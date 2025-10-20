import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  TrendingUp,
  Users,
} from "lucide-react";

interface KpiRow {
  creator_id: string;
  metric_date: string;
  kpi_key: string;
  total_value: number;
  event_count: number;
  last_occurred_at: string | null;
}

interface AggregatedKpi {
  total: number;
  daily: Record<string, number>;
}

type LucideIcon = typeof Play;

interface KpiConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  format: (value: number) => string;
  formatDelta?: (value: number) => string;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const formatCurrencyFromCents = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value / 100);

const roundPercent = (value: number) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : "–";

const KPI_CONFIG: Record<string, KpiConfig> = {
  total_streams: {
    label: "Total Streams",
    description: "Daily streams tracked across releases",
    icon: Play,
    format: formatNumber,
  },
  total_views: {
    label: "Video Views",
    description: "Cross-platform video consumption",
    icon: Eye,
    format: formatNumber,
  },
  total_likes: {
    label: "Audience Likes",
    description: "Engagement on posts and media",
    icon: Heart,
    format: formatNumber,
  },
  total_comments: {
    label: "Comments",
    description: "Conversation volume across channels",
    icon: MessageCircle,
    format: formatNumber,
  },
  fan_revenue_cents: {
    label: "Fan Revenue",
    description: "Subscriptions and direct support",
    icon: DollarSign,
    format: formatCurrencyFromCents,
    formatDelta: formatCurrencyFromCents,
  },
  active_subscriptions: {
    label: "Active Subs",
    description: "Current paying supporters",
    icon: Users,
    format: formatNumber,
  },
  new_fans: {
    label: "New Fans (30d)",
    description: "New subscribers in the last 30 days",
    icon: TrendingUp,
    format: formatNumber,
  },
  churned_fans: {
    label: "Churned Fans (30d)",
    description: "Cancelled subscriptions in the last 30 days",
    icon: TrendingUp,
    format: formatNumber,
  },
  battle_revenue_cents: {
    label: "Battle Revenue",
    description: "Gains from competitive events",
    icon: DollarSign,
    format: formatCurrencyFromCents,
    formatDelta: formatCurrencyFromCents,
  },
  event_revenue_cents: {
    label: "Event Revenue",
    description: "Ticketed session earnings",
    icon: DollarSign,
    format: formatCurrencyFromCents,
    formatDelta: formatCurrencyFromCents,
  },
  total_followers: {
    label: "Spotify Followers",
    description: "Latest follower snapshot from Spotify",
    icon: Users,
    format: formatNumber,
  },
  total_subscribers: {
    label: "YouTube Subscribers",
    description: "Channel subscribers captured during sync",
    icon: Users,
    format: formatNumber,
  },
};

const KPI_ORDER = [
  "total_streams",
  "total_views",
  "total_likes",
  "total_comments",
  "fan_revenue_cents",
  "battle_revenue_cents",
  "event_revenue_cents",
  "active_subscriptions",
  "new_fans",
  "churned_fans",
  "total_followers",
  "total_subscribers",
];

const computeTrend = (daily: Record<string, number>) => {
  const sortedDates = Object.keys(daily).sort();
  if (sortedDates.length === 0) {
    return null;
  }

  const lastSeven = sortedDates.slice(-7);
  const previousSeven = sortedDates.slice(-14, -7);

  const sumFor = (dates: string[]) =>
    dates.reduce((acc, date) => acc + (daily[date] ?? 0), 0);

  const recent = sumFor(lastSeven);
  const previous = sumFor(previousSeven);
  const delta = recent - previous;
  const percent = previous === 0 ? (recent > 0 ? 100 : 0) : (delta / previous) * 100;

  return {
    delta,
    percent,
  };
};

export const InsightsModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchKpis = async () => {
      setLoading(true);
      try {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        const startDate = start.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("creator_kpi_daily_personal")
          .select("creator_id, metric_date, kpi_key, total_value, event_count, last_occurred_at")
          .gte("metric_date", startDate)
          .order("metric_date", { ascending: true });

        if (error) throw error;
        setRows(data ?? []);
      } catch (error) {
        console.error("Failed to load KPI analytics", error);
        toast({
          title: "Unable to load insights",
          description: "We couldn't fetch the latest KPI rollups. Please try again soon.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchKpis();
  }, [user?.id, toast]);

  const aggregated = useMemo(() => {
    return rows.reduce((acc, row) => {
      const bucket = acc.get(row.kpi_key) ?? { total: 0, daily: {} };
      bucket.total += Number(row.total_value ?? 0);
      bucket.daily[row.metric_date] = Number(row.total_value ?? 0);
      acc.set(row.kpi_key, bucket);
      return acc;
    }, new Map<string, AggregatedKpi>());
  }, [rows]);

  const hasData = rows.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Key performance indicators</h2>
          <p className="text-sm text-muted-foreground">
            Unified metrics aggregated nightly from streaming activity, fan commerce, and community engagement.
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {!loading && !hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>No analytics yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            KPI rollups will appear once fans start engaging with your content and purchases. Check back tomorrow after activity is processed.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KPI_ORDER.filter(key => KPI_CONFIG[key]).map(key => {
            const config = KPI_CONFIG[key];
            const stats = aggregated.get(key);
            const total = stats?.total ?? 0;
            const trend = stats ? computeTrend(stats.daily) : null;
            const Icon = config.icon;
            const formattedTotal = config.format(total);
            const formattedDelta = trend
              ? (config.formatDelta ?? config.format)(trend.delta)
              : null;
            const trendClass = !trend
              ? "text-muted-foreground"
              : trend.delta >= 0
                ? "text-emerald-500"
                : "text-destructive";

            return (
              <Card key={key} className="flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-bold">{formattedTotal}</div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  {trend && (
                    <p className="text-xs font-medium">
                      <span className={trendClass}>
                        {trend.delta >= 0 ? "▲" : "▼"} {formattedDelta}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        ({roundPercent(trend.percent)} vs prior 7d)
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
