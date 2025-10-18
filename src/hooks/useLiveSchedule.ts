import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveScheduleItem = {
  id: string;
  type: "session" | "battle";
  title: string;
  status: "live" | "upcoming" | "finished";
  scheduledFor: string | null;
  endsAt?: string | null;
  actionHref: string;
};

type SessionRow = {
  id: string;
  title: string;
  status: string;
  scheduled_for: string | null;
  duration_minutes?: number | null;
};

type BattleRow = {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

const mapSession = (session: SessionRow): LiveScheduleItem => {
  const status = session.status === "live" ? "live" : session.status === "ended" ? "finished" : "upcoming";
  return {
    id: session.id,
    type: "session",
    title: session.title,
    status,
    scheduledFor: session.scheduled_for,
    endsAt: session.scheduled_for && session.duration_minutes
      ? new Date(new Date(session.scheduled_for).getTime() + session.duration_minutes * 60_000).toISOString()
      : null,
    actionHref: `/live/sessions/${session.id}`,
  };
};

const mapBattle = (battle: BattleRow): LiveScheduleItem => {
  const status =
    battle.status === "live"
      ? "live"
      : battle.status === "finished"
        ? "finished"
        : "upcoming";

  return {
    id: battle.id,
    type: "battle",
    title: battle.title,
    status,
    scheduledFor: battle.starts_at,
    endsAt: battle.ends_at,
    actionHref: `/live/battles/${battle.id}`,
  };
};

const sortSchedule = (items: LiveScheduleItem[]) => {
  const statusWeight: Record<LiveScheduleItem["status"], number> = {
    live: 0,
    upcoming: 1,
    finished: 2,
  };

  return [...items].sort((a, b) => {
    const statusDiff = statusWeight[a.status] - statusWeight[b.status];
    if (statusDiff !== 0) return statusDiff;

    const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
};

const upsertItem = (items: LiveScheduleItem[], item: LiveScheduleItem) => {
  const index = items.findIndex((existing) => existing.id === item.id && existing.type === item.type);
  if (index === -1) {
    return [...items, item];
  }
  const updated = [...items];
  updated[index] = item;
  return updated;
};

export const useLiveSchedule = () => {
  const [schedule, setSchedule] = useState<LiveScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSchedule = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [sessionsResult, battlesResult] = await Promise.all([
        supabase
          .from("live_sessions")
          .select("id,title,status,scheduled_for,duration_minutes")
          .order("scheduled_for", { ascending: true }),
        supabase
          .from("battles")
          .select("id,title,status,starts_at,ends_at")
          .order("starts_at", { ascending: true }),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (battlesResult.error) throw battlesResult.error;

      const items = [
        ...(sessionsResult.data || []).map(mapSession),
        ...(battlesResult.data || []).map(mapBattle),
      ].filter((item) => item.status !== "finished");

      setSchedule(sortSchedule(items));
    } catch (error) {
      console.error("Error loading live schedule", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  useEffect(() => {
    const channel = supabase
      .channel("live-schedule")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setSchedule((prev) => prev.filter((item) => !(item.type === "session" && item.id === (payload.old as any)?.id)));
          return;
        }
        const next = mapSession(payload.new as SessionRow);
        setSchedule((prev) => sortSchedule(upsertItem(prev, next)).filter((item) => item.status !== "finished"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "battles" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setSchedule((prev) => prev.filter((item) => !(item.type === "battle" && item.id === (payload.old as any)?.id)));
          return;
        }
        const next = mapBattle(payload.new as BattleRow);
        setSchedule((prev) => sortSchedule(upsertItem(prev, next)).filter((item) => item.status !== "finished"));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () => ({
      schedule,
      loading,
      refetch: () => refreshSchedule(),
    }),
    [schedule, loading, refreshSchedule]
  );
};

export default useLiveSchedule;
