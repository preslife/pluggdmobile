import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { formatDateLocalized } from "@/lib/i18n/formatting";
import { CreditCard, Download, History, Upload } from "lucide-react";

export const DashboardWalletSummary = () => {
  const { balance, ledger, loading } = useWallet();

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

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total balance</CardDescription>
            <CardTitle>{formatCreditsWithGBP(balance.balance_credits)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">All credits on account</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available now</CardDescription>
            <CardTitle className="text-green-600">
              {formatCreditsWithGBP(balance.available_credits)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Ready to spend or cash out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-amber-500">
              {formatCreditsWithGBP(balance.pending_credits)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Releasing after compliance hold</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger insights</CardTitle>
          <CardDescription>
            {ledger.length > 0
              ? `Last ${ledger.length} ledger ${ledger.length === 1 ? "entry" : "entries"}`
              : "No ledger activity yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <History className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Once you earn or spend credits, your ledger summary will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Credits added
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatCreditsWithGBP(ledgerSummary.creditsAdded)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4 text-amber-500" />
                  Credits spent
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatCreditsWithGBP(ledgerSummary.creditsSpent)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Download
                    className={`h-4 w-4 ${ledgerSummary.netMovement >= 0 ? "text-green-600" : "text-red-500"}`}
                  />
                  Net movement
                </div>
                <p
                  className={`mt-2 text-sm font-medium ${
                    ledgerSummary.netMovement >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {formatCreditsWithGBP(ledgerSummary.netMovement)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4 text-slate-500" />
                  Last transaction
                </div>
                {ledgerSummary.lastTransaction ? (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {ledgerSummary.lastTransaction.kind.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-medium">
                        {formatCreditsWithGBP(Math.abs(ledgerSummary.lastTransaction.amount_credits))}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateLocalized(ledgerSummary.lastTransaction.created_at)}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No recent transactions</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardWalletSummary;
