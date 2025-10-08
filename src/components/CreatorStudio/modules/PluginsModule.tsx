import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Music,
  Calendar,
  MessageCircle,
  BarChart3,
  Globe,
  Plus,
  Settings,
  Power,
  AlertCircle,
  Share2,
  TrendingUp,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  RefreshCcw,
  Instagram,
  Twitter,
  Youtube,
  Hash,
  Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ContentComposer } from "@/components/ContentComposer";
import { EnhancedConnections } from "@/components/EnhancedConnections";
import { UnifiedInbox } from "@/components/UnifiedInbox";
import { OAuthService } from "@/services/plugins/oauth-service";
import { formatDistanceToNow } from "date-fns";

interface Plugin {
  id: string;
  provider: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  accountName?: string;
  healthStatus?: string;
  expired?: boolean;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

const PROVIDER_CONFIG: Record<string, { name: string; description: string; icon: React.ElementType }> = {
  instagram_business: {
    name: 'Instagram',
    description: 'Sync with Instagram for content sharing and engagement',
    icon: Instagram
  },
  facebook_pages: {
    name: 'Facebook Pages',
    description: 'Publish and manage your Facebook page content',
    icon: Share2
  },
  youtube: {
    name: 'YouTube',
    description: 'Connect your YouTube channel for video uploads',
    icon: Youtube
  },
  tiktok_business: {
    name: 'TikTok',
    description: 'Export and automate short-form video posts',
    icon: Hash
  },
  twitter: {
    name: 'X (Twitter)',
    description: 'Schedule and manage cross-posted tweets',
    icon: Twitter
  },
  soundcloud: {
    name: 'SoundCloud',
    description: 'Push new tracks directly to your SoundCloud audience',
    icon: Music
  },
  discord: {
    name: 'Discord',
    description: 'Manage your Discord community',
    icon: MessageCircle
  },
  mailchimp: {
    name: 'Mailchimp',
    description: 'Sync lists and campaigns with Mailchimp',
    icon: Mail
  },
  substack: {
    name: 'Substack',
    description: 'Publish newsletters and posts to Substack subscribers',
    icon: Globe
  },
  patreon: {
    name: 'Patreon',
    description: 'Share updates with your Patreon supporters',
    icon: BarChart3
  }
};

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduled_for?: string;
  status: 'scheduled' | 'published' | 'failed';
  created_at: string;
}

