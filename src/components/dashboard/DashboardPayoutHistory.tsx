import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";
import { formatCreditsWithGBP } from "@/hooks/useWallet";
import { PiggyBank } from "lucide-react";

export type PayoutRecord = Database["public"]["Tables"]["payout_records"]["Row"];

const statusVariant: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  paid: { label: "Paid", variant: "default" },
  completed: { label: "Paid", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const formatStatus = (status: string) => {
  const key = status?.toLowerCase();
  const config = statusVariant[key] || {
    label: status.replace(/_/g, " "),
    variant: "secondary" as const,
  };

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "PP");
  } catch {
    return value;
  }
};

export const DashboardPayoutHistory = ({ payouts, isLoading }: { payouts: PayoutRecord[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Tracking your transfers from sales and royalties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!payouts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Tracking your transfers from sales and royalties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted-foreground">
            <PiggyBank className="h-10 w-10" />
            <div>
              <p className="text-sm font-medium">No payouts yet</p>
              <p className="text-sm">
                When your first sale settles we will generate a payout record here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payouts.reduce((sum, payout) => {
    return payout.payout_status?.toLowerCase() === "paid" || payout.payout_status?.toLowerCase() === "completed"
      ? sum + payout.amount
      : sum;
  }, 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>Tracking your transfers from sales and royalties</CardDescription>
        </div>
        <div className="text-sm text-muted-foreground">
          Paid out {formatCreditsWithGBP(totalPaid)}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((payout) => (
              <TableRow key={payout.id} data-testid="dashboard-payout-row">
                <TableCell>
                  <div className="font-medium">{payout.payout_reference || payout.id}</div>
                  {payout.beat_id && (
                    <div className="text-xs text-muted-foreground">Beat #{payout.beat_id}</div>
                  )}
                </TableCell>
                <TableCell>{formatStatus(payout.payout_status)}</TableCell>
                <TableCell>{formatDate(payout.processed_at || payout.created_at)}</TableCell>
                <TableCell className="capitalize">{payout.payout_method || "manual"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCreditsWithGBP(payout.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DashboardPayoutHistory;
