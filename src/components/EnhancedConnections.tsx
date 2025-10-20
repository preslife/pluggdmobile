import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { OAuthService } from "@/services/plugins/oauth-service";
import { formatDistanceToNow } from "date-fns";
import { Mail, MessageSquare, Zap, Settings, Plug, ExternalLink, Users, Crown, Twitter, Instagram, Hash, RefreshCcw, Clock, Loader2 } from "lucide-react";

interface Connection {
  id: string;
  provider: string;
  provider_user_id?: string;
  access_token?: string;
  connection_data?: any;
  created_at: string;
  updated_at?: string;
}

interface Profile {
  mailchimp_list_id?: string;
  mailchimp_status?: string;
  mailchimp_auto_sync?: boolean;
  discord_guild_id?: string;
  discord_role_map?: any;
}

interface MailchimpList {
  id: string;
  name: string;
  member_count: number;
  last_synced_at?: string | null;
  error?: string | null;
}

interface MailchimpExportSummary {
  processed: number;
  errors: number;
  total_audience: number;
  last_synced_at?: string | null;
  error?: string | null;
}

interface DiscordSyncResult {
  summary: {
    successful: number;
    failed: number;
    total: number;
  };
  results: {
    action: string;
    tier?: string | null;
    role_id?: string | null;
    success: boolean;
    error?: string | null;
  }[];
  current_tier?: string | null;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number | null;
  currency: string | null;
}

const DISTRIBUTORS = [
  {
    id: 'distrokid',
    name: 'DistroKid',
    description: 'Upload to Spotify, Apple Music, and more',
    icon: Zap,
    color: 'bg-orange-500'
  },
  {
    id: 'tunecore',
    name: 'TuneCore',
    description: 'Professional music distribution',
    icon: Settings,
    color: 'bg-blue-500'
  },
  {
    id: 'amuse',
    name: 'Amuse',
    description: 'Free music distribution',
    icon: Plug,
    color: 'bg-green-500'
  }
];

const SOCIAL_PLATFORMS = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Post tweets with text and media',
    icon: Twitter,
    color: 'bg-black',
    features: ['Text posts', 'Media uploads', 'Cross-posting']
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share feed posts and Reels',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    features: ['Feed posts', 'Reels', 'Business accounts']
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Post to your community channels',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    features: ['Channel posting', 'Webhooks', 'Bot integration']
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Export content for TikTok posting',
    icon: Hash,
    color: 'bg-black',
    features: ['Export flow', 'API posting', 'Performance insights']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Manage comments and engagement',
    icon: Crown,
    color: 'bg-red-500',
    features: ['Comment replies', 'Inbox integration']
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Manage email communications',
    icon: Mail,
    color: 'bg-red-600',
    features: ['Email threads', 'Reply links', 'Inbox integration']
  }
];

