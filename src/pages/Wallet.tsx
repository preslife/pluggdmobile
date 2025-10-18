import { useEffect, useMemo } from "react";
import { setMeta } from "@/lib/seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletOverview } from "@/components/WalletOverview";
import { WalletActivity } from "@/components/WalletActivity";
import { WalletTopUp } from "@/components/WalletTopUp";
import { WalletCashOut } from "@/components/WalletCashOut";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, CreditCard, Upload, Download, ShieldCheck, History } from "lucide-react";

const WalletPage = () => {
  const { balance, ledger } = useWallet();
  const { user } = useAuth();

  const ledgerSummary = useMemo(() => {
    if (!ledger?.length) {
      return {
        creditsAdded: 0,
        creditsSpent: 0,
        netMovement: 0,
        lastTransaction: null as (typeof ledger)[number] | null,
      };
    }

    const creditsAdded = ledger.reduce((sum, entry) => {
      return entry.amount_credits > 0 ? sum + entry.amount_credits : sum;
    }, 0);

    const creditsSpent = ledger.reduce((sum, entry) => {
      return entry.amount_credits < 0 ? sum + Math.abs(entry.amount_credits) : sum;
    }, 0);

    const netMovement = creditsAdded - creditsSpent;
    const lastTransaction = ledger[0] ?? null;

    return { creditsAdded, creditsSpent, netMovement, lastTransaction };
  }, [ledger]);

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

            <Alert className="mb-6">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <AlertTitle>Compliance notice</AlertTitle>
                <AlertDescription>
                  <p className="mb-2 text-muted-foreground">
                    PLGD Credits are a limited-purpose digital balance. They are non-transferable, do not earn
                    interest, and are not insured deposits.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Available credits exclude pending top ups for the first 48 hours to mitigate chargebacks.</li>
                    <li>Refunds create reversing ledger entries so that buyer, seller, and platform balances stay aligned.</li>
                    <li>
                      Contact support@pluggd.io for ledger disputes. Statements are retained for statutory anti-money laundering
                      audits.
                    </li>
                  </ul>
                </AlertDescription>
              </div>
            </Alert>

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

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Ledger snapshot</CardTitle>
                <CardDescription>
                  {ledger.length > 0
                    ? `Based on your last ${ledger.length} ledger ${ledger.length === 1 ? "entry" : "entries"}.`
                    : "No ledger activity recorded yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Credits added</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCreditsWithGBP(ledgerSummary.creditsAdded)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <Upload className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium">Credits spent</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCreditsWithGBP(ledgerSummary.creditsSpent)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <Download className={`h-5 w-5 ${ledgerSummary.netMovement >= 0 ? "text-green-600" : "text-red-600"}`} />
                      <div>
                        <p className="text-sm font-medium">Net movement</p>
                        <p
                          className={`text-sm font-semibold ${
                            ledgerSummary.netMovement >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCreditsWithGBP(ledgerSummary.netMovement)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <History className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Last transaction</p>
                        {ledgerSummary.lastTransaction ? (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {ledgerSummary.lastTransaction.kind.replace(/_/g, " ")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatCreditsWithGBP(Math.abs(ledgerSummary.lastTransaction.amount_credits))}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ledgerSummary.lastTransaction.created_at).toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No activity captured yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Once you start topping up or spending credits we’ll summarise the movement here.
                  </p>
                )}
              </CardContent>
            </Card>
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