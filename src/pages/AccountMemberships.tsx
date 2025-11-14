import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { setMeta } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";

type FanSubscriptionRow = Database["public"]["Tables"]["fan_subscriptions"]["Row"];

type TierSummary = Pick<
  Database["public"]["Tables"]["membership_tiers"]["Row"],
  "id" | "name" | "status" | "price_monthly" | "price_yearly" | "price_lifetime" | "currency"
>;

type CreatorSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "user_id" | "display_name" | "username" | "avatar_url"
>;

interface MembershipRecord {
  subscription: FanSubscriptionRow;
  tier: TierSummary | null;
  creator: CreatorSummary | null;
}

const STATUS_META: Record<
  string,
  {
    label: string;
    className: string;
    description?: string;
  }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    description: "Perks unlocked",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "Complete checkout",
  },
  past_due: {
    label: "Past due",
    className: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    description: "Update payment method",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
};

const priceFromTier = (tier: TierSummary | null) => {
  if (!tier) return null;
  return tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime ?? null;
};

const AccountMemberships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managingPortalFor, setManagingPortalFor] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    setMeta(
      "Your Memberships — Pluggd",
      "Manage the creators you support, review membership status, and jump back into Stripe billing if needed.",
      "/account/memberships"
    );
  }, []);

  const loadMemberships = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("fan_subscriptions")
        .select("*")
        .eq("fan_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as FanSubscriptionRow[];
      if (rows.length === 0) {
        setMemberships([]);
        setLoading(false);
        return;
      }

      const tierIds = Array.from(new Set(rows.map((row) => row.tier_id).filter((id): id is string => Boolean(id))));
      const creatorIds = Array.from(new Set(rows.map((row) => row.creator_id).filter((id): id is string => Boolean(id))));

      const [{ data: tierRows, error: tierError }, { data: creatorRows, error: creatorError }] = await Promise.all([
        tierIds.length
          ? supabase
              .from("membership_tiers")
              .select("id, name, status, price_monthly, price_yearly, price_lifetime, currency")
              .in("id", tierIds)
          : Promise.resolve({ data: [], error: null }),
        creatorIds.length
          ? supabase
              .from("profiles")
              .select("id, user_id, display_name, username, avatar_url")
              .in("user_id", creatorIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (tierError) throw tierError;
      if (creatorError) throw creatorError;

      const tierMap = new Map<string, TierSummary>();
      (tierRows ?? []).forEach((tier) => tierMap.set(tier.id, tier as TierSummary));

      const creatorMap = new Map<string, CreatorSummary>();
      (creatorRows ?? []).forEach((profile) => creatorMap.set(profile.user_id, profile as CreatorSummary));

      setMemberships(
        rows.map((row) => ({
          subscription: row,
          tier: row.tier_id ? tierMap.get(row.tier_id) ?? null : null,
          creator: creatorMap.get(row.creator_id) ?? null,
        }))
      );
    } catch (err: any) {
      console.error("[AccountMemberships] fetch error", err);
      setError(err?.message ?? "Unable to load memberships right now.");
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void loadMemberships();
    }
  }, [loadMemberships, user?.id]);

  const handleCustomerPortal = useCallback(
    async (membershipId?: string) => {
      setManagingPortalFor(membershipId ?? "__global");
      try {
        const { data, error } = await supabase.functions.invoke("customer-portal");
        if (error) throw new Error(error.message ?? "Unable to open billing portal.");
        if (data?.url) {
          window.open(data.url, "_blank");
        } else {
          toast({
            title: "Portal unavailable",
            description: "Stripe did not return a portal link. Please try again shortly.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("[AccountMemberships] portal error", err);
        toast({
          title: "Billing portal unavailable",
          description: err?.message ?? "Unable to open Stripe right now.",
          variant: "destructive",
        });
      } finally {
        setManagingPortalFor(null);
      }
    },
    [toast]
  );

  const handleResumeCheckout = useCallback(
    async (record: MembershipRecord) => {
      if (!record.subscription.tier_id) {
        toast({
          title: "Tier unavailable",
          description: "We couldn’t determine which tier to resume. Visit the creator profile to try again.",
          variant: "destructive",
        });
        return;
      }

      setResumingId(record.subscription.id);
      try {
        const { data, error } = await supabase.functions.invoke("create-fan-subscription", {
          body: {
            creatorId: record.subscription.creator_id,
            membershipTierId: record.subscription.tier_id,
          },
        });

        if (error) {
          throw new Error(error.message ?? "Unable to restart checkout.");
        }

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Stripe did not return a checkout URL.");
        }
      } catch (err: any) {
        console.error("[AccountMemberships] resume checkout error", err);
        toast({
          title: "Checkout unavailable",
          description: err?.message ?? "We couldn't restart that membership. Try again soon.",
          variant: "destructive",
        });
      } finally {
        setResumingId(null);
      }
    },
    [toast]
  );

  const summary = useMemo(() => {
    const counts = {
      total: memberships.length,
      active: 0,
      pending: 0,
      pastDue: 0,
      uniqueCreators: new Set<string>(),
    };

    memberships.forEach((record) => {
      const status = record.subscription.status ?? "pending";
      if (status === "active") counts.active += 1;
      else if (status === "pending") counts.pending += 1;
      else if (status === "past_due") counts.pastDue += 1;

      if (record.subscription.creator_id) {
        counts.uniqueCreators.add(record.subscription.creator_id);
      }
    });

    return {
      total: counts.total,
      active: counts.active,
      pending: counts.pending,
      pastDue: counts.pastDue,
      creators: counts.uniqueCreators.size,
    };
  }, [memberships]);

const renderPrice = (record: MembershipRecord) => {
  const cents = record.subscription.price_cents ?? priceFromTier(record.tier);
  if (cents == null) return "Free tier";
  const currency = record.subscription.currency ?? record.tier?.currency ?? "USD";
  return formatCurrency(cents / 100, currency);
};

  const formatRelative = (value?: string | null) => {
    if (!value) return "—";
    try {
      return formatDistanceToNow(new Date(value), { addSuffix: true });
    } catch {
      return new Date(value).toLocaleDateString();
    }
  };

  const statusMeta = (status?: string | null) => STATUS_META[status ?? "pending"] ?? STATUS_META.pending;

  const renderSkeletons = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <Card key={item}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/90 to-muted/40">
      <DomainAwareNavigation />
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary font-semibold">Memberships</p>
              <h1 className="text-3xl font-bold mt-1">Creators you support</h1>
              <p className="text-muted-foreground mt-2">
                Keep track of active perks, resume pending checkouts, and jump into Stripe billing when needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => loadMemberships()}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleCustomerPortal()}
                disabled={Boolean(managingPortalFor)}
              >
                {managingPortalFor === "__global" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Manage billing
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Unable to load memberships</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && memberships.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active memberships</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground">{summary.active}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Perks unlock instantly once active.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending checkout</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground">{summary.pending}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Finish payment to unlock creator perks.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Creators supported</CardTitle>
                  <CardDescription className="text-3xl font-bold text-foreground">{summary.creators}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Unique creator storefronts you’re backing.
                </CardContent>
              </Card>
            </div>
          )}

          {loading && renderSkeletons()}

          {!loading && memberships.length === 0 && !error && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>No memberships yet</CardTitle>
                <CardDescription>Support a creator to unlock exclusive drops, behind-the-scenes posts, and Discord perks.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/community" className="gap-2">
                    Explore creators
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && memberships.length > 0 && (
            <div className="space-y-4">
              {memberships.map((record) => {
                const { subscription, creator, tier } = record;
                const meta = statusMeta(subscription.status);
                return (
                  <Card key={subscription.id}>
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={creator?.avatar_url ?? undefined} />
                          <AvatarFallback>{(creator?.display_name ?? creator?.username ?? "C")?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl flex flex-wrap items-center gap-2">
                            {creator?.display_name || creator?.username || "Creator"}
                            <Badge variant="outline" className={`text-xs ${meta.className}`}>
                              {meta.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {tier?.name ? `${tier.name} tier • ${renderPrice(record)}` : renderPrice(record)}
                          </CardDescription>
                        </div>
                      </div>
                      {meta.description && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {subscription.status === "past_due" ? (
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {meta.description}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground tracking-wide">Supported since</p>
                          <p className="text-sm font-medium">{new Date(subscription.created_at).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{formatRelative(subscription.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground tracking-wide">Last payment</p>
                          <p className="text-sm font-medium">
                            {subscription.last_payment_at
                              ? new Date(subscription.last_payment_at).toLocaleDateString()
                              : "Pending"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelative(subscription.last_payment_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground tracking-wide">Stripe reference</p>
                          <p className="text-sm font-medium break-all">
                            {subscription.stripe_subscription_id ?? "Not created yet"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                          <Link to={`/profile/${subscription.creator_id}`} className="gap-2">
                            View creator
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        {subscription.status === "pending" && (
                          <Button
                            className="gap-2"
                            onClick={() => handleResumeCheckout(record)}
                            disabled={resumingId === subscription.id}
                          >
                            {resumingId === subscription.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            Resume checkout
                          </Button>
                        )}
                        {subscription.status !== "pending" && (
                          <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() => handleCustomerPortal(subscription.id)}
                            disabled={managingPortalFor === subscription.id}
                          >
                            {managingPortalFor === subscription.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            Manage billing
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountMemberships;
