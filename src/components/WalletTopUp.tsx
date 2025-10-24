import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { useLogger } from "@/hooks/useLogger";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import { CreditCard, Package, Share2 } from "lucide-react";

export const WalletTopUp = () => {
  const { topUpCredits } = useWallet();
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { logEvent, logError } = useLogger({
    component: "WalletTopUp",
    feature: "wallet",
    view: "wallet_dashboard",
  });

  const handleTopUp = async (amount: number, context: "package" | "custom") => {
    if (!Number.isFinite(amount) || amount <= 0) {
      void logError("wallet_topup_invalid_amount", new Error("Invalid amount"), {
        amount,
        context,
      });
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
            Credit Packages
          </CardTitle>
          <CardDescription>
            Choose a credit package that suits your needs
          </CardDescription>
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
                      Popular
                    </span>
                  </div>
                )}
                <div className="text-center space-y-2">
                  <h3 className="font-semibold">{pkg.credits.toLocaleString()} Credits</h3>
                  <p className="text-2xl font-bold">£{pkg.price}</p>
                  <p className="text-sm text-muted-foreground">
                    {(pkg.credits / pkg.price).toFixed(0)} credits per £1
                  </p>
                  <Button
                    onClick={() => handleTopUp(pkg.credits, "package")}
                    disabled={loading}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Amount</CardTitle>
          <CardDescription>
            Enter a custom amount of credits to purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="number"
              placeholder="Enter credits amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              min="100"
              max="100000"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Minimum: 100 credits (£1) | Maximum: 100,000 credits (£1,000)
            </p>
          </div>
          
          {customAmount && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>{parseInt(customAmount).toLocaleString()} credits</strong> for{" "}
                <strong>£{(parseInt(customAmount) / 100).toFixed(2)}</strong>
              </p>
            </div>
          )}
          
          <Button
            onClick={() => handleTopUp(parseInt(customAmount), "custom")}
            disabled={loading || !customAmount || parseInt(customAmount) < 100}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Purchase Custom Amount
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Share & Earn Free Credits</CardTitle>
          <CardDescription>
            Invite friends and earn credits when they join and make purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              💰 200 Credits (£2) for each friend signup<br/>
              🎯 1,000 Credits (£10) when they make their first £5+ purchase<br/>
              🚀 2,000 Credits (£20) each when they start a subscription
            </p>
            <ShareToEarnModal
              shareUrl={`${window.location.origin}?ref=wallet`}
              shareTitle="Join me on Pluggd and get free credits!"
              shareDescription="Sign up and we both get bonus credits to spend on beats and more!"
            >
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Share & Earn Credits
              </Button>
            </ShareToEarnModal>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};