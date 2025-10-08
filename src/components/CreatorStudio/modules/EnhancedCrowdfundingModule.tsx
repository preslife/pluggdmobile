import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Gift,
  Plus,
  Rocket,
  Share2,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type RewardRow = Database['public']['Tables']['campaign_rewards']['Row'];
type SupporterRow = Database['public']['Tables']['campaign_supporters']['Row'];
type StatusHistoryRow = Database['public']['Tables']['campaign_status_history']['Row'];
type CampaignStatus = Database['public']['Enums']['campaign_status'];
type SupporterStatus = Database['public']['Enums']['campaign_supporter_status'];

type SupporterWithProfile = SupporterRow & {
  supporter?: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  } | null;
};

type CampaignWithRelations = CampaignRow & {
  campaign_rewards: RewardRow[];
  campaign_supporters: SupporterWithProfile[];
  campaign_status_history: StatusHistoryRow[];
};

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const statusConfig: Record<CampaignStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }>
  = {
  draft: { label: 'Draft', variant: 'secondary' },
  reviewing: { label: 'In Review', variant: 'outline' },
  live: { label: 'Live', variant: 'default' },
  success: { label: 'Successful', variant: 'default' },
  failed: { label: 'Unsuccessful', variant: 'destructive' },
  fulfilled: { label: 'Fulfilled', variant: 'outline' },
};

