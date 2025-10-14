import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Crown, Check, X } from 'lucide-react';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { setMeta } from '@/lib/seo';

const Subscription = () => {
  const { user } = useAuth();
  const { subscription, loading, refreshData } = useSubscription();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    setMeta(
      'Beat Marketplace Tiers — Pluggd',
      'Compare Free, Creator, and Pro plans for beat producers.',
      '/subscription'
    );
  }, []);

  const handleUpgrade = async (tier: 'creator' | 'pro') => {
    if (!user) return;

    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier }
      });

      if (error) throw error;
      
      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process.",
        variant: "destructive"
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      window.open(data.url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open customer portal.",
        variant: "destructive"
      });
    }
  };

  const formatTier = (t: 'free' | 'creator' | 'pro') => ({ free: 'Free', creator: 'Creator', pro: 'Pro' }[t]);

  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: '£0',
      commission: '15%',
      features: [
        'Upload up to 10 beats',
        'Basic storefront with brand colors',
        'Standard beat player with waveform',
        'Community marketplace exposure',
        'Basic analytics (plays, downloads, revenue)',
        'Standard licensing templates',
        'Mobile-responsive beat store',
        'Email support'
      ]
    },
    {
      name: 'Creator',
      tier: 'creator', 
      price: '£9.99',
      commission: '10%',
      features: [
        'Upload up to 100 beats',
        'Advanced analytics dashboard',
        'Beat promotion tools',
        'Custom licensing options',
        'Priority marketplace placement',
        'Embeddable beat players',
        'Batch upload tools',
        'Scheduled releases',
        'Fan email capture',
        'Priority email support'
      ]
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: '£24.99',
      commission: '5%',
      features: [
        'Unlimited beat uploads',
        '5% commission on marketplace sales',
        '0% commission on direct sales',
        'White-label custom storefront',
        'Advanced marketing automation',
        'Content ID protection',
        'API access',
        'Collaboration tools',
        'Advanced licensing templates',
        'Priority customer success manager',
        'Beta access to new features',
        'Detailed royalty reporting',
        'Export tools'
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Beat Marketplace Tiers</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your beat production goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <Card key={plan.tier} className={`relative ${subscription?.tier === plan.tier ? 'ring-2 ring-primary' : ''}`}>
                {subscription?.tier === plan.tier && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    Current Plan
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    {plan.tier !== 'free' && <Crown className="h-5 w-5" />}
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-3xl font-bold">{plan.price}</CardDescription>
                  {plan.tier !== 'free' && <p className="text-sm text-muted-foreground">per month</p>}
                  <div className="mt-2">
                    <span className="text-sm font-medium text-primary">Platform Commission: {plan.commission}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {subscription?.tier === plan.tier ? (
                    subscription.tier !== 'free' ? (
                      <Button onClick={handleManageSubscription} variant="outline" className="w-full">
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button disabled variant="outline" className="w-full">
                        Current Plan
                      </Button>
                    )
                  ) : plan.tier === 'free' ? (
                    <Button disabled variant="outline" className="w-full">
                      Downgrade Not Available
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleUpgrade(plan.tier as 'creator' | 'pro')}
                      disabled={upgrading}
                      className="w-full"
                    >
                      {upgrading ? 'Processing...' : 'Upgrade'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {subscription?.tier !== 'free' && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Manage your active subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Plan:</span>
                  <Badge>{formatTier(subscription.tier as 'free' | 'creator' | 'pro')} Plan</Badge>
                </div>
                {subscription.current_period_end && (
                  <div className="flex justify-between items-center">
                    <span>Next billing date:</span>
                    <span>{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                  </div>
                )}
                <Button onClick={handleManageSubscription} variant="outline" className="w-full">
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
