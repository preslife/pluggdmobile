import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { useLogger } from "@/hooks/useLogger";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import { CreditCard, Package, Share2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export const WalletTopUp = () => {
  const { topUpCredits } = useWallet();
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { logEvent, logError } = useLogger({
    component: "WalletTopUp",
    feature: "wallet",
    view: "wallet_dashboard",
  });
  const { t, formatNumber, formatCurrency } = useTranslation();

  const minimumCustomCredits = 100;
  const maximumCustomCredits = 100000;

  const minCurrency = useMemo(
    () => formatCurrency(minimumCustomCredits / 100, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [formatCurrency]
  );
  const maxCurrency = useMemo(
    () => formatCurrency(maximumCustomCredits / 100, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [formatCurrency]
  );

  const handleTopUp = async (amount: number, context: "package" | "custom") => {
    if (!Number.isFinite(amount) || amount <= 0) {
      void logError(
        "wallet_topup_invalid_amount",
        new Error(t("wallet:topUp.errors.invalidAmount")),
        {
          amount,
          context,
        }
      );
      return;
    }
    setLoading(true);
    try {
      void logEvent("wallet_topup_button_clicked", { amount, context });
      const result = await topUpCredits(amount);
      if (result.url) {
        window.open(result.url, '_blank');
        void logEvent("wallet_topup_checkout_opened", { amount, context });
      } else if (result.error) {
        void logError("wallet_topup_checkout_unavailable", new Error(result.error), {
          amount,
          context,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const packages = [
    { credits: 5000, price: 50, popular: false },
    { credits: 10000, price: 100, popular: true },
    { credits: 25000, price: 250, popular: false },
    { credits: 50000, price: 500, popular: false },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("wallet:topUp.packages.title")}
          </CardTitle>
          <CardDescription>{t("wallet:topUp.packages.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.credits}
                className={`relative p-4 border rounded-lg ${pkg.popular ? 'border-primary' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                      {t("wallet:topUp.packages.popular")}
                    </span>
                  </div>
                )}
                <div className="text-center space-y-2">
                  <h3 className="font-semibold">
                    {t("wallet:topUp.packages.card.title", { amount: formatNumber(pkg.credits) })}
                  </h3>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pkg.price, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("wallet:topUp.packages.card.value", {
                      credits: formatNumber(Math.round(pkg.credits / pkg.price)),
                      currency: formatCurrency(1, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                    })}
                  </p>
                  <Button
                    onClick={() => handleTopUp(pkg.credits, "package")}
                    disabled={loading}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {t("wallet:topUp.packages.card.cta")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("wallet:topUp.custom.title")}</CardTitle>
          <CardDescription>{t("wallet:topUp.custom.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="number"
              placeholder={t("wallet:topUp.custom.placeholder")}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min={minimumCustomCredits}
              max={maximumCustomCredits}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t("wallet:topUp.custom.limits", {
                min: formatNumber(minimumCustomCredits),
                max: formatNumber(maximumCustomCredits),
                minCurrency,
                maxCurrency,
              })}
            </p>
          </div>

          {customAmount && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>{formatNumber(parseInt(customAmount))} {t("wallet:topUp.custom.summary.credits")}</strong>{" "}
                {t("wallet:topUp.custom.summary.connector")} <strong>{formatCurrency(parseInt(customAmount) / 100, "GBP")}</strong>
              </p>
            </div>
          )}

          <Button
            onClick={() => handleTopUp(parseInt(customAmount), "custom")}
            disabled={
              loading ||
              !customAmount ||
              parseInt(customAmount) < minimumCustomCredits ||
              parseInt(customAmount) > maximumCustomCredits
            }
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t("wallet:topUp.custom.purchaseButton")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("wallet:topUp.share.title")}</CardTitle>
          <CardDescription>{t("wallet:topUp.share.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                {t("wallet:topUp.share.perks.signup", {
                  credits: formatNumber(200),
                  reward: formatCurrency(2, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
                })}
              </li>
              <li>
                {t("wallet:topUp.share.perks.purchase", {
                  credits: formatNumber(1000),
                  reward: formatCurrency(10, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
                })}
              </li>
              <li>
                {t("wallet:topUp.share.perks.subscription", {
                  credits: formatNumber(2000),
                  reward: formatCurrency(20, "GBP", { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
                })}
              </li>
            </ul>
            <ShareToEarnModal
              shareUrl={`${window.location.origin}?ref=wallet`}
              shareTitle={t("wallet:topUp.share.shareTitle")}
              shareDescription={t("wallet:topUp.share.shareDescription")}
            >
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                {t("wallet:topUp.share.button")}
              </Button>
            </ShareToEarnModal>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};