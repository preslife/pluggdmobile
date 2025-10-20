import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export interface DashboardOrderItem {
  id?: string;
  title?: string | null;
  quantity?: number | null;
  price?: number | null;
}

export interface DashboardOrderSummary {
  order_id: string;
  created_at: string;
  status: string;
  total_amount: number;
  currency?: string | null;
  item_count: number;
  items?: DashboardOrderItem[];
  payment_provider?: string | null;
  paid_at?: string | null;
}

const statusVariants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  completed: { label: "Completed", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  processing: { label: "Processing", variant: "secondary" },
  pending: { label: "Pending", variant: "secondary" },
  refunded: { label: "Refunded", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const normaliseStatus = (status: string) => status?.toLowerCase().trim();

const formatStatus = (status: string) => {
  const key = normaliseStatus(status);
  const config = (key && statusVariants[key]) || {
    label: status.replace(/_/g, " "),
    variant: "secondary" as const,
  };

  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
};

const formatDate = (date: string) => {
  try {
    return format(new Date(date), "PP");
  } catch {
    return date;
  }
};

const getItemSummary = (items?: DashboardOrderItem[], count?: number) => {
  if (!items?.length) {
    return `${count ?? 0} item${(count ?? 0) === 1 ? "" : "s"}`;
  }

  const titles = items
    .filter((item) => item?.title)
    .map((item) => item.title as string);

  if (!titles.length) {
    return `${count ?? items.length} item${(count ?? items.length) === 1 ? "" : "s"}`;
  }

  if (titles.length === 1) {
    return titles[0];
  }

  const [first, second] = titles;
  if (titles.length === 2) {
    return `${first} & ${second}`;
  }

  return `${first}, ${second} +${titles.length - 2} more`;
};

export const DashboardOrdersTable = ({ orders }: { orders: DashboardOrderSummary[] }) => {
  const totalSpend = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Your latest purchases and fulfilment statuses</CardDescription>
        </div>
        <div className="text-sm text-muted-foreground">
          Lifetime spend {formatCurrency(totalSpend || 0, orders[0]?.currency || "GBP")}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const amount = formatCurrency(order.total_amount || 0, order.currency || "GBP");
              const summary = getItemSummary(order.items, order.item_count);
              const paymentLabel = order.payment_provider ? ` • ${order.payment_provider}` : "";

              return (
                <TableRow key={order.order_id} data-testid="dashboard-order-row">
                  <TableCell>
                    <div className="font-medium">{order.order_id}</div>
                    <div className="text-xs text-muted-foreground">{`Items: ${order.item_count}`}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{formatDate(order.paid_at || order.created_at)}</div>
                    {order.paid_at && (
                      <div className="text-xs text-muted-foreground">Paid {formatDate(order.paid_at)}</div>
                    )}
                  </TableCell>
                  <TableCell>{formatStatus(order.status)}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={summary}>
                      {summary}
                    </div>
                    {order.payment_provider && (
                      <div className="text-xs text-muted-foreground">{`Paid via${paymentLabel}`}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{amount}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DashboardOrdersTable;
