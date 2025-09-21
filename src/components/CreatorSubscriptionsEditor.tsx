import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  price_cents: number;
  perks: string[];
  active: boolean;
}

export const CreatorSubscriptionsEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price_cents: 499,
    perks: '',
    active: true
  });

  useEffect(() => {
    if (user) {
      fetchTiers();
    }
  }, [user]);

  const fetchTiers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creator_subscription_tiers')
        .select('*')
        .eq('user_id', user.id)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription tiers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price_cents: 499,
      perks: '',
      active: true
    });
    setEditingTier(null);
    setIsCreating(false);
  };

  const handleEdit = (tier: SubscriptionTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      price_cents: tier.price_cents,
      perks: tier.perks.join('\n'),
      active: tier.active
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const tierData = {
        user_id: user.id,
        name: formData.name.trim(),
        price_cents: formData.price_cents,
        perks: formData.perks.split('\n').filter(perk => perk.trim()),
        active: formData.active
      };

      if (editingTier) {
        const { error } = await supabase
          .from('creator_subscription_tiers')
          .update(tierData)
          .eq('id', editingTier.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_subscription_tiers')
          .insert(tierData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Tier ${editingTier ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      fetchTiers();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subscription tier',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this subscription tier?')) return;

    try {
      const { error } = await supabase
        .from('creator_subscription_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Subscription tier deleted successfully',
      });

      fetchTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subscription tier',
        variant: 'destructive',
      });
    }
  };

  const toggleTierActive = async (tier: SubscriptionTier) => {
    try {
      const { error } = await supabase
        .from('creator_subscription_tiers')
        .update({ active: !tier.active })
        .eq('id', tier.id);

      if (error) throw error;

      fetchTiers();
    } catch (error) {
      console.error('Error toggling tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tier status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Tiers</h2>
          <p className="text-muted-foreground">Manage your fan subscription offerings</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tier
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTier ? 'Edit' : 'Create'} Subscription Tier</CardTitle>
            <CardDescription>
              Set up a subscription tier for your fans to support you monthly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Tier Name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Basic, Premium, VIP"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (in cents)*</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price_cents}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_cents: Number(e.target.value) }))}
                  placeholder="499"
                  min="100"
                  step="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Currently: {formatCurrency(formData.price_cents / 100)}/month
                </p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="perks">Perks (one per line)</Label>
              <Textarea
                id="perks"
                value={formData.perks}
                onChange={(e) => setFormData(prev => ({ ...prev, perks: e.target.value }))}
                placeholder="Early access to releases&#10;Behind-the-scenes content&#10;Monthly Q&A sessions"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Active (visible to fans)</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                {editingTier ? 'Update' : 'Create'} Tier
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card key={tier.id} className={!tier.active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tier.active}
                    onCheckedChange={() => toggleTierActive(tier)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(tier)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(tier.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {formatCurrency(tier.price_cents / 100)}/month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Perks:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {tier.perks.map((perk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && !isCreating && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No subscription tiers yet</h3>
            <p className="text-muted-foreground mb-4">
              Create subscription tiers to allow fans to support you monthly
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Tier
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
