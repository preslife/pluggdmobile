import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";
import { useLogger } from "@/hooks/useLogger";

type OrderItemSummary = {
  id: string;
  quantity: number;
  price: number;
  product_type?: string | null;
  store_products?: {
    title?: string | null;
    image_url?: string | null;
  } | null;
};

type OrderSummary = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address: Record<string, unknown> | null;
  order_items: OrderItemSummary[];
};

type ReleaseReceiptContext = {
  releaseId: string;
  title: string;
  artist?: string;
  checkoutUrl?: string;
  timestamp?: string;
};

const StoreSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  const [releaseReceipt, setReleaseReceipt] = useState<ReleaseReceiptContext | null>(null);

  const loggerMetadata = useMemo(() => ({ sessionId }), [sessionId]);
  const { logEvent, logError, logUserAction } = useLogger({
    component: 'StoreSuccessPage',
    feature: 'commerce',
    view: 'store-success',
    metadata: loggerMetadata,
  });

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session identifier. Please check your confirmation email for your receipt.");
      setLoading(false);
      void logError('store_success_missing_session', new Error('missing_session_id'), {
        searchParams: Object.fromEntries(searchParams.entries()),
      });
      return;
    }

    const fetchOrder = async () => {
      let resolvedOrderId: string | null = null;
      let resolvedHasOrder = false;
      try {
        setLoading(true);
        void logEvent('store_success_order_fetch_start', { sessionId });
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, status, created_at, shipping_address, order_items(id, quantity, price, product_type, store_products(title, image_url)))")
          .eq("payment_id", sessionId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          setError("We could not find your order. If you were charged, contact support with your Stripe receipt.");
          void logEvent('store_success_order_not_found', { sessionId });
          return;
        }

        const orderSummary = data as unknown as OrderSummary;
        resolvedOrderId = orderSummary.id;
        resolvedHasOrder = true;
        setOrder(orderSummary);
        void logEvent('store_success_order_fetch_success', {
          sessionId,
          orderId: orderSummary.id,
          status: orderSummary.status,
          total: orderSummary.total_amount,
        });

        if (!cartCleared) {
          clearCart();
          setCartCleared(true);
          void logEvent('store_success_cart_cleared', {
            sessionId,
            orderId: orderSummary.id,
          });
        }
      } catch (err: any) {
        const message = err?.message || "Unable to load your order summary.";
        setError(message);
        toast({ title: "Order lookup failed", description: message, variant: "destructive" });
        void logError('store_success_order_fetch_failed', err, { sessionId });
      } finally {
        setLoading(false);
        void logEvent('store_success_order_fetch_complete', {
          sessionId,
          orderId: resolvedOrderId,
          hasOrder: resolvedHasOrder,
        });
      }
    };

    fetchOrder();
  }, [sessionId, clearCart, toast, cartCleared, logEvent, logError, searchParams]);

  const heading = useMemo(() => {
    if (loading) return "Processing your order";
    if (error) return "We couldn't confirm your purchase";
    return "Your order is confirmed";
  }, [loading, error]);

  useEffect(() => {
    setMeta(
      "Order Confirmed — Pluggd Store",
      "We've emailed your receipt and unlocked your downloads. Head to your library or order history to manage purchases.",
      "/store/success"
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedReceipt = sessionStorage.getItem("recentReleaseReceipt");
    if (storedReceipt) {
      try {
        const parsed = JSON.parse(storedReceipt) as ReleaseReceiptContext;
        const timestampMs = parsed.timestamp ? Date.parse(parsed.timestamp) : Date.now();
        const within24Hours = !Number.isNaN(timestampMs) ? Date.now() - timestampMs < 1000 * 60 * 60 * 24 : true;

        if (within24Hours) {
          setReleaseReceipt((current) => current ?? parsed);
          void logEvent('store_success_release_receipt_restored', {
            releaseId: parsed.releaseId,
            source: 'sessionStorage',
          });
        } else {
          void logEvent('store_success_release_receipt_discarded', {
            releaseId: parsed.releaseId,
            reason: 'stale',
            source: 'sessionStorage',
          });
        }
      } catch (parseError) {
        console.warn("Failed to parse stored release receipt context", parseError);
        void logError('store_success_release_receipt_parse_failed', parseError, { source: 'sessionStorage' });
      } finally {
        sessionStorage.removeItem("recentReleaseReceipt");
        void logEvent('store_success_release_receipt_cleared', { source: 'sessionStorage' });
      }
    }

    const releaseIdParam = searchParams.get("release_id");
    if (releaseIdParam && !releaseReceipt) {
      setReleaseReceipt({
        releaseId: releaseIdParam,
        title: "Your release",
      });
      void logEvent('store_success_release_receipt_from_query', { releaseId: releaseIdParam });
    }
  }, [searchParams, releaseReceipt, logEvent, logError]);

  return (
    <div className="min-h-[60vh] px-4 py-16 flex flex-col items-center bg-background">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            {loading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : error ? (
              <Package className="h-12 w-12 text-destructive" />
            ) : (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-muted-foreground">
            {loading && "Hang tight while we confirm your payment with Stripe."}
            {!loading && !error && (
              releaseReceipt
                ? "We've emailed your receipt. Use the download shortcut below or visit your library anytime."
                : "We've emailed your receipt. Download links unlock immediately in your library."
            )}
            {!loading && error && "Refresh the page or reach out to support if the charge completed."}
          </p>
        </div>

        {releaseReceipt && (
          <Card>
            <CardHeader>
              <CardTitle>Access your download</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {releaseReceipt.title}
                {releaseReceipt.artist ? ` — ${releaseReceipt.artist}` : ''}
              </p>
              <p className="text-xs">
                Your purchase is unlocked instantly. Follow the link below to open the release page and start a secure download.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={`/release/${releaseReceipt.releaseId}?purchased=true`}>
                    Go to release download
                  </a>
                </Button>
                <Button variant="outline" onClick={() => navigate(`/release/${releaseReceipt.releaseId}?purchased=true`)}>
                  View in this window
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Verifying payment…</span>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && order && (
              <div className="space-y-6">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs">{order.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize font-medium">{order.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Placed</span>
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total charged</span>
                    <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Items</h2>
                  <div className="space-y-3">
                    {order.order_items?.length ? (
                      order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          {item.store_products?.image_url ? (
                            <img
                              src={item.store_products.image_url}
                              alt={item.store_products.title ?? "Product thumbnail"}
                              className="h-14 w-14 rounded-md object-cover border"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.store_products?.title ?? "Store item"}</p>
                            <p className="text-xs text-muted-foreground uppercase">{item.product_type ?? "digital"}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No line items recorded yet. This can take a few seconds.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate("/store")}>Return to Store</Button>
          <Button variant="outline" onClick={() => navigate("/account/orders")}>View Order History</Button>
          <Button onClick={() => navigate("/library")}>Go to Library</Button>
        </div>
      </div>
    </div>
  );
};

export default StoreSuccess;
