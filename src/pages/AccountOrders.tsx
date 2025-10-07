import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ReceiptViewer } from "@/components/ReceiptViewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, DownloadCloud, ExternalLink, LifeBuoy, Library as LibraryIcon, Package, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setMeta } from "@/lib/seo";

interface OrderItem {
  id: string;
  product_id: string;
  kind?: string | null;
  quantity: number;
  price: number;
  creator_id?: string | null;
  title?: string | null;
  image_url?: string | null;
}

interface OrderSummary {
  order_id: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_provider?: string | null;
  paid_at?: string | null;
  shipping_address?: Record<string, unknown> | null;
  item_count: number;
  currency?: string | null;
  items?: OrderItem[];
  refund_status?: string | null;
  refund_total?: number | null;
}

const PAGE_SIZE = 10;

const SUPPORT_EMAIL = "support@pluggd.fm";
const ADDRESS_METADATA_KEYS = new Set([
  "tracking_number",
  "trackingNumber",
  "tracking_no",
  "tracking",
  "tracking_url",
  "trackingUrl",
  "tracking_link",
  "carrier",
  "shipping_carrier",
  "shipper",
  "delivery_service",
  "support_url",
  "supportUrl",
  "help_url",
  "support_email",
  "supportEmail",
  "contact_email",
  "support_phone",
  "supportPhone",
  "contact_phone",
  "phone",
  "status",
  "fulfillment_status",
  "shipping_status",
  "expected_delivery",
  "expectedDelivery",
  "eta",
  "estimated_arrival",
]);

const PHYSICAL_KEYWORDS = [
  "physical",
  "merch",
  "merchandise",
  "vinyl",
  "cassette",
  "apparel",
  "shirt",
  "hoodie",
  "tote",
  "poster",
  "print",
];

const DIGITAL_KEYWORDS = [
  "digital",
  "download",
  "release",
  "beat",
  "sample",
  "membership",
  "course",
  "software",
  "bundle",
];

interface StoreProductSummary {
  id: string;
  product_type: string | null;
  download_url?: string | null;
  title?: string | null;
  tags?: string[] | null;
}

interface ShippingMetadata {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  expectedDelivery?: string | null;
  status?: string | null;
  supportUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

type IconType = "download" | "product" | "external" | "library";

interface FulfillmentButtonConfig {
  href: string;
  label: string;
  external?: boolean;
  variant?: "default" | "secondary" | "outline";
  icon?: IconType;
}

interface FulfillmentDetails {
  type: "digital" | "physical" | "service" | "unknown";
  primary?: FulfillmentButtonConfig;
  secondary?: FulfillmentButtonConfig;
  description?: string | null;
  typeLabel?: string;
}

const normalise = (value?: string | null) => value?.toLowerCase().trim() ?? "";

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDisplayLabel = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  const formatted = value.replace(/[_-]/g, " ");
  return toTitleCase(formatted);
};

const getSupportHref = (orderId: string) => {
  const subject = `Support request for order ${orderId}`;
  const body = [
    "Hi Pluggd support team,",
    "",
    "I'm reaching out about an order and could use a hand.",
    "",
    `Order ID: ${orderId}`,
    "",
    "Thanks!",
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const parseShippingMetadata = (address: Record<string, unknown> | null | undefined): ShippingMetadata => {
  if (!address) return {};
  const record = address as Record<string, unknown>;
  const pick = (keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
    return null;
  };

  return {
    trackingNumber: pick(["tracking_number", "trackingNumber", "tracking_no", "tracking"]),
    trackingUrl: pick(["tracking_url", "trackingUrl", "tracking_link"]),
    carrier: pick(["carrier", "shipping_carrier", "shipper", "delivery_service"]),
    expectedDelivery: pick(["expected_delivery", "expectedDelivery", "eta", "estimated_arrival"]),
    status: pick(["status", "fulfillment_status", "shipping_status"]),
    supportUrl: pick(["support_url", "supportUrl", "help_url"]),
    supportEmail: pick(["support_email", "supportEmail", "contact_email"]),
    supportPhone: pick(["support_phone", "supportPhone", "contact_phone", "phone"]),
  };
};

const formatAddressEntries = (address: Record<string, unknown> | null | undefined) => {
  if (!address) return [] as string[];

  return Object.entries(address)
    .filter(([key, value]) => value && !ADDRESS_METADATA_KEYS.has(key))
    .map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        return `${formatDisplayLabel(key, key)}: ${value}`;
      }
      return null;
    })
    .filter((line): line is string => Boolean(line));
};

