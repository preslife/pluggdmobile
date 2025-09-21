import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletOverview } from "@/components/WalletOverview";
import { WalletActivity } from "@/components/WalletActivity";
import { WalletTopUp } from "@/components/WalletTopUp";
import { WalletCashOut } from "@/components/WalletCashOut";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, CreditCard, Upload, Download } from "lucide-react";

const WalletPage = () => {
  const { balance, loading } = useWallet();
  const { user } = useAuth();

  useEffect(() => {
    setMeta(
      "Wallet — Pluggd",
      "Manage your PLGD Credits, top up your wallet, and cash out your earnings.",
      "/dashboard/wallet"
    );
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please sign in to access your wallet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Wallet</h1>
            </div>
            
            {/* Balance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Total Balance</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCreditsWithGBP(balance.balance_credits)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Total balance
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Available</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {formatCreditsWithGBP(balance.available_credits)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ready to spend
                  </p>
                </CardContent>
              </Card>
              
              {balance.pending_credits > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">Pending</CardDescription>
                    <CardTitle className="text-2xl text-yellow-600">
                      {formatCreditsWithGBP(balance.pending_credits)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Available in 48h
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="topup">Top Up</TabsTrigger>
              <TabsTrigger value="cashout">Cash Out</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <WalletOverview />
            </TabsContent>

            <TabsContent value="activity">
              <WalletActivity />
            </TabsContent>

            <TabsContent value="topup">
              <WalletTopUp />
            </TabsContent>

            <TabsContent value="cashout">
              <WalletCashOut />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;