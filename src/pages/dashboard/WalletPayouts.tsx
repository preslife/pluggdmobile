import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { DashboardWalletSummary } from "@/components/dashboard/DashboardWalletSummary";
import { DashboardPayoutHistory, type PayoutRecord } from "@/components/dashboard/DashboardPayoutHistory";
import { WalletCashOut } from "@/components/WalletCashOut";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setMeta } from "@/lib/seo";
import { Wallet, Landmark } from "lucide-react";

const WalletPayoutsPage = () => {
  const { user } = useAuth();

  useEffect(() => {
    setMeta(
      "Wallet & payouts — Pluggd",
      "View your PLGD Credits balance, request cash-outs, and track payout transfers.",
      "/dashboard/payouts"
    );
  }, []);

  const {
    data: payoutHistory,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["dashboard", "payouts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_records")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as PayoutRecord[]) ?? [];
    },
  });

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
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Wallet & payouts</h1>
                <p className="text-muted-foreground">
                  Monitor wallet balances, request cash-outs, and review royalties you've received.
                </p>
              </div>
            </div>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6" data-testid="payouts-error">
            <AlertTitle>Unable to load payouts</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : "Please try again later."}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-8">
          <DashboardWalletSummary />

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <DashboardPayoutHistory payouts={payoutHistory ?? []} isLoading={isLoading} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Cash out to your bank
                </CardTitle>
                <CardDescription>Send available PLGD Credits to your preferred payout destination.</CardDescription>
              </CardHeader>
              <CardContent>
                <WalletCashOut />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WalletPayoutsPage;
