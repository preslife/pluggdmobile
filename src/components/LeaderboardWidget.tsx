
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Star } from "lucide-react";
import clsx from "clsx";

type Metric = "total_points" | "beats_sold" | "current_streak";

type UserStat = {
  user_id: string;
  total_points: number | null;
  beats_sold: number | null;
  current_streak: number | null;
};

type Profile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

async function fetchLeaderboard(metric: Metric) {
  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("user_id, total_points, beats_sold, current_streak")
    .order(metric, { ascending: false })
    .limit(10);
  if (error) throw error;

  const ids = (stats || []).map((s) => s.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, full_name, username, avatar_url")
    .in("user_id", ids);
  if (pErr) throw pErr;

  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p) => profileMap.set((p as any).user_id, p as any));

  return (stats || []).map((s, i) => {
    const p = profileMap.get((s as any).user_id);
    return {
      rank: i + 1,
      user_id: (s as any).user_id as string,
      value: (s as any)[metric] ?? 0,
      name: p?.full_name || p?.username || "User",
      avatar_url: p?.avatar_url || null,
    };
  });
}

const MetricButton = ({
  metric,
  active,
  onClick,
  children,
}: {
  metric: Metric;
  active: boolean;
  onClick: (m: Metric) => void;
  children: React.ReactNode;
}) => (
  <Button
    variant={active ? "default" : "outline"}
    size="sm"
    onClick={() => onClick(metric)}
    className={clsx("rounded-full", active ? "" : "bg-background")}
  >
    {children}
  </Button>
);

const LeaderboardItem = ({
  rank,
  name,
  avatar_url,
  value,
}: {
  rank: number;
  name: string;
  avatar_url: string | null;
  value: number;
}) => (
  <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
    <div className="flex items-center gap-3">
      <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold", {
        "bg-primary/20 text-primary": rank === 1,
        "bg-yellow-500/20 text-yellow-600": rank === 2,
        "bg-orange-500/20 text-orange-600": rank === 3,
        "bg-muted text-foreground": rank > 3,
      })}>
        {rank}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar_url ?? undefined} />
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{name}</span>
    </div>
    <span className="text-sm text-muted-foreground">{value}</span>
  </div>
);

const LeaderboardWidget = () => {
  const [metric, setMetric] = useState<Metric>("total_points");

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: () => fetchLeaderboard(metric),
    meta: {
      onError: (err: any) => {
        console.error("Leaderboard error", err?.message || err);
      },
    },
  });

  const title = useMemo(() => {
    switch (metric) {
      case "total_points":
        return "Top XP Earners";
      case "beats_sold":
        return "Top Sellers";
      case "current_streak":
        return "Longest Streaks";
      default:
        return "Leaderboard";
    }
  }, [metric]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {metric === "total_points" && <Trophy className="h-5 w-5 text-primary" />}
            {metric === "beats_sold" && <Star className="h-5 w-5 text-primary" />}
            {metric === "current_streak" && <Flame className="h-5 w-5 text-primary" />}
            {title}
          </span>
          <div className="flex items-center gap-2">
            <MetricButton metric="total_points" active={metric === "total_points"} onClick={setMetric}>
              XP
            </MetricButton>
            <MetricButton metric="beats_sold" active={metric === "beats_sold"} onClick={setMetric}>
              Sold
            </MetricButton>
            <MetricButton metric="current_streak" active={metric === "current_streak"} onClick={setMetric}>
              Streak
            </MetricButton>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <div className="h-9 rounded-md bg-muted animate-pulse" />
            <div className="h-9 rounded-md bg-muted animate-pulse" />
            <div className="h-9 rounded-md bg-muted animate-pulse" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">Failed to load leaderboard.</p>}
        {!isLoading && !error && (
          <div className="space-y-2">
            {(data || []).map((row: any) => (
              <LeaderboardItem
                key={row.user_id}
                rank={row.rank}
                name={row.name}
                avatar_url={row.avatar_url}
                value={row.value}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardWidget;