export const PluginsModule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [automationRetries, setAutomationRetries] = useState(0);
  const [attributionMetrics, setAttributionMetrics] = useState({ sales: 0, plays: 0, conversionRate: 0 });
  const [metricDetails, setMetricDetails] = useState<{
    id: string;
    channel: string;
    impressions: number;
    clicks: number;
    sales: number;
    plays: number;
    engagement: number;
    fetchedAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const expiredToastRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  useEffect(() => {
    plugins.forEach(plugin => {
      if (plugin.expired && !expiredToastRef.current.has(plugin.provider)) {
        expiredToastRef.current.add(plugin.provider);
        toast({
          title: `${plugin.name} token expired`,
          description: 'Reconnect to resume automations and syncs.',
          variant: 'destructive'
        });
      }
    });
  }, [plugins, toast]);

  const loadDashboard = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadPlugins(),
        fetchScheduledPosts(),
        fetchAttributionMetrics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlugins = async () => {
    if (!user) return;

    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts')
        .select('id, provider, account_name, connection_status, last_synced_at, updated_at, created_at')
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      const accountIds = (accounts || []).map(account => account.id);

      let tokensMap = new Map<string, { expires_at: string | null; updated_at: string | null }>();
      if (accountIds.length > 0) {
        const { data: tokens, error: tokensError } = await supabase
          .from('oauth_tokens')
          .select('social_account_id, expires_at, updated_at')
          .in('social_account_id', accountIds);

        if (tokensError) throw tokensError;

        tokensMap = new Map((tokens || []).map(token => [token.social_account_id, token]));
      }

      let healthMap = new Map<string, { status?: string; checked_at?: string | null }>();
      try {
        const { data: healthData, error: healthError } = await supabase
          .from('provider_health_checks')
          .select('provider, status, checked_at')
          .eq('user_id', user.id);

        if (healthError) throw healthError;

        healthMap = new Map((healthData || []).map(item => [item.provider, item]));
      } catch (error) {
        console.warn('Provider health checks unavailable:', error);
      }

      const configuredProviders = new Set(Object.keys(PROVIDER_CONFIG));

      const pluginList: Plugin[] = Object.entries(PROVIDER_CONFIG).map(([provider, metadata]) => {
        const account = accounts?.find(acc => acc.provider === provider);
        const tokenInfo = account ? tokensMap.get(account.id) : undefined;
        const healthInfo = healthMap.get(provider);
        const tokenExpired = tokenInfo?.expires_at ? new Date(tokenInfo.expires_at) < new Date() : false;

        let status: Plugin['status'] = 'disconnected';
        if (account) {
          if ((account.connection_status === 'connected' || account.connection_status === 'publishing') && !tokenExpired) {
            status = 'connected';
          } else if (account.connection_status === 'revoked') {
            status = 'disconnected';
          } else {
            status = 'error';
          }
        }

        if (tokenExpired) {
          status = 'error';
        }

        const lastSyncSource = healthInfo?.checked_at || account?.last_synced_at || tokenInfo?.updated_at || account?.updated_at;

        return {
          id: provider,
          provider,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon,
          status,
          lastSync: formatRelativeTime(lastSyncSource),
          accountName: account?.account_name,
          healthStatus: healthInfo?.status,
          expired: tokenExpired
        } satisfies Plugin;
      });

      (accounts || [])
        .filter(account => !configuredProviders.has(account.provider))
        .forEach(account => {
          const tokenInfo = tokensMap.get(account.id);
          const tokenExpired = tokenInfo?.expires_at ? new Date(tokenInfo.expires_at) < new Date() : false;
          pluginList.push({
            id: account.id,
            provider: account.provider,
            name: account.account_name || account.provider,
            description: 'Connected channel',
            icon: Zap,
            status: (account.connection_status === 'connected' && !tokenExpired) ? 'connected' : 'error',
            lastSync: formatRelativeTime(account.last_synced_at || account.updated_at),
            accountName: account.account_name,
            expired: tokenExpired
          });
        });

      setPlugins(pluginList);
    } catch (error) {
      console.error('Error loading plugin connections:', error);
      toast({
        title: 'Unable to load channels',
        description: 'There was a problem loading your connection status.',
        variant: 'destructive'
      });
    }
  };

  const fetchScheduledPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select(`
          id,
          content,
          status,
          created_at,
          channel_variants,
          post_targets (
            id,
            status,
            scheduled_at,
            retry_count,
            max_retries,
            social_accounts (provider)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'publishing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const mappedPosts: ScheduledPost[] = (data || []).map(post => {
        const targets = (post.post_targets || []) as {
          status: string;
          scheduled_at?: string;
          retry_count?: number;
          max_retries?: number;
          social_accounts?: { provider?: string };
        }[];

        const platforms = Array.from(new Set(
          targets
            .map(target => target.social_accounts?.provider)
            .filter((value): value is string => !!value)
        ));

        const nextTarget = targets
          .filter(target => target.scheduled_at)
          .sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())[0];

        const status = targets.some(target => target.status === 'failed')
          ? 'failed'
          : targets.every(target => target.status === 'published')
            ? 'published'
            : 'scheduled';

        const channelVariants = post.channel_variants as Record<string, any> | null;
        const derivedTitle = channelVariants?.default?.title || channelVariants?.instagram_business?.title;
        const contentPreview = post.content?.slice(0, 160) || '';

        return {
          id: post.id,
          title: derivedTitle || (contentPreview ? `${contentPreview}${contentPreview.length === 160 ? '…' : ''}` : 'Untitled Post'),
          content: post.content || '',
          platforms,
          scheduled_for: nextTarget?.scheduled_at,
          status,
          created_at: post.created_at
        };
      });

      const allTargets = (data || []).flatMap(post => (post.post_targets || []) as { status: string; scheduled_at?: string; retry_count?: number }[]);
      const queuedTargets = allTargets.filter(target => target.status === 'queued' || target.status === 'scheduled' || target.status === 'publishing');
      const retryTargets = allTargets.filter(target => (target.retry_count || 0) > 0 || target.status === 'failed');

      setScheduledPosts(mappedPosts);
      setScheduledCount(queuedTargets.filter(target => !target.scheduled_at || new Date(target.scheduled_at) >= now).length);
      setAutomationRetries(retryTargets.length);
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      toast({
        title: 'Schedule error',
        description: 'Unable to load scheduled posts.',
        variant: 'destructive'
      });
    }
  };

  const fetchAttributionMetrics = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('social_metrics')
        .select(`
          id,
          impressions,
          engagements,
          clicks,
          attributed_sales,
          attributed_plays,
          fetched_at,
          post_targets!inner (
            post_id,
            social_accounts!inner (user_id, provider)
          )
        `)
        .eq('post_targets.social_accounts.user_id', user.id)
        .gte('metrics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, metric) => {
          acc.sales += Number(metric.attributed_sales || 0);
          acc.plays += Number(metric.attributed_plays || 0);
          acc.clicks += Number(metric.clicks || 0);
          return acc;
        },
        { sales: 0, plays: 0, clicks: 0 }
      );

      const conversionRate = totals.clicks > 0 ? (totals.sales / totals.clicks) * 100 : 0;

      setAttributionMetrics({
        sales: totals.sales,
        plays: totals.plays,
        conversionRate: Number(conversionRate.toFixed(2))
      });

      const mappedDetails = (data || []).map((metric: any) => ({
        id: metric.id,
        channel: metric.post_targets?.social_accounts?.provider || 'unknown',
        impressions: Number(metric.impressions || 0),
        clicks: Number(metric.clicks || 0),
        sales: Number(metric.attributed_sales || 0),
        plays: Number(metric.attributed_plays || 0),
        engagement: Number(metric.engagements || 0),
        fetchedAt: metric.fetched_at || new Date().toISOString()
      }));

      setMetricDetails(mappedDetails);
    } catch (error) {
      console.error('Error fetching attribution metrics:', error);
      toast({
        title: 'Analytics unavailable',
        description: 'Unable to load attribution metrics right now.',
        variant: 'destructive'
      });
    }
  };

  const handlePostCreated = (post: any) => {
    toast({
      title: "Post created!",
      description: "Your content has been saved and is ready to publish."
    });
    fetchScheduledPosts();
    fetchAttributionMetrics();
  };

  const handleScheduleCreated = (schedule: any) => {
    toast({
      title: "Post scheduled!",
      description: "Your content will be published at the scheduled time."
    });
    fetchScheduledPosts();
    fetchAttributionMetrics();
  };

  const deleteScheduledPost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "The scheduled post has been removed."
      });

      fetchScheduledPosts();
      fetchAttributionMetrics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const handleReconnect = (provider: string) => {
    try {
      const url = OAuthService.getAuthorizationUrl(provider);
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: 'Unable to reconnect',
        description: error?.message || 'Failed to start the OAuth flow.',
        variant: 'destructive'
      });
    }
  };

  const handleRunDispatcher = async () => {
    try {
      const { error } = await supabase.functions.invoke('social-post-dispatcher');
      if (error) throw error;

      toast({
        title: 'Dispatcher triggered',
        description: 'Queued posts will begin publishing shortly.'
      });
    } catch (error: any) {
      console.error('Dispatcher trigger error:', error);
      toast({
        title: 'Failed to start dispatcher',
        description: error?.message || 'The dispatcher could not be started.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'disconnected':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Power className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Power className="h-3 w-3 text-gray-400" />;
    }
  };

  const getPostStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPostStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatScheduledTime = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Not scheduled';
    }

    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';
    if (diff < 60000) return 'In 1 minute';
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} minutes`;
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`;
    return date.toLocaleDateString();
  };

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 100 ? 2 : 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plug-ins & Channels</h1>
          <p className="text-muted-foreground">
            Connect and manage your external platforms and tools.
          </p>
        </div>
        <Button onClick={() => navigate("/studio/plugins/browse")}>
          <Plus className="w-4 h-4 mr-2" />
          Browse Plugins
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Posts</p>
                <p className="text-2xl font-bold">{scheduledCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automation Retries</p>
                <p className="text-2xl font-bold">{automationRetries}</p>
              </div>
              <RefreshCcw className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attributed Revenue (30d)</p>
                <p className="text-2xl font-bold">{formatCurrency(attributionMetrics.sales)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{attributionMetrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Attributed plays: {attributionMetrics.plays.toLocaleString()}</p>
              </div>
              <Share2 className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connect" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connect" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Connect
          </TabsTrigger>
          <TabsTrigger value="composer" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Composer
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="smart-links" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Smart Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((plugin) => {
              const Icon = plugin.icon;
              return (
                <Card key={plugin.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{plugin.name}</CardTitle>
                          {plugin.accountName && (
                            <p className="text-xs text-muted-foreground">{plugin.accountName}</p>
                          )}
                          <div className="flex items-center gap-2">
                            {getStatusIcon(plugin.status)}
                            <Badge variant={getStatusColor(plugin.status)} className="text-xs">
                              {plugin.status}
                            </Badge>
                          </div>
                          {plugin.healthStatus && (
                            <p className="text-xs text-muted-foreground mt-1">Health: {plugin.healthStatus}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plugin.description}
                    </p>

                    {plugin.metrics && (
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {plugin.metrics.map((metric, index) => (
                          <div key={index} className="text-center">
                            <div className="font-semibold">{metric.value}</div>
                            <div className="text-xs text-muted-foreground">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {plugin.lastSync && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Last sync: {plugin.lastSync}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      {plugin.status === 'connected' ? (
                        <>
                          <Button variant="outline" size="sm" className="flex-1" onClick={handleRunDispatcher}>
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            Run Sync
                          </Button>
                          <Button
                            variant={plugin.expired ? 'destructive' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleReconnect(plugin.provider)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Reconnect
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="flex-1" onClick={() => handleReconnect(plugin.provider)}>
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="composer" className="space-y-6">
          <ContentComposer
            onPostCreated={handlePostCreated}
            onScheduleCreated={handleScheduleCreated}
          />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Scheduler</CardTitle>
              <CardDescription>
                Schedule posts, releases, and content across platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Scheduled Posts</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule your content to publish automatically
                  </p>
                  <Button onClick={() => navigate("/studio/plugins")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPosts.map((post) => (
                    <Card key={post.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPostStatusIcon(post.status)}
                            <Badge className={getPostStatusColor(post.status)}>
                              {post.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatScheduledTime(post.scheduled_for)}
                            </span>
                          </div>
                          
                          <h4 className="font-medium mb-2">{post.title || 'Untitled Post'}</h4>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Platforms: {post.platforms.length}</span>
                            <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteScheduledPost(post.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox" className="space-y-6">
          <UnifiedInbox />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Analytics</CardTitle>
              <CardDescription>
                View attribution and engagement pulled from your connected channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricDetails.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
                  <p className="text-muted-foreground mb-4">
                    Analytics will appear here once posts have collected impressions and clicks.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metricDetails.map((analytics) => (
                    <Card key={analytics.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{analytics.channel}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(analytics.fetchedAt).toLocaleString()}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {analytics.engagement.toLocaleString()} engagements
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{analytics.impressions.toLocaleString()}</p>
                          <p className="text-muted-foreground">Impressions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{analytics.clicks.toLocaleString()}</p>
                          <p className="text-muted-foreground">Clicks</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{analytics.plays.toLocaleString()}</p>
                          <p className="text-muted-foreground">Attributed Plays</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analytics.sales)}</p>
                          <p className="text-muted-foreground">Attributed Sales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{analytics.engagement.toLocaleString()}</p>
                          <p className="text-muted-foreground">Engagements</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smart-links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Smart Links</CardTitle>
              <CardDescription>
                Create intelligent links that adapt to your audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Smart Links Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create smart links to direct fans to the right platform
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Smart Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};