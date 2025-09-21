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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { 
  Target, 
  Plus, 
  DollarSign, 
  Users,
  Clock,
  TrendingUp,
  Gift,
  Share2,
  Edit,
  Eye,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Rocket
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  backer_count: number;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  category: string;
  rewards: Reward[];
  updates: Update[];
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  limit?: number;
  claimed: number;
  delivery_date: string;
  items: string[];
}

interface Update {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Backer {
  id: string;
  name: string;
  amount: number;
  reward_title?: string;
  date: string;
  message?: string;
}

/**
 * EnhancedCrowdfundingModule - Crowdfunding campaign management
 * Allows creators to raise funds for projects, albums, tours, etc.
 */
export const EnhancedCrowdfundingModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [backers, setBackers] = useState<Backer[]>([]);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    goal_amount: 5000,
    end_date: '',
    category: 'album'
  });
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // In production, fetch from campaigns table
      // For now, use mock data
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          title: 'New Album: "Midnight Sessions"',
          description: 'Help fund the production and release of my upcoming album featuring 12 original tracks.',
          goal_amount: 10000,
          current_amount: 7250,
          backer_count: 89,
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          category: 'album',
          rewards: [
            {
              id: '1',
              title: 'Digital Album',
              description: 'Get the full album in high-quality digital format',
              amount: 10,
              claimed: 45,
              delivery_date: '2024-06-01',
              items: ['Digital album download', 'Exclusive artwork']
            },
            {
              id: '2',
              title: 'Signed Physical CD',
              description: 'Physical CD with signed cover art',
              amount: 25,
              claimed: 28,
              limit: 100,
              delivery_date: '2024-06-15',
              items: ['Signed CD', 'Digital album', 'Thank you note']
            },
            {
              id: '3',
              title: 'VIP Producer Package',
              description: 'Get producer credit and exclusive content',
              amount: 100,
              claimed: 12,
              limit: 50,
              delivery_date: '2024-06-01',
              items: ['Producer credit', 'All stems', 'Video call', 'Signed merch']
            }
          ],
          updates: [
            {
              id: '1',
              title: 'Recording Complete!',
              content: 'All tracks have been recorded. Moving to mixing phase.',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setCampaigns(mockCampaigns);
      setActiveCampaign(mockCampaigns.find(c => c.status === 'active') || null);
      
      // Mock backers
      const mockBackers: Backer[] = [
        {
          id: '1',
          name: 'John Smith',
          amount: 100,
          reward_title: 'VIP Producer Package',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'Can\'t wait for the album!'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          amount: 25,
          reward_title: 'Signed Physical CD',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          name: 'Mike Davis',
          amount: 10,
          reward_title: 'Digital Album',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setBackers(mockBackers);
      
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error loading campaigns",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      // In production, create campaign in database and Stripe
      toast({
        title: "Campaign created",
        description: "Your crowdfunding campaign is now live!",
      });
      
      setShowCreateCampaign(false);
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: "Error creating campaign",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const calculateDaysLeft = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Crowdfunding Campaigns</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-secondary rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-secondary rounded" />
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
          <h1 className="text-3xl font-bold">Crowdfunding Campaigns</h1>
          <p className="text-muted-foreground">Raise funds for your creative projects</p>
        </div>
        <Button onClick={() => setShowCreateCampaign(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Active Campaign Overview */}
      {activeCampaign && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{activeCampaign.title}</CardTitle>
                <CardDescription>{activeCampaign.description}</CardDescription>
              </div>
              <Badge variant="default" className="animate-pulse">
                <Rocket className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  ${activeCampaign.current_amount.toLocaleString()} of ${activeCampaign.goal_amount.toLocaleString()}
                </span>
              </div>
              <Progress value={calculateProgress(activeCampaign.current_amount, activeCampaign.goal_amount)} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(calculateProgress(activeCampaign.current_amount, activeCampaign.goal_amount))}% funded</span>
                <span>{calculateDaysLeft(activeCampaign.end_date)} days left</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">${activeCampaign.current_amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">raised</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCampaign.backer_count}</p>
                <p className="text-sm text-muted-foreground">backers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{calculateDaysLeft(activeCampaign.end_date)}</p>
                <p className="text-sm text-muted-foreground">days left</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit Campaign
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="backers">Backers</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="all-campaigns">All Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Reward Tiers</CardTitle>
                  <CardDescription>Manage your campaign rewards and perks</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reward
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeCampaign?.rewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rewards created yet</p>
                  <Button className="mt-4">Create First Reward</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCampaign?.rewards.map((reward) => (
                    <div key={reward.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">{reward.title}</h3>
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {reward.items.map((item, i) => (
                              <Badge key={i} variant="secondary">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {item}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Delivery: {new Date(reward.delivery_date).toLocaleDateString()}</span>
                            {reward.limit && (
                              <span>Limited: {reward.claimed}/{reward.limit}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">${reward.amount}</p>
                          <p className="text-sm text-muted-foreground">{reward.claimed} claimed</p>
                          <div className="flex gap-1 mt-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Backers</CardTitle>
              <CardDescription>People supporting your campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {backers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No backers yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Share your campaign to get your first backers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backers.map((backer) => (
                    <div key={backer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {backer.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{backer.name}</p>
                          {backer.message && (
                            <p className="text-sm text-muted-foreground italic">"{backer.message}"</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${backer.amount}</p>
                        {backer.reward_title && (
                          <p className="text-xs text-muted-foreground">{backer.reward_title}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(backer.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Campaign Updates</CardTitle>
                  <CardDescription>Keep your backers informed</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeCampaign?.updates.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No updates posted</p>
                  <Button className="mt-4">Post First Update</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCampaign?.updates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold">{update.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(update.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Funding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Analytics coming soon</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Backer Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Demographics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all-campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Your crowdfunding history</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No campaigns created yet</p>
                  <Button className="mt-4" onClick={() => setShowCreateCampaign(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <p className="text-sm text-muted-foreground">{campaign.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Progress 
                              value={calculateProgress(campaign.current_amount, campaign.goal_amount)} 
                              className="w-32 h-2"
                            />
                            <span className="text-sm">
                              ${campaign.current_amount.toLocaleString()} / ${campaign.goal_amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Campaign</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="My Amazing Project"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell your story and explain what you're raising funds for..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal">Funding Goal ($)</Label>
                  <Input
                    id="goal"
                    type="number"
                    value={campaignForm.goal_amount}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, goal_amount: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={campaignForm.end_date}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCampaign} className="flex-1">
                  Create Campaign
                </Button>
                <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
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

export default EnhancedCrowdfundingModule;
