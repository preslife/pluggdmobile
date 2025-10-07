import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Crown,
  Heart,
  HeartHandshake,
  Star,
  Gift,
  Zap,
  Users,
  Lock,
  Unlock,
  TrendingUp,
  CheckCircle,
  Plus,
  Settings,
  CreditCard,
  Info,
} from 'lucide-react';

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface MembershipTierRow {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string;
  status: string;
  current_members: number;
  features: string[];
  emoji: string | null;
  color: string | null;
}

interface ActiveMembership {
  id: string;
  tier_id: string;
  started_at: string;
  membership_tiers: {
    name: string | null;
    price_monthly: number | null;
    currency: string | null;
  } | null;
}

interface MembershipStatsSummary {
  totalSubscribers: number;
  monthlyRevenue: number;
}

interface MembershipWidgetProps {
  creatorId: string;
  visitorStatus: VisitorStatus | null;
}

const ESTIMATE_MULTIPLIER_FOR_YEARLY = 1 / 12;

const normaliseFeatures = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }
  return [];
};

const deriveStats = (tiers: MembershipTierRow[]): MembershipStatsSummary => {
  const totalSubscribers = tiers.reduce((sum, tier) => sum + (tier.current_members ?? 0), 0);

  const monthlyRevenue = tiers.reduce((sum, tier) => {
    if (tier.price_monthly) {
      return sum + tier.price_monthly * (tier.current_members ?? 0);
    }

    if (tier.price_yearly) {
      return sum + tier.price_yearly * ESTIMATE_MULTIPLIER_FOR_YEARLY * (tier.current_members ?? 0);
    }

    return sum;
  }, 0);

  return {
    totalSubscribers,
    monthlyRevenue,
  };
};

const describePrice = (tier: MembershipTierRow) => {
  if (tier.price_monthly) {
    return {
      amount: formatCurrency(tier.price_monthly / 100, tier.currency || 'USD'),
      cadence: 'month',
    };
  }

  if (tier.price_yearly) {
    return {
      amount: formatCurrency(tier.price_yearly / 100, tier.currency || 'USD'),
      cadence: 'year',
    };
  }

  if (tier.price_lifetime) {
    return {
      amount: formatCurrency(tier.price_lifetime / 100, tier.currency || 'USD'),
      cadence: 'lifetime',
    };
  }

  return {
    amount: 'Free',
    cadence: '',
  };
};

