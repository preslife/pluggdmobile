import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, MessageSquare, Zap, Settings, Plug, ExternalLink, Users, Crown, Twitter, Instagram, Hash } from "lucide-react";

interface Connection {
  id: string;
  provider: string;
  provider_user_id?: string;
  access_token?: string;
  connection_data?: any;
  created_at: string;
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
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
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
    features: ['Export flow', 'Manual posting', 'Coming soon: API']
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
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [discordGuildId, setDiscordGuildId] = useState('');
  const [roleMap, setRoleMap] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch connections
      const { data: connectionsData } = await supabase
        .from('social_connections')
        .select('*')
        .in('provider', ['distrokid', 'tunecore', 'amuse', 'mailchimp', 'discord', 'twitter', 'instagram', 'youtube', 'gmail', 'tiktok']);

      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('mailchimp_list_id, mailchimp_status, mailchimp_auto_sync, discord_guild_id, discord_role_map')
        .eq('user_id', user!.id)
        .single();

      // Fetch subscription tiers (using fan_subscriptions as proxy)
      const { data: tiersData } = await supabase
        .from('fan_subscriptions')
        .select('id')
        .eq('creator_id', user!.id)
        .limit(1);

      setConnections(connectionsData || []);
      setProfile(profileData || {});
      setSubscriptionTiers([
        { id: '1', name: 'Basic', price: 500 },
        { id: '2', name: 'Premium', price: 1000 }
      ]); // Placeholder tiers
      setDiscordGuildId(profileData?.discord_guild_id || '');
      setRoleMap((profileData?.discord_role_map as {[key: string]: string}) || {});

      // Fetch Mailchimp lists if connected
      if (isConnected('mailchimp')) {
        await fetchMailchimpLists();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMailchimpLists = async () => {
    try {
      // This would call Mailchimp API to get lists
      // For now, simulating with placeholder data
      setMailchimpLists([
        { id: 'list1', name: 'Main Audience', member_count: 1250 },
        { id: 'list2', name: 'VIP Fans', member_count: 340 }
      ]);
    } catch (error) {
      console.error('Error fetching Mailchimp lists:', error);
    }
  };

  const isConnected = (provider: string) => {
    return connections.some(c => c.provider === provider);
  };

  const handleConnect = async (provider: string) => {
    if (provider === 'mailchimp' || provider === 'discord') {
      toast({
        title: "OAuth Integration",
        description: `${provider} OAuth integration coming soon. Please configure manually for now.`,
      });
    } else {
      toast({
        title: "Coming Soon",
        description: `${provider} integration will be available soon.`,
      });
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('provider', provider)
        .eq('user_id', user!.id);

      if (error) throw error;

      setConnections(connections.filter(c => c.provider !== provider));
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
      toast({
        title: "Settings Updated",
        description: "Mailchimp settings saved successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
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
      toast({
        title: "Error",
        description: "Failed to update Discord settings",
        variant: "destructive"
      });
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
      const { data, error } = await supabase.functions.invoke('mailchimp-export-audience', {
        body: { creator_id: user!.id }
      });

      if (error) throw error;

      toast({
        title: "Export Complete",
        description: `Successfully exported ${data.total_audience} contacts to Mailchimp`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export audience to Mailchimp",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

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
                    {isConnected('mailchimp') ? 'Connected' : 'Connect to sync your audience'}
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
                {/* Audience Selection */}
                <div className="space-y-3">
                  <Label>Select Mailchimp Audience</Label>
                  <Select
                    value={profile.mailchimp_list_id || ''}
                    onValueChange={(value) => updateMailchimpSettings({ mailchimp_list_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an audience to sync to" />
                    </SelectTrigger>
                    <SelectContent>
                      {mailchimpLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.member_count} members)
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
                        disabled={platform.id === 'tiktok'} // TikTok requires special approval
                      >
                        {platform.id === 'tiktok' ? 'Coming Soon' : 'Connect'}
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
                    {isConnected('discord') ? 'Bot connected to your server' : 'Connect bot to manage roles'}
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
                  {subscriptionTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Crown className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{tier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${(tier.price / 100).toFixed(2)}/month
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
    </div>
  );
};