const supporterStatusLabel: Record<SupporterStatus, string> = {
  pledged: 'Pledged',
  fulfilled: 'Fulfilled',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

const formatCurrency = (amountCents: number | null | undefined) =>
  currencyFormatter.format((amountCents ?? 0) / 100);

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const calculateProgress = (currentCents: number, goalCents: number) => {
  if (!goalCents || goalCents <= 0) return 0;
  return Math.min((currentCents / goalCents) * 100, 100);
};

const calculateDaysLeft = (deadline: string | null) => {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
};

interface CampaignFormState {
  title: string;
  description: string;
  goalAmount: number;
  fundingDeadline: string;
  slug: string;
}

interface RewardFormState {
  title: string;
  description: string;
  amount: number;
  quantityLimit: string;
  estimatedDelivery: string;
}

const defaultCampaignForm: CampaignFormState = {
  title: '',
  description: '',
  goalAmount: 5000,
  fundingDeadline: '',
  slug: '',
};

const defaultRewardForm: RewardFormState = {
  title: '',
  description: '',
  amount: 25,
  quantityLimit: '',
  estimatedDelivery: '',
};

export const EnhancedCrowdfundingModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithRelations[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(defaultCampaignForm);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(defaultRewardForm);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [supporterActionId, setSupporterActionId] = useState<string | null>(null);
  const [publishingCampaignId, setPublishingCampaignId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const activeCampaign = useMemo(() => {
    if (!campaigns.length) return null;
    if (activeCampaignId) {
      return campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0];
    }

    const liveCampaign = campaigns.find((campaign) => campaign.status === 'live');
    if (liveCampaign) {
      return liveCampaign;
    }

    return campaigns[0];
  }, [campaigns, activeCampaignId]);

  const fetchCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_rewards(*),
          campaign_supporters(*, supporter:profiles!campaign_supporters_supporter_id_fkey(full_name, username, avatar_url)),
          campaign_status_history(*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sorted = (data ?? []).map((campaign) => ({
        ...campaign,
        campaign_rewards: [...(campaign.campaign_rewards ?? [])].sort(
          (a, b) => a.contribution_amount_cents - b.contribution_amount_cents
        ),
        campaign_supporters: [...(campaign.campaign_supporters ?? [])].sort(
          (a, b) => new Date(b.contributed_at).getTime() - new Date(a.contributed_at).getTime()
        ),
        campaign_status_history: [...(campaign.campaign_status_history ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      })) as CampaignWithRelations[];

      setCampaigns(sorted);
      if (!activeCampaignId && sorted.length) {
        const preferred = sorted.find((campaign) => campaign.status === 'live') ?? sorted[0];
        setActiveCampaignId(preferred.id);
      }
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error loading campaigns',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCampaignModal = (campaign?: CampaignWithRelations) => {
    if (campaign) {
      setCampaignForm({
        title: campaign.title,
        description: campaign.description ?? '',
        goalAmount: Math.round((campaign.goal_amount_cents ?? 0) / 100),
        fundingDeadline: campaign.funding_deadline ? campaign.funding_deadline.slice(0, 10) : '',
        slug: campaign.slug ?? '',
      });
      setEditingCampaignId(campaign.id);
    } else {
      setCampaignForm(defaultCampaignForm);
      setEditingCampaignId(null);
    }
    setShowCampaignModal(true);
  };

  const handleSaveCampaign = async () => {
    if (!user) return;

    try {
      setSavingCampaign(true);
      const goalCents = Math.max(0, Math.round((campaignForm.goalAmount || 0) * 100));
      const existing = editingCampaignId
        ? campaigns.find((campaign) => campaign.id === editingCampaignId)?.metadata
        : null;
      const payload: Partial<CampaignRow> = {
        title: campaignForm.title,
        description: campaignForm.description,
        goal_amount_cents: goalCents,
        funding_deadline: campaignForm.fundingDeadline ? new Date(campaignForm.fundingDeadline).toISOString() : null,
        slug: campaignForm.slug || null,
        metadata: {
          ...((existing as Record<string, unknown> | null) ?? {}),
          goal_currency: 'GBP',
        },
      };

      if (editingCampaignId) {
        const { error } = await supabase
          .from('campaigns')
          .update(payload)
          .eq('id', editingCampaignId);

        if (error) throw error;
        toast({ title: 'Campaign updated', description: 'Your changes have been saved.' });
      } else {
        const { error } = await supabase
          .from('campaigns')
          .insert({
            ...payload,
            creator_id: user.id,
            status: 'draft',
          });

        if (error) throw error;
        toast({ title: 'Campaign created', description: 'Your crowdfunding campaign has been created.' });
      }

      setShowCampaignModal(false);
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: editingCampaignId ? 'Error updating campaign' : 'Error creating campaign',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const openRewardModal = (reward?: RewardRow) => {
    if (!activeCampaign) return;
    if (reward) {
      setRewardForm({
        title: reward.title,
        description: reward.description ?? '',
        amount: Math.round((reward.contribution_amount_cents ?? 0) / 100),
        quantityLimit: reward.quantity_limit?.toString() ?? '',
        estimatedDelivery: reward.estimated_delivery ?? '',
      });
      setEditingRewardId(reward.id);
    } else {
      setRewardForm(defaultRewardForm);
      setEditingRewardId(null);
    }
    setShowRewardModal(true);
  };

  const handleSaveReward = async () => {
    if (!activeCampaign) return;

    try {
      const amountCents = Math.max(0, Math.round((rewardForm.amount || 0) * 100));
      const quantityLimit = rewardForm.quantityLimit ? parseInt(rewardForm.quantityLimit, 10) : null;
      const payload: Partial<RewardRow> = {
        title: rewardForm.title,
        description: rewardForm.description,
        contribution_amount_cents: amountCents,
        quantity_limit: quantityLimit,
        estimated_delivery: rewardForm.estimatedDelivery || null,
        metadata: { delivery_notes: rewardForm.estimatedDelivery },
      };

      if (editingRewardId) {
        const { error } = await supabase
          .from('campaign_rewards')
          .update(payload)
          .eq('id', editingRewardId)
          .eq('campaign_id', activeCampaign.id);
        if (error) throw error;
        toast({ title: 'Reward updated', description: 'Reward details have been saved.' });
      } else {
        const { error } = await supabase
          .from('campaign_rewards')
          .insert({
            ...payload,
            campaign_id: activeCampaign.id,
          });
        if (error) throw error;
        toast({ title: 'Reward created', description: 'New reward tier added to your campaign.' });
      }

      setShowRewardModal(false);
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: editingRewardId ? 'Error updating reward' : 'Error creating reward',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePublishCampaign = async (campaign: CampaignWithRelations, goLive: boolean) => {
    try {
      setPublishingCampaignId(campaign.id);
      const { error } = await supabase.rpc('crowdfunding_publish_campaign', {
        p_campaign_id: campaign.id,
        p_go_live: goLive,
        p_note: goLive ? 'Campaign launched' : 'Campaign submitted for review',
      });
      if (error) throw error;

      toast({
        title: goLive ? 'Campaign is live' : 'Review requested',
        description: goLive
          ? 'Your campaign is now live for supporters.'
          : 'We will review your campaign before it goes live.',
      });

      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Unable to update campaign status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPublishingCampaignId(null);
    }
  };

  const handleFinalizeCampaign = async (campaign: CampaignWithRelations, status: 'success' | 'failed' | 'fulfilled') => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaign.id);
      if (error) throw error;
      toast({
        title: 'Campaign status updated',
        description: `Campaign marked as ${statusConfig[status].label.toLowerCase()}.`,
      });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Unable to update campaign',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkSupporterFulfilled = async (supporter: SupporterWithProfile) => {
    try {
      setSupporterActionId(supporter.id);
      const note = window.prompt('Add a note for this fulfillment (optional)') ?? null;
      const { error } = await supabase.rpc('crowdfunding_mark_supporter_fulfilled', {
        p_supporter_entry: supporter.id,
        p_note: note,
      });
      if (error) throw error;
      toast({ title: 'Reward fulfilled', description: 'Supporter has been notified.' });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Unable to mark fulfilled',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSupporterActionId(null);
    }
  };

  const handleRefundSupporter = async (supporter: SupporterWithProfile) => {
    try {
      const reason = window.prompt('Enter refund reason');
      if (reason === null) return;
      setSupporterActionId(supporter.id);
      const { error } = await supabase.rpc('crowdfunding_refund_supporter', {
        p_supporter_entry: supporter.id,
        p_reason: reason,
        p_refund_cents: supporter.contribution_amount_cents,
      });
      if (error) throw error;
      toast({ title: 'Supporter refunded', description: 'Contribution has been refunded.' });
      fetchCampaigns();
    } catch (error: any) {
      toast({
        title: 'Unable to refund supporter',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSupporterActionId(null);
    }
  };

  const buildTimeline = (campaign: CampaignWithRelations) => {
    const statusEvents = campaign.campaign_status_history.map((history) => ({
      id: `status-${history.id}`,
      created_at: history.created_at,
      title: `${statusConfig[history.to_status].label}`,
      description: history.note ?? `Status changed from ${history.from_status ?? '—'} to ${history.to_status}`,
      type: 'status' as const,
    }));

    const supporterEvents = campaign.campaign_supporters.flatMap((supporter) => {
      const supporterName = supporter.supporter?.full_name || supporter.supporter?.username || 'Supporter';
      const rewardTitle = campaign.campaign_rewards.find((reward) => reward.id === supporter.reward_id)?.title ?? 'Support only';
      const metadata = (supporter.metadata as Record<string, unknown> | null) ?? {};
      const events: Array<{ id: string; created_at: string; title: string; description: string; type: string }> = [
        {
          id: `pledge-${supporter.id}`,
          created_at: supporter.contributed_at,
          title: `${supporterName} pledged ${formatCurrency(supporter.contribution_amount_cents)}`,
          description: `Reward: ${rewardTitle}`,
          type: 'pledge',
        },
      ];

      if (supporter.fulfilled_at) {
        events.push({
          id: `fulfilled-${supporter.id}`,
          created_at: supporter.fulfilled_at,
          title: `${supporterName} reward fulfilled`,
          description: supporterStatusLabel[supporter.status],
          type: 'fulfilled',
        });
      }

      if (supporter.refunded_at) {
        events.push({
          id: `refund-${supporter.id}`,
          created_at: supporter.refunded_at,
          title: `${supporterName} refunded`,
          description: typeof metadata.reason === 'string' && metadata.reason ? metadata.reason : 'Contribution refunded',
          type: 'refund',
        });
      }

      return events;
    });

    return [...statusEvents, ...supporterEvents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Crowdfunding Campaigns</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
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
          <p className="text-muted-foreground">Raise funds for your next project and reward your supporters.</p>
        </div>
        <Button onClick={() => openCampaignModal()}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {activeCampaign ? (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{activeCampaign.title}</CardTitle>
                  <Badge variant={statusConfig[activeCampaign.status].variant}>
                    {statusConfig[activeCampaign.status].label}
                  </Badge>
                </div>
                <CardDescription>{activeCampaign.description}</CardDescription>
              </div>
              {activeCampaign.status === 'live' && (
                <Badge variant="default" className="animate-pulse">
                  <Rocket className="w-3 h-3 mr-1" />
                  Live now
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {formatCurrency(activeCampaign.current_amount_cents)} of {formatCurrency(activeCampaign.goal_amount_cents)}
                </span>
              </div>
              <Progress value={calculateProgress(activeCampaign.current_amount_cents, activeCampaign.goal_amount_cents)} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {Math.round(calculateProgress(activeCampaign.current_amount_cents, activeCampaign.goal_amount_cents))}% funded
                </span>
                <span>
                  {activeCampaign.funding_deadline
                    ? `${calculateDaysLeft(activeCampaign.funding_deadline)} days left`
                    : 'No deadline'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(activeCampaign.current_amount_cents)}</p>
                <p className="text-sm text-muted-foreground">raised</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCampaign.supporter_count}</p>
                <p className="text-sm text-muted-foreground">supporters</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeCampaign.funding_deadline ? calculateDaysLeft(activeCampaign.funding_deadline) : '—'}
                </p>
                <p className="text-sm text-muted-foreground">days left</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="flex-1 min-w-[140px]" onClick={() => openCampaignModal(activeCampaign)}>
                <Edit className="w-4 h-4 mr-2" /> Edit Campaign
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-w-[140px]"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  const shareUrl = window.location.href;
                  const shareData = {
                    url: shareUrl,
                    title: activeCampaign.title,
                    text: activeCampaign.description ?? undefined,
                  };
                  if (navigator.share) {
                    navigator.share(shareData).catch(() => undefined);
                  } else {
                    window.open(shareUrl, '_blank');
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeCampaign.status === 'draft' && (
                <Button
                  variant="secondary"
                  disabled={publishingCampaignId === activeCampaign.id}
                  onClick={() => handlePublishCampaign(activeCampaign, false)}
                >
                  {publishingCampaignId === activeCampaign.id ? 'Submitting…' : 'Submit for review'}
                </Button>
              )}
              {activeCampaign.status === 'reviewing' && (
                <Button
                  disabled={publishingCampaignId === activeCampaign.id}
                  onClick={() => handlePublishCampaign(activeCampaign, true)}
                >
                  {publishingCampaignId === activeCampaign.id ? 'Going live…' : 'Go live'}
                </Button>
              )}
              {activeCampaign.status === 'live' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleFinalizeCampaign(activeCampaign, 'success')}
                  >
                    Mark Successful
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleFinalizeCampaign(activeCampaign, 'failed')}
                  >
                    Mark Failed
                  </Button>
                </div>
              )}
              {(activeCampaign.status === 'success' || activeCampaign.status === 'failed') && (
                <Button onClick={() => handleFinalizeCampaign(activeCampaign, 'fulfilled')}>
                  Mark Fulfilled
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Target className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">No campaigns yet</h2>
            <p className="text-muted-foreground">Create your first crowdfunding campaign to rally your community.</p>
            <Button onClick={() => openCampaignModal()}>
              <Plus className="w-4 h-4 mr-2" /> Create campaign
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeCampaign?.id ?? 'all'} onValueChange={setActiveCampaignId} className="space-y-4">
        <TabsList className="flex flex-wrap gap-2">
          {campaigns.map((campaign) => (
            <TabsTrigger key={campaign.id} value={campaign.id} className="gap-2">
              <Rocket className="w-4 h-4" />
              {campaign.title}
            </TabsTrigger>
          ))}
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
        </TabsList>

        {campaigns.map((campaign) => {
          const timeline = buildTimeline(campaign);
          return (
            <TabsContent key={campaign.id} value={campaign.id} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Reward tiers</CardTitle>
                  <CardDescription>Manage the perks available to supporters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.campaign_rewards.length === 0 ? (
                    <div className="text-center py-12">
                      <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No rewards yet. Create your first tier to entice supporters.</p>
                      <Button className="mt-4" onClick={() => {
                        setActiveCampaignId(campaign.id);
                        openRewardModal();
                      }}>
                        <Plus className="w-4 h-4 mr-2" /> Add reward tier
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {campaign.campaign_rewards.map((reward) => (
                        <div key={reward.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div>
                                <h3 className="font-semibold">{reward.title}</h3>
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Contribution: {formatCurrency(reward.contribution_amount_cents)}</span>
                                <span>
                                  Claimed: {reward.quantity_claimed}
                                  {reward.quantity_limit ? ` / ${reward.quantity_limit}` : ''}
                                </span>
                                <span>Delivery: {formatDate(reward.estimated_delivery)}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setActiveCampaignId(campaign.id);
                              openRewardModal(reward);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => {
                        setActiveCampaignId(campaign.id);
                        openRewardModal();
                      }}>
                        <Plus className="w-4 h-4 mr-2" /> New reward tier
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign status</CardTitle>
                  <CardDescription>Track where this campaign is in the workflow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-medium">Funding goal</span>
                  </div>
                  <p className="text-muted-foreground">{formatCurrency(campaign.goal_amount_cents)}</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-muted-foreground">{formatDate(campaign.funding_deadline)}</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-medium">Supporters</span>
                  </div>
                  <p className="text-muted-foreground">{campaign.supporter_count}</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-medium">Current status</span>
                  </div>
                  <Badge variant={statusConfig[campaign.status].variant}>{statusConfig[campaign.status].label}</Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Supporters</CardTitle>
                <CardDescription>Manage contributions and fulfillment.</CardDescription>
              </CardHeader>
              <CardContent>
                {campaign.campaign_supporters.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No supporters yet. Share your campaign to start building momentum.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaign.campaign_supporters.map((supporter) => {
                      const supporterName = supporter.supporter?.full_name || supporter.supporter?.username || 'Supporter';
                      const rewardTitle = campaign.campaign_rewards.find((reward) => reward.id === supporter.reward_id)?.title;
                      return (
                        <div key={supporter.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{supporterName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(supporter.contribution_amount_cents)} • {rewardTitle ?? 'No reward selected'}
                            </p>
                            <p className="text-xs text-muted-foreground">Pledged {formatDate(supporter.contributed_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{supporterStatusLabel[supporter.status]}</Badge>
                            {supporter.status === 'pledged' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkSupporterFulfilled(supporter)}
                                  disabled={supporterActionId === supporter.id}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {supporterActionId === supporter.id ? 'Updating…' : 'Mark fulfilled'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRefundSupporter(supporter)}
                                  disabled={supporterActionId === supporter.id}
                                >
                                  Refund
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Status changes and supporter activity.</CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No activity yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((event) => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>
          );
        })}

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All campaigns</CardTitle>
              <CardDescription>A historical view of every crowdfunding campaign you have launched.</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No campaigns yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{campaign.title}</h3>
                          <p className="text-sm text-muted-foreground">{campaign.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{formatCurrency(campaign.current_amount_cents)} raised</span>
                            <span>{campaign.supporter_count} supporters</span>
                            <span>Created {formatDate(campaign.created_at)}</span>
                          </div>
                        </div>
                        <Badge variant={statusConfig[campaign.status].variant}>
                          {statusConfig[campaign.status].label}
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

      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCampaignId ? 'Edit campaign' : 'Create new campaign'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign-title">Campaign title</Label>
                <Input
                  id="campaign-title"
                  value={campaignForm.title}
                  onChange={(event) => setCampaignForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="My amazing project"
                />
              </div>
              <div>
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  rows={4}
                  value={campaignForm.description}
                  onChange={(event) => setCampaignForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Tell your story and explain what you're raising funds for..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-goal">Funding goal (£)</Label>
                  <Input
                    id="campaign-goal"
                    type="number"
                    min={0}
                    value={campaignForm.goalAmount}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, goalAmount: Number(event.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="campaign-deadline">Funding deadline</Label>
                  <Input
                    id="campaign-deadline"
                    type="date"
                    value={campaignForm.fundingDeadline}
                    onChange={(event) => setCampaignForm((current) => ({ ...current, fundingDeadline: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="campaign-slug">Custom URL (optional)</Label>
                <Input
                  id="campaign-slug"
                  value={campaignForm.slug}
                  onChange={(event) => setCampaignForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="midnight-sessions"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveCampaign} disabled={savingCampaign}>
                  {savingCampaign ? 'Saving…' : editingCampaignId ? 'Save changes' : 'Create campaign'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCampaignModal(false);
                    setCampaignForm(defaultCampaignForm);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRewardModal && activeCampaign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-xl w-full space-y-4">
            <h2 className="text-xl font-semibold">
              {editingRewardId ? 'Edit reward tier' : 'Create reward tier'}
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="reward-title">Title</Label>
                <Input
                  id="reward-title"
                  value={rewardForm.title}
                  onChange={(event) => setRewardForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Signed vinyl edition"
                />
              </div>
              <div>
                <Label htmlFor="reward-description">Description</Label>
                <Textarea
                  id="reward-description"
                  rows={3}
                  value={rewardForm.description}
                  onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reward-amount">Contribution amount (£)</Label>
                  <Input
                    id="reward-amount"
                    type="number"
                    min={0}
                    value={rewardForm.amount}
                    onChange={(event) => setRewardForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="reward-quantity">Quantity limit</Label>
                  <Input
                    id="reward-quantity"
                    type="number"
                    min={0}
                    value={rewardForm.quantityLimit}
                    onChange={(event) => setRewardForm((current) => ({ ...current, quantityLimit: event.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reward-delivery">Estimated delivery</Label>
                <Input
                  id="reward-delivery"
                  type="date"
                  value={rewardForm.estimatedDelivery}
                  onChange={(event) => setRewardForm((current) => ({ ...current, estimatedDelivery: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSaveReward}>
                {editingRewardId ? 'Save reward' : 'Create reward'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRewardModal(false);
                  setRewardForm(defaultRewardForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCrowdfundingModule;
