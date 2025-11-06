
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreatorSupport } from "@/hooks/useCreatorSupport";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

type Props = {
  creatorId: string;
  className?: string;
};

type MembershipTierRow = {
  id: string;
  name: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string | null;
};

type TierOption = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: "monthly" | "yearly" | "lifetime";
  label: string;
};

const resolveTierOption = (row: MembershipTierRow): TierOption | null => {
  const currency = row.currency?.toUpperCase() || "USD";

  if (typeof row.price_monthly === "number" && row.price_monthly > 0) {
    return {
      id: row.id,
      name: row.name,
      priceCents: row.price_monthly,
      currency,
      billingInterval: "monthly",
      label: `${formatCurrency(row.price_monthly / 100, currency)}/month`,
    };
  }

  if (typeof row.price_yearly === "number" && row.price_yearly > 0) {
    return {
      id: row.id,
      name: row.name,
      priceCents: row.price_yearly,
      currency,
      billingInterval: "yearly",
      label: `${formatCurrency(row.price_yearly / 100, currency)}/year`,
    };
  }

  if (typeof row.price_lifetime === "number" && row.price_lifetime > 0) {
    return {
      id: row.id,
      name: row.name,
      priceCents: row.price_lifetime,
      currency,
      billingInterval: "lifetime",
      label: `${formatCurrency(row.price_lifetime / 100, currency)} lifetime`,
    };
  }

  return null;
};

const CreatorSupportCard = ({ creatorId, className }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscribed, loading, isOwner } = useCreatorSupport(creatorId);
  const [supporterCount, setSupporterCount] = useState<number | null>(null);
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);
  const [showTierPicker, setShowTierPicker] = useState(false);

  const loadSupporterCount = useCallback(async () => {
    if (!creatorId) return;
    const { count, error } = await (supabase.from as any)("fan_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorId)
      .eq("status", "active");
    if (!error) setSupporterCount(count ?? 0);
  }, [creatorId]);

  const loadMembershipTiers = useCallback(async () => {
    if (!creatorId) return;
    const { data, error } = await supabase
      .from("membership_tiers")
      .select(
        "id, name, description, tier_order, price_monthly, price_yearly, price_lifetime, currency, status"
      )
      .eq("owner_type", "profile")
      .eq("owner_id", creatorId)
      .eq("status", "active")
      .order("tier_order", { ascending: true });

    if (error) {
      console.error("[CreatorSupportCard] Failed to load membership tiers", error);
      setTiers([]);
      setSelectedTier(null);
      return;
    }

    const mapped =
      data
        ?.map((row) => resolveTierOption(row as MembershipTierRow))
        .filter((tier): tier is TierOption => Boolean(tier)) ?? [];

    setTiers(mapped);
    if (mapped.length === 1) {
      setSelectedTier(mapped[0]);
    } else {
      setSelectedTier(null);
    }
  }, [creatorId]);

  useEffect(() => {
    void loadSupporterCount();
  }, [loadSupporterCount, subscribed]);

  useEffect(() => {
    void loadMembershipTiers();
  }, [loadMembershipTiers, subscribed]);

  const tierSummary = useMemo(() => {
    if (tiers.length === 0) return "No membership tiers available";
    if (tiers.length === 1) return tiers[0].label;
    return `${tiers.length} membership tiers available`;
  }, [tiers]);

  const onSubscribePaid = async (tier?: any) => {
    if (!creatorId) return;
    
    const tierToUse: TierOption | null = tier ?? selectedTier;
    if (!tierToUse) {
      toast({ title: "No tier selected", description: "Please select a subscription tier", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-fan-subscription", {
      body: { creatorId, membershipTierId: tierToUse.id },
    });
    if (error || !data?.url) {
      toast({ title: "Could not start subscription", description: (error as any)?.message || 'Unknown error', variant: "destructive" });
      return;
    }
    window.open((data as any).url, '_blank');
    setShowTierPicker(false);
  };

  const onManageBilling = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error || !data?.url) {
      toast({ title: "Unable to open billing portal", description: (error as any)?.message || 'Unknown error', variant: "destructive" });
      return;
    }
    window.open((data as any).url, "_blank");
    setShowTierPicker(false);
  };
  if (isOwner) return null;

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-primary" />
          Support this Creator
        </CardTitle>
        {typeof supporterCount === "number" && (
          <Badge variant="secondary" title="Active supporters">
            {supporterCount} {supporterCount === 1 ? "supporter" : "supporters"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Subscribe to unlock exclusive projects and behind‑the‑scenes content. Billed monthly via Stripe.
        </p>
        <p className="text-xs text-muted-foreground">{tierSummary}</p>
        {!user ? (
          <Button asChild className="w-full">
            <Link to="/auth">Sign in to support</Link>
          </Button>
        ) : subscribed ? (
          <div className="flex gap-2">
            <Button variant="secondary" disabled className="flex-1">
              Subscribed
            </Button>
            <Button variant="ghost" onClick={onManageBilling}>
              Manage billing
            </Button>
          </div>
        ) : tiers.length === 0 ? (
          <Button disabled className="w-full" variant="outline">
            Membership tiers coming soon
          </Button>
        ) : tiers.length === 1 && selectedTier ? (
          <Button onClick={() => onSubscribePaid(selectedTier)} disabled={loading} className="w-full">
            Subscribe {selectedTier.label}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={() => setShowTierPicker(true)} disabled={loading} className="w-full">
              Choose Subscription Tier
            </Button>
            {showTierPicker && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm">Select a tier:</h4>
                {tiers.map((tier) => (
                  <Button
                    key={tier.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => onSubscribePaid(tier)}
                  >
                    <span>{tier.name}</span>
                    <span>{tier.label}</span>
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setShowTierPicker(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Status: {subscribed ? "Active" : "Not subscribed"}</p>
      </CardContent>
    </Card>
  );
};

export default CreatorSupportCard;
