
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreatorSupport } from "@/hooks/useCreatorSupport";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { HeartHandshake } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  creatorId: string;
  className?: string;
};

const CreatorSupportCard = ({ creatorId, className }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscribed, loading, subscribe, unsubscribe, isOwner } = useCreatorSupport(creatorId);
  const [supporterCount, setSupporterCount] = useState<number | null>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [showTierPicker, setShowTierPicker] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    const fetchData = async () => {
      // Fetch supporter count
      const { count, error } = await (supabase as any)
        .from("fan_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("status", "active");
      if (!error) setSupporterCount(count ?? 0);

      // Fetch creator's subscription tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from("creator_subscription_tiers")
        .select("*")
        .eq("user_id", creatorId)
        .eq("active", true)
        .order("price_cents", { ascending: true });
      
      if (!tiersError && tiersData) {
        setTiers(tiersData);
        if (tiersData.length === 1) {
          setSelectedTier(tiersData[0]);
        }
      }
    };
    fetchData();
  }, [creatorId, subscribed]);

  const onSubscribePaid = async (tier?: any) => {
    if (!creatorId) return;
    
    const tierToUse = tier || selectedTier;
    if (!tierToUse) {
      toast({ title: "No tier selected", description: "Please select a subscription tier", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.functions.invoke('create-fan-subscription', {
      body: { creatorId, priceCents: tierToUse.price_cents },
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
    window.open((data as any).url, '_blank');
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
          <Button disabled className="w-full">
            No subscription tiers available
          </Button>
        ) : tiers.length === 1 ? (
          <Button onClick={() => onSubscribePaid()} disabled={loading} className="w-full">
            Subscribe {formatCurrency(selectedTier?.price_cents / 100 || 0)}/mo
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
                    <span>{formatCurrency(tier.price_cents / 100)}/mo</span>
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
