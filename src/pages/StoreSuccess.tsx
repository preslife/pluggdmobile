import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { logger } from "@/lib/logger";

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

  const handleInlineReleaseOpen = useCallback(() => {
    if (!releaseReceipt) return;
    void logger.userAction("store_success_open_release", "StoreSuccessPage", {
      releaseId: releaseReceipt.releaseId,
      source: "inline_button",
    });
    navigate(`/release/${releaseReceipt.releaseId}?purchased=true`);
  }, [navigate, releaseReceipt]);

  const handleExternalReleaseOpen = useCallback(() => {
    if (!releaseReceipt) return;
    void logger.userAction("store_success_open_release", "StoreSuccessPage", {
      releaseId: releaseReceipt.releaseId,
      source: "external_link",
    });
  }, [releaseReceipt]);

  useEffect(() => {
    if (!sessionId) {
      void logger.warn("store_success_missing_session", {
        component: "StoreSuccessPage",
      });
      setError("Missing session identifier. Please check your confirmation email for your receipt.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        void logger.info("store_success_fetch_start", {
          component: "StoreSuccessPage",
          sessionId,
        });
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, status, created_at, shipping_address, order_items(id, quantity, price, product_type, store_products(title, image_url)))")
          .eq("payment_id", sessionId)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          void logger.warn("store_success_order_missing", {
            component: "StoreSuccessPage",
            sessionId,
          });
          setError("We could not find your order. If you were charged, contact support with your Stripe receipt.");
          return;
        }

        void logger.info("store_success_fetch_success", {
          component: "StoreSuccessPage",
          sessionId,
          orderId: data.id,
          status: data.status,
          totalAmount: data.total_amount,
        });
        setOrder(data as unknown as OrderSummary);
        if (!cartCleared) {
          void logger.info("store_success_cart_cleared", {
            component: "StoreSuccessPage",
            sessionId,
            orderId: data.id,
          });
          clearCart();
          setCartCleared(true);
        }
      } catch (err: any) {
        const message = err?.message || "Unable to load your order summary.";
        const errorObject = err instanceof Error ? err : new Error(message);
        void logger.error("store_success_fetch_failed", {
          component: "StoreSuccessPage",
          sessionId,
        }, errorObject);
        setError(message);
        toast({ title: "Order lookup failed", description: message, variant: "destructive" });
      } finally {
        void logger.info("store_success_fetch_complete", {
          component: "StoreSuccessPage",
          sessionId,
        });
        setLoading(false);
      }
    };

    fetchOrder();
  }, [sessionId, clearCart, toast, cartCleared]);

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
    void logger.info("store_success_meta_initialized", {
      component: "StoreSuccessPage",
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedReceipt = sessionStorage.getItem("recentReleaseReceipt");
    if (storedReceipt) {
      try {
        const parsed = JSON.parse(storedReceipt) as ReleaseReceiptContext;
        const timestampMs = parsed.timestamp ? Date.parse(parsed.timestamp) : Date.now();
        const within24Hours = !Number.isNaN(timestampMs) ? Date.now() - timestampMs < 1000 * 60 * 60 * 24 : true;

        if (within24Hours && !releaseReceipt) {
          setReleaseReceipt(parsed);
          void logger.info("store_success_release_receipt_loaded", {
            component: "StoreSuccessPage",
            releaseId: parsed.releaseId,
            source: "session_storage",
          });
        }
      } catch (parseError) {
        console.warn("Failed to parse stored release receipt context", parseError);
        const errorObject = parseError instanceof Error ? parseError : new Error('Failed to parse release receipt');
        void logger.error("store_success_release_receipt_parse_failed", {
          component: "StoreSuccessPage",
        }, errorObject);
      } finally {
        sessionStorage.removeItem("recentReleaseReceipt");
      }
    }

    const releaseIdParam = searchParams.get("release_id");
    if (releaseIdParam && !releaseReceipt) {
      setReleaseReceipt({
        releaseId: releaseIdParam,
        title: "Your release",
      });
      void logger.info("store_success_release_receipt_loaded", {
        component: "StoreSuccessPage",
        releaseId: releaseIdParam,
        source: "query_param",
      });
    }
  }, [searchParams, releaseReceipt]);

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
                  <a
                    href={`/release/${releaseReceipt.releaseId}?purchased=true`}
                    onClick={handleExternalReleaseOpen}
                  >
                    Go to release download
                  </a>
                </Button>
                <Button variant="outline" onClick={handleInlineReleaseOpen}>
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