export const MembershipWidget = ({ creatorId, visitorStatus }: MembershipWidgetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tiers, setTiers] = useState<MembershipTierRow[]>([]);
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [stats, setStats] = useState<MembershipStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribingTierId, setSubscribingTierId] = useState<string | null>(null);

  const loadMembershipData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: tierRows, error: tiersError } = await supabase
        .from('membership_tiers')
        .select(
          `id, name, description, price_monthly, price_yearly, price_lifetime, currency, status, current_members, features, emoji, color`
        )
        .eq('owner_type', 'profile')
        .eq('owner_id', creatorId)
        .neq('status', 'archived')
        .order('tier_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (tiersError) throw tiersError;

      const normalisedTiers: MembershipTierRow[] = (tierRows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        price_monthly: row.price_monthly ?? null,
        price_yearly: row.price_yearly ?? null,
        price_lifetime: row.price_lifetime ?? null,
        currency: row.currency ?? 'USD',
        status: row.status ?? 'draft',
        current_members: row.current_members ?? 0,
        features: normaliseFeatures(row.features),
        emoji: row.emoji ?? null,
        color: row.color ?? null,
      }));

      setTiers(normalisedTiers);
      setStats(deriveStats(normalisedTiers));

      if (user) {
        const { data: membershipRow, error: membershipError } = await supabase
          .from('memberships')
          .select(
            `id, tier_id, started_at, status, membership_tiers!inner(name, price_monthly, currency, owner_id, owner_type)`
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('membership_tiers.owner_type', 'profile')
          .eq('membership_tiers.owner_id', creatorId)
          .maybeSingle();

        if (membershipError && membershipError.code !== 'PGRST116') {
          throw membershipError;
        }

        setActiveMembership(membershipRow ?? null);
      } else {
        setActiveMembership(null);
      }
    } catch (err: any) {
      console.error('[MembershipWidget] load error', err);
      setError(err?.message ?? 'Unable to load membership data');
    } finally {
      setLoading(false);
    }
  }, [creatorId, user?.id]);

  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fanSubResult = params.get('fan_sub');
    if (!fanSubResult) {
      return;
    }

    const sessionId = params.get('session_id');

    if (fanSubResult === 'success') {
      toast({
        title: 'Membership confirmed',
        description: 'Welcome aboard! Perks will unlock automatically.',
      });
    } else if (fanSubResult === 'canceled') {
      toast({
        title: 'Checkout cancelled',
        description: 'No worries — you can restart the membership anytime.',
      });
    }

    loadMembershipData();

    params.delete('fan_sub');
    if (sessionId) params.delete('session_id');
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, [loadMembershipData, toast]);

  const handleSubscribe = async (tier: MembershipTierRow) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Create a free account to access memberships',
        variant: 'destructive',
      });
      return;
    }

    if (activeMembership) {
      toast({
        title: 'Already subscribed',
        description: 'You already have an active membership for this creator.',
        variant: 'destructive',
      });
      return;
    }

    setSubscribing(true);
    setSubscribingTierId(tier.id);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-fan-subscription', {
        body: {
          creatorId,
          membershipTierId: tier.id,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error('Membership checkout URL was not returned.');
    } catch (err: any) {
      console.error('[MembershipWidget] subscribe error', err);
      toast({
        title: 'Unable to start checkout',
        description: err?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
      setSubscribingTierId(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data, error: portalError } = await supabase.functions.invoke('customer-portal');
      if (portalError) throw portalError;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: 'Unable to open billing portal',
        description: err?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Info className="h-4 w-4" />
            Memberships unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-destructive">
          <p>{error}</p>
          <p className="text-xs opacity-80">
            If you believe this is an error, please refresh the page or try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isOwner = Boolean(visitorStatus?.isOwner);

  if (isOwner) {
    if (tiers.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Membership program
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              You haven&apos;t created any membership tiers yet. Head to Creator Studio → Memberships to publish your
              first tier and start earning support from fans.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/studio/memberships/tiers">
                <Plus className="h-4 w-4 mr-2" /> Create a tier
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Membership program
            </CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to="/studio/memberships/tiers">
                <Settings className="h-4 w-4 mr-2" /> Manage tiers
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-semibold">{stats.totalSubscribers}</div>
                <div className="text-muted-foreground">Subscribers</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {formatCurrency((stats.monthlyRevenue ?? 0) / 100, tiers[0]?.currency ?? 'USD')}
                </div>
                <div className="text-muted-foreground">Est. monthly revenue</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tiers.map((tier) => {
              const price = describePrice(tier);
              return (
                <div key={tier.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {tier.emoji && <span className="text-lg" aria-hidden>{tier.emoji}</span>}
                      <span>{tier.name}</span>
                      <Badge variant={tier.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {tier.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tier.current_members} member{tier.current_members === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">
                    {price.amount}
                    {price.cadence && <span className="text-xs text-muted-foreground"> / {price.cadence}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tiers.length === 0) {
    return null;
  }

  if (activeMembership) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Active membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="text-center">
            <Badge variant="outline" className="mb-2">
              {activeMembership.membership_tiers?.name ?? 'Supporter'}
            </Badge>
            <p className="text-muted-foreground">
              Supporting since {new Date(activeMembership.started_at).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={handleManageBilling}>
            <CreditCard className="h-4 w-4 mr-2" /> Manage billing
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Thank you for supporting this creator! 💜
          </p>
        </CardContent>
      </Card>
    );
  }

  const heroTier = tiers[0];
  const otherTiers = tiers.slice(1, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-primary" /> Support this creator
        </CardTitle>
        {stats && stats.totalSubscribers > 0 && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {stats.totalSubscribers} members already in the community
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Join the membership to unlock exclusive releases, behind-the-scenes updates, and more ways to support this
          artist.
        </p>

        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {heroTier?.emoji && <span className="text-lg" aria-hidden>{heroTier.emoji}</span>}
                  <span>{heroTier?.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {heroTier?.current_members ?? 0} member{(heroTier?.current_members ?? 0) === 1 ? '' : 's'}
                </div>
              </div>
              {heroTier && (
                <div className="text-right text-sm font-semibold">
                  {describePrice(heroTier).amount}
                  {describePrice(heroTier).cadence && (
                    <span className="text-xs text-muted-foreground"> / {describePrice(heroTier).cadence}</span>
                  )}
                </div>
              )}
            </div>
            {heroTier?.features?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {heroTier.features.slice(0, 3).map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{perk}</span>
                  </li>
                ))}
                {heroTier.features.length > 3 && (
                  <li className="text-[11px] text-muted-foreground/70">
                    +{heroTier.features.length - 3} more perks
                  </li>
                )}
              </ul>
            ) : null}
            <Button
              className="mt-4 w-full"
              disabled={subscribing && subscribingTierId === heroTier?.id}
              onClick={() => heroTier && handleSubscribe(heroTier)}
            >
              {subscribing && subscribingTierId === heroTier?.id ? 'Preparing checkout…' : 'Join membership'}
            </Button>
          </div>

          {otherTiers.length > 0 && (
            <div className="space-y-3 text-sm">
              {otherTiers.map((tier) => {
                const price = describePrice(tier);
                return (
                  <div key={tier.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            style={{ backgroundColor: tier.color ?? undefined }}
                            className={cn('text-[11px]', !tier.color && 'bg-muted text-muted-foreground')}
                          >
                            {tier.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tier.current_members} member{tier.current_members === 1 ? '' : 's'}
                          </span>
                        </div>
                        {tier.features.slice(0, 2).map((perk) => (
                          <div key={perk} className="text-[11px] text-muted-foreground">
                            • {perk}
                          </div>
                        ))}
                      </div>
                      <div className="text-right text-sm font-semibold">
                        {price.amount}
                        {price.cadence && <span className="text-xs text-muted-foreground"> / {price.cadence}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Cancel anytime. Perks unlock instantly after checkout completes.
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" />
            Membership payments are securely processed through Stripe.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
