
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CommissionStatus =
  | "pending"
  | "accepted"
  | "funded"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type CommissionRequest = {
  id: string;
  requester_id: string;
  producer_id: string;
  title: string;
  description: string | null;
  genre: string | null;
  reference_links: string[] | null;
  budget_cents: number;
  application_fee_percent: number | null;
  status: CommissionStatus;
  stripe_payment_intent_id: string | null;
  deadline: string | null; // date
  created_at: string;
  updated_at: string;
};

export const useCommissionRequests = () => {
  const getUserId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }, []);

  const createRequest = useCallback(
    async (payload: {
      producerId: string;
      title: string;
      description?: string;
      genre?: string;
      referenceLinks?: string[];
      budgetAmount: number; // in major units, e.g. 100.50 means £100.50
      applicationFeePercent?: number;
      deadline?: string; // YYYY-MM-DD
    }) => {
      const userId = await getUserId();
      if (!userId) return { error: new Error("Please sign in to request a commission") } as const;

      const budget_cents = Math.round(Number(payload.budgetAmount || 0) * 100);

      console.log("[createRequest] inserting", {
        requester_id: userId,
        producer_id: payload.producerId,
        title: payload.title,
        budget_cents,
      });

      const { data, error } = await supabase
        .from("commission_requests")
        .insert({
          requester_id: userId,
          producer_id: payload.producerId,
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          genre: payload.genre?.trim() || null,
          reference_links: payload.referenceLinks?.length ? payload.referenceLinks : [],
          budget_cents,
          application_fee_percent:
            typeof payload.applicationFeePercent === "number" ? payload.applicationFeePercent : null,
          deadline: payload.deadline || null,
        })
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("[createRequest] error", error);
        return { error } as const;
      }
      return { data: data as CommissionRequest } as const;
    },
    [getUserId]
  );

  const listAsRequester = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return { error: new Error("Not signed in") } as const;

    const { data, error } = await supabase
      .from("commission_requests")
      .select("*")
      .eq("requester_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listAsRequester] error", error);
      return { error } as const;
    }
    return { data: (data || []) as CommissionRequest[] } as const;
  }, [getUserId]);

  const listAsProducer = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) return { error: new Error("Not signed in") } as const;

    const { data, error } = await supabase
      .from("commission_requests")
      .select("*")
      .eq("producer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listAsProducer] error", error);
      return { error } as const;
    }
    return { data: (data || []) as CommissionRequest[] } as const;
  }, [getUserId]);

  const updateStatus = useCallback(async (id: string, status: CommissionStatus) => {
    console.log("[updateStatus]", id, status);
    const { data, error } = await supabase
      .from("commission_requests")
      .update({ status })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[updateStatus] error", error);
      return { error } as const;
    }
    return { data: data as CommissionRequest } as const;
  }, []);

  const updateFields = useCallback(
    async (id: string, fields: Partial<Pick<CommissionRequest, "title" | "description" | "genre" | "reference_links" | "deadline">>) => {
      console.log("[updateFields]", id, fields);
      const { data, error } = await supabase
        .from("commission_requests")
        .update(fields)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("[updateFields] error", error);
        return { error } as const;
      }
      return { data: data as CommissionRequest } as const;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    console.log("[remove commission]", id);
    const { error } = await supabase.from("commission_requests").delete().eq("id", id);
    if (error) {
      console.error("[remove] error", error);
      return { error } as const;
    }
    return { ok: true } as const;
  }, []);

  return {
    createRequest,
    listAsRequester,
    listAsProducer,
    updateStatus,
    updateFields,
    remove,
  } as const;
};