export const EnhancedConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [mailchimpLists, setMailchimpLists] = useState<MailchimpList[]>([]);
  const [mailchimpSummary, setMailchimpSummary] = useState<MailchimpExportSummary | null>(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [discordGuildId, setDiscordGuildId] = useState('');
  const [roleMap, setRoleMap] = useState<{[key: string]: string}>({});
  const [mailchimpError, setMailchimpError] = useState<string | null>(null);
  const [mailchimpLoading, setMailchimpLoading] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);
  const [discordFanId, setDiscordFanId] = useState('');
  const [discordSyncing, setDiscordSyncing] = useState<'sync' | 'grant' | 'revoke' | null>(null);
  const [discordResult, setDiscordResult] = useState<DiscordSyncResult | null>(null);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [tiktokDialogOpen, setTiktokDialogOpen] = useState(false);
  const [tiktokMethod, setTiktokMethod] = useState<'oauth' | 'apiKey'>('apiKey');
  const [tiktokAccountName, setTiktokAccountName] = useState('');
  const [tiktokAccountId, setTiktokAccountId] = useState('');
  const [tiktokApiKey, setTiktokApiKey] = useState('');
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [tiktokStatusMeta, setTiktokStatusMeta] = useState<any | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return formatDistanceToNow(date);
  };

  const connectionMap = useMemo(() => {
    return connections.reduce<Record<string, Connection>>((acc, connection) => {
      acc[connection.provider] = connection;
      return acc;
    }, {});
  }, [connections]);

  const refreshTikTokStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('tiktok-connector', {
        body: { action: 'status' },
      });

      if (error) throw error;

      if (data?.connection) {
        setTiktokStatusMeta(data.connection);
      } else {
        setTiktokStatusMeta(null);
      }
    } catch (error) {
      console.error('Error fetching TikTok status:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [{ data: connectionsData, error: connectionsError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('social_connections')
          .select('*')
          .eq('user_id', user!.id)
          .in('provider', ['distrokid', 'tunecore', 'amuse', 'mailchimp', 'discord', 'twitter', 'instagram', 'youtube', 'gmail', 'tiktok']),
        supabase
          .from('profiles')
          .select('mailchimp_list_id, mailchimp_status, mailchimp_auto_sync, discord_guild_id, discord_role_map')
          .eq('user_id', user!.id)
          .single()
      ]);

      if (connectionsError) throw connectionsError;
      if (profileError) throw profileError;

      const resolvedProfile = profileData || {};

      setConnections(connectionsData || []);
      setProfile(resolvedProfile);
      setDiscordGuildId(resolvedProfile?.discord_guild_id || '');
      setRoleMap((resolvedProfile?.discord_role_map as {[key: string]: string}) || {});

      await loadMembershipTiers();

      const hasMailchimp = (connectionsData || []).some((c) => c.provider === 'mailchimp');
      const hasDiscord = (connectionsData || []).some((c) => c.provider === 'discord');
      const hasTikTok = (connectionsData || []).some((c) => c.provider === 'tiktok');

      if (hasMailchimp) {
        await fetchMailchimpLists();
      }

      if (hasDiscord) {
        await fetchDiscordStatus(connectionsData || []);
      }

      if (hasTikTok) {
        await refreshTikTokStatus();
      } else {
        setTiktokStatusMeta(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembershipTiers = async () => {
    if (!user) return;

    try {
      setTierError(null);
      const { data, error } = await supabase
        .from('membership_tiers')
        .select('id, name, price_monthly, currency, status, tier_order, created_at')
        .eq('owner_type', 'profile')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('tier_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSubscriptionTiers(
        (data || []).map((tier) => ({
          id: tier.id,
          name: tier.name,
          price_monthly: tier.price_monthly ?? null,
          currency: tier.currency ?? 'USD'
        }))
      );
    } catch (error: any) {
      console.error('Error loading membership tiers:', error);
      setTierError(error?.message || 'Unable to load membership tiers');
      setSubscriptionTiers([]);
    }
  };

  const fetchMailchimpLists = async () => {
    try {
      if (!user) return;

      setMailchimpLoading(true);
      setMailchimpError(null);

      const { data, error } = await supabase
        .from('mailchimp_audience_snapshots' as any)
        .select('list_id, list_name, member_count, last_synced_at, error_message')
        .eq('user_id', user.id)
        .order('last_synced_at', { ascending: false });

      if (error) throw error;

      const lists = (data || []).map((list) => ({
        id: list.list_id,
        name: list.list_name || list.list_id,
        member_count: list.member_count ?? 0,
        last_synced_at: list.last_synced_at,
        error: list.error_message ?? null,
      }));

      setMailchimpLists(lists);
      if (lists[0]) {
        setMailchimpSummary({
          processed: lists[0].member_count ?? 0,
          errors: lists[0].error ? 1 : 0,
          total_audience: lists[0].member_count ?? 0,
          last_synced_at: lists[0].last_synced_at,
          error: lists[0].error ?? null,
        });
      } else {
        setMailchimpSummary(null);
      }
    } catch (error: any) {
      console.error('Error fetching Mailchimp lists:', error);
      setMailchimpLists([]);
      setMailchimpSummary(null);
      setMailchimpError(error?.message || 'Failed to load Mailchimp lists');
    } finally {
      setMailchimpLoading(false);
    }
  };

  const isConnected = (provider: string) => {
    return connections.some(c => c.provider === provider);
  };

  const handleConnect = async (provider: string) => {
    try {
      if (provider === 'mailchimp' || provider === 'discord') {
        const url = OAuthService.getAuthorizationUrl(provider);
        window.location.href = url;
        return;
      }

      if (provider === 'tiktok') {
        setTiktokError(null);
        setTiktokDialogOpen(true);
        return;
      }

      toast({
        title: "Coming Soon",
        description: `${provider} integration will be available soon.`,
      });
    } catch (error: any) {
      console.error('OAuth launch error:', error);
      toast({
        title: "Connection error",
        description: error?.message || 'Unable to start the OAuth flow.',
        variant: "destructive"
      });
    }
  };

  const resetTikTokForm = () => {
    setTiktokMethod('apiKey');
    setTiktokAccountName('');
    setTiktokAccountId('');
    setTiktokApiKey('');
  };

  const handleTikTokApiKeyConnect = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'You need to sign in before connecting TikTok.',
        variant: 'destructive',
      });
      return;
    }

    setTiktokConnecting(true);
    setTiktokError(null);

    try {
      const { data, error } = await supabase.functions.invoke('tiktok-connector', {
        body: {
          action: 'connect',
          method: 'apiKey',
          accountName: tiktokAccountName.trim(),
          accountId: tiktokAccountId.trim(),
          apiKey: tiktokApiKey.trim(),
        },
      });

      if (error) throw error;

      await refreshTikTokStatus();
      await fetchData();

      toast({
        title: 'TikTok connected',
        description: 'API key saved. You can now export and post directly to TikTok.',
      });

      setTiktokDialogOpen(false);
      resetTikTokForm();
    } catch (error: any) {
      console.error('TikTok connect failed:', error);
      setTiktokError(error?.message || 'Unable to connect TikTok right now.');
    } finally {
      setTiktokConnecting(false);
    }
  };

  const startTikTokOAuth = () => {
    try {
      const url = OAuthService.getAuthorizationUrl('tiktok_business');
      window.location.href = url;
    } catch (error: any) {
      console.error('TikTok OAuth launch failed:', error);
      setTiktokError(error?.message || 'Unable to start the TikTok OAuth flow.');
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      if (provider === 'tiktok') {
        const { error } = await supabase.functions.invoke('tiktok-connector', {
          body: { action: 'disconnect' },
        });

        if (error) throw error;
        await refreshTikTokStatus();
      } else {
        const { error } = await supabase
          .from('social_connections')
          .delete()
          .eq('provider', provider)
          .eq('user_id', user!.id);

        if (error) throw error;
      }

      setConnections(prev => prev.filter(c => c.provider !== provider));
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${provider}`,
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive"
      });
    }
  };

  const updateMailchimpSettings = async (updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...updates }));
      setMailchimpError(null);
      toast({
        title: "Settings Updated",
        description: "Mailchimp settings saved successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMailchimpError(error instanceof Error ? error.message : 'Failed to update Mailchimp settings');
    }
  };

  const updateDiscordSettings = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          discord_guild_id: discordGuildId,
          discord_role_map: roleMap
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, discord_guild_id: discordGuildId, discord_role_map: roleMap }));
      toast({
        title: "Discord Settings Updated",
        description: "Role mapping configuration saved",
      });
    } catch (error) {
      console.error('Error updating Discord settings:', error);
      setDiscordError(error instanceof Error ? error.message : 'Failed to update Discord settings');
    }
  };

  const exportToMailchimp = async () => {
    if (!profile.mailchimp_list_id) {
      toast({
        title: "Error",
        description: "Please select a Mailchimp audience first",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    try {
      setMailchimpError(null);
      const { data, error } = await supabase.functions.invoke('mailchimp-export-audience', {
        body: { creator_id: user!.id }
      });

      if (error) throw error;

      if (data) {
        setMailchimpSummary({
          processed: data.processed ?? data.total_audience ?? 0,
          errors: data.errors ?? 0,
          total_audience: data.total_audience ?? data.processed ?? 0,
          error: data.error ?? (data.errors ? 'Some members failed to sync' : null),
          last_synced_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Export Complete",
        description: `Successfully exported ${data.total_audience} contacts to Mailchimp`,
      });

      await fetchMailchimpLists();
    } catch (error) {
      console.error('Export error:', error);
      setMailchimpError(error instanceof Error ? error.message : 'Failed to export audience to Mailchimp');
    } finally {
      setExporting(false);
    }
  };

  const fetchDiscordStatus = async (connectionData: Connection[]) => {
    const discordConnection = connectionData.find((c) => c.provider === 'discord');

    if (!discordConnection) {
      setDiscordResult(null);
    }
  };

  const performDiscordAction = async (action: 'sync' | 'grant' | 'revoke') => {
    if (!discordFanId.trim()) {
      setDiscordError('Enter a fan user ID to run the sync.');
      return;
    }

    setDiscordError(null);
    setDiscordSyncing(action);
    try {
      const { data, error } = await supabase.functions.invoke('discord-sync-subscriber', {
        body: {
          creator_id: user!.id,
          fan_user_id: discordFanId.trim(),
          action,
        },
      });

      if (error) {
        throw new Error(error.message ?? 'Discord sync failed');
      }

      if (data) {
        setDiscordResult({
          summary: data.summary,
          results: data.results ?? [],
          current_tier: data.current_tier ?? null,
        });
      }

      toast({
        title: action === 'sync' ? 'Sync complete' : action === 'grant' ? 'Role granted' : 'Roles revoked',
        description: 'Discord role update processed.',
      });
    } catch (error) {
      console.error('Discord manual sync error:', error);
      setDiscordResult(null);
      setDiscordError(error instanceof Error ? error.message : 'Failed to run Discord sync');
    } finally {
      setDiscordSyncing(null);
    }
  };

  const discordConnectionMeta = useMemo(() => connections.find((c) => c.provider === 'discord'), [connections]);
  const mailchimpConnectionMeta = useMemo(() => connections.find((c) => c.provider === 'mailchimp'), [connections]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="w-48 h-6 bg-muted rounded animate-pulse" />
              <div className="w-64 h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="w-full h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Music Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Music Distribution
          </CardTitle>
          <CardDescription>
            Connect your music distribution accounts to streamline releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DISTRIBUTORS.map((distributor) => {
              const connected = isConnected(distributor.id);
              const Icon = distributor.icon;
              
              return (
                <div key={distributor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${distributor.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{distributor.name}</div>
                      <div className="text-sm text-muted-foreground">{distributor.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(distributor.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(distributor.id)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mailchimp Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mailchimp Email Marketing
          </CardTitle>
          <CardDescription>
            Sync your audience (followers, subscribers, buyers) to grow your email list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-yellow-500">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium">Mailchimp Account</div>
                  <div className="text-sm text-muted-foreground">
                    {isConnected('mailchimp') ? (
                      formatRelativeTime(mailchimpConnectionMeta?.updated_at)
                        ? <>Last refreshed {formatRelativeTime(mailchimpConnectionMeta?.updated_at)} ago</>
                        : 'Connected'
                    ) : 'Connect to sync your audience'}
                  </div>
                </div>
              </div>
              {isConnected('mailchimp') ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Connected
                </Badge>
              ) : (
                <Button onClick={() => handleConnect('mailchimp')}>
                  Connect Mailchimp
                </Button>
              )}
            </div>

            {isConnected('mailchimp') && (
              <>
                {mailchimpError && (
                  <Alert variant="destructive">
                    <AlertTitle>Mailchimp error</AlertTitle>
                    <AlertDescription>{mailchimpError}</AlertDescription>
                  </Alert>
                )}

                {/* Audience Selection */}
                <div className="space-y-3">
                  <Label>Select Mailchimp Audience</Label>
                  <Select
                    value={profile.mailchimp_list_id || ''}
                    onValueChange={(value) => updateMailchimpSettings({ mailchimp_list_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={mailchimpLoading ? 'Loading audiences...' : 'Choose an audience to sync to'} />
                    </SelectTrigger>
                    <SelectContent>
                      {mailchimpLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          <div className="flex flex-col">
                            <span>{list.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {list.member_count} members
                              {formatRelativeTime(list.last_synced_at) && (
                                <> · Synced {formatRelativeTime(list.last_synced_at)} ago</>
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-sync Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Auto-Sync</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically sync new followers and subscribers daily
                    </div>
                  </div>
                  <Switch
                    checked={profile.mailchimp_auto_sync || false}
                    onCheckedChange={(checked) => updateMailchimpSettings({ mailchimp_auto_sync: checked })}
                  />
                </div>

                {/* Manual Export */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Export Now</div>
                    <div className="text-sm text-muted-foreground">
                      Manually sync your current audience to Mailchimp
                    </div>
                  </div>
                  <Button
                    onClick={exportToMailchimp}
                    disabled={exporting || !profile.mailchimp_list_id}
                    variant="outline"
                  >
                    {exporting ? 'Exporting...' : 'Export Audience'}
                  </Button>
                </div>

                {mailchimpSummary && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Total Audience
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{mailchimpSummary.total_audience}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCcw className="h-4 w-4" />
                        Processed
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{mailchimpSummary.processed}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">Errors</span>
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-destructive">{mailchimpSummary.errors}</div>
                      {mailchimpSummary.error && (
                        <p className="mt-1 text-xs text-muted-foreground">{mailchimpSummary.error}</p>
                      )}
                    </div>
                    {formatRelativeTime(mailchimpSummary.last_synced_at) && (
                      <div className="md:col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Last sync {formatRelativeTime(mailchimpSummary.last_synced_at)} ago
                      </div>
                    )}
                  </div>
                )}

                {/* Status */}
                {profile.mailchimp_status && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={profile.mailchimp_status === 'connected' ? 'default' : 'destructive'}
                    >
                      {profile.mailchimp_status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Last sync status
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social Media Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Social Media & Communication
          </CardTitle>
          <CardDescription>
            Connect platforms for cross-posting and unified inbox management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              const connected = isConnected(platform.id);
              const Icon = platform.icon;
              const providerConnection = connectionMap[platform.id];
              const platformMeta =
                platform.id === 'tiktok'
                  ? tiktokStatusMeta || providerConnection?.connection_data
                  : providerConnection?.connection_data;
              const connectionMethod = platformMeta?.method;

              return (
                <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{platform.name}</div>
                      <div className="text-sm text-muted-foreground">{platform.description}</div>
                      <div className="flex gap-1 mt-1">
                        {platform.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Connected
                        </Badge>
                        {connectionMethod && (
                          <Badge variant="outline" className="border-indigo-500 text-indigo-500 capitalize">
                            {connectionMethod}
                          </Badge>
                        )}
                        {platformMeta?.accountName && (
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            {platformMeta.accountName}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform.id)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Discord Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discord Community Perks
          </CardTitle>
          <CardDescription>
            Automatically grant Discord roles to subscribers based on their tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium">Discord Bot</div>
                  <div className="text-sm text-muted-foreground">
                    {isConnected('discord')
                      ? formatRelativeTime(discordConnectionMeta?.updated_at)
                        ? `Bot connected · updated ${formatRelativeTime(discordConnectionMeta?.updated_at)} ago`
                        : 'Bot connected to your server'
                      : 'Connect bot to manage roles'}
                  </div>
                </div>
              </div>
              {isConnected('discord') ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Connected
                </Badge>
              ) : (
                <Button onClick={() => handleConnect('discord')}>
                  Add Bot to Server
                </Button>
              )}
            </div>

            {isConnected('discord') && (
              <>
                {discordError && (
                  <Alert variant="destructive">
                    <AlertTitle>Discord sync error</AlertTitle>
                    <AlertDescription>{discordError}</AlertDescription>
                  </Alert>
                )}

                {/* Guild ID */}
                <div className="space-y-3">
                  <Label>Discord Server ID</Label>
                  <Input
                    placeholder="Enter your Discord server ID"
                    value={discordGuildId}
                    onChange={(e) => setDiscordGuildId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Right-click your server name in Discord and select "Copy Server ID"
                  </p>
                </div>

                {/* Role Mapping */}
                <div className="space-y-4">
                  <Label>Subscription Tier Role Mapping</Label>
                  {tierError && (
                    <Alert variant="destructive">
                      <AlertTitle>Unable to load tiers</AlertTitle>
                      <AlertDescription>{tierError}</AlertDescription>
                    </Alert>
                  )}
                  {subscriptionTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Crown className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{tier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tier.price_monthly ? `$${(tier.price_monthly / 100).toFixed(2)}/${tier.currency ?? 'USD'}` : 'Custom pricing'}
                        </div>
                      </div>
                      <Input
                        placeholder="Discord Role ID"
                        value={roleMap[tier.name] || ''}
                        onChange={(e) => setRoleMap(prev => ({ ...prev, [tier.name]: e.target.value }))}
                        className="w-40"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Right-click a role in Discord and select "Copy Role ID" to get the role ID
                  </p>
                </div>

                {/* Save Settings */}
                <Button onClick={updateDiscordSettings} className="w-full">
                  Save Discord Settings
                </Button>

                {/* Manual Sync */}
                <Separator />
                <div className="space-y-3">
                  <Label>Manual Role Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter a fan&apos;s Pluggd user ID to manually sync Discord roles. Use grant or revoke for overrides.
                  </p>
                  <Input
                    placeholder="Fan user ID"
                    value={discordFanId}
                    onChange={(event) => setDiscordFanId(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={discordSyncing !== null}
                      onClick={() => performDiscordAction('sync')}
                    >
                      {discordSyncing === 'sync' ? 'Syncing...' : 'Sync Roles'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={discordSyncing !== null}
                      onClick={() => performDiscordAction('grant')}
                    >
                      {discordSyncing === 'grant' ? 'Granting...' : 'Grant Roles'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={discordSyncing !== null}
                      onClick={() => performDiscordAction('revoke')}
                    >
                      {discordSyncing === 'revoke' ? 'Revoking...' : 'Revoke Roles'}
                    </Button>
                  </div>
                  {discordResult && (
                    <div className="space-y-2 rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCcw className="h-4 w-4" />
                        Summary: {discordResult.summary.successful} successful · {discordResult.summary.failed} failed of {discordResult.summary.total}
                      </div>
                      {discordResult.current_tier && (
                        <div className="text-sm text-muted-foreground">
                          Current tier detected: <span className="font-medium text-foreground">{discordResult.current_tier}</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {discordResult.results.map((result, index) => (
                          <div key={`${result.action}-${index}`} className="rounded-md border p-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{result.action}</span>
                              <span className={result.success ? 'text-green-600' : 'text-destructive'}>
                                {result.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.tier ? `Tier: ${result.tier}` : null}
                              {result.role_id ? ` · Role ID: ${result.role_id}` : null}
                            </div>
                            {!result.success && result.error && (
                              <div className="text-xs text-destructive mt-1">{result.error}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help & Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Integration Help
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/docs/integrations" target="_blank">
                Setup Guides
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/docs/webhooks" target="_blank">
                Webhook Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={tiktokDialogOpen}
        onOpenChange={(open) => {
          setTiktokDialogOpen(open);
          if (!open) {
            resetTikTokForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect TikTok</DialogTitle>
            <DialogDescription>
              Link your TikTok Business account to schedule exports and push videos directly from Pluggd.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={tiktokMethod === 'oauth' ? 'default' : 'outline'}
                onClick={() => setTiktokMethod('oauth')}
              >
                Use OAuth
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tiktokMethod === 'apiKey' ? 'default' : 'outline'}
                onClick={() => setTiktokMethod('apiKey')}
              >
                Use API key
              </Button>
            </div>

            {tiktokMethod === 'oauth' ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  We&apos;ll redirect you to TikTok to approve access. After granting permissions you&apos;ll return here automatically.
                </p>
                <Button onClick={startTikTokOAuth} className="w-full" disabled={tiktokConnecting}>
                  Continue with TikTok
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="tiktok-account-name">Account display name</Label>
                  <Input
                    id="tiktok-account-name"
                    value={tiktokAccountName}
                    onChange={(event) => setTiktokAccountName(event.target.value)}
                    placeholder="TikTok Artist Handle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok-account-id">Business account ID</Label>
                  <Input
                    id="tiktok-account-id"
                    value={tiktokAccountId}
                    onChange={(event) => setTiktokAccountId(event.target.value)}
                    placeholder="e.g. 720103918273"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok-api-key">TikTok API key</Label>
                  <Input
                    id="tiktok-api-key"
                    value={tiktokApiKey}
                    onChange={(event) => setTiktokApiKey(event.target.value)}
                    placeholder="Paste the generated API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate keys from the TikTok Business Center and ensure posting scopes are enabled.
                  </p>
                </div>
              </div>
            )}

            {tiktokError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to connect TikTok</AlertTitle>
                <AlertDescription>{tiktokError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTiktokDialogOpen(false);
                resetTikTokForm();
              }}
            >
              Cancel
            </Button>
            {tiktokMethod === 'apiKey' && (
              <Button onClick={handleTikTokApiKeyConnect} disabled={tiktokConnecting}>
                {tiktokConnecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Save API key'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};