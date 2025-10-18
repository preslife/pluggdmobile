import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { DashboardOrdersTable, type DashboardOrderSummary, type DashboardOrderItem } from "@/components/dashboard/DashboardOrdersTable";
import { setMeta } from "@/lib/seo";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Package, ShoppingBag } from "lucide-react";

const normaliseItems = (items: unknown): DashboardOrderItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return {
        id: typeof record.id === "string" ? record.id : undefined,
        title: typeof record.title === "string" ? record.title : null,
        quantity: typeof record.quantity === "number" ? record.quantity : null,
        price: typeof record.price === "number" ? record.price : null,
      } satisfies DashboardOrderItem;
    }
    return {} as DashboardOrderItem;
  });
};

type RpcOrder = Database["public"]["Functions"]["get_orders_for_user"]["Returns"][number];

const transformOrder = (order: RpcOrder): DashboardOrderSummary => ({
  order_id: order.order_id,
  created_at: order.created_at,
  status: order.status,
  total_amount: order.total_amount,
  currency: order.currency,
  item_count: order.item_count,
  items: normaliseItems(order.items as unknown[] | undefined),
  payment_provider: order.payment_provider,
  paid_at: order.paid_at,
});

const OrdersPurchasesPage = () => {
  const { user } = useAuth();

  useEffect(() => {
    setMeta(
      "Orders & purchases — Pluggd",
      "Review your PLGD orders, track fulfilment status, and revisit download links.",
      "/dashboard/orders"
    );
  }, []);

  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboard", "orders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_orders_for_user", {
        p_user_id: user!.id,
        p_limit: 25,
      });

      if (error) throw error;
      const raw = (data as RpcOrder[]) ?? [];
      return raw.map(transformOrder);
    },
  });

  const ordersList = useMemo(() => orders ?? [], [orders]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Orders & purchases</h1>
                <p className="text-muted-foreground">
                  Access receipts, fulfilment updates, and digital downloads from the PLGD marketplace.
                </p>
              </div>
            </div>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6" data-testid="orders-error">
            <AlertTitle>Unable to load orders</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : "Please try again in a moment."}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Fetching orders
              </CardTitle>
              <CardDescription>We are contacting Supabase for your recent activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : ordersList.length > 0 ? (
          <DashboardOrdersTable orders={ordersList} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>You're all set</CardTitle>
              <CardDescription>No purchases have been made with this account yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse the store to discover beats, sample packs, and creator memberships. New purchases will show up here
                instantly along with fulfilment details.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default OrdersPurchasesPage;
