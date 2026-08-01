import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  clientIp,
  DIGITAL_DELIVERY_CONSENT_TEXT,
  DIGITAL_DELIVERY_CONSENT_VERSION,
} from "../_shared/beatLicenseCompliance.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SignerType = "producer" | "artist";

interface ContractExecutionBody {
  contractId?: string;
  signature?: string;
  signerType?: SignerType;
  digitalDeliveryConsent?: {
    accepted?: unknown;
    version?: unknown;
  };
}

export interface ContractExecutionContext {
  supabase: Pick<SupabaseClient, "auth" | "from">;
}

export async function handleContractExecution(
  req: Request,
  { supabase }: ContractExecutionContext,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ContractExecutionBody;
    const { contractId, signature, signerType, digitalDeliveryConsent } = body;

    const normalizedSignature = signature?.trim();
    if (
      !contractId || !normalizedSignature ||
      normalizedSignature.length < 2 || normalizedSignature.length > 160 ||
      (signerType !== "producer" && signerType !== "artist")
    ) {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractError } = await supabase
      .from("licensing_contracts")
      .select("id, producer_id, artist_id, producer_signature, artist_signature, signed_at, status, digital_delivery_requested, digital_delivery_consent_version")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    if (signerType === "producer" && contract.producer_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (signerType === "artist" && contract.artist_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (signerType === "artist" && (
      digitalDeliveryConsent?.accepted !== true ||
      digitalDeliveryConsent?.version !== DIGITAL_DELIVERY_CONSENT_VERSION
    )) {
      return new Response(JSON.stringify({
        error: "Separate consent for immediate digital delivery is required",
        code: "DIGITAL_DELIVERY_CONSENT_REQUIRED",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["pending", "signed"].includes(contract.status)) {
      return new Response(JSON.stringify({
        error: "This contract can no longer be signed",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipAddress = clientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const signedAt = new Date().toISOString();

    const existingSignature = await supabase.from("contract_signatures")
      .select("id")
      .eq("contract_id", contractId)
      .eq("signer_id", userId)
      .eq("signer_type", signerType)
      .maybeSingle();
    const newlyRecorded = !existingSignature.data;
    const insertError = !newlyRecorded
      ? null
      : (await supabase
        .from("contract_signatures")
        .insert({
          contract_id: contractId,
          signer_id: userId,
          signer_type: signerType,
          signature_data: normalizedSignature,
          ip_address: ipAddress,
          user_agent: userAgent,
          signed_at: signedAt,
        })).error;

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to record signature" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auditIpAddress = ipAddress === "unknown" ? null : ipAddress;
    const auditError = !newlyRecorded
      ? null
      : (await supabase
        .from("security_audit_log")
        .insert({
          user_id: userId,
          table_name: "licensing_contracts",
          action: `contract_signed_${signerType}`,
          record_id: contractId,
          ip_address: auditIpAddress,
          user_agent: userAgent,
          created_at: signedAt,
        })).error;

    if (auditError) {
      return new Response(JSON.stringify({ error: "Failed to record contract audit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, any> = {
      updated_at: signedAt,
    };

    if (signerType === "producer") {
      updatePayload.producer_signature = normalizedSignature;
      updatePayload.producer_ip_address = ipAddress;
    } else {
      updatePayload.artist_signature = normalizedSignature;
      updatePayload.artist_ip_address = ipAddress;
      updatePayload.digital_delivery_requested = true;
      updatePayload.digital_delivery_consent_text =
        DIGITAL_DELIVERY_CONSENT_TEXT;
      updatePayload.digital_delivery_consent_version =
        DIGITAL_DELIVERY_CONSENT_VERSION;
      updatePayload.digital_delivery_consented_at = signedAt;
      updatePayload.digital_delivery_consent_ip = ipAddress;
      updatePayload.digital_delivery_consent_user_agent = userAgent;
    }

    const {
      data: updatedContracts,
      error: updateError,
    } = await supabase
      .from("licensing_contracts")
      .update(updatePayload)
      .eq("id", contractId)
      .select("id, producer_signature, artist_signature, signed_at, status, digital_delivery_requested, digital_delivery_consent_version");

    if (updateError || !updatedContracts || updatedContracts.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to update contract" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatedContract = updatedContracts[0];

    const producerSigned = Boolean(updatedContract.producer_signature);
    const artistSigned = Boolean(updatedContract.artist_signature);
    const deliveryConsentRecorded = Boolean(
      updatedContract.digital_delivery_requested &&
        updatedContract.digital_delivery_consent_version ===
          DIGITAL_DELIVERY_CONSENT_VERSION,
    );

    if (
      producerSigned && artistSigned && deliveryConsentRecorded &&
      updatedContract.status !== "signed"
    ) {
      const contractSignedAt = updatedContract.signed_at ?? signedAt;
      const { error: finalizeError } = await supabase
        .from("licensing_contracts")
        .update({
          status: "signed",
          signed_at: contractSignedAt,
          updated_at: contractSignedAt,
        })
        .eq("id", contractId);

      if (finalizeError) {
        return new Response(JSON.stringify({ error: "Failed to finalize contract" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          ipAddress,
          userAgent,
          signedAt,
          signerType,
          digitalDeliveryConsentVersion: signerType === "artist"
            ? DIGITAL_DELIVERY_CONSENT_VERSION
            : null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[CONTRACT-EXECUTION]", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
