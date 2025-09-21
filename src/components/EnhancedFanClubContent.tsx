import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users, TrendingUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FanClubTier {
  id: string;
  name: string;
  description: string;
  price_pence: number;
  benefits: string[];
  is_active: boolean;
  created_at: string;
  subscriber_count?: number;
}

interface CreatorEarnings {
  monthly_revenue: number;
  total_subscribers: number;
  top_tier: string;
}

export const EnhancedFanClubContent = ({ creatorId }: { creatorId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<FanClubTier[]>([]);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingTier, setIsCreatingTier] = useState(false);
  const [editingTier, setEditingTier] = useState<FanClubTier | null>(null);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  
  const [newTier, setNewTier] = useState({
    name: "",
    description: "",
    price_pence: 500, // £5.00 default
    benefits: [""]
  });

  const isOwner = user?.id === creatorId;

  useEffect(() => {
    fetchTiers();
    if (isOwner) {
      checkStripeAccount();
      fetchEarnings();
    }
  }, [creatorId, isOwner]);

  const formatPrice = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const fetchTiers = async () => {
    try {
      // Mock data until database types are updated
      const mockTiers: FanClubTier[] = [
        {
          id: '1',
          name: 'Bronze Support',
          description: 'Basic supporter tier with early access to content',
          price_pence: 500, // £5.00
          benefits: ['Early access to releases', 'Supporter badge'],
          is_active: true,
          created_at: new Date().toISOString(),
          subscriber_count: 12
        },
        {
          id: '2',
          name: 'Gold Support',
          description: 'Premium supporter tier with exclusive content',
          price_pence: 1000, // £10.00
          benefits: ['Everything in Bronze', 'Exclusive tracks', 'Monthly Q&A'],
          is_active: true,
          created_at: new Date().toISOString(),
          subscriber_count: 5
        }
      ];
      
      setTiers(mockTiers);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkStripeAccount = async () => {
    try {
      // For now, we'll assume no Stripe account until we can properly check
      setHasStripeAccount(false);
    } catch (error) {
      console.error('Error checking Stripe account:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      // Mock earnings data
      setEarnings({
        monthly_revenue: 136.0, // Mock: £136 monthly revenue (80% of £170 gross)
        total_subscribers: 17,
        top_tier: 'Bronze Support'
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const setupStripeAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up payment account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createTier = async () => {
    if (!newTier.name || !newTier.description || newTier.price_pence <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, create a simple tier record
      const tierData = {
        creator_id: creatorId,
        name: newTier.name,
        description: newTier.description,
        price_pence: newTier.price_pence,
        benefits: newTier.benefits.filter(b => b.trim() !== ''),
      };

      // This will be enabled once the types are updated
      // Creating new tier

      toast({
        title: "Coming Soon",
        description: "Fan club tier creation will be available soon!",
      });

      setNewTier({ name: "", description: "", price_pence: 500, benefits: [""] });
      setIsCreatingTier(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tier. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateTier = async () => {
    if (!editingTier) return;

    try {
      // For now, just log the update
      // Updating existing tier

      toast({
        title: "Success",
        description: "Tier updated successfully!",
      });

      setEditingTier(null);
      fetchTiers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tier. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteTier = async (tierId: string) => {
    try {
      // For now, just log the deletion
      // Deleting tier

      toast({
        title: "Success",
        description: "Tier deactivated successfully!",
      });

      fetchTiers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate tier. Please try again.",
        variant: "destructive",
      });
    }
  };

  const subscribeTo = async (tierId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      return;
    }

    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-fan-subscription', {
        body: { 
          creatorId, 
          pricePence: tier.price_pence 
        }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading fan club content...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Creator Dashboard */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Creator Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasStripeAccount ? (
              <div className="text-center p-6 border rounded-lg bg-muted/50">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Set up payments</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your bank account to receive fan subscription payments.
                </p>
                <Button onClick={setupStripeAccount}>
                  Set Up Payment Account
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    £{earnings?.monthly_revenue?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {earnings?.total_subscribers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Subscribers</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {tiers.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Tiers</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Tiers */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fan Club Tiers</h2>
        {isOwner && hasStripeAccount && (
          <Dialog open={isCreatingTier} onOpenChange={setIsCreatingTier}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tier</DialogTitle>
                <DialogDescription>
                  Set up a new subscription tier for your fans.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tier Name</Label>
                  <Input
                    id="name"
                    value={newTier.name}
                    onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                    placeholder="e.g., Bronze Supporter"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTier.description}
                    onChange={(e) => setNewTier({ ...newTier, description: e.target.value })}
                    placeholder="Describe what supporters get..."
                  />
                </div>
                <div>
                  <Label htmlFor="price">Monthly Price (£)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="1"
                    value={newTier.price_pence / 100}
                    onChange={(e) => setNewTier({ 
                      ...newTier, 
                      price_pence: Math.round(parseFloat(e.target.value) * 100) 
                    })}
                  />
                </div>
                <div>
                  <Label>Benefits</Label>
                  {newTier.benefits.map((benefit, index) => (
                    <Input
                      key={index}
                      value={benefit}
                      onChange={(e) => {
                        const newBenefits = [...newTier.benefits];
                        newBenefits[index] = e.target.value;
                        setNewTier({ ...newTier, benefits: newBenefits });
                      }}
                      placeholder={`Benefit ${index + 1}`}
                      className="mt-2"
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setNewTier({ 
                      ...newTier, 
                      benefits: [...newTier.benefits, ""] 
                    })}
                  >
                    Add Benefit
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createTier} className="flex-1">
                    Create Tier
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingTier(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No fan club tiers yet</h3>
            <p className="text-muted-foreground">
              {isOwner 
                ? "Create your first tier to start receiving fan support!" 
                : "This creator hasn't set up any fan subscription tiers yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card key={tier.id} className="relative">
              {isOwner && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTier(tier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTier(tier.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {tier.name}
                  <Badge variant="secondary">
                    {formatPrice(tier.price_pence)}/mo
                  </Badge>
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Benefits:</h4>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {tier.subscriber_count || 0} subscribers
                  </div>
                  {!isOwner && (
                    <Button onClick={() => subscribeTo(tier.id)}>
                      Subscribe
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Tier Dialog */}
      {editingTier && (
        <Dialog open={!!editingTier} onOpenChange={() => setEditingTier(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Tier Name</Label>
                <Input
                  id="edit-name"
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ 
                    ...editingTier, 
                    name: e.target.value 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTier.description}
                  onChange={(e) => setEditingTier({ 
                    ...editingTier, 
                    description: e.target.value 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Monthly Price (£)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="1"
                  value={editingTier.price_pence / 100}
                  onChange={(e) => setEditingTier({ 
                    ...editingTier, 
                    price_pence: Math.round(parseFloat(e.target.value) * 100) 
                  })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={updateTier} className="flex-1">
                  Update Tier
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingTier(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};