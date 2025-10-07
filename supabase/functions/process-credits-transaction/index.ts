import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processCreditsTransaction } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WalletTransactionResponse {
  ledgerEntryId: string;
  manualEntryId: string | null;
}

function normalizeTransactionResponse(data: unknown): WalletTransactionResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Unexpected wallet transaction response shape");
  }

  const ledgerEntryId =
    (data as any).ledgerEntryId ||
    (data as any).ledger_entry_id ||
    (data as any).ledger_id ||
    (data as any).id;

  if (!ledgerEntryId || typeof ledgerEntryId !== "string") {
    throw new Error("Wallet transaction response missing ledger entry id");
  }

  const manualEntryId =
    typeof (data as any).manualEntryId === "string"
      ? (data as any).manualEntryId
      : typeof (data as any).manual_entry_id === "string"
      ? (data as any).manual_entry_id
      : null;

  return {
    ledgerEntryId,
    manualEntryId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const defaultCorrelationId = crypto.randomUUID();
  let correlationId = defaultCorrelationId;
  let body: any = null;

  try {
    body = await req.json();
    if (typeof body?.correlation_id === "string" && body.correlation_id) {
      correlationId = body.correlation_id;
    }

    console.log(
      `[PROCESS-CREDITS-TRANSACTION][${correlationId}] Function started`,
      { correlationId },
    );

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    console.log(
      `[PROCESS-CREDITS-TRANSACTION][${correlationId}] User authenticated`,
      { correlationId, userId: user.id },
    );

    // Parse request body
    const {
      amount_credits,
      kind,
      ref_type,
      ref_id,
      counterparty_user_id,
      manual_entry,
      meta = {}
    } = await req.json();

    if (!amount_credits || !kind) {
      throw new Error("Invalid transaction data");
    }

    console.log(
      `[PROCESS-CREDITS-TRANSACTION][${correlationId}] Processing transaction`,
      { correlationId, kind, amount_credits },
    );

    // For spending transactions, check balance first
    if (amount_credits < 0) {
      const { data: balanceData, error: balanceError } = await supabaseClient.rpc('get_wallet_balance', {
        p_user_id: user.id
      });

      if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);

      const balance = balanceData as any;
      if (balance.available_credits < Math.abs(amount_credits)) {
        throw new Error("Insufficient credits");
      }
    }

    const transactionPayload = {
      user_id: user.id,
      amount_credits,
      kind,
      ref_type,
      ref_id,
      counterparty_user_id,
      meta,
      manual_entry,
    };

    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'wallet_process_transaction',
      transactionPayload as Record<string, unknown>,
    );

    if (!rpcError && rpcData) {
      const normalized = normalizeTransactionResponse(rpcData);

      console.log('[PROCESS-CREDITS-TRANSACTION] Transaction completed via RPC');

      return new Response(
        JSON.stringify({
          success: true,
          ledgerEntryId: normalized.ledgerEntryId,
          manualEntryId: normalized.manualEntryId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    if (rpcError) {
      console.warn(
        `[PROCESS-CREDITS-TRANSACTION] RPC unavailable, falling back to manual inserts: ${rpcError.message}`,
      );
    }

    const { data: ledgerData, error: ledgerError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: user.id,
        kind,
        amount_credits,
        ref_type,
        ref_id,
        counterparty_user_id,
        meta,
      })
      .select('id')
      .single();

    if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

    const ledgerEntryId = (ledgerData as { id: string }).id;

    let manualEntryId: string | null = null;

    if (manual_entry) {
      const manualPayload: Record<string, any> = {
        ledger_entry_id: ledgerEntryId,
        user_id: user.id,
        order_id: manual_entry.order_id ?? ref_id ?? null,
        item_type: manual_entry.item_type ?? meta?.product_type ?? null,
        item_id: manual_entry.item_id ?? meta?.product_id ?? null,
        operator_id: manual_entry.operator_id ?? user.id,
        direction: manual_entry.direction ?? (amount_credits < 0 ? 'debit' : 'credit'),
        amount_credits: manual_entry.amount_credits ?? Math.abs(amount_credits),
        metadata: manual_entry.metadata ?? { ...meta, kind },
      };

      Object.keys(manualPayload).forEach((key) => {
        if (manualPayload[key] === undefined) {
          delete manualPayload[key];
        }
      });

      const { data: manualData, error: manualError } = await supabaseClient
        .from('wallet_manual_entries')
        .insert(manualPayload)
        .select('id')
        .single();

      if (manualError) {
        console.error(
          `[PROCESS-CREDITS-TRANSACTION] Manual entry insert failed: ${manualError.message}`,
        );
      } else {
        manualEntryId = (manualData as { id?: string } | null)?.id ?? null;
      }
    }

    // For tips and transfers, create counterparty entry
    if (counterparty_user_id && (kind === 'spend_tip' || kind === 'spend_purchase')) {
      const counterpartyKind = kind === 'spend_tip' ? 'spend_tip' : 'spend_purchase';
      
      const { error: counterpartyError } = await supabaseClient
        .from('wallet_ledger')
        .insert({
          user_id: counterparty_user_id,
          kind: counterpartyKind,
          amount_credits: Math.abs(amount_credits), // Always positive for receiver
          ref_type,
          ref_id,
          counterparty_user_id: user.id,
          meta: transactionMeta,
        });

    if (result.counterparty_error) {
      console.error(`[PROCESS-CREDITS-TRANSACTION] Counterparty error: ${result.counterparty_error}`);
    }

    console.log(
      `[PROCESS-CREDITS-TRANSACTION][${correlationId}] Transaction completed successfully`,
      { correlationId },
    );

    return new Response(
      JSON.stringify({ success: true, ledgerEntryId, manualEntryId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[PROCESS-CREDITS-TRANSACTION][${correlationId}] Error encountered`,
      { correlationId, error: errorMessage },
    );

    return new Response(JSON.stringify({ error: errorMessage, correlation_id: correlationId }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Correlation-Id": correlationId,
      },
      status: 500,
    });
  }
});
