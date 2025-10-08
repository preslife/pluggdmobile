import React, { useEffect, useState } from "react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track ticketing performance, reminder coverage, and recording publishing in one view.
          </p>
        </div>
      </div>

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
