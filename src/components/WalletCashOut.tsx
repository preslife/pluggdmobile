import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCredits, creditsToGBP, formatCreditsWithGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useLogger } from "@/hooks/useLogger";
import { Download, AlertTriangle, CheckCircle, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const WalletCashOut = () => {
  const { balance, cashOutCredits, ledger } = useWallet();
  const { user } = useAuth();
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectActionLoading, setConnectActionLoading] = useState(false);
  const [tierInfo, setTierInfo] = useState<{ commission_rate?: number; tier_name?: string } | null>(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    onboarding_complete: boolean;
    payouts_enabled: boolean;
    compliance_hold_reason?: string | null;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { logEvent, logError } = useLogger({
    component: "WalletCashOut",
    feature: "wallet",
    view: "wallet_dashboard",
    metadata: { user_id: user?.id ?? null },
  });
  const { t, formatCurrency } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setTierInfo(null);
      return;
    }

    setTierLoading(true);
    supabase
      .rpc('get_user_tier_limits', { user_id: user.id })
      .then(({ data, error }) => {
        if (error) {
          void logError('wallet_cashout_tier_fetch_failed', error, { user_id: user.id });
          return;
        }
        setTierInfo(data as any);
      })
      .finally(() => setTierLoading(false));
  }, [user?.id, logError]);

  useEffect(() => {
    if (!user?.id) {
      setStripeStatus(null);
      return;
    }

    setStripeLoading(true);
    supabase
      .from('producer_stripe_accounts')
      .select('onboarding_complete, payouts_enabled, compliance_hold_reason')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          void logError('wallet_cashout_stripe_status_failed', error, { user_id: user.id });
          return;
        }
        setStripeStatus(
          data
            ? {
                onboarding_complete: Boolean(data.onboarding_complete),
                payouts_enabled: Boolean(data.payouts_enabled),
                compliance_hold_reason: data.compliance_hold_reason ?? null,
              }
            : { onboarding_complete: false, payouts_enabled: false },
        );
      })
      .finally(() => setStripeLoading(false));
  }, [user?.id, logError]);

  const cashOutEntries = useMemo(
    () => (ledger || []).filter((entry) => entry.kind === "convert_cashout"),
    [ledger]
  );

  const cashOutStats = useMemo(() => {
    if (!cashOutEntries.length) {
      return {
        totalCredits: 0,
        totalNetPence: 0,
        lastCashOut: null as (typeof cashOutEntries)[number] | null,
      };
    }

    const totalCredits = cashOutEntries.reduce(
      (sum, entry) => sum + Math.abs(entry.amount_credits),
      0
    );

    const totalNetPence = cashOutEntries.reduce((sum, entry) => {
      const net = typeof entry.meta?.net_amount_pence === "number" ? entry.meta.net_amount_pence : 0;
      return sum + net;
    }, 0);

    return {
      totalCredits,
      totalNetPence,
      lastCashOut: cashOutEntries[0] ?? null,
    };
  }, [cashOutEntries]);

  const recentCashOuts = useMemo(
    () =>
      cashOutEntries.slice(0, 5).map((entry) => ({
        id: entry.id,
        createdAt: entry.created_at,
        credits: Math.abs(entry.amount_credits),
        grossPence: typeof entry.meta?.gross_amount_pence === "number" ? entry.meta.gross_amount_pence : null,
        netPence: typeof entry.meta?.net_amount_pence === "number" ? entry.meta.net_amount_pence : null,
        commissionPence:
          typeof entry.meta?.commission_amount_pence === "number" ? entry.meta.commission_amount_pence : null,
        status:
          typeof entry.meta?.cash_out_status === "string"
            ? entry.meta.cash_out_status
            : entry.meta?.compliance?.status ?? "processing",
      })),
    [cashOutEntries]
  );

  const formatPayout = (pence?: number | null) => formatCurrency((pence ?? 0) / 100, "GBP");

  const getStatusMeta = (status?: string | null) => {
    const normalized = status?.toLowerCase() ?? "";
    if (["paid", "complete", "completed", "succeeded"].includes(normalized)) {
      return {
        label: t("wallet:cashOut.history.items.completed.status"),
        variant: "secondary" as const,
      };
    }

    if (["blocked", "hold", "compliance_hold", "requires_action"].includes(normalized)) {
      return { label: "Compliance hold", variant: "destructive" as const };
    }

    return {
      label: t("wallet:cashOut.history.items.processing.status"),
      variant: "outline" as const,
    };
  };

  const handleCashOut = async () => {
    const amount = parseInt(cashOutAmount, 10);
    if (!cashOutAmount || !Number.isFinite(amount) || amount < 1000) {
      void logEvent("wallet_cashout_invalid_amount", {
        amount,
      });
      return;
    }

    setLoading(true);
    try {
      void logEvent("wallet_cashout_click", { amount });
      const result = await cashOutCredits(amount);
      if (result.success) {
        setCashOutAmount("");
        setLastError(null);
        void logEvent("wallet_cashout_ui_success", { amount });
      } else {
        setLastError(result.error ?? "Cash-out failed");
        void logError(
          "wallet_cashout_ui_failure",
          new Error(result.error ?? "Cash-out failed"),
          {
            amount,
            code: result.code,
            compliance_block: result.complianceBlock,
          }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchConnectSetup = async () => {
    if (connectActionLoading) {
      return;
    }

    setConnectActionLoading(true);
    try {
      void logEvent("wallet_cashout_stripe_launch", {
        payouts_enabled: stripeStatus?.payouts_enabled,
        onboarding_complete: stripeStatus?.onboarding_complete,
      });

      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) {
        throw error;
      }

      const onboardingUrl = data?.url ?? data?.onboarding_url;
      if (!onboardingUrl) {
        throw new Error("Stripe did not return an onboarding link");
      }

      window.open(onboardingUrl, "_blank", "noopener,noreferrer");
      toast({
        title: payoutsReady ? "Stripe dashboard opening" : "Complete Stripe setup",
        description: payoutsReady
          ? "Review payouts or settings directly in Stripe."
          : "Finish onboarding in the new tab to enable payouts.",
      });
    } catch (error: any) {
      const message = error?.message ?? "Unable to open Stripe Connect";
      toast({
        title: "Stripe setup unavailable",
        description: message,
        variant: "destructive",
      });
      void logError("wallet_cashout_stripe_launch_failed", error, {
        user_id: user?.id ?? null,
      });
    } finally {
      setConnectActionLoading(false);
    }
  };

  const minimumCashOut = 1000; // £10 minimum
  const isEligible = balance.available_credits >= minimumCashOut;
  const enteredAmount = parseInt(cashOutAmount) || 0;

  const commissionRate = ((tierInfo?.commission_rate ?? 15) / 100);
  const tierLabel = tierInfo?.tier_name ?? 'STANDARD';
  const grossAmount = creditsToGBP(enteredAmount);
  const commissionAmount = grossAmount * commissionRate;
  const netAmount = grossAmount - commissionAmount;

  const minimumCashOutCredits = formatCredits(minimumCashOut);
  const minimumCashOutCurrency = formatCurrency(minimumCashOut / 100, "GBP");
  const availableCredits = formatCredits(balance.available_credits);
  const commissionPercentage = useMemo(() => `${(commissionRate * 100).toFixed(0)}%`, [commissionRate]);
  const formattedGrossAmount = useMemo(() => formatCurrency(grossAmount, "GBP"), [grossAmount, formatCurrency]);
  const formattedCommissionAmount = useMemo(
    () => formatCurrency(commissionAmount, "GBP"),
    [commissionAmount, formatCurrency]
  );
  const formattedNetAmount = useMemo(() => formatCurrency(netAmount, "GBP"), [netAmount, formatCurrency]);
  const payoutsReady = Boolean(stripeStatus?.onboarding_complete && stripeStatus?.payouts_enabled);
  const complianceMessage = stripeStatus?.compliance_hold_reason;
  const connectButtonLabel = payoutsReady ? "Open Stripe dashboard" : "Resume Stripe onboarding";

  return (
    <div className="space-y-6">
      {/* Eligibility Check */}
      {!isEligible && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("wallet:cashOut.eligibility.notice", {
              minimumCredits: minimumCashOutCredits,
              minimumCurrency: minimumCashOutCurrency,
              availableCredits,
            })}
          </AlertDescription>
        </Alert>
      )}

      {!payoutsReady && (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {complianceMessage
            ? complianceMessage
            : `Complete your Stripe Connect onboarding to enable payouts for the ${tierLabel} tier.`}
        </AlertDescription>
      </Alert>
      )}

      {complianceMessage && payoutsReady && (
        <Alert variant="destructive">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            {complianceMessage} Please review Stripe and resolve the compliance hold before submitting another cash-out.
          </AlertDescription>
        </Alert>
      )}

      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t("wallet:cashOut.setup.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between p-3 border rounded-lg ${
                payoutsReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div>
                <p className="font-medium">
                  {payoutsReady ? t("wallet:cashOut.setup.accountTitle") : 'Stripe Connect onboarding incomplete'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stripeLoading
                    ? 'Checking Connect status...'
                    : payoutsReady
                    ? t("wallet:cashOut.setup.accountStatus")
                    : 'Finish verification to enable payouts.'}
                </p>
              </div>
              {stripeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : payoutsReady ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {tierLoading
                  ? 'Loading commission rate...'
                  : `Current commission: ${commissionPercentage} (${tierLabel})`}
              </p>
              <Button
                variant={payoutsReady ? "outline" : "default"}
                onClick={handleLaunchConnectSetup}
                disabled={stripeLoading || connectActionLoading}
              >
                {connectActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {connectActionLoading ? "Opening…" : connectButtonLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Out Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("wallet:cashOut.form.title")}
          </CardTitle>
          <CardDescription>{t("wallet:cashOut.form.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("wallet:cashOut.form.amountLabel")}</label>
            <Input
              type="number"
              placeholder={t("wallet:cashOut.form.placeholder", {
                minimumCredits: minimumCashOutCredits,
              })}
              value={cashOutAmount}
              onChange={(e) => setCashOutAmount(e.target.value)}
              min={minimumCashOut}
              max={balance.available_credits}
              disabled={!isEligible}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t("wallet:cashOut.form.available", { availableCredits })}
            </p>
          </div>

          {enteredAmount >= minimumCashOut && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">{t("wallet:cashOut.summary.title")}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t("wallet:cashOut.summary.creditsLabel")}</span>
                  <span>{formatCredits(enteredAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("wallet:cashOut.summary.grossLabel")}</span>
                  <span>{formattedGrossAmount}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>{t("wallet:cashOut.summary.commissionLabel", { rate: commissionPercentage })}</span>
                  <span>-{formattedCommissionAmount}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>{t("wallet:cashOut.summary.netLabel")}</span>
                  <span>{formattedNetAmount}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCashOut}
            disabled={
              loading ||
              !isEligible ||
              enteredAmount < minimumCashOut ||
              enteredAmount > balance.available_credits ||
              !payoutsReady
            }
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading
              ? t("wallet:cashOut.form.processing")
              : t("wallet:cashOut.form.submit", { amount: formattedNetAmount })}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t("wallet:cashOut.disclaimers.minimum", { minimumCurrency: minimumCashOutCurrency })}</p>
            <p>{t("wallet:cashOut.disclaimers.timeline")}</p>
            <p>{t("wallet:cashOut.disclaimers.commission")}</p>
            <p>{t("wallet:cashOut.disclaimers.confirmation")}</p>
            <p>All payouts remain subject to platform compliance reviews and Stripe KYC obligations.</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Cash-outs */}
      <Card>
        <CardHeader>
          <CardTitle>{t("wallet:cashOut.history.title")}</CardTitle>
          <CardDescription>{t("wallet:cashOut.history.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total credits requested
              </p>
              <p className="text-lg font-semibold mt-1">
                {formatCreditsWithGBP(cashOutStats.totalCredits)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Net payouts
              </p>
              <p className="text-lg font-semibold mt-1">
                {formatPayout(cashOutStats.totalNetPence)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Last cash-out
              </p>
              <p className="text-sm font-medium mt-1">
                {cashOutStats.lastCashOut
                  ? new Date(cashOutStats.lastCashOut.created_at).toLocaleString()
                  : "No cash-out history yet"}
              </p>
            </div>
          </div>

          {recentCashOuts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cash-out activity yet. Submit a request once payouts are enabled.
            </p>
          ) : (
            <div className="space-y-3">
              {recentCashOuts.map((entry) => {
                const statusMeta = getStatusMeta(entry.status);
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 border rounded-lg p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{formatCredits(entry.credits, { showConversion: true })}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested {new Date(entry.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {`Commission ${formatPayout(entry.commissionPence)} • Gross ${formatPayout(entry.grossPence)}`}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold">{formatPayout(entry.netPence)} net</p>
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
