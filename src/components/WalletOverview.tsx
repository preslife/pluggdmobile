import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpCircle, ArrowDownCircle, CreditCard, Award } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLogger } from "@/hooks/useLogger";

export const WalletOverview = () => {
  const { balance, topUpCredits, applyCreditsToSubscription } = useWallet();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { t, formatNumber, formatCurrency } = useTranslation();
  const loggerMetadata = useMemo(() => ({ user_id: user?.id ?? null }), [user?.id]);
  const { logEvent, logError, logUserAction } = useLogger({
    component: "WalletOverview",
    feature: "wallet",
    metadata: loggerMetadata,
  });

  const handleQuickTopUp = async (amount: number) => {
    setLoading(true);
    try {
      void logUserAction("wallet_quick_topup_selected", { amount });
      await logEvent("wallet_quick_topup_start", { amount });
      const result = await topUpCredits(amount);
      if (result.error) {
        void logError("wallet_quick_topup_failed", new Error(result.error), { amount });
        return;
      }

      if (result.url) {
        window.open(result.url, '_blank');
      }
      await logEvent("wallet_quick_topup_complete", {
        amount,
        has_checkout_url: Boolean(result.url),
      });
    } catch (error) {
      void logError("wallet_quick_topup_exception", error, { amount });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToSubscription = async () => {
    if (balance.available_credits < 1000) {
      alert(t("wallet:overview.quickActions.applySubscription.alert"));
      return;
    }

    setLoading(true);
    try {
      void logUserAction("wallet_apply_subscription_selected", { amount: 1000 });
      await logEvent("wallet_apply_subscription_start", { amount: 1000 });
      const response = await applyCreditsToSubscription(1000);
      if (!response.success) {
        void logError(
          "wallet_apply_subscription_action_failed",
          response.error ? new Error(response.error) : new Error("unknown_error"),
          {
            amount: 1000,
            code: response.code,
            compliance_block: response.complianceBlock,
          }
        );
      } else {
        await logEvent("wallet_apply_subscription_complete", { amount: 1000 });
      }
    } catch (error) {
      void logError("wallet_apply_subscription_exception", error, { amount: 1000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            {t("wallet:overview.quickActions.title")}
          </CardTitle>
          <CardDescription>{t("wallet:overview.quickActions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => handleQuickTopUp(5000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">
                {t("wallet:overview.quickActions.buy", { amount: formatNumber(5000) })}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(50, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </Button>

            <Button
              onClick={() => handleQuickTopUp(10000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">
                {t("wallet:overview.quickActions.buy", { amount: formatNumber(10000) })}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(100, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </Button>

            <Button
              onClick={() => handleQuickTopUp(25000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">
                {t("wallet:overview.quickActions.buy", { amount: formatNumber(25000) })}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(250, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </Button>

            <Button
              onClick={handleApplyToSubscription}
              disabled={loading || balance.available_credits < 1000}
              variant="outline"
              className="h-20 flex-col"
            >
              <Award className="h-6 w-6 mb-2" />
              <span className="text-sm">{t("wallet:overview.quickActions.applySubscription.label")}</span>
              <span className="text-xs text-muted-foreground">
                {t("wallet:overview.quickActions.applySubscription.helper", {
                  amount: formatNumber(1000),
                })}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("wallet:overview.accountStatus.title")}</CardTitle>
            <CardDescription>{t("wallet:overview.accountStatus.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">{t("wallet:overview.accountStatus.accountType.label")}</span>
              <Badge variant="secondary">{t("wallet:overview.accountStatus.accountType.free")}</Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">{t("wallet:overview.accountStatus.totalCredits")}</span>
              <span className="font-medium">{formatCreditsWithGBP(balance.balance_credits)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">{t("wallet:overview.accountStatus.availableCredits")}</span>
              <span className="font-medium text-green-600">{formatCreditsWithGBP(balance.available_credits)}</span>
            </div>

            {balance.pending_credits > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm">{t("wallet:overview.accountStatus.pendingCredits")}</span>
                <span className="font-medium text-yellow-600">{formatCreditsWithGBP(balance.pending_credits)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("wallet:overview.recentActivity.title")}</CardTitle>
            <CardDescription>{t("wallet:overview.recentActivity.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{t("wallet:overview.recentActivity.items.topUp.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("wallet:overview.recentActivity.items.topUp.timeAgo")}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">+{formatNumber(5000)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">{t("wallet:overview.recentActivity.items.purchase.title")}</p>
                    <p className="text-xs text-muted-foreground">{t("wallet:overview.recentActivity.items.purchase.timeAgo")}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-red-600">-{formatNumber(1500)}</span>
              </div>

              <Button variant="link" className="w-full" size="sm">
                {t("wallet:overview.recentActivity.viewAll")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
