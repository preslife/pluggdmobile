import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SignerType = "producer" | "artist";

interface ContractExecutionBody {
  contractId?: string;
  signature?: string;
  signerType?: SignerType;
}

export interface ContractExecutionContext {
  supabase: Pick<SupabaseClient, "auth" | "from">;
}

const getClientIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;

  const real = req.headers.get("x-real-ip");
  if (real) return real;

  return "unknown";
};

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
    const { contractId, signature, signerType } = body;

    if (!contractId || !signature || (signerType !== "producer" && signerType !== "artist")) {
      return new Response(JSON.stringify({ error: "Invalid request payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractError } = await supabase
      .from("licensing_contracts")
      .select("id, producer_id, artist_id, producer_signature, artist_signature, signed_at")
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

    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const signedAt = new Date().toISOString();

    const { error: insertError } = await supabase
      .from("contract_signatures")
      .insert({
        contract_id: contractId,
        signer_id: userId,
        signer_type: signerType,
        signature_data: signature,
        ip_address: ipAddress,
        user_agent: userAgent,
        signed_at: signedAt,
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to record signature" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, any> = {
      updated_at: signedAt,
    };

    if (signerType === "producer") {
      updatePayload.producer_signature = signature;
      updatePayload.producer_ip_address = ipAddress;
    } else {
      updatePayload.artist_signature = signature;
      updatePayload.artist_ip_address = ipAddress;
    }

    const {
      data: updatedContracts,
      error: updateError,
    } = await supabase
      .from("licensing_contracts")
      .update(updatePayload)
      .eq("id", contractId)
      .select("id, producer_signature, artist_signature, signed_at, status");

    if (updateError || !updatedContracts || updatedContracts.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to update contract" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatedContract = updatedContracts[0];

    const producerSigned = Boolean(updatedContract.producer_signature);
    const artistSigned = Boolean(updatedContract.artist_signature);

    if (producerSigned && artistSigned && updatedContract.status !== "signed") {
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
