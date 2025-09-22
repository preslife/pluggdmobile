import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, RefreshCw } from "lucide-react";

type StripeState = {
  stripe_account_id: string | null;
  onboarding_complete: boolean | null;
  requirements: Record<string, unknown> | null;
  updated_at: string | null;
};

type CatalogRevenue = {
  id: string;
  title: string;
  type: "release" | "beat";
  price: number;
  estimatedStreams: number;
  estimatedRevenue: number;
};

const asNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const exportFinancials = (rows: CatalogRevenue[]) => {
  if (!rows.length) return;
  const headers = ['Title', 'Type', 'Price', 'Estimated Streams', 'Estimated Revenue'];
  const csv = [
    headers.join(','),
    ...rows.map((row) => [
      row.title,
      row.type,
      asNumber(row.price).toString(),
      asNumber(row.estimatedStreams).toString(),
      asNumber(row.estimatedRevenue).toString(),
    ].join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'label-financials.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export default function LabelFinancialsModule() {
  const { label: activeLabel, loading: labelLoading } = useActiveLabel();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stripeState, setStripeState] = useState<StripeState | null>(null);
  const [catalog, setCatalog] = useState<CatalogRevenue[]>([]);

  const fetchFinancials = async () => {
    if (!activeLabel?.id) return;
    setLoading(true);
    try {
      const [stripeRes, releasesRes] = await Promise.all([
        supabase
          .from("label_stripe_accounts")
          .select("stripe_account_id, onboarding_complete, requirements, updated_at")
          .eq("label_id", activeLabel.id)
          .maybeSingle(),
        supabase
          .from("releases")
          .select("id, title, price, total_plays, owner_type, owner_id")
          .eq("owner_type", "label")
          .eq("owner_id", activeLabel.id),
      ]);

      if (stripeRes.data) {
        setStripeState(stripeRes.data as StripeState);
      } else {
        setStripeState(null);
      }

      if (releasesRes.error) throw releasesRes.error;

      let beatRows: CatalogRevenue[] = [];
      const beatsRes = await supabase
        .from("beats")
        .select("id, title, price, total_plays, owner_type, owner_id")
        .eq("owner_type", "label")
        .eq("owner_id", activeLabel.id);

      if (!beatsRes.error) {
        beatRows = (beatsRes.data || []).map((beat: any) => {
          const price = asNumber(beat.price);
          const streams = asNumber(beat.total_plays);
          return {
            id: beat.id,
            title: beat.title,
            type: "beat" as const,
            price,
            estimatedStreams: streams,
            estimatedRevenue: price * streams,
          };
        });
      }

      const releaseRows: CatalogRevenue[] = (releasesRes.data || []).map((release: any) => {
        const price = asNumber(release.price);
        const streams = asNumber(release.total_plays);
        return {
          id: release.id,
          title: release.title,
          type: "release" as const,
          price,
          estimatedStreams: streams,
          estimatedRevenue: price * streams,
        };
      });

      setCatalog([...releaseRows, ...beatRows]);
    } catch (err: any) {
      toast({
        title: "Unable to load financial data",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!labelLoading && activeLabel?.id) {
      fetchFinancials();
    }
  }, [activeLabel?.id, labelLoading]);

  const totals = useMemo(() => {
    if (!catalog.length) {
      return {
        catalogValue: 0,
        estimatedRevenue: 0,
        pricedItems: 0,
        freeItems: 0,
      };
    }
    const priced = catalog.filter((item) => asNumber(item.price) > 0);
    const free = catalog.length - priced.length;
    const catalogValue = priced.reduce((sum, item) => sum + asNumber(item.price), 0);
    const estimatedRevenue = catalog.reduce((sum, item) => sum + asNumber(item.estimatedRevenue), 0);
    return {
      catalogValue,
      estimatedRevenue,
      pricedItems: priced.length,
      freeItems: free,
    };
  }, [catalog]);

  if (labelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading financials…</div>
      </div>
    );
  }

  if (!activeLabel) {
    return <div className="text-muted-foreground">Select a label to review financials.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Financials</h2>
          <p className="text-muted-foreground">
            Monitor Stripe onboarding, catalog value, and estimated revenue for {activeLabel.name || activeLabel.slug}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchFinancials}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportFinancials(catalog)} disabled={!catalog.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Stripe status
            </CardTitle>
            <CardDescription>
              {stripeState
                ? `Last update ${stripeState.updated_at ? new Date(stripeState.updated_at).toLocaleDateString() : "—"}`
                : "No Stripe account configured"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stripeState ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={stripeState.onboarding_complete ? "default" : "destructive"}>
                    {stripeState.onboarding_complete ? "Onboarding complete" : "Action required"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {stripeState.stripe_account_id || "No account ID"}
                  </span>
                </div>
                {!stripeState.onboarding_complete && stripeState.requirements && (
                  <div className="rounded-md border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
                    Additional Stripe requirements outstanding.
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Connect Stripe to enable payouts.</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Priced catalog value</CardTitle>
            <CardDescription>Sum of list prices across priced items.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.catalogValue)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estimated revenue</CardTitle>
            <CardDescription>Price × reported plays (approximation).</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(totals.estimatedRevenue)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Catalog mix</CardTitle>
            <CardDescription>{totals.pricedItems} priced · {totals.freeItems} free</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Priced items</span>
                <Badge variant="secondary">{totals.pricedItems}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Free items</span>
                <Badge variant="outline">{totals.freeItems}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog revenue snapshot</CardTitle>
          <CardDescription>Indexed by list price and reported streams.</CardDescription>
        </CardHeader>
        <CardContent>
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No catalog items yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Streams</TableHead>
                  <TableHead className="text-right">Est. revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...catalog]
                  .sort((a, b) => asNumber(b.estimatedRevenue) - asNumber(a.estimatedRevenue))
                  .slice(0, 8)
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === "beat" ? "secondary" : "outline"}>{item.type}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(asNumber(item.price))}</TableCell>
                      <TableCell className="text-right">{asNumber(item.estimatedStreams).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(asNumber(item.estimatedRevenue))}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

