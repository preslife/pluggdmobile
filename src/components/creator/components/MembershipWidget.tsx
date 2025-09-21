import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  CreditCard
} from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  benefits: string[];
  badge_color?: string;
  max_subscribers?: number;
  current_subscribers?: number;
  is_popular?: boolean;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface MembershipStats {
  total_subscribers: number;
  monthly_revenue: number;
  growth_rate: number;
  tier_distribution: Record<string, number>;
}

interface MembershipWidgetProps {
  creatorId: string;
  visitorStatus: VisitorStatus | null;
}

export const MembershipWidget = ({ creatorId, visitorStatus }: MembershipWidgetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchMembershipData();
  }, [creatorId, user]);

  const fetchMembershipData = async () => {
    try {
      setLoading(true);

      // Fetch subscription tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('creator_subscription_tiers')
        .select('*')
        .eq('user_id', creatorId)
        .eq('active', true)
        .order('price_cents', { ascending: true });

      if (tiersError) throw tiersError;

      // Fetch current subscription if user is logged in
      let subscriptionData = null;
      if (user) {
        const { data: subData } = await supabase
          .from('fan_subscriptions')
          .select(`
            *,
            creator_subscription_tiers (*)
          `)
          .eq('user_id', user.id)
          .eq('creator_id', creatorId)
          .eq('status', 'active')
          .maybeSingle();

        subscriptionData = subData;
      }

      // Fetch membership stats
      const { data: statsData } = await supabase.rpc('get_creator_membership_stats', {
        p_creator_id: creatorId
      });

      // Enhanced tiers with subscriber counts
      const enhancedTiers = await Promise.all(
        (tiersData || []).map(async (tier) => {
          const { count } = await supabase
            .from('fan_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('tier_id', tier.id)
            .eq('status', 'active');

          return {
            ...tier,
            current_subscribers: count || 0
          };
        })
      );

      setTiers(enhancedTiers);
      setCurrentSubscription(subscriptionData);
      setStats(statsData?.[0] || null);

    } catch (error) {
      console.error('Error fetching membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to creators",
        variant: "destructive"
      });
      return;
    }

    if (currentSubscription) {
      toast({
        title: "Already subscribed",
        description: "You're already supporting this creator",
        variant: "destructive"
      });
      return;
    }

    setSubscribing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-fan-subscription', {
        body: {
          creatorId,
          tierId: tier.id,
          priceCents: tier.price_cents
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }

    } catch (error: any) {
      toast({
        title: "Subscription failed",
        description: error.message || "Unable to process subscription",
        variant: "destructive"
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to open billing portal",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Owner view
  if (visitorStatus?.isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_subscribers}</div>
                <div className="text-xs text-muted-foreground">Subscribers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(stats.monthly_revenue)}</div>
                <div className="text-xs text-muted-foreground">Monthly</div>
              </div>
            </div>
          )}

          {tiers.length === 0 ? (
            <div className="text-center py-6">
              <Crown className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Set up membership tiers to monetize your content
              </p>
              <Button asChild size="sm">
                <Link to="/creator/subscriptions">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tiers
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{tier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tier.current_subscribers} subscribers
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(tier.price_cents / 100)}/mo
                  </div>
                </div>
              ))}
              
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/creator/subscriptions">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Tiers
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // No tiers available
  if (tiers.length === 0) {
    return null;
  }

  // Already subscribed
  if (currentSubscription) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Active Membership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Badge variant="outline" className="mb-2">
              {currentSubscription.creator_subscription_tiers?.name}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Supporting since {new Date(currentSubscription.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleManageBilling}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Thank you for supporting this creator! 💜
          </div>
        </CardContent>
      </Card>
    );
  }

  // Subscription options for visitors
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-primary" />
          Support This Creator
        </CardTitle>
        {stats && stats.total_subscribers > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{stats.total_subscribers} supporters</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get exclusive access to behind-the-scenes content, early releases, and direct creator interaction.
        </p>

        <div className="space-y-3">
          {tiers.slice(0, 2).map((tier) => (
            <div 
              key={tier.id} 
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                tier.is_popular ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{tier.name}</h4>
                  {tier.is_popular && (
                    <Badge variant="default" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(tier.price_cents / 100)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
              </div>

              {tier.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {tier.description}
                </p>
              )}

              {tier.benefits && tier.benefits.length > 0 && (
                <ul className="text-sm space-y-1 mb-4">
                  {tier.benefits.slice(0, 3).map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {benefit}
                    </li>
                  ))}
                  {tier.benefits.length > 3 && (
                    <li className="text-muted-foreground">
                      +{tier.benefits.length - 3} more benefits
                    </li>
                  )}
                </ul>
              )}

              {/* Subscriber progress for limited tiers */}
              {tier.max_subscribers && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{tier.current_subscribers} / {tier.max_subscribers} spots</span>
                    <span>{Math.round(((tier.current_subscribers || 0) / tier.max_subscribers) * 100)}% filled</span>
                  </div>
                  <Progress 
                    value={((tier.current_subscribers || 0) / tier.max_subscribers) * 100} 
                    className="h-2"
                  />
                </div>
              )}

              <Button 
                onClick={() => handleSubscribe(tier)}
                disabled={subscribing || !user}
                className="w-full"
                variant={tier.is_popular ? "default" : "outline"}
              >
                {!user ? (
                  <>
                    <Link to="/auth" className="flex items-center">
                      Sign in to Subscribe
                    </Link>
                  </>
                ) : subscribing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Subscribe {formatCurrency(tier.price_cents / 100)}/mo
                  </>
                )}
              </Button>
            </div>
          ))}

          {tiers.length > 2 && (
            <Button variant="ghost" size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              View All {tiers.length} Tiers
            </Button>
          )}
        </div>

        <Separator />

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Secure payments via Stripe • Cancel anytime
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipWidget;