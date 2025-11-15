import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  BarChart3,
  Workflow,
  Globe,
  PieChart,
  TrendingUp,
  ArrowUpRight,
  Users,
  Play,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { InsightsModule } from "./InsightsModule";

interface KpiDailyRow {
  metric_date: string;
  kpi_key: string;
  total_value: number;
  attribution_source?: string | null;
  attribution_medium?: string | null;
  attribution_campaign?: string | null;
  post_id?: string | null;
  content_type?: string | null;
  content_id?: string | null;
}

interface AttributionRow {
  key: string;
  label: string;
  views: number;
  plays: number;
  revenueCents: number;
  conversionRate: number | null;
  revenuePerViewCents: number | null;
}

interface LiveAnalyticsMetrics {
  ticketRevenue: number;
  ticketsSold: number;
  upcomingSessions: number;
  publishedRecordings: number;
  averageTicketPrice: number;
  recordingsPublishedThisMonth: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value / 100);
};

const summarizeKpis = (rows: KpiDailyRow[]) => {
  return rows.reduce(
    (acc, row) => {
      const value = Number(row.total_value ?? 0);
      if (!Number.isFinite(value)) {
        return acc;
      }

      switch (row.kpi_key) {
        case "total_views":
          acc.totalViews += value;
          break;
        case "total_streams":
          acc.totalStreams += value;
          break;
        case "fan_revenue_cents":
          acc.fanRevenueCents += value;
          break;
        case "event_revenue_cents":
          acc.eventRevenueCents += value;
          break;
        case "battle_revenue_cents":
          acc.battleRevenueCents += value;
          break;
      }

      return acc;
    },
    {
      totalViews: 0,
      totalStreams: 0,
      fanRevenueCents: 0,
      eventRevenueCents: 0,
      battleRevenueCents: 0,
    },
  );
};

const buildAttributionRows = (rows: KpiDailyRow[]): AttributionRow[] => {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      views: number;
      plays: number;
      revenueCents: number;
    }
  >();

  for (const row of rows) {
    const value = Number(row.total_value ?? 0);
    if (!Number.isFinite(value)) continue;

    const keyParts = [
      row.post_id ? `post:${row.post_id}` : null,
      row.attribution_source ? `src:${row.attribution_source}` : null,
      row.content_type ? `type:${row.content_type}` : null,
    ].filter(Boolean);

    const key = keyParts.join("|") || row.kpi_key || "unattributed";
    const labelSegments = [
      row.attribution_source,
      row.attribution_medium,
      row.content_type,
      row.post_id ? `post ${row.post_id.slice(0, 6)}` : null,
    ].filter(Boolean);
    const label = labelSegments.join(" • ") || "Organic / Unknown";

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label,
        views: 0,
        plays: 0,
        revenueCents: 0,
      });
    }

    const bucket = buckets.get(key)!;
    switch (row.kpi_key) {
      case "total_views":
        bucket.views += value;
        break;
      case "total_streams":
        bucket.plays += value;
        break;
      case "fan_revenue_cents":
      case "event_revenue_cents":
      case "battle_revenue_cents":
        bucket.revenueCents += value;
        break;
    }
  }

  return Array.from(buckets.values())
    .filter((bucket) => bucket.views > 0 || bucket.plays > 0 || bucket.revenueCents > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      views: bucket.views,
      plays: bucket.plays,
      revenueCents: bucket.revenueCents,
      conversionRate: bucket.views > 0 ? (bucket.plays / bucket.views) * 100 : null,
      revenuePerViewCents: bucket.views > 0 ? bucket.revenueCents / bucket.views : null,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
};