export default function AccountOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [productSummaries, setProductSummaries] = useState<Record<string, StoreProductSummary>>({});

  useEffect(() => {
    setMeta(
      "Order History — Pluggd",
      "Review and download receipts for every purchase you have made on Pluggd.",
      "/orders"
    );
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_orders_for_user', {
          p_user_id: user.id,
          p_limit: PAGE_SIZE + 1,
          p_offset: page * PAGE_SIZE,
        });

        if (error) throw error;

        if (!isMounted) return;

        const rows = (data || []) as OrderSummary[];
        setHasMore(rows.length > PAGE_SIZE);
        setOrders(rows.slice(0, PAGE_SIZE));
      } catch (err: any) {
        console.error('Failed to load orders', err);
        toast({
          title: "Unable to load orders",
          description: err.message || 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [user, page, toast]);

  const productIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        if (item.product_id) {
          ids.add(item.product_id);
        }
      }
    }

    return Array.from(ids);
  }, [orders]);

  useEffect(() => {
    const missingIds = productIds.filter((id) => !productSummaries[id]);
    if (!missingIds.length) return;

    let isActive = true;

    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("store_products")
          .select("id, product_type, download_url, title, tags")
          .in("id", missingIds);

        if (error) throw error;
        if (!isActive) return;

        const mapped: Record<string, StoreProductSummary> = {};
        for (const product of data ?? []) {
          mapped[product.id] = product as StoreProductSummary;
        }

        setProductSummaries((prev) => ({ ...prev, ...mapped }));
      } catch (err) {
        console.error("Failed to load product metadata", err);
      }
    };

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [productIds, productSummaries]);

  const totals = useMemo(() => {
    const completed = orders.filter((order) => order.status === 'completed');
    const lifetime = completed.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    return {
      completedCount: completed.length,
      lifetimeValue: lifetime,
    };
  }, [orders]);

  const renderStatus = (status: string) => {
    const normalized = status?.toLowerCase?.() || 'pending';
    switch (normalized) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'partial_refund':
      case 'partially_refunded':
        return <Badge className="bg-emerald-500/10 text-emerald-600">Partially Refunded</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="text-destructive border-destructive/40">Refunded</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const renderRefundStatusBadge = (order: OrderSummary) => {
    const status = normalise(order.refund_status);

    if (!status) {
      if (order.status?.toLowerCase() === 'refunded') {
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Refund processed
          </Badge>
        );
      }
      return null;
    }

    switch (status) {
      case 'requested':
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/40">
            Refund requested
          </Badge>
        );
      case 'processing':
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/40">
            Refund processing
          </Badge>
        );
      case 'partial':
      case 'partially_refunded':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Partial refund
          </Badge>
        );
      case 'completed':
      case 'refunded':
      case 'succeeded':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Refund processed
          </Badge>
        );
      case 'failed':
      case 'denied':
      case 'declined':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/40">
            Refund denied
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderButtonIcon = (type?: IconType) => {
    if (!type) return null;
    const iconProps = { className: 'mr-2 h-4 w-4' };
    switch (type) {
      case 'download':
        return <DownloadCloud {...iconProps} />;
      case 'product':
        return <Package {...iconProps} />;
      case 'external':
        return <ExternalLink {...iconProps} />;
      case 'library':
        return <LibraryIcon {...iconProps} />;
      default:
        return null;
    }
  };

  const isPhysicalItem = (order: OrderSummary, item: OrderItem) => {
    const product = productSummaries[item.product_id];
    const kindValue = normalise(item.kind);
    const productType = normalise(product?.product_type);

    if (productType) {
      if (PHYSICAL_KEYWORDS.some((keyword) => productType.includes(keyword))) return true;
      if (DIGITAL_KEYWORDS.some((keyword) => productType.includes(keyword))) return false;
    }

    if (kindValue) {
      if (PHYSICAL_KEYWORDS.some((keyword) => kindValue.includes(keyword))) return true;
      if (DIGITAL_KEYWORDS.some((keyword) => kindValue.includes(keyword))) return false;
    }

    if (order.shipping_address && Object.keys(order.shipping_address).length > 0) {
      return true;
    }

    return false;
  };

  const getItemFulfillment = (order: OrderSummary, item: OrderItem): FulfillmentDetails => {
    const product = productSummaries[item.product_id];
    const storeHref = `/store/product/${item.product_id}`;
    const physical = isPhysicalItem(order, item);
    const typeLabel = formatDisplayLabel(product?.product_type ?? item.kind, physical ? 'Physical item' : 'Digital item');

    if (physical) {
      return {
        type: 'physical',
        typeLabel,
        primary: {
          href: storeHref,
          label: 'View product details',
          variant: 'outline',
          icon: 'product',
        },
        description: "We’ll send tracking updates as soon as the carrier scans your package.",
      };
    }

    const normalizedKind = normalise(item.kind);
    const normalizedType = normalise(product?.product_type);

    let primaryHref = '/library';
    let primaryLabel = 'Open in library';
    let primaryIcon: IconType = 'library';
    let primaryExternal = false;
    let description = 'Downloads unlock instantly. Use the link to jump straight to your library.';

    if (normalizedKind.includes('release')) {
      primaryHref = `/release/${item.product_id}?purchased=true`;
      primaryLabel = 'View release';
      primaryIcon = 'download';
      description = 'Stream or download your release from the release page.';
    } else if (normalizedKind.includes('beat')) {
      primaryHref = `/beat/${item.product_id}`;
      primaryLabel = 'View beat license';
      primaryIcon = 'download';
      description = 'Download stems and license files from your beat purchase.';
    } else if (normalizedKind.includes('sample')) {
      primaryHref = '/library?tab=sample_pack';
      primaryLabel = 'Open sample packs';
      primaryIcon = 'library';
      description = 'Find this pack in the Sample Packs tab of your library.';
    } else if (normalizedKind.includes('membership') || normalizedType.includes('membership')) {
      primaryHref = '/subscriptions';
      primaryLabel = 'Manage membership';
      primaryIcon = 'external';
      description = 'Manage your membership perks and billing from the subscriptions dashboard.';
    } else if (normalizedKind.includes('course') || normalizedType.includes('course')) {
      primaryHref = '/education';
      primaryLabel = 'Go to courses';
      primaryIcon = 'external';
      description = 'Course materials live in the education hub.';
    } else if (normalizedType.includes('software')) {
      if (product?.download_url) {
        primaryHref = product.download_url;
        primaryLabel = 'Download software';
        primaryIcon = 'download';
        primaryExternal = true;
        description = 'Launch the software download in a new tab.';
      } else {
        primaryHref = '/library';
        primaryLabel = 'Open library';
        primaryIcon = 'library';
        description = 'Your software license unlocks in the library.';
      }
    } else if (normalizedType.includes('digital_download')) {
      primaryHref = '/library';
      primaryLabel = 'Open in library';
      primaryIcon = 'library';
    }

    if (primaryHref.startsWith('http')) {
      primaryExternal = true;
    }

    const primaryVariant: FulfillmentButtonConfig['variant'] = primaryExternal ? 'secondary' : 'default';

    let secondary: FulfillmentButtonConfig | undefined;
    if (!primaryExternal && product?.download_url) {
      secondary = {
        href: product.download_url,
        label: 'Direct download',
        external: true,
        variant: 'secondary',
        icon: 'download',
      };
    } else if (storeHref !== primaryHref) {
      secondary = {
        href: storeHref,
        label: 'View product page',
        variant: 'secondary',
        icon: 'product',
      };
    }

    return {
      type: 'digital',
      typeLabel,
      primary: {
        href: primaryHref,
        label: primaryLabel,
        icon: primaryIcon,
        external: primaryExternal,
        variant: primaryVariant,
      },
      secondary,
      description,
    };
  };

  const renderShippingAddress = (address: Record<string, unknown> | null | undefined) => {
    const lines = formatAddressEntries(address);

    if (!lines.length) return null;

    return (
      <div className="text-sm text-muted-foreground space-y-1">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    );
  };

  const onPrev = () => setPage((p) => Math.max(0, p - 1));
  const onNext = () => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
            <p className="text-muted-foreground">
              Review your previous purchases, download receipts, and pick up digital items anytime.
            </p>
          </div>

          {!user && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign in required</AlertTitle>
              <AlertDescription>
                Please sign in to view your order history.
              </AlertDescription>
            </Alert>
          )}

          {user && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Total Completed Orders</CardTitle>
                  <CardDescription>Number of store orders marked as completed.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-semibold">{totals.completedCount}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Lifetime Spend</CardTitle>
                  <CardDescription>Total value of completed store purchases.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-3xl font-semibold">{formatCurrency(totals.lifetimeValue || 0)}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your most recent store transactions.</CardDescription>
              </div>
              {user && orders.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DownloadCloud className="h-4 w-4" />
                  Receipts are available for every order.
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-20 w-full" />
                      <Separator />
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    You haven’t completed any store purchases yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {orders.map((order) => {
                    const hasPhysicalItems = (order.items || []).some((item) => isPhysicalItem(order, item));
                    const shippingMeta = parseShippingMetadata(order.shipping_address);
                    const supportHref = getSupportHref(order.order_id);
                    const refundBadge = renderRefundStatusBadge(order);
                    const refundAmount =
                      typeof order.refund_total === 'number' && !Number.isNaN(order.refund_total) && order.refund_total > 0
                        ? formatCurrency(order.refund_total, order.currency || 'GBP')
                        : null;
                    const shippingSupportLink = shippingMeta.supportUrl
                      ? shippingMeta.supportUrl
                      : shippingMeta.supportEmail
                      ? `mailto:${shippingMeta.supportEmail}`
                      : null;

                    return (
                      <div key={order.order_id} className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-lg">
                                {formatCurrency(order.total_amount || 0, order.currency || 'GBP')}
                              </span>
                              {renderStatus(order.status)}
                              {refundBadge}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Placed on {new Date(order.created_at).toLocaleString()}
                              {order.payment_provider && ` · Paid via ${order.payment_provider}`}
                            </div>
                            {order.paid_at && (
                              <div className="text-xs text-muted-foreground">
                                Paid at {new Date(order.paid_at).toLocaleString()}
                              </div>
                            )}
                            {refundAmount && (
                              <div className="text-xs text-muted-foreground">
                                Refund total:{' '}
                                <span className="font-medium text-foreground">{refundAmount}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <ReceiptViewer
                              paymentId={order.order_id}
                              receiptType="order"
                              className="w-full sm:w-auto"
                            />
                            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                              <a href={supportHref}>
                                <LifeBuoy className="mr-2 h-4 w-4" />
                                Request support
                              </a>
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h3>
                            <div className="space-y-3">
                              {(order.items || []).map((item) => {
                                const product = productSummaries[item.product_id];
                                const fulfillment = getItemFulfillment(order, item);
                                const buttons = [fulfillment.primary, fulfillment.secondary].filter(
                                  (config): config is FulfillmentButtonConfig => Boolean(config)
                                );
                                const badgeClass =
                                  fulfillment.type === 'physical'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : fulfillment.type === 'digital'
                                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                                    : 'bg-secondary text-secondary-foreground border-transparent';
                                const itemLabel = item.title || product?.title || 'Store item';
                                const kindLabel = item.kind
                                  ? item.kind.toUpperCase()
                                  : formatDisplayLabel(product?.product_type, 'Digital');

                                return (
                                  <div key={item.id} className="space-y-3 rounded-md border border-border/60 bg-background/60 p-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="font-medium">{itemLabel}</div>
                                          {fulfillment.typeLabel && (
                                            <Badge variant="outline" className={badgeClass}>
                                              {fulfillment.typeLabel}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {kindLabel} · Qty {item.quantity || 1}
                                        </div>
                                      </div>
                                      <div className="text-sm font-semibold text-right">
                                        {formatCurrency((item.price || 0) * (item.quantity || 1), order.currency || 'GBP')}
                                      </div>
                                    </div>
                                    {(fulfillment.description || buttons.length > 0) && (
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        {fulfillment.description && (
                                          <p className="text-xs text-muted-foreground sm:max-w-xl">
                                            {fulfillment.description}
                                          </p>
                                        )}
                                        {buttons.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {buttons.map((config) => {
                                              const icon = renderButtonIcon(config.icon);
                                              return (
                                                <Button
                                                  key={`${config.href}-${config.label}`}
                                                  variant={config.variant ?? (config.external ? 'secondary' : 'default')}
                                                  size="sm"
                                                  asChild
                                                >
                                                  <a
                                                    href={config.href}
                                                    target={config.external ? '_blank' : undefined}
                                                    rel={config.external ? 'noopener noreferrer' : undefined}
                                                  >
                                                    {icon}
                                                    {config.label}
                                                  </a>
                                                </Button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {hasPhysicalItems && (
                            <div className="space-y-3 rounded-md border border-dashed border-muted-foreground/40 bg-background/50 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <Truck className="h-4 w-4" />
                                Shipping & tracking
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                {shippingMeta.status && (
                                  <div>
                                    Status:{' '}
                                    <span className="font-medium text-foreground">
                                      {formatDisplayLabel(shippingMeta.status, shippingMeta.status)}
                                    </span>
                                  </div>
                                )}
                                {shippingMeta.carrier && (
                                  <div>
                                    Carrier:{' '}
                                    <span className="font-medium text-foreground">{shippingMeta.carrier}</span>
                                  </div>
                                )}
                                {shippingMeta.trackingNumber && (
                                  <div>
                                    Tracking number:{' '}
                                    <span className="font-mono text-foreground">{shippingMeta.trackingNumber}</span>
                                  </div>
                                )}
                                {shippingMeta.expectedDelivery && (
                                  <div>
                                    Expected delivery:{' '}
                                    <span className="font-medium text-foreground">{shippingMeta.expectedDelivery}</span>
                                  </div>
                                )}
                                {!shippingMeta.trackingNumber && !shippingMeta.trackingUrl && !shippingMeta.expectedDelivery && (
                                  <div>
                                    We'll email tracking information as soon as it's available. Reach out if you need an update.
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {shippingMeta.trackingUrl && (
                                  <Button asChild size="sm">
                                    <a href={shippingMeta.trackingUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Track package
                                    </a>
                                  </Button>
                                )}
                                {shippingSupportLink && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                  >
                                    <a
                                      href={shippingSupportLink}
                                      target={shippingMeta.supportUrl ? '_blank' : undefined}
                                      rel={shippingMeta.supportUrl ? 'noopener noreferrer' : undefined}
                                    >
                                      <LifeBuoy className="mr-2 h-4 w-4" />
                                      Shipping support
                                    </a>
                                  </Button>
                                )}
                              </div>
                              {renderShippingAddress(order.shipping_address)}
                              {shippingMeta.supportPhone && (
                                <div className="text-xs text-muted-foreground">
                                  Phone support:{' '}
                                  <span className="font-medium text-foreground">{shippingMeta.supportPhone}</span>
                                </div>
                              )}
                              {!shippingSupportLink && !shippingMeta.supportPhone && (
                                <div className="text-xs text-muted-foreground">
                                  Need help? Use the Request support button above and include your tracking number.
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Separator />
                      </div>
                    );
                  })}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Button variant="outline" disabled={page === 0} onClick={onPrev} className="w-full sm:w-auto">
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground text-center">
                      Page {page + 1}
                    </div>
                    <Button variant="outline" onClick={onNext} disabled={!hasMore} className="w-full sm:w-auto">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
