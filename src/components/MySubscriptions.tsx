import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, Zap, ArrowUpCircle, Settings, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Subscription {
  id: string;
  creator_id: string;
  price_cents: number;
  status: string;
  created_at: string;
  creator: {
    user_id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

const getTierInfo = (priceCents: number) => {
  if (priceCents <= 299) {
    return {
      name: 'Supporter',
      icon: Crown,
      color: 'bg-blue-500',
      perks: ['Exclusive releases', 'Behind-the-scenes content', 'Discord access', 'Early notifications']
    };
  } else if (priceCents <= 999) {
    return {
      name: 'VIP',
      icon: Zap,
      color: 'bg-purple-500',
      perks: ['All supporter perks', 'Early access to releases', 'Personalized messages', 'Video calls (monthly)', 'Custom requests']
    };
  } else {
    return {
      name: 'Premium',
      icon: Star,
      color: 'bg-gold-500',
      perks: ['All VIP perks', '1-on-1 sessions', 'Exclusive collaborations', 'Merchandise discounts']
    };
  }
};

export function MySubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data: subscriptionsData, error } = await supabase
        .from("fan_subscriptions")
        .select("*")
        .eq("fan_id", user.id)
        .eq("status", "active");

      if (error) throw error;

      // Get creator data
      const creatorIds = [...new Set(subscriptionsData?.map(s => s.creator_id) || [])];
      const { data: creators } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", creatorIds);

      const creatorsMap = new Map(creators?.map(c => [c.user_id, c]) || []);

      const subscriptionsWithCreators = subscriptionsData?.map(subscription => {
        const creator = creatorsMap.get(subscription.creator_id) || {
          user_id: subscription.creator_id,
          full_name: "Unknown Creator",
          username: "unknown",
          avatar_url: null
        };

        return {
          ...subscription,
          creator
        };
      }) || [];

      setSubscriptions(subscriptionsWithCreators);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('fan_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Successfully unsubscribed');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Sign in to view subscriptions</h3>
        <p className="text-muted-foreground">
          You need to be signed in to see your creator subscriptions.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading subscriptions...</div>;
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No Active Subscriptions</h3>
        <p className="text-muted-foreground">
          You haven't subscribed to any creators yet. Browse creators to find exclusive content!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Subscriptions</h2>
          <p className="text-muted-foreground">
            Manage your creator subscriptions and view your perks
          </p>
        </div>
        <Badge variant="secondary">
          {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6">
        {subscriptions.map((subscription) => {
          const tierInfo = getTierInfo(subscription.price_cents);
          const Icon = tierInfo.icon;

          return (
            <Card key={subscription.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={subscription.creator?.avatar_url} />
                      <AvatarFallback>
                        {subscription.creator?.full_name?.[0] || 
                         subscription.creator?.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {subscription.creator?.full_name || 
                         subscription.creator?.username || 'Unknown Creator'}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${tierInfo.color} text-white`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {tierInfo.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ${(subscription.price_cents / 100).toFixed(2)}/month
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Subscribed {formatDistanceToNow(new Date(subscription.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Your Perks Unlocked:</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {tierInfo.perks.map((perk, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                    <Button variant="outline" size="sm">
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Upgrade
                    </Button>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleUnsubscribe(subscription.id)}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-medium mb-2">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Have questions about your subscriptions or need to update payment methods?
          </p>
          <Button variant="outline">Contact Support</Button>
        </CardContent>
      </Card>
    </div>
  );
}