import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCredits, formatCreditsWithGBP, creditsToGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { TipModal } from "./TipModal";
import { Link } from "react-router-dom";
import { Wallet, Heart, ShoppingCart, Zap, CreditCard } from "lucide-react";

export const CreditsShowcase = () => {
  const { balance, topUpCredits, spendCredits } = useWallet();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleQuickTopUp = async (credits: number) => {
    setLoading(true);
    try {
      const result = await topUpCredits(credits);
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSpend = async () => {
    setLoading(true);
    try {
      const result = await spendCredits(50, 'spend_purchase', 'demo_purchase');
      // This would normally be connected to actual functionality
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            PLGD Credits System
          </CardTitle>
          <CardDescription>
            Sign in to explore the credits and wallet functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/auth">
            <Button className="w-full">Sign In to View Credits</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Your PLGD Credits Wallet
          </CardTitle>
          <CardDescription>
            Unified currency for all platform transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCredits(balance.balance_credits)}
              </div>
              <div className="text-xs text-muted-foreground">
                £{creditsToGBP(balance.balance_credits).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Balance</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCredits(balance.available_credits)}
              </div>
              <div className="text-xs text-muted-foreground">
                £{creditsToGBP(balance.available_credits).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCredits(balance.pending_credits)}
              </div>
              <div className="text-xs text-muted-foreground">
                £{creditsToGBP(balance.pending_credits).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleQuickTopUp(1000)} disabled={loading} variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Add 1,000 Credits (£10)
            </Button>
            <Button onClick={() => handleQuickTopUp(2500)} disabled={loading} variant="outline" size="sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Add 2,500 Credits (£25)
            </Button>
            <Link to="/dashboard/wallet">
              <Button variant="secondary" size="sm">
                <Wallet className="h-4 w-4 mr-2" />
                Full Wallet
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Tip Creators
            </CardTitle>
            <CardDescription>
              Support your favorite creators with credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TipModal creatorId="demo-creator" creatorName="Demo Creator">
              <Button variant="outline" className="w-full">
                <Heart className="h-4 w-4 mr-2" />
                Send Tip
              </Button>
            </TipModal>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Purchase Beats
            </CardTitle>
            <CardDescription>
              Buy beat licenses with credits or card
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/marketplace">
              <Button variant="outline" className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Browse Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Credits System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Instant Transactions
              </h4>
              <p className="text-sm text-muted-foreground">
                Pay for beats, tips, and premium features instantly with credits
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Unified Currency
              </h4>
              <p className="text-sm text-muted-foreground">
                One currency for all platform transactions and creator payments
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                Flexible Top-ups
              </h4>
              <p className="text-sm text-muted-foreground">
                Add credits via Stripe with multiple package options
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Creator Support
              </h4>
              <p className="text-sm text-muted-foreground">
                Cash out earnings and receive tips from your audience
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};