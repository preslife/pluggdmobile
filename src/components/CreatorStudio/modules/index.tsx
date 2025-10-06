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

// Export all Creator Studio modules
export { CatalogRouter as CatalogModule } from './CatalogRouter';
export { PluginsModule } from './PluginsModule';
export { LiveModule } from './LiveModule';
export { AnalyticsModule } from './AnalyticsModule';

// Placeholder modules (to be implemented)
// Import the enhanced courses module
import { EnhancedCoursesModule } from './EnhancedCoursesModule';
export const CoursesModule = EnhancedCoursesModule;

// Import the enhanced memberships module
import { EnhancedMembershipsModule } from './EnhancedMembershipsModule';
export const MembershipsModule = EnhancedMembershipsModule;

// Import the enhanced crowdfunding module
import { EnhancedCrowdfundingModule } from './EnhancedCrowdfundingModule';
export const CrowdfundingModule = EnhancedCrowdfundingModule;

// Import the enhanced collaboration module
import { EnhancedCollaborationsModule } from './EnhancedCollaborationsModule';
export const CollaborationsModule = EnhancedCollaborationsModule;

// Import the enhanced CRM module
import { EnhancedCRMModule } from './EnhancedCRMModule';
export const CRMModule = EnhancedCRMModule;

// Import the enhanced storefront module
import { EnhancedStorefrontModule } from './EnhancedStorefrontModule';
export const StorefrontModule = EnhancedStorefrontModule;

export const FinancialsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statements, setStatements] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalStatements: 0,
    pendingPayouts: 0,
    thisMonth: 0
  });
  const [accountStatus, setAccountStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value);
  };

  const fetchFinancialData = async (silent = false) => {
    if (!user) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      const [statementsRes, payoutsRes, accountRes] = await Promise.all([
        supabase
          .from('creator_statements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('payouts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('producer_stripe_accounts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (statementsRes.error) throw statementsRes.error;
      if (payoutsRes.error) throw payoutsRes.error;

      const statementData = statementsRes.data || [];
      const payoutData = payoutsRes.data || [];

      setStatements(statementData);
      setPayouts(payoutData);
      setAccountStatus(accountRes.data || null);

      const totalNetCents = statementData.reduce(
        (sum, statement) => sum + (statement.net_amount_cents || 0),
        0
      );
      const pendingNetCents = statementData
        .filter(statement => ['ready', 'pending'].includes(statement.status))
        .reduce((sum, statement) => sum + (statement.net_amount_cents || 0), 0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthCents = statementData
        .filter(statement => {
          const createdAt = statement.created_at ? new Date(statement.created_at) : null;
          return createdAt && createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
        })
        .reduce((sum, statement) => sum + (statement.net_amount_cents || 0), 0);

      setStats({
        totalRevenue: totalNetCents / 100,
        totalStatements: statementData.length,
        pendingPayouts: pendingNetCents / 100,
        thisMonth: thisMonthCents / 100
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast({
        title: 'Unable to load financials',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive'
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const getContentLabel = (statement: any) => {
    if (statement.metadata?.content_title) return statement.metadata.content_title;
    if (statement.content_id) {
      return `${statement.content_type ?? 'content'} · ${statement.content_id.slice(0, 8)}`;
    }
    return statement.content_type ?? 'General earnings';
  };

  const downloadCsv = (rows: Record<string, any>[], filename: string) => {
    if (rows.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'There are no records available to download yet.'
      });
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];

    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportStatements = () => {
    const rows = statements.map(statement => ({
      statement_id: statement.id,
      created_at: statement.created_at,
      content_type: statement.content_type,
      content_id: statement.content_id,
      gross_amount: (statement.gross_amount_cents || 0) / 100,
      fee_amount: (statement.fee_amount_cents || 0) / 100,
      net_amount: (statement.net_amount_cents || 0) / 100,
      split_percent: statement.split_percent ?? '',
      status: statement.status,
      source_type: statement.source_type
    }));
    downloadCsv(rows, 'creator-statements.csv');
  };

  const exportPayouts = () => {
    const rows = payouts.map(payout => ({
      payout_id: payout.id,
      created_at: payout.created_at,
      processed_at: payout.processed_at,
      total_amount: (payout.total_amount_cents || 0) / 100,
      status: payout.status,
      stripe_transfer_id: payout.stripe_transfer_id || ''
    }));
    downloadCsv(rows, 'creator-payouts.csv');
  };

  const refreshStripeStatus = async () => {
    if (!user) return;

    setRefreshingStatus(true);
    try {
      const { error } = await supabase.functions.invoke('update-stripe-account-status', {
        body: {}
      });

      if (error) throw error;

      toast({ title: 'Stripe status refreshed' });
      await fetchFinancialData(true);
    } catch (error) {
      console.error('Failed to refresh Stripe status', error);
      toast({
        title: 'Unable to refresh Stripe status',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setRefreshingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financials & Payouts</h1>
        <p className="text-muted-foreground">Track orders, refunds, payouts, and tax information.</p>
      </div>

      {accountStatus && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Stripe Connect</CardTitle>
              <CardDescription>Manage your payout account health</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={accountStatus.onboarding_complete ? 'default' : 'outline'}>
                {accountStatus.onboarding_complete ? 'Onboarding complete' : 'Action required'}
              </Badge>
              <Badge variant={accountStatus.payouts_enabled ? 'default' : 'secondary'}>
                {accountStatus.payouts_enabled ? 'Payouts enabled' : 'Payouts disabled'}
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshStripeStatus} disabled={refreshingStatus}>
                {refreshingStatus ? 'Refreshing…' : 'Refresh status'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStatements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingPayouts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="statements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="statements">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Recent Statements</CardTitle>
                <CardDescription>Revenue attributed to your content and collaborators</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportStatements} disabled={statements.length === 0}>
                Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : statements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No statements yet. Once sales are processed you will see them here.
                </div>
              ) : (
                <div className="space-y-4">
                  {statements.map(statement => (
                    <div key={statement.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{getContentLabel(statement)}</p>
                        <p className="text-sm text-muted-foreground">
                          {statement.source_type === 'order' ? 'Store order' : statement.source_type}
                          {' · '}
                          {statement.created_at ? new Date(statement.created_at).toLocaleDateString() : 'Pending'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency((statement.net_amount_cents || 0) / 100)}</p>
                          <p className="text-xs text-muted-foreground">
                            Gross {formatCurrency((statement.gross_amount_cents || 0) / 100)} · Fees {formatCurrency((statement.fee_amount_cents || 0) / 100)}
                          </p>
                        </div>
                        <Badge variant={statement.status === 'paid' ? 'default' : statement.status === 'ready' ? 'outline' : 'secondary'}>
                          {statement.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Transfers sent to your Stripe account</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportPayouts} disabled={payouts.length === 0}>
                Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payouts have been processed yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {payouts.map(payout => (
                    <div key={payout.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{payout.processed_at ? 'Transfer sent' : 'Payout pending'}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : '—'}
                          {payout.processed_at ? ` · Paid ${new Date(payout.processed_at).toLocaleDateString()}` : ''}
                        </p>
                        {payout.stripe_transfer_id && (
                          <p className="text-xs text-muted-foreground">Transfer #{payout.stripe_transfer_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency((payout.total_amount_cents || 0) / 100)}</p>
                          <p className="text-xs text-muted-foreground">{payout.currency?.toUpperCase() ?? 'GBP'}</p>
                        </div>
                        <Badge variant={payout.status === 'paid' ? 'default' : payout.status === 'failed' ? 'destructive' : 'secondary'}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
              <CardDescription>Revenue trends grouped by content</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : statements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Add collaborators and complete orders to unlock revenue analytics.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    statements.reduce((acc: Record<string, { label: string; net: number; count: number }>, statement) => {
                      const key = `${statement.content_type || 'unknown'}:${statement.content_id || 'none'}`;
                      if (!acc[key]) {
                        acc[key] = {
                          label: getContentLabel(statement),
                          net: 0,
                          count: 0
                        };
                      }
                      acc[key].net += (statement.net_amount_cents || 0) / 100;
                      acc[key].count += 1;
                      return acc;
                    }, {})
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{value.label}</p>
                        <p className="text-sm text-muted-foreground">{value.count} statement{value.count !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(value.net)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const SettingsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    website: '',
    twitter: '',
    instagram: '',
    youtube: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setProfile({
          username: data.username || '',
          full_name: data.full_name || '',
          bio: data.bio || '',
          website: data.website || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          youtube: data.youtube || '',
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account, team, and platform settings.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={profile.username}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input 
                  id="full_name" 
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <Button onClick={updateProfile} disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>Customize how others see your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input 
                    id="twitter" 
                    value={profile.twitter}
                    onChange={(e) => setProfile(prev => ({ ...prev, twitter: e.target.value }))}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input 
                    id="instagram" 
                    value={profile.instagram}
                    onChange={(e) => setProfile(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input 
                    id="youtube" 
                    value={profile.youtube}
                    onChange={(e) => setProfile(prev => ({ ...prev, youtube: e.target.value }))}
                    placeholder="Channel URL"
                  />
                </div>
              </div>
              <Button onClick={updateProfile} disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Sales</p>
                    <p className="text-sm text-muted-foreground">Get notified when someone purchases your content</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Followers</p>
                    <p className="text-sm text-muted-foreground">Get notified when someone follows you</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Updates</p>
                    <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your connected social media and streaming accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">S</div>
                    <div>
                      <p className="font-medium">Spotify</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">Y</div>
                    <div>
                      <p className="font-medium">YouTube</p>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const PartnershipsModule = () => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold">Partnerships & Mentorship</h1>
    <p className="text-muted-foreground">Manage brand partnerships and mentorship programs.</p>
    <div className="text-center py-16 text-muted-foreground">
      Partnership features coming soon...
    </div>
  </div>
);