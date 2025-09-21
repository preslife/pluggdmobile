
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type FanSubscription = {
  id: string;
  fan_id: string;
  creator_id: string;
  status: string;
  price_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export const useCreatorSupport = (creatorId: string | undefined) => {
  const [fanId, setFanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [record, setRecord] = useState<FanSubscription | null>(null);

  // Use an untyped Postgrest call until Supabase types include the fan_subscriptions table
  const fanSubs = useCallback(() => {
    return (supabase.from as any)("fan_subscriptions");
  }, []);

  // Load current user id
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setFanId(user?.id ?? null);
      console.log("[useCreatorSupport] Loaded fanId:", user?.id);
    };
    load();
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!fanId || !creatorId) {
      setSubscribed(false);
      setRecord(null);
      return;
    }
    setLoading(true);
    console.log("[useCreatorSupport] Fetching status for", { fanId, creatorId });

    // Get the most recent subscription record for this fan->creator pair
    const { data, error } = await fanSubs()
      .select("*")
      .eq("fan_id", fanId)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[useCreatorSupport] fetchStatus error:", error);
    }

    if (!error && data && data.length > 0) {
      setRecord(data[0] as FanSubscription);
      setSubscribed((data[0] as any).status === "active");
    } else {
      setRecord(null);
      setSubscribed(false);
    }
    setLoading(false);
  }, [fanId, creatorId, fanSubs]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Realtime sync for this fan/creator pair
  useEffect(() => {
    if (!fanId || !creatorId) return;

    const channel = supabase
      .channel("fan-subs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fan_subscriptions",
          filter: `fan_id=eq.${fanId}`,
        },
        () => {
          console.log("[useCreatorSupport] Realtime change detected, refetching...");
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fanId, creatorId, fetchStatus]);

  const subscribe = useCallback(async () => {
    if (!fanId || !creatorId) {
      return { error: new Error("Please sign in to support") } as const;
    }
    setLoading(true);

    if (record) {
      const { error } = await fanSubs()
        .update({ status: "active", updated_at: new Date().toISOString() } as any)
        .eq("id", record.id);

      setLoading(false);
      if (error) return { error } as const;

      await fetchStatus();
      return { ok: true } as const;
    } else {
      const { error } = await fanSubs().insert({
        fan_id: fanId,
        creator_id: creatorId,
        status: "active",
        price_cents: 0,
        currency: "usd",
      } as any);

      setLoading(false);
      if (error) return { error } as const;

      await fetchStatus();
      return { ok: true } as const;
    }
  }, [fanId, creatorId, record, fetchStatus, fanSubs]);

  const unsubscribe = useCallback(async () => {
    if (!fanId || !creatorId) {
      return { error: new Error("Please sign in") } as const;
    }
    setLoading(true);

    const { error } = await fanSubs()
      .update({ status: "canceled", updated_at: new Date().toISOString() } as any)
      .eq("fan_id", fanId)
      .eq("creator_id", creatorId)
      .eq("status", "active");

    setLoading(false);
    if (error) return { error } as const;

    await fetchStatus();
    return { ok: true } as const;
  }, [fanId, creatorId, fetchStatus, fanSubs]);

  const isOwner = useMemo(
    () => fanId != null && creatorId != null && fanId === creatorId,
    [fanId, creatorId]
  );

  return { fanId, subscribed, loading, subscribe, unsubscribe, isOwner } as const;
};