export const AnalyticsModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<LiveAnalyticsMetrics>({
    ticketRevenue: 0,
    ticketsSold: 0,
    upcomingSessions: 0,
    publishedRecordings: 0,
    averageTicketPrice: 0,
    recordingsPublishedThisMonth: 0,
  });
  const [loading, setLoading] = useState(false);
  const [kpiRows, setKpiRows] = useState<KpiDailyRow[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const kpiSummary = useMemo(() => summarizeKpis(kpiRows), [kpiRows]);
  const attributionRows = useMemo(() => buildAttributionRows(kpiRows), [kpiRows]);
  const attributedRevenueCents =
    kpiSummary.fanRevenueCents + kpiSummary.eventRevenueCents + kpiSummary.battleRevenueCents;
  const hasAttributionData =
    kpiRows.length > 0 &&
    (kpiSummary.totalViews > 0 || kpiSummary.totalStreams > 0 || attributedRevenueCents > 0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const [ticketRes, sessionRes, recordingRes] = await Promise.all([
          supabase
            .from("live_tickets")
            .select("price_cents, status")
            .eq("host_id", user.id),
          supabase
            .from("sessions")
            .select("id, scheduled_at, status")
            .eq("host_id", user.id),
          supabase
            .from("recordings")
            .select("id, published_at, created_at")
            .eq("host_id", user.id),
        ]);

        if (ticketRes.error) throw ticketRes.error;
        if (sessionRes.error) throw sessionRes.error;
        if (recordingRes.error) throw recordingRes.error;

        const ticketRows = ticketRes.data ?? [];
        const revenueCents = ticketRows.reduce((acc, ticket) => {
          if (ticket.status === "refunded") return acc;
          const price = Number(ticket.price_cents ?? 0);
          return acc + (price > 0 ? price : 0);
        }, 0);

        const totalTickets = ticketRows.length;
        const averageTicketPrice = totalTickets > 0 ? revenueCents / totalTickets : 0;

        const now = Date.now();
        const upcomingSessions = (sessionRes.data ?? []).filter((session) => {
          if (!session.scheduled_at) return false;
          const scheduled = new Date(session.scheduled_at).getTime();
          return scheduled >= now && session.status !== "cancelled";
        }).length;

        const recordings = recordingRes.data ?? [];
        const publishedRecordings = recordings.filter((recording) => recording.published_at).length;
        const recordingsPublishedThisMonth = recordings.filter((recording) => {
          if (!recording.published_at) return false;
          const published = new Date(recording.published_at);
          const today = new Date();
          return published.getFullYear() === today.getFullYear() && published.getMonth() === today.getMonth();
        }).length;

        setMetrics({
          ticketRevenue: revenueCents,
          ticketsSold: totalTickets,
          upcomingSessions,
          publishedRecordings,
          averageTicketPrice,
          recordingsPublishedThisMonth,
        });
      } catch (error) {
        console.error("[AnalyticsModule] Failed to load metrics", error);
        toast({
          title: "Unable to load analytics",
          description: "We couldn't fetch live ticket or recording metrics.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, [user?.id, toast]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAttribution = async () => {
      setKpiLoading(true);
      try {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const startDate = start.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("creator_kpi_daily_personal")
          .select(
            "metric_date, kpi_key, total_value, attribution_source, attribution_medium, attribution_campaign, post_id, content_type, content_id"
          )
          .gte("metric_date", startDate)
          .order("metric_date", { ascending: true });

        if (error) throw error;

        const normalized =
          (data ?? []).map((row) => ({
            metric_date: row.metric_date,
            kpi_key: row.kpi_key,
            total_value: Number(row.total_value ?? 0),
            attribution_source: row.attribution_source,
            attribution_medium: row.attribution_medium,
            attribution_campaign: row.attribution_campaign,
            post_id: row.post_id,
            content_type: row.content_type,
            content_id: row.content_id,
          })) ?? [];

        setKpiRows(normalized);
      } catch (error) {
        console.error("[AnalyticsModule] Failed to load KPI attribution", error);
        toast({
          title: "Unable to load attribution",
          description: "We couldn't fetch KPI rollups right now. Try again later.",
          variant: "destructive",
        });
      } finally {
        setKpiLoading(false);
      }
    };

    void fetchAttribution();
  }, [user?.id, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Monitor key audience KPIs alongside live session performance, reminders, and recordings in one place.
          </p>
      </div>
      </div>

      <InsightsModule />

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Attribution & ROI</h2>
            <p className="text-sm text-muted-foreground">
              Closed-loop metrics from creator_kpi_daily_personal showing views → plays → revenue.
            </p>
          </div>
          {kpiLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        {hasAttributionData ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Attributed views (30d)</p>
                  <p className="text-2xl font-semibold">{kpiSummary.totalViews.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Streams / plays (30d)</p>
                  <p className="text-2xl font-semibold">{kpiSummary.totalStreams.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Attributed revenue</p>
                  <p className="text-2xl font-semibold">{formatCurrency(attributedRevenueCents)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Top channel</p>
                  <p className="text-2xl font-semibold">
                    {attributionRows[0]?.label ?? "Organic / Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attributionRows[0]
                      ? `${attributionRows[0].views.toLocaleString()} views`
                      : "Awaiting activity"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Post & UTM attribution</CardTitle>
                <CardDescription>Track how social pushes convert to plays and revenue.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-4 font-medium">Source / Post</th>
                      <th className="py-2 pr-4 font-medium">Views</th>
                      <th className="py-2 pr-4 font-medium">Plays</th>
                      <th className="py-2 pr-4 font-medium">Revenue</th>
                      <th className="py-2 pr-4 font-medium">Conversion</th>
                      <th className="py-2 font-medium">Rev / View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributionRows.map((row) => (
                      <tr key={row.key} className="border-b last:border-none">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{row.label}</p>
                          <p className="text-xs text-muted-foreground">{row.key}</p>
                        </td>
                        <td className="py-2 pr-4">{row.views.toLocaleString()}</td>
                        <td className="py-2 pr-4">{row.plays.toLocaleString()}</td>
                        <td className="py-2 pr-4">{formatCurrency(row.revenueCents)}</td>
                        <td className="py-2 pr-4">
                          {row.conversionRate !== null ? `${row.conversionRate.toFixed(1)}%` : "–"}
                        </td>
                        <td className="py-2">
                          {row.revenuePerViewCents !== null
                            ? formatCurrency(row.revenuePerViewCents)
                            : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Attribution data will populate after your connected channels begin delivering events. Publish
              via Plug-ins or sync Spotify/YouTube to start the closed-loop pipeline.
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Live Ticket Revenue
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ticketRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span>Avg. ticket {formatCurrency(metrics.averageTicketPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Tickets Sold
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.ticketsSold.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <Play className="w-3 h-3" />
              <span>Reminders queue automatically per attendee.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Published Recordings
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.publishedRecordings}</div>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span>{metrics.recordingsPublishedThisMonth} this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="plays" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Recordings
          </TabsTrigger>
          <TabsTrigger value="funnels" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Funnels
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Sources/UTM
          </TabsTrigger>
          <TabsTrigger value="post-roi" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Post ROI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ticket revenue</CardTitle>
                <CardDescription>Breakdown of ticket types and reminder coverage</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-48 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculating…
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border p-4">
                      <p className="text-sm font-medium">Total revenue</p>
                      <p className="text-2xl font-semibold">{formatCurrency(metrics.ticketRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Pricing updates from the live module enforce seat caps and refunds automatically.
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-sm font-medium">Upcoming sessions</p>
                      <p className="text-2xl font-semibold">{metrics.upcomingSessions}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Reminder queues refresh whenever sessions are created or updated.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket summary</CardTitle>
                <CardDescription>Snapshot of live session attendance and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm text-muted-foreground">Tickets sold</span>
                    <span className="text-sm font-semibold">{metrics.ticketsSold}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm text-muted-foreground">Average ticket price</span>
                    <span className="text-sm font-semibold">{formatCurrency(metrics.averageTicketPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm text-muted-foreground">Published recordings</span>
                    <span className="text-sm font-semibold">{metrics.publishedRecordings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plays" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recording engagement</CardTitle>
              <CardDescription>Monitor recordings that were automatically published after sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Recording engagement charts will render here once watch metrics are available.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnels</CardTitle>
              <CardDescription>Track user journey from discovery to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Funnel visualization would be shown here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>See where your audience is coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Source tracking and UTM analytics would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="post-roi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post ROI</CardTitle>
              <CardDescription>Measure the impact of your posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                ROI analytics will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
