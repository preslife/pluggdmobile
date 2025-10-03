import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ReceiptViewer } from "@/components/ReceiptViewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, DownloadCloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setMeta } from "@/lib/seo";

interface OrderItem {
  id: string;
  product_id: string;
  kind?: string | null;
  quantity: number;
  price: number;
  creator_id?: string | null;
  title?: string | null;
  image_url?: string | null;
}

interface OrderSummary {
  order_id: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_provider?: string | null;
  paid_at?: string | null;
  shipping_address?: Record<string, unknown> | null;
  item_count: number;
  currency?: string | null;
  items?: OrderItem[];
}

const PAGE_SIZE = 10;

export default function AccountOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setMeta(
      "Order History — Pluggd",
      "Review and download receipts for every purchase you have made on Pluggd.",
      "/account/orders"
    );
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_orders_for_user', {
          p_user_id: user.id,
          p_limit: PAGE_SIZE + 1,
          p_offset: page * PAGE_SIZE,
        });

        if (error) throw error;

        if (!isMounted) return;

        const rows = (data || []) as OrderSummary[];
        setHasMore(rows.length > PAGE_SIZE);
        setOrders(rows.slice(0, PAGE_SIZE));
      } catch (err: any) {
        console.error('Failed to load orders', err);
        toast({
          title: "Unable to load orders",
          description: err.message || 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [user, page, toast]);

  const totals = useMemo(() => {
    const completed = orders.filter((order) => order.status === 'completed');
    const lifetime = completed.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    return {
      completedCount: completed.length,
      lifetimeValue: lifetime,
    };
  }, [orders]);

  const renderStatus = (status: string) => {
    const normalized = status?.toLowerCase?.() || 'pending';
    switch (normalized) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-destructive border-destructive/40">Refunded</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const renderShippingAddress = (address: Record<string, unknown> | null | undefined) => {
    if (!address) return null;
    const lines = Object.entries(address)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`);

    if (!lines.length) return null;

    return (
      <div className="text-sm text-muted-foreground space-y-1">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    );
  };

  const onPrev = () => setPage((p) => Math.max(0, p - 1));
  const onNext = () => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
            <p className="text-muted-foreground">
              Review your previous purchases, download receipts, and pick up digital items anytime.
            </p>
          </div>

          {!user && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign in required</AlertTitle>
              <AlertDescription>
                Please sign in to view your order history.
              </AlertDescription>
            </Alert>
          )}

          {user && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Total Completed Orders</CardTitle>
                  <CardDescription>Number of store orders marked as completed.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-semibold">{totals.completedCount}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lifetime Spend</CardTitle>
                  <CardDescription>Total value of completed store purchases.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-semibold">{formatCurrency(totals.lifetimeValue || 0)}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your most recent store transactions.</CardDescription>
              </div>
              {user && orders.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DownloadCloud className="h-4 w-4" />
                  Receipts are available for every order.
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-20 w-full" />
                      <Separator />
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    You haven’t completed any store purchases yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {orders.map((order) => (
                    <div key={order.order_id} className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg">
                              {formatCurrency(order.total_amount || 0, order.currency || 'GBP')}
                            </span>
                            {renderStatus(order.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Placed on {new Date(order.created_at).toLocaleString()}
                            {order.payment_provider && ` · Paid via ${order.payment_provider}`}
                          </div>
                          {order.paid_at && (
                            <div className="text-xs text-muted-foreground">
                              Paid at {new Date(order.paid_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ReceiptViewer
                            paymentId={order.order_id}
                            receiptType="order"
                            className="w-full sm:w-auto"
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h3>
                          <div className="space-y-3">
                            {(order.items || []).map((item) => (
                              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="font-medium">{item.title || 'Store item'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.kind ? item.kind.toUpperCase() : 'DIGITAL'} · Qty {item.quantity || 1}
                                  </div>
                                </div>
                                <div className="text-sm font-semibold">
                                  {formatCurrency((item.price || 0) * (item.quantity || 1), order.currency || 'GBP')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {renderShippingAddress(order.shipping_address)}
                      </div>

                      <Separator />
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Button variant="outline" disabled={page === 0} onClick={onPrev} className="w-full sm:w-auto">
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground text-center">
                      Page {page + 1}
                    </div>
                    <Button variant="outline" onClick={onNext} disabled={!hasMore} className="w-full sm:w-auto">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
