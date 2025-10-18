import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

interface KpiRow {
  creator_id: string | null;
  metric_date: string | null;
  kpi_key: string | null;
  total_value: number | null;
  event_count: number | null;
}

type MetricKey = "active_subscriptions" | "churned_fans" | "fan_revenue_cents";

type TableCandidate = {
  name: string;
  label: string;
};

interface TrendSummary {
  current: number;
  changePercent: number;
  trend: "up" | "down" | "flat";
}

interface ChartDatum {
  date: string;
  activeSubscribers: number;
  churnedFans: number;
  gmvCents: number;
}

const TABLE_CANDIDATES: TableCandidate[] = [
  { name: "creator_subscription_kpi_daily_personal", label: "subscription_personal" },
  { name: "creator_subscription_kpi_daily", label: "subscription_rollup" },
  { name: "creator_kpi_daily_personal", label: "legacy_personal" },
];

const METRIC_LABELS: Record<MetricKey, string> = {
  active_subscriptions: "Active Subscribers",
  churned_fans: "Churned Fans (30d)",
  fan_revenue_cents: "GMV (30d)",
};

const METRIC_ICONS: Record<MetricKey, React.ElementType> = {
  active_subscriptions: Users,
  churned_fans: TrendingDown,
  fan_revenue_cents: Wallet,
};

const getMetricValue = (row: KpiRow) =>
  typeof row.total_value === "number" ? row.total_value : row.event_count ?? 0;

const formatCurrencyFromCents = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

const computePercentChange = (series: number[]) => {
  if (series.length === 0) return 0;
  const recent = series.slice(-7).reduce((acc, value) => acc + value, 0);
  const previous = series.slice(-14, -7).reduce((acc, value) => acc + value, 0);
  if (previous === 0) {
    return recent > 0 ? 100 : 0;
  }
  return ((recent - previous) / previous) * 100;
};

export const SubscriptionAnalyticsModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      void logger.info("subscription_analytics.fetch_start", {
        component: "creatorStudio.subscriptionAnalytics",
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      const startDateIso = startDate.toISOString().split("T")[0];

      let latestRows: KpiRow[] | null = null;
      let lastError: { message: string } | null = null;

      for (const candidate of TABLE_CANDIDATES) {
        try {
          const { data, error: queryError } = await supabase
            .from(candidate.name as any)
            .select("creator_id, metric_date, kpi_key, total_value, event_count")
            .eq("creator_id", user.id)
            .gte("metric_date", startDateIso)
            .order("metric_date", { ascending: true });

          if (queryError) {
            lastError = queryError;
            void logger.warn("subscription_analytics.table_failed", {
              component: "creatorStudio.subscriptionAnalytics",
              table: candidate.name,
              message: queryError.message,
            });
            continue;
          }

          latestRows = data ?? [];
          void logger.info("subscription_analytics.table_selected", {
            component: "creatorStudio.subscriptionAnalytics",
            table: candidate.name,
            rows: latestRows.length,
          });
          break;
        } catch (candidateError: any) {
          lastError = { message: candidateError?.message ?? "Unknown error" };
          void logger.error("subscription_analytics.table_exception", {
            component: "creatorStudio.subscriptionAnalytics",
            table: candidate.name,
            message: lastError.message,
          });
        }
      }

      if (latestRows === null) {
        const fallbackMessage =
          lastError?.message ?? "We couldn't reach the subscription analytics service.";
        setError(fallbackMessage);
        void logger.error("subscription_analytics.fetch_failed", {
          component: "creatorStudio.subscriptionAnalytics",
          message: fallbackMessage,
        });
        toast({
          title: "Unable to load analytics",
          description: fallbackMessage,
          variant: "destructive",
        });
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(latestRows);
      void logger.info("subscription_analytics.fetch_success", {
        component: "creatorStudio.subscriptionAnalytics",
        rows: latestRows.length,
      });
      setLoading(false);
    };

    void fetchMetrics();
  }, [user?.id, toast, refreshIndex]);

  const chartData: ChartDatum[] = useMemo(() => {
    const byDate = new Map<string, ChartDatum>();

    for (const row of rows) {
      if (!row.metric_date || !row.kpi_key) continue;
      if (!byDate.has(row.metric_date)) {
        byDate.set(row.metric_date, {
          date: row.metric_date,
          activeSubscribers: 0,
          churnedFans: 0,
          gmvCents: 0,
        });
      }

      const bucket = byDate.get(row.metric_date)!;
      const value = getMetricValue(row);

      switch (row.kpi_key as MetricKey) {
        case "active_subscriptions":
          bucket.activeSubscribers = value;
          break;
        case "churned_fans":
          bucket.churnedFans = value;
          break;
        case "fan_revenue_cents":
          bucket.gmvCents = value;
          break;
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  const summaries = useMemo(() => {
    if (chartData.length === 0) {
      return {
        active: { current: 0, changePercent: 0, trend: "flat" as const },
        churn: { current: 0, changePercent: 0, trend: "flat" as const },
        gmv: { current: 0, changePercent: 0, trend: "flat" as const },
      };
    }

    const activeSeries = chartData.map((entry) => entry.activeSubscribers);
    const churnSeries = chartData.map((entry) => entry.churnedFans);
    const gmvSeries = chartData.map((entry) => entry.gmvCents);

    const activeChange = computePercentChange(activeSeries);
    const churnChange = computePercentChange(churnSeries);
    const gmvChange = computePercentChange(gmvSeries);

    return {
      active: {
        current: activeSeries.at(-1) ?? 0,
        changePercent: activeChange,
        trend: activeChange === 0 ? "flat" : activeChange > 0 ? "up" : "down",
      },
      churn: {
        current: churnSeries.reduce((acc, value) => acc + value, 0),
        changePercent: churnChange,
        trend: churnChange === 0 ? "flat" : churnChange > 0 ? "up" : "down",
      },
      gmv: {
        current: gmvSeries.reduce((acc, value) => acc + value, 0),
        changePercent: gmvChange,
        trend: gmvChange === 0 ? "flat" : gmvChange > 0 ? "up" : "down",
      },
    };
  }, [chartData]);

  const hasData = chartData.length > 0 && chartData.some((entry) => entry.gmvCents > 0 || entry.activeSubscribers > 0);

  const renderTrend = (summary: TrendSummary) => {
    const Icon = summary.trend === "down" ? ArrowDownRight : summary.trend === "up" ? ArrowUpRight : null;
    const trendClass =
      summary.trend === "down"
        ? "text-red-500"
        : summary.trend === "up"
          ? "text-green-500"
          : "text-muted-foreground";

    return (
      <div className={`flex items-center gap-1 text-xs ${trendClass}`}>
        {Icon ? <Icon className="w-3 h-3" /> : null}
        <span>
          {summary.trend === "flat" ? "No change" : `${Math.abs(summary.changePercent).toFixed(1)}% vs prev. period`}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscription Analytics</h1>
          <p className="text-muted-foreground">
            Track recurring revenue, subscriber churn, and growth trends pulled from the analytics warehouse.
          </p>
        </div>
        <Badge variant="outline">Last 30 days</Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading subscription analytics…</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load subscription analytics</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefreshIndex((value) => value + 1)}
              className="shrink-0"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              Subscription analytics will appear soon
            </CardTitle>
            <CardDescription>
              We will display subscriber KPIs once fans begin supporting you or the next aggregation cycle completes.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(METRIC_LABELS) as MetricKey[]).map((metricKey) => {
              const Icon = METRIC_ICONS[metricKey];
              const summary =
                metricKey === "active_subscriptions"
                  ? summaries.active
                  : metricKey === "churned_fans"
                    ? summaries.churn
                    : summaries.gmv;
              const displayValue =
                metricKey === "fan_revenue_cents"
                  ? formatCurrencyFromCents(summary.current)
                  : formatNumber(summary.current);

              return (
                <Card key={metricKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {METRIC_LABELS[metricKey]}
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div
                      className="text-2xl font-bold"
                      data-testid={`subscription-analytics-${metricKey}`}
                    >
                      {displayValue}
                    </div>
                    {renderTrend(summary)}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recurring Revenue</CardTitle>
                <CardDescription>Daily GMV captured from memberships and supporter activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis tickFormatter={(value) => `$${Math.round(value / 100)}`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrencyFromCents(value)}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="gmvCents"
                        stroke="hsl(var(--chart-1))"
                        fill="url(#gmvGradient)"
                        name="GMV"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscriber Health</CardTitle>
                <CardDescription>Balance subscriber growth with churn to understand retention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="activeSubscribers"
                        stroke="hsl(var(--chart-2))"
                        fill="hsl(var(--chart-2))"
                        fillOpacity={0.12}
                        name="Active"
                      />
                      <Area
                        type="monotone"
                        dataKey="churnedFans"
                        stroke="hsl(var(--chart-3))"
                        fill="hsl(var(--chart-3))"
                        fillOpacity={0.12}
                        name="Churned"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionAnalyticsModule;
