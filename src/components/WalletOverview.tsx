import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpCircle, ArrowDownCircle, CreditCard, Award } from "lucide-react";
import { useState } from "react";

export const WalletOverview = () => {
  const { balance, topUpCredits, applyCreditsToSubscription } = useWallet();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleQuickTopUp = async (amount: number) => {
    setLoading(true);
    try {
      const result = await topUpCredits(amount);
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      console.error('Error with quick top-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToSubscription = async () => {
    if (balance.available_credits < 1000) {
      alert('You need at least 1,000 credits (£10) to apply to subscription');
      return;
    }
    
    setLoading(true);
    try {
      await applyCreditsToSubscription(1000);
    } catch (error) {
      console.error('Error applying credits to subscription:', error);
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
            Quick Actions
          </CardTitle>
          <CardDescription>
            Top up your wallet or manage your credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => handleQuickTopUp(5000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">Buy 5,000</span>
              <span className="text-xs text-muted-foreground">£50</span>
            </Button>
            
            <Button
              onClick={() => handleQuickTopUp(10000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">Buy 10,000</span>
              <span className="text-xs text-muted-foreground">£100</span>
            </Button>
            
            <Button
              onClick={() => handleQuickTopUp(25000)}
              disabled={loading}
              className="h-20 flex-col"
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">Buy 25,000</span>
              <span className="text-xs text-muted-foreground">£250</span>
            </Button>
            
            <Button
              onClick={handleApplyToSubscription}
              disabled={loading || balance.available_credits < 1000}
              variant="outline"
              className="h-20 flex-col"
            >
              <Award className="h-6 w-6 mb-2" />
              <span className="text-sm">Apply to Sub</span>
              <span className="text-xs text-muted-foreground">1,000 credits</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Your current wallet and account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Account Type</span>
              <Badge variant="secondary">Free</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Credits</span>
              <span className="font-medium">{formatCreditsWithGBP(balance.balance_credits)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Credits</span>
              <span className="font-medium text-green-600">{formatCreditsWithGBP(balance.available_credits)}</span>
            </div>
            
            {balance.pending_credits > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Credits</span>
                <span className="font-medium text-yellow-600">{formatCreditsWithGBP(balance.pending_credits)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest wallet transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Top-up</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">+5,000</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Beat Purchase</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-red-600">-1,500</span>
              </div>
              
              <Button variant="link" className="w-full" size="sm">
                View all activity →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};