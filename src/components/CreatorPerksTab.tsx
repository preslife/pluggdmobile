import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Crown, Star, Zap } from "lucide-react";
import { useCreatorSupport } from "@/hooks/useCreatorSupport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatorPerksTabProps {
  creatorId: string;
}

interface PerkedContent {
  id: string;
  title: string;
  perk_access: string;
  type: 'release' | 'content';
}

const PERK_TIERS = [
  {
    id: 'public',
    name: 'Free',
    price: 0,
    icon: Star,
    color: 'bg-gray-500',
    perks: ['Access to public releases', 'Community feed access', 'Basic support']
  },
  {
    id: 'supporter',
    name: 'Supporter', 
    price: 299, // $2.99
    icon: Crown,
    color: 'bg-blue-500',
    perks: ['All free perks', 'Exclusive releases', 'Behind-the-scenes content', 'Discord access']
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 999, // $9.99
    icon: Zap,
    color: 'bg-purple-500',
    perks: ['All supporter perks', 'Early access to releases', 'Personalized messages', 'Video calls (monthly)', 'Custom requests']
  }
];

export function CreatorPerksTab({ creatorId }: CreatorPerksTabProps) {
  const { subscribed, subscribe, unsubscribe, loading: supportLoading } = useCreatorSupport(creatorId);
  const [perkedContent, setPerkedContent] = useState<PerkedContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerkedContent();
  }, [creatorId]);

  const fetchPerkedContent = async () => {
    try {
      // Get releases with perk access requirements
      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select('id, title, perk_access')
        .eq('user_id', creatorId)
        .neq('perk_access', 'public');

      if (releasesError) throw releasesError;

      const content: PerkedContent[] = (releases || []).map(release => ({
        id: release.id,
        title: release.title,
        perk_access: release.perk_access || 'public',
        type: 'release'
      }));

      setPerkedContent(content);
    } catch (error) {
      console.error('Error fetching perked content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierPrice: number) => {
    try {
      await subscribe();
      toast.success('Successfully subscribed!');
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to subscribe');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      toast.success('Successfully unsubscribed');
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Failed to unsubscribe');
    }
  };

  const getContentForTier = (tierName: string) => {
    if (tierName === 'Free') return perkedContent.filter(c => c.perk_access === 'public');
    if (tierName === 'Supporter') return perkedContent.filter(c => ['supporter', 'public'].includes(c.perk_access));
    if (tierName === 'VIP') return perkedContent.filter(c => ['vip', 'supporter', 'public'].includes(c.perk_access));
    return [];
  };

  const getUserAccessLevel = (): 'public' | 'supporter' | 'vip' => {
    if (!subscribed) return 'public';
    // In a real implementation, this would check the subscription tier/amount
    // For now, return supporter - this could be enhanced to check subscription details
    return 'supporter';
  };

  const canAccessTier = (tierName: string) => {
    const userLevel = getUserAccessLevel();
    if (tierName === 'Free') return true;
    if (tierName === 'Supporter') return ['supporter', 'vip'].includes(userLevel);
    if (tierName === 'VIP') return userLevel === 'vip';
    return false;
  };

  if (loading) {
    return <div className="text-center py-8">Loading perks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Creator Perks</h2>
        <p className="text-muted-foreground">
          Support this creator and unlock exclusive content and perks
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PERK_TIERS.map((tier) => {
          const Icon = tier.icon;
          const hasAccess = canAccessTier(tier.name);
          const tierContent = getContentForTier(tier.name);

          return (
            <Card key={tier.id} className={`relative ${hasAccess ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="text-center">
                <div className={`w-12 h-12 rounded-full ${tier.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center justify-center gap-2">
                  {tier.name}
                  {hasAccess && <Unlock className="h-4 w-4 text-green-500" />}
                </CardTitle>
                <div className="text-2xl font-bold">
                  {tier.price === 0 ? 'Free' : `$${(tier.price / 100).toFixed(2)}/month`}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Perks included:</h4>
                  <ul className="space-y-1">
                    {tier.perks.map((perk, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 bg-current rounded-full" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>

                {tierContent.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Exclusive Content ({tierContent.length}):</h4>
                    <div className="space-y-1">
                      {tierContent.slice(0, 3).map((content) => (
                        <div key={content.id} className="flex items-center gap-2 text-sm">
                          {hasAccess ? (
                            <Unlock className="h-3 w-3 text-green-500" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className={hasAccess ? '' : 'text-muted-foreground'}>
                            {content.title}
                          </span>
                        </div>
                      ))}
                      {tierContent.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{tierContent.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  {tier.price === 0 ? (
                    <Badge variant="secondary" className="w-full justify-center">
                      Available to Everyone
                    </Badge>
                  ) : hasAccess ? (
                    <div className="space-y-2">
                      <Badge variant="default" className="w-full justify-center bg-green-500">
                        ✓ Subscribed
                      </Badge>
                      {subscribed && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={handleUnsubscribe}
                          disabled={supportLoading}
                        >
                          Manage Subscription
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleSubscribe(tier.price)}
                      disabled={supportLoading}
                    >
                      {supportLoading ? 'Processing...' : `Subscribe for $${(tier.price / 100).toFixed(2)}`}
                    </Button>
                  )}
                </div>
              </CardContent>

              {hasAccess && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-500">Current</Badge>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {perkedContent.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Exclusive Content Yet</h3>
            <p className="text-muted-foreground">
              This creator hasn't added any tier-exclusive content yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}