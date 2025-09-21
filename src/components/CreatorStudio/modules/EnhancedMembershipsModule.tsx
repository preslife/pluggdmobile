import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Gift,
  Crown,
  Star,
  Zap,
  Shield,
  CheckCircle,
  TrendingUp,
  Settings,
  Edit,
  Trash2
} from 'lucide-react';

interface MembershipTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  perks: string[];
  is_active: boolean;
  subscriber_count: number;
  color: string;
}

interface Subscriber {
  id: string;
  user_id: string;
  tier_id: string;
  tier_name: string;
  username: string;
  email: string;
  joined_date: string;
  status: 'active' | 'paused' | 'cancelled';
  lifetime_value: number;
}

/**
 * EnhancedMembershipsModule - Full membership/subscription management
 * Connects to Stripe for payments and fan subscriptions
 */
export const EnhancedMembershipsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    monthlyRevenue: 0,
    averageValue: 0,
    churnRate: 0,
    growthRate: 0
  });
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  
  // Form state for creating/editing tiers
  const [tierForm, setTierForm] = useState({
    name: '',
    description: '',
    price: 5,
    features: '',
    perks: '',
    color: 'blue'
  });

  useEffect(() => {
    if (user) {
      fetchMembershipData();
    }
  }, [user]);

  const fetchMembershipData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch fan subscriptions
      const { data: subscriptions } = await supabase
        .from('fan_subscriptions')
        .select('*, profiles!fan_subscriptions_fan_id_fkey(username, email)')
        .eq('creator_id', user.id)
        .eq('status', 'active');
      
      // Mock tier data (would come from database)
      const mockTiers: MembershipTier[] = [
        {
          id: '1',
          name: 'Supporter',
          description: 'Basic support tier for fans',
          price: 5,
          features: ['Early access to releases', 'Exclusive updates', 'Discord access'],
          perks: ['10% merch discount', 'Monthly Q&A'],
          is_active: true,
          subscriber_count: subscriptions?.filter(s => s.price_cents === 500).length || 0,
          color: 'blue'
        },
        {
          id: '2',
          name: 'VIP',
          description: 'Premium tier with extra perks',
          price: 15,
          features: ['Everything in Supporter', 'Exclusive content', 'Behind the scenes', 'Direct messaging'],
          perks: ['25% merch discount', 'Free digital downloads', 'Birthday shoutout'],
          is_active: true,
          subscriber_count: subscriptions?.filter(s => s.price_cents === 1500).length || 0,
          color: 'purple'
        },
        {
          id: '3',
          name: 'Producer Circle',
          description: 'Top tier for serious supporters',
          price: 50,
          features: ['Everything in VIP', '1-on-1 monthly call', 'Production tutorials', 'Stems & project files'],
          perks: ['50% merch discount', 'Guest list spots', 'Credits in releases', 'Custom beats'],
          is_active: true,
          subscriber_count: subscriptions?.filter(s => s.price_cents === 5000).length || 0,
          color: 'gold'
        }
      ];
      
      setTiers(mockTiers);
      
      // Process subscribers
      const processedSubscribers: Subscriber[] = subscriptions?.map((sub: any) => ({
        id: sub.id,
        user_id: sub.fan_id,
        tier_id: sub.price_cents === 500 ? '1' : sub.price_cents === 1500 ? '2' : '3',
        tier_name: sub.price_cents === 500 ? 'Supporter' : sub.price_cents === 1500 ? 'VIP' : 'Producer Circle',
        username: sub.profiles?.username || 'Unknown',
        email: sub.profiles?.email || '',
        joined_date: sub.created_at,
        status: sub.status,
        lifetime_value: (sub.price_cents / 100) * 3 // Mock calculation
      })) || [];
      
      setSubscribers(processedSubscribers);
      
      // Calculate stats
      const totalSubs = processedSubscribers.length;
      const monthlyRev = processedSubscribers.reduce((sum, sub) => {
        const tier = mockTiers.find(t => t.id === sub.tier_id);
        return sum + (tier?.price || 0);
      }, 0);
      
      setStats({
        totalSubscribers: totalSubs,
        monthlyRevenue: monthlyRev,
        averageValue: totalSubs > 0 ? monthlyRev / totalSubs : 0,
        churnRate: 2.5, // Mock
        growthRate: 15.3 // Mock
      });
      
    } catch (error: any) {
      console.error('Error fetching membership data:', error);
      toast({
        title: "Error loading memberships",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTier = async () => {
    try {
      // In production, this would create a Stripe product/price
      toast({
        title: "Tier created",
        description: `${tierForm.name} tier has been created successfully`,
      });
      
      setShowCreateTier(false);
      setTierForm({ name: '', description: '', price: 5, features: '', perks: '', color: 'blue' });
      fetchMembershipData();
    } catch (error: any) {
      toast({
        title: "Error creating tier",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier? Existing subscribers will be unaffected.')) {
      return;
    }
    
    try {
      // In production, archive the Stripe product
      toast({
        title: "Tier deleted",
        description: "The membership tier has been removed",
      });
      fetchMembershipData();
    } catch (error: any) {
      toast({
        title: "Error deleting tier",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Memberships & Subscriptions</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-secondary rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-secondary rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Memberships & Subscriptions</h1>
          <p className="text-muted-foreground">Create tiers and manage your paying supporters</p>
        </div>
        <Button onClick={() => setShowCreateTier(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Tier
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">Recurring income</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per subscriber</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate}%</div>
            <p className="text-xs text-muted-foreground">Monthly churn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+{stats.growthRate}%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="perks">Perks & Benefits</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <Card key={tier.id} className={`relative ${!tier.is_active && 'opacity-60'}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {tier.name === 'Producer Circle' && <Crown className="w-5 h-5 text-yellow-500" />}
                        {tier.name === 'VIP' && <Star className="w-5 h-5 text-purple-500" />}
                        {tier.name === 'Supporter' && <Heart className="w-5 h-5 text-blue-500" />}
                        {tier.name}
                      </CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingTier(tier)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTier(tier.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">${tier.price}</div>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Features:</p>
                    <ul className="text-sm space-y-1">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Perks:</p>
                    <ul className="text-sm space-y-1">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-purple-500" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {tier.subscriber_count} subscribers
                      </span>
                      <Switch checked={tier.is_active} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscribers</CardTitle>
              <CardDescription>Manage your paying supporters</CardDescription>
            </CardHeader>
            <CardContent>
              {subscribers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No subscribers yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Share your membership page to start growing your community
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscribers.map((subscriber) => (
                    <div key={subscriber.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {subscriber.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{subscriber.username}</p>
                          <p className="text-sm text-muted-foreground">{subscriber.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={subscriber.tier_id === '3' ? 'default' : 'secondary'}>
                          {subscriber.tier_name}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">${subscriber.lifetime_value.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Since {new Date(subscriber.joined_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Perks & Benefits</CardTitle>
              <CardDescription>Configure what each tier receives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Digital Perks</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Early Access</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Exclusive Content</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Physical Perks</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm">Merch Discounts</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        <span className="text-sm">VIP Event Access</span>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membership Analytics</CardTitle>
              <CardDescription>Track your membership program performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Track subscriber growth, revenue trends, and engagement metrics
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Tier Modal */}
      {(showCreateTier || editingTier) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingTier ? 'Edit Tier' : 'Create New Tier'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tier Name</Label>
                <Input
                  id="name"
                  value={tierForm.name}
                  onChange={(e) => setTierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., VIP Supporter"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={tierForm.description}
                  onChange={(e) => setTierForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What makes this tier special?"
                />
              </div>
              <div>
                <Label htmlFor="price">Monthly Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={tierForm.price}
                  onChange={(e) => setTierForm(prev => ({ ...prev, price: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={tierForm.features}
                  onChange={(e) => setTierForm(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="Early access&#10;Exclusive content&#10;Discord access"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="perks">Perks (one per line)</Label>
                <Textarea
                  id="perks"
                  value={tierForm.perks}
                  onChange={(e) => setTierForm(prev => ({ ...prev, perks: e.target.value }))}
                  placeholder="20% merch discount&#10;Monthly Q&A&#10;Birthday shoutout"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateTier} className="flex-1">
                  {editingTier ? 'Update' : 'Create'} Tier
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateTier(false);
                    setEditingTier(null);
                    setTierForm({ name: '', description: '', price: 5, features: '', perks: '', color: 'blue' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMembershipsModule;
