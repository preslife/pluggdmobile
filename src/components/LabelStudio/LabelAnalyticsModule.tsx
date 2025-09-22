import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TrendingUp, Calendar, PieChart, DollarSign } from "lucide-react";

type CatalogRow = {
  id: string;
  title: string;
  type: "release" | "beat";
  price: number | null;
  status?: string | null;
  total_plays?: number | null;
  created_at: string;
  release_date?: string | null;
};

type MetricsState = {
  totalItems: number;
  liveReleases: number;
  upcomingRelease?: string | null;
  totalStreams: number;
  averagePrice: number;
};

const asNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export default function LabelAnalyticsModule() {
  const { label: activeLabel, loading: labelLoading } = useActiveLabel();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsState>({
    totalItems: 0,
    liveReleases: 0,
    upcomingRelease: undefined,
    totalStreams: 0,
    averagePrice: 0,
  });

  useEffect(() => {
    if (!labelLoading && activeLabel?.id) {
      fetchAnalytics(activeLabel.id);
    }
  }, [activeLabel?.id, labelLoading]);

  const fetchAnalytics = async (labelId: string) => {
    setLoading(true);
    try {
      const releasesRes = await supabase
        .from("releases")
        .select("id, title, price, status, total_plays, created_at, release_date")
        .eq("owner_type", "label")
        .eq("owner_id", labelId);

      if (releasesRes.error) throw releasesRes.error;

      const releases: CatalogRow[] = (releasesRes.data || []).map((row) => ({
        id: row.id,
        title: row.title,
        type: "release",
        price: row.price,
        status: row.status,
        total_plays: row.total_plays,
        created_at: row.created_at,
        release_date: row.release_date,
      }));

      let beats: CatalogRow[] = [];
      const beatsRes = await supabase
        .from("beats")
        .select("id, title, price, total_plays, created_at, status, owner_type, owner_id")
        .eq("owner_type", "label")
        .eq("owner_id", labelId);

      if (!beatsRes.error) {
        beats = (beatsRes.data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          type: "beat" as const,
          price: row.price,
          total_plays: row.total_plays,
          status: row.status,
          created_at: row.created_at,
        }));
      } else if (beatsRes.error.code !== "42703") {
        throw beatsRes.error;
      }

      const combined = [...releases, ...beats];
      setCatalog(combined);

      const totalStreams = combined.reduce((sum, item) => sum + asNumber(item.total_plays), 0);
      const pricedItems = combined.filter((item) => asNumber(item.price) > 0);
      const avgPrice = pricedItems.length
        ? pricedItems.reduce((sum, item) => sum + asNumber(item.price), 0) / pricedItems.length
        : 0;

      const liveReleases = releases.filter((release) => {
        if (release.status === "live" || release.status === "published") return true;
        if (release.release_date) {
          const releaseDate = new Date(release.release_date);
          return releaseDate <= new Date();
        }
        return false;
      }).length;

      const upcomingRelease = releases
        .filter((release) => release.release_date && new Date(release.release_date) > new Date())
        .sort((a, b) => new Date(a.release_date || 0).getTime() - new Date(b.release_date || 0).getTime())[0]
        ?.title;

      setMetrics({
        totalItems: combined.length,
        liveReleases,
        upcomingRelease: upcomingRelease || null,
        totalStreams,
        averagePrice: avgPrice,
      });
    } catch (err: any) {
      toast({
        title: "Unable to load analytics",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const topPerformers = useMemo(() => {
    return [...catalog]
      .sort((a, b) => asNumber(b.total_plays) - asNumber(a.total_plays))
      .slice(0, 5);
  }, [catalog]);

  if (labelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading analytics…</div>
      </div>
    );
  }

  if (!activeLabel) {
    return <div className="text-muted-foreground">Select a label to view analytics.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Analytics</h2>
          <p className="text-muted-foreground">
            Snapshot of catalog performance and engagement for {activeLabel.name || activeLabel.slug}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Total streams
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.totalStreams.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Catalog items
            </CardTitle>
            <CardDescription>{metrics.liveReleases} live releases</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.totalItems}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Avg. price
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {metrics.averagePrice > 0 ? `$${metrics.averagePrice.toFixed(2)}` : "Free"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Next release
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {metrics.upcomingRelease ? metrics.upcomingRelease : "Nothing scheduled"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top performers</CardTitle>
          <CardDescription>Most streamed releases and beats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topPerformers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No streaming data yet.</p>
          ) : (
            topPerformers.map((item) => {
              const plays = asNumber(item.total_plays);
              const progress = metrics.totalStreams ? Math.min(100, Math.round((plays / metrics.totalStreams) * 100)) : 0;
              return (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={item.type === "beat" ? "border-blue-500 text-blue-500" : "border-purple-500 text-purple-500"}>
                        {item.type}
                      </Badge>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <span className="text-muted-foreground">{plays.toLocaleString()} streams</span>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent catalog activity</CardTitle>
          <CardDescription>Latest items added to the label roster.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...catalog]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6)
            .map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={item.type === "beat" ? "border-blue-500 text-blue-500" : "border-purple-500 text-purple-500"}>
                    {item.type}
                  </Badge>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-muted-foreground text-xs">
                      Added {format(new Date(item.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground text-xs flex flex-col items-end">
                  <span>{asNumber(item.total_plays).toLocaleString()} streams</span>
                  {item.price ? <span>${asNumber(item.price).toFixed(2)}</span> : <span>Free</span>}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

