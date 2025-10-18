import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useStudioEmbedSettings,
  TeamMember,
  TeamRole,
  LegalDocument,
  StudioDefaults,
  PartnershipDeal,
  PartnershipStatus,
  generateStudioId
} from '@/hooks/useStudioEmbedSettings';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils';

// Export all Creator Studio modules
export { CatalogRouter as CatalogModule } from './CatalogRouter';
export { PluginsModule } from './PluginsModule';
export { LiveModule } from './LiveModule';
export { AnalyticsModule } from './AnalyticsModule';
export { InsightsModule } from './InsightsModule';

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

        <TabsContent value="release-docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Release split documents</CardTitle>
              <CardDescription>Keep release-specific paperwork (split sheets, agreements, stems) tidy and shareable with collaborators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {releasesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your releases…
                </div>
              ) : creatorReleases.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  Publish a release first to start organising split sheets and supporting paperwork here.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-[260px_1fr] md:items-center">
                    <div>
                      <Label htmlFor="release-docs-select">Release</Label>
                      <p className="text-xs text-muted-foreground">Pick the release whose documents you want to view.</p>
                    </div>
                    <Select
                      value={selectedReleaseId ?? ''}
                      onValueChange={(value) => setSelectedReleaseId(value)}
                    >
                      <SelectTrigger id="release-docs-select">
                        <SelectValue placeholder="Choose a release" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {creatorReleases.map((release) => (
                          <SelectItem key={release.id} value={release.id}>
                            {release.title}
                            {release.status ? ` • ${release.status}` : ''}
                            {release.release_date ? ` (${new Date(release.release_date).toLocaleDateString()})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {releaseDocsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching documents…
                    </div>
                  ) : releaseDocuments.length === 0 ? (
                    <div className="rounded-lg border border-muted/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                      No documents stored for this release yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {releaseDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(doc.uploaded_at).toLocaleString()}
                            </p>
                            {doc.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">Notes: {doc.notes}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReleaseDocument(doc)}
                              disabled={releaseDocDownloadId === doc.id}
                            >
                              {releaseDocDownloadId === doc.id ? 'Generating…' : 'Download'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteReleaseDocument(doc)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {creatorReleases.length > 0 && selectedReleaseId && (
            <Card>
              <CardHeader>
                <CardTitle>Upload new document</CardTitle>
                <CardDescription>Store signed paperwork with the release so the whole team stays aligned.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="release-doc-file">File</Label>
                  <Input
                    id="release-doc-file"
                    type="file"
                    onChange={(event) => setReleaseDocFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOCX, or image files work best.
                  </p>
                </div>
                <div>
                  <Label htmlFor="release-doc-notes">Notes (optional)</Label>
                  <Textarea
                    id="release-doc-notes"
                    placeholder="E.g. signed split sheet - 15 Jan 2025"
                    value={releaseDocNotes}
                    onChange={(event) => setReleaseDocNotes(event.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={handleUploadReleaseDocument} disabled={releaseDocUploading || !releaseDocFile}>
                  {releaseDocUploading ? 'Uploading…' : 'Upload document'}
                </Button>
              </CardFooter>
            </Card>
          )}
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

const DEFAULT_TIMEZONE =
  typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
    : 'UTC';

export const SettingsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    loading: settingsLoading,
    saving: settingsSaving,
    updateSettings
  } = useStudioEmbedSettings();

  const [profileForm, setProfileForm] = useState({
    username: '',
    fullName: '',
    bio: '',
    website: '',
    socials: {
      twitter: '',
      instagram: '',
      youtube: '',
      tiktok: ''
    }
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [teamForm, setTeamForm] = useState<{ name: string; email: string; role: TeamRole }>({
    name: '',
    email: '',
    role: 'editor'
  });
  const [teamSaving, setTeamSaving] = useState(false);

  const [legalFile, setLegalFile] = useState<File | null>(null);
  const [legalMetadata, setLegalMetadata] = useState({
    type: 'Contract',
    signer: '',
    notes: ''
  });
  const [legalUploading, setLegalUploading] = useState(false);
  const [legalDownloadId, setLegalDownloadId] = useState<string | null>(null);

  const [defaultsForm, setDefaultsForm] = useState({
    currency: 'USD',
    timezone: DEFAULT_TIMEZONE,
    releasePrice: '',
    payoutSchedule: 'monthly',
    licenseTemplate: '',
    deliveryWindowDays: ''
  });

  type ReleaseSummary = {
    id: string;
    title: string;
    status?: string | null;
    release_date?: string | null;
  };

  type ReleaseDocumentRecord = {
    id: string;
    file_name: string;
    notes: string | null;
    storage_path: string;
    uploaded_at: string;
    uploaded_by: string | null;
  };

  const [creatorReleases, setCreatorReleases] = useState<ReleaseSummary[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(true);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [releaseDocuments, setReleaseDocuments] = useState<ReleaseDocumentRecord[]>([]);
  const [releaseDocsLoading, setReleaseDocsLoading] = useState(false);
  const [releaseDocFile, setReleaseDocFile] = useState<File | null>(null);
  const [releaseDocNotes, setReleaseDocNotes] = useState('');
  const [releaseDocUploading, setReleaseDocUploading] = useState(false);
  const [releaseDocDownloadId, setReleaseDocDownloadId] = useState<string | null>(null);

  const teamMembers = settings.team ?? [];
  const legalDocuments = settings.legalVault ?? [];

  const ownerCount = useMemo(
    () => teamMembers.filter((member) => member.role === 'owner').length,
    [teamMembers]
  );

  const timezoneOptions = useMemo(() => {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
      return ((Intl as any).supportedValuesOf('timeZone') as string[]) ?? [];
    }
    return [
      'UTC',
      'America/Los_Angeles',
      'America/New_York',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo'
    ];
  }, []);

  const currencyOptions = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'JPY'];

  const teamRoles: { value: TeamRole; label: string; description: string }[] = [
    {
      value: 'owner',
      label: 'Owner',
      description: 'Full control including payouts, API keys, and team management.'
    },
    {
      value: 'admin',
      label: 'Admin',
      description: 'Manage catalog, campaigns, and team members (except owners).'
    },
    {
      value: 'editor',
      label: 'Editor',
      description: 'Manage content, campaigns, and messaging without billing access.'
    },
    {
      value: 'viewer',
      label: 'Viewer',
      description: 'Read-only access for analytics and reporting.'
    }
  ];

  const legalTypes = ['Contract', 'Split Sheet', 'License', 'NDA', 'Other'];

  const payoutOptions: { value: StudioDefaults['payoutSchedule']; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'manual', label: 'Manual' }
  ];

  useEffect(() => {
    if (user?.id) {
      void loadProfile();
    } else {
      setProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      website: settings.website ?? settings.socials?.website ?? '',
      socials: {
        twitter: settings.socials?.twitter ?? '',
        instagram: settings.socials?.instagram ?? '',
        youtube: settings.socials?.youtube ?? '',
        tiktok: settings.socials?.tiktok ?? ''
      }
    }));
    setDefaultsForm({
      currency: settings.defaults?.currency ?? 'USD',
      timezone: settings.defaults?.timezone ?? DEFAULT_TIMEZONE,
      releasePrice:
        settings.defaults?.releasePrice != null ? settings.defaults?.releasePrice.toString() : '',
      payoutSchedule: settings.defaults?.payoutSchedule ?? 'monthly',
      licenseTemplate: settings.defaults?.licenseTemplate ?? '',
      deliveryWindowDays:
        settings.defaults?.deliveryWindowDays != null
          ? settings.defaults?.deliveryWindowDays.toString()
          : ''
    });
  }, [settings]);

  useEffect(() => {
    if (user?.id) {
      void loadReleases();
    } else {
      setCreatorReleases([]);
      setSelectedReleaseId(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedReleaseId) {
      void loadReleaseDocuments(selectedReleaseId);
    } else {
      setReleaseDocuments([]);
    }
  }, [selectedReleaseId]);

  const loadProfile = async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfileForm((prev) => ({
        ...prev,
        username: data?.username ?? '',
        fullName: data?.full_name ?? '',
        bio: data?.bio ?? ''
      }));
    } catch (err) {
      console.error('Error loading profile basics', err);
      toast({
        title: 'Unable to load profile',
        description: 'Please try again shortly.',
        variant: 'destructive'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const loadReleases = async () => {
    if (!user?.id) {
      setCreatorReleases([]);
      setSelectedReleaseId(null);
      return;
    }

    setReleasesLoading(true);
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, status, release_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ReleaseSummary[] = (data ?? []).map((release) => ({
        id: release.id,
        title: release.title ?? 'Untitled release',
        status: (release as any)?.status ?? null,
        release_date: release.release_date ?? null
      }));

      setCreatorReleases(mapped);
      if (mapped.length > 0) {
        setSelectedReleaseId((current) => current ?? mapped[0]?.id ?? null);
      } else {
        setSelectedReleaseId(null);
      }
    } catch (err) {
      console.error('Error loading releases', err);
      toast({
        title: 'Unable to load releases',
        description: 'We could not fetch your releases. Try again later.',
        variant: 'destructive'
      });
      setCreatorReleases([]);
      setSelectedReleaseId(null);
    } finally {
      setReleasesLoading(false);
    }
  };

  const loadReleaseDocuments = async (releaseId: string) => {
    setReleaseDocsLoading(true);
    try {
      const { data, error } = await supabase
        .from('release_split_documents')
        .select('id, file_name, notes, storage_path, uploaded_at, uploaded_by')
        .eq('release_id', releaseId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setReleaseDocuments(data ?? []);
    } catch (err) {
      console.error('Error loading split documents', err);
      toast({
        title: 'Unable to load documents',
        description: 'Check your connection and try again.',
        variant: 'destructive'
      });
      setReleaseDocuments([]);
    } finally {
      setReleaseDocsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    try {
      const nextSettings = {
        ...settings,
        website: profileForm.website.trim(),
        socials: {
          ...settings.socials,
          twitter: profileForm.socials.twitter.trim(),
          instagram: profileForm.socials.instagram.trim(),
          youtube: profileForm.socials.youtube.trim(),
          tiktok: profileForm.socials.tiktok.trim(),
          website: profileForm.website.trim()
        }
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileForm.username.trim(),
          full_name: profileForm.fullName.trim(),
          bio: profileForm.bio,
          embed_settings: nextSettings
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.'
      });
    } catch (err) {
      console.error('Error saving profile', err);
      toast({
        title: 'Unable to update profile',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUploadReleaseDocument = async () => {
    if (!user?.id || !selectedReleaseId) return;
    if (!releaseDocFile) {
      toast({
        title: 'Select a file',
        description: 'Choose a PDF or document to upload.',
        variant: 'destructive'
      });
      return;
    }

    setReleaseDocUploading(true);
    try {
      const safeName = releaseDocFile.name.replace(/[^a-zA-Z0-9_.-]+/g, '_');
      const storagePath = `${user.id}/release-docs/${selectedReleaseId}/${Date.now()}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('release-split-docs')
        .upload(storagePath, releaseDocFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (storageError) throw storageError;

      const { error: insertError } = await supabase
        .from('release_split_documents')
        .insert({
          release_id: selectedReleaseId,
          storage_path: storagePath,
          file_name: releaseDocFile.name,
          notes: releaseDocNotes.trim() || null
        });

      if (insertError) throw insertError;

      toast({
        title: 'Document uploaded',
        description: 'Your split sheet is safely stored and accessible to collaborators.'
      });

      setReleaseDocFile(null);
      setReleaseDocNotes('');
      await loadReleaseDocuments(selectedReleaseId);
    } catch (err) {
      console.error('Error uploading release document', err);
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast({
        title: 'Unable to upload document',
        description: message.includes('bucket')
          ? 'Storage bucket "release-split-docs" is missing. Create it in Supabase storage and retry.'
          : message,
        variant: 'destructive'
      });
    } finally {
      setReleaseDocUploading(false);
    }
  };

  const handleDownloadReleaseDocument = async (doc: ReleaseDocumentRecord) => {
    setReleaseDocDownloadId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('release-split-docs')
        .createSignedUrl(doc.storage_path, 120);

      if (error || !data?.signedUrl) {
        throw error ?? new Error('Unable to generate download link');
      }

      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (err) {
      console.error('Error downloading release document', err);
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setReleaseDocDownloadId(null);
    }
  };

  const handleDeleteReleaseDocument = async (doc: ReleaseDocumentRecord) => {
    if (!confirm(`Remove ${doc.file_name}?`)) {
      return;
    }

    try {
      await supabase.storage.from('release-split-docs').remove([doc.storage_path]);
    } catch (err) {
      console.warn('Unable to remove file from storage', err);
    }

    try {
      const { error } = await supabase
        .from('release_split_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
      toast({ title: 'Document removed' });
      if (selectedReleaseId) {
        await loadReleaseDocuments(selectedReleaseId);
      }
    } catch (err) {
      console.error('Error deleting release document record', err);
      toast({
        title: 'Unable to remove document',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddTeamMember = async () => {
    if (!user?.id) return;
    const email = teamForm.email.trim();
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Enter an email address before inviting a collaborator.',
        variant: 'destructive'
      });
      return;
    }

    const member: TeamMember = {
      id: generateStudioId(),
      name: teamForm.name.trim() || email,
      email,
      role: teamForm.role,
      addedAt: new Date().toISOString()
    };

    setTeamSaving(true);
    try {
      await updateSettings((prev) => ({
        ...prev,
        team: [...(prev.team ?? []), member]
      }));
      toast({
        title: 'Collaborator added',
        description: `${member.name} now has studio access.`
      });
      setTeamForm({ name: '', email: '', role: 'editor' });
    } catch (err) {
      toast({
        title: 'Unable to add collaborator',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setTeamSaving(false);
    }
  };

  const handleUpdateTeamRole = async (memberId: string, role: TeamRole) => {
    const member = teamMembers.find((item) => item.id === memberId);
    if (!member) return;
    if (member.role === 'owner' && role !== 'owner' && ownerCount <= 1) {
      toast({
        title: 'At least one owner required',
        description: 'Assign a new owner before demoting the last owner.',
        variant: 'destructive'
      });
      return;
    }

    setTeamSaving(true);
    try {
      await updateSettings((prev) => ({
        ...prev,
        team: (prev.team ?? []).map((item) =>
          item.id === memberId ? { ...item, role } : item
        )
      }));
    } catch (err) {
      toast({
        title: 'Unable to update role',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setTeamSaving(false);
    }
  };

  const handleRemoveTeamMember = async (member: TeamMember) => {
    if (member.role === 'owner' && ownerCount <= 1) {
      toast({
        title: 'Cannot remove final owner',
        description: 'Assign another owner before removing this collaborator.',
        variant: 'destructive'
      });
      return;
    }

    if (!window.confirm(`Remove ${member.name} from your studio?`)) {
      return;
    }

    setTeamSaving(true);
    try {
      await updateSettings((prev) => ({
        ...prev,
        team: (prev.team ?? []).filter((item) => item.id !== member.id)
      }));
      toast({
        title: 'Team member removed'
      });
    } catch (err) {
      toast({
        title: 'Unable to remove member',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setTeamSaving(false);
    }
  };

  const handleUploadLegalDocument = async () => {
    if (!user?.id) return;
    if (!legalFile) {
      toast({
        title: 'Select a file first',
        variant: 'destructive'
      });
      return;
    }

    setLegalUploading(true);
    try {
      const extension = legalFile.name.includes('.')
        ? legalFile.name.substring(legalFile.name.lastIndexOf('.'))
        : '';
      const storagePath = `${user.id}/legal/${generateStudioId()}${extension}`;

      const { error } = await supabase.storage
        .from('legal-vault')
        .upload(storagePath, legalFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      const document: LegalDocument = {
        id: generateStudioId(),
        fileName: legalFile.name,
        storagePath,
        uploadedAt: new Date().toISOString(),
        size: legalFile.size,
        type: legalMetadata.type || undefined,
        signer: legalMetadata.signer || undefined,
        notes: legalMetadata.notes || undefined
      };

      await updateSettings((prev) => ({
        ...prev,
        legalVault: [...(prev.legalVault ?? []), document]
      }));

      toast({
        title: 'Document stored',
        description: `${legalFile.name} was added to your legal vault.`
      });

      setLegalFile(null);
      setLegalMetadata({ type: 'Contract', signer: '', notes: '' });
    } catch (err) {
      console.error('Legal upload error', err);
      const message =
        err && typeof err === 'object' && 'message' in err ? (err as any).message : undefined;
      toast({
        title: 'Unable to upload file',
        description:
          message?.includes('bucket')
            ? 'Storage bucket "legal-vault" is missing. Create it in Supabase storage and try again.'
            : message ?? 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLegalUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: LegalDocument) => {
    setLegalDownloadId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('legal-vault')
        .createSignedUrl(doc.storagePath, 60);
      if (error || !data?.signedUrl) {
        throw error ?? new Error('Unable to generate secure link');
      }
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (err) {
      toast({
        title: 'Unable to download document',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLegalDownloadId(null);
    }
  };

  const handleRemoveDocument = async (doc: LegalDocument) => {
    if (!window.confirm(`Remove ${doc.fileName} from the vault?`)) {
      return;
    }

    try {
      await supabase.storage.from('legal-vault').remove([doc.storagePath]);
    } catch (err) {
      console.warn('Unable to remove file from storage', err);
    }

    try {
      await updateSettings((prev) => ({
        ...prev,
        legalVault: (prev.legalVault ?? []).filter((item) => item.id !== doc.id)
      }));
      toast({
        title: 'Document removed'
      });
    } catch (err) {
      toast({
        title: 'Unable to update vault',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveDefaults = async () => {
    const releasePriceValue = defaultsForm.releasePrice.trim()
      ? Number(defaultsForm.releasePrice)
      : null;
    if (defaultsForm.releasePrice && Number.isNaN(releasePriceValue)) {
      toast({
        title: 'Invalid price',
        description: 'Enter a numeric default release price.',
        variant: 'destructive'
      });
      return;
    }

    const deliveryWindowValue = defaultsForm.deliveryWindowDays.trim()
      ? Number(defaultsForm.deliveryWindowDays)
      : null;
    if (defaultsForm.deliveryWindowDays && Number.isNaN(deliveryWindowValue)) {
      toast({
        title: 'Invalid delivery window',
        description: 'Enter a numeric number of days.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateSettings((prev) => ({
        ...prev,
        defaults: {
          timezone: defaultsForm.timezone,
          currency: defaultsForm.currency,
          releasePrice:
            releasePriceValue != null
              ? Math.round(releasePriceValue * 100) / 100
              : null,
          payoutSchedule: defaultsForm.payoutSchedule as StudioDefaults['payoutSchedule'],
          licenseTemplate: defaultsForm.licenseTemplate,
          deliveryWindowDays:
            deliveryWindowValue != null ? Math.max(0, Math.trunc(deliveryWindowValue)) : null
        }
      }));
      toast({
        title: 'Defaults saved',
        description: 'Future releases will inherit these values automatically.'
      });
    } catch (err) {
      toast({
        title: 'Unable to save defaults',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account & Studio Settings</h1>
        <p className="text-muted-foreground">
          Control your public presence, collaboration access, legal documents, and studio defaults.
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="legal">Legal Vault</TabsTrigger>
          <TabsTrigger value="release-docs">Release Docs</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile & Presence</CardTitle>
              <CardDescription>Update the information visible to fans, collaborators, and partners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="settings-username">Username</Label>
                  <Input
                    id="settings-username"
                    value={profileForm.username}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="settings-fullname">Full name</Label>
                  <Input
                    id="settings-fullname"
                    value={profileForm.fullName}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="settings-website">Primary website</Label>
                <Input
                  id="settings-website"
                  placeholder="https://your-site.com"
                  value={profileForm.website}
                  disabled={profileLoading}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, website: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="settings-twitter">Twitter</Label>
                  <Input
                    id="settings-twitter"
                    placeholder="@handle"
                    value={profileForm.socials.twitter}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        socials: { ...prev.socials, twitter: event.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="settings-instagram">Instagram</Label>
                  <Input
                    id="settings-instagram"
                    placeholder="@handle"
                    value={profileForm.socials.instagram}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        socials: { ...prev.socials, instagram: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="settings-youtube">YouTube</Label>
                  <Input
                    id="settings-youtube"
                    placeholder="Channel URL"
                    value={profileForm.socials.youtube}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        socials: { ...prev.socials, youtube: event.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="settings-tiktok">TikTok</Label>
                  <Input
                    id="settings-tiktok"
                    placeholder="@handle"
                    value={profileForm.socials.tiktok}
                    disabled={profileLoading}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        socials: { ...prev.socials, tiktok: event.target.value }
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="settings-bio">Bio</Label>
                <Textarea
                  id="settings-bio"
                  className="min-h-[120px]"
                  placeholder="Tell collaborators and fans about your work, services, and achievements."
                  value={profileForm.bio}
                  disabled={profileLoading}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, bio: event.target.value }))
                  }
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => void loadProfile()}
                disabled={profileLoading || profileSaving}
              >
                Reset
              </Button>
              <Button onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save profile'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team access</CardTitle>
              <CardDescription>Invite collaborators to help run your studio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  Invite trusted collaborators to manage releases, campaigns, and analytics with you.
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {member.name
                              .split(' ')
                              .map((fragment) => fragment.charAt(0).toUpperCase())
                              .slice(0, 2)
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-tight">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Added {new Date(member.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  handleUpdateTeamRole(member.id, value as TeamRole)
                                }
                                disabled={
                                  teamSaving ||
                                  (member.role === 'owner' && ownerCount <= 1)
                                }
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamRoles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-sm">
                              {teamRoles.find((role) => role.value === member.role)?.description}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={teamSaving || (member.role === 'owner' && ownerCount <= 1)}
                          onClick={() => handleRemoveTeamMember(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invite a collaborator</CardTitle>
              <CardDescription>Grant permissions tailored to their responsibilities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="team-name">Name (optional)</Label>
                  <Input
                    id="team-name"
                    placeholder="Creative partner"
                    value={teamForm.name}
                    onChange={(event) =>
                      setTeamForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="team-email">Email</Label>
                  <Input
                    id="team-email"
                    type="email"
                    placeholder="collaborator@email.com"
                    value={teamForm.email}
                    onChange={(event) =>
                      setTeamForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="max-w-xs">
                <Label htmlFor="team-role">Role</Label>
                <Select
                  id="team-role"
                  value={teamForm.role}
                  onValueChange={(value) =>
                    setTeamForm((prev) => ({ ...prev, role: value as TeamRole }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleAddTeamMember} disabled={teamSaving || !teamForm.email}>
                {teamSaving ? 'Adding…' : 'Invite collaborator'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stored agreements</CardTitle>
              <CardDescription>Keep split sheets, NDAs, and contracts securely in one place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {legalDocuments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  Upload legal documents to share with your team anytime.
                </div>
              ) : (
                legalDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.type ?? 'Document'} • Uploaded{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.signer ? ` • ${doc.signer}` : ''}
                      </p>
                      {doc.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{doc.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc)}
                        disabled={legalDownloadId === doc.id}
                      >
                        {legalDownloadId === doc.id ? 'Generating…' : 'Download'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemoveDocument(doc)}
                        disabled={legalUploading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add to legal vault</CardTitle>
              <CardDescription>Upload agreements to keep everyone aligned.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="legal-file">File</Label>
                <Input
                  id="legal-file"
                  type="file"
                  onChange={(event) => setLegalFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="legal-type">Type</Label>
                  <Select
                    id="legal-type"
                    value={legalMetadata.type}
                    onValueChange={(value) => setLegalMetadata((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {legalTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="legal-signer">Counterparty / signer</Label>
                  <Input
                    id="legal-signer"
                    placeholder="Label, partner, or contractor"
                    value={legalMetadata.signer}
                    onChange={(event) =>
                      setLegalMetadata((prev) => ({ ...prev, signer: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="legal-notes">Notes</Label>
                  <Input
                    id="legal-notes"
                    placeholder="Optional notes"
                    value={legalMetadata.notes}
                    onChange={(event) =>
                      setLegalMetadata((prev) => ({ ...prev, notes: event.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleUploadLegalDocument} disabled={legalUploading || !legalFile}>
                {legalUploading ? 'Uploading…' : 'Upload document'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Release & payout defaults</CardTitle>
              <CardDescription>Standardise new releases, split sheets, and payouts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="defaults-currency">Primary currency</Label>
                  <Select
                    id="defaults-currency"
                    value={defaultsForm.currency}
                    onValueChange={(value) =>
                      setDefaultsForm((prev) => ({ ...prev, currency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="defaults-timezone">Default timezone</Label>
                  <Select
                    id="defaults-timezone"
                    value={defaultsForm.timezone}
                    onValueChange={(value) =>
                      setDefaultsForm((prev) => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {timezoneOptions.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>
                          {timezone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="defaults-price">Default release price</Label>
                  <Input
                    id="defaults-price"
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 9.99"
                    value={defaultsForm.releasePrice}
                    onChange={(event) =>
                      setDefaultsForm((prev) => ({ ...prev, releasePrice: event.target.value }))
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Currency: {defaultsForm.currency}
                  </p>
                </div>
                <div>
                  <Label htmlFor="defaults-delivery">Delivery window (days)</Label>
                  <Input
                    id="defaults-delivery"
                    type="number"
                    inputMode="numeric"
                    placeholder="7"
                    value={defaultsForm.deliveryWindowDays}
                    onChange={(event) =>
                      setDefaultsForm((prev) => ({
                        ...prev,
                        deliveryWindowDays: event.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="defaults-payout">Payout schedule</Label>
                  <Select
                    id="defaults-payout"
                    value={defaultsForm.payoutSchedule}
                    onValueChange={(value) =>
                      setDefaultsForm((prev) => ({ ...prev, payoutSchedule: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {payoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="defaults-license">Default license & terms</Label>
                <Textarea
                  id="defaults-license"
                  className="min-h-[140px]"
                  placeholder="Paste standard licensing terms, delivery expectations, or onboarding instructions."
                  value={defaultsForm.licenseTemplate}
                  onChange={(event) =>
                    setDefaultsForm((prev) => ({
                      ...prev,
                      licenseTemplate: event.target.value
                    }))
                  }
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleSaveDefaults} disabled={settingsSaving}>
                {settingsSaving ? 'Saving…' : 'Save defaults'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>Choose how we keep you informed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: 'notif-sales',
                  title: 'New sales',
                  description: 'Receive an alert when someone purchases your products.'
                },
                {
                  id: 'notif-followers',
                  title: 'New followers & supporters',
                  description: 'Get notified about new followers, members, and top fans.'
                },
                {
                  id: 'notif-admin',
                  title: 'Operational updates',
                  description: 'Critical updates about payouts, compliance, or scheduled downtime.'
                },
                {
                  id: 'notif-news',
                  title: 'Product news & marketing',
                  description: 'Feature launches, webinars, and marketing tips.',
                  defaultChecked: false
                }
              ].map((pref) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{pref.title}</p>
                    <p className="text-sm text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch defaultChecked={pref.defaultChecked ?? true} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected accounts</CardTitle>
              <CardDescription>Integrate social and streaming accounts for automated posts and analytics.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                { id: 'spotify', label: 'Spotify for Artists', connected: false },
                { id: 'youtube', label: 'YouTube', connected: Boolean(settings.socials?.youtube) },
                { id: 'instagram', label: 'Instagram', connected: Boolean(settings.socials?.instagram) },
                { id: 'tiktok', label: 'TikTok', connected: Boolean(settings.socials?.tiktok) }
              ].map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{integration.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                  <Button variant={integration.connected ? 'ghost' : 'outline'} disabled>
                    {integration.connected ? 'Manage' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const partnershipStatusMeta: Record<
  PartnershipStatus,
  { title: string; description: string; accent: string }
> = {
  prospect: {
    title: 'Prospects',
    description: 'Early outreach and initial conversations.',
    accent: 'border-amber-400/60'
  },
  negotiating: {
    title: 'Negotiating',
    description: 'Active conversations covering scope and rates.',
    accent: 'border-blue-400/60'
  },
  'awaiting-contract': {
    title: 'Awaiting contract',
    description: 'Agreed in principle, waiting on paperwork.',
    accent: 'border-purple-400/60'
  },
  signed: {
    title: 'Signed',
    description: 'Contracts signed and kickoff scheduled.',
    accent: 'border-emerald-500/70'
  },
  active: {
    title: 'Active',
    description: 'Deliverables in progress.',
    accent: 'border-emerald-500/70'
  },
  completed: {
    title: 'Completed',
    description: 'All deliverables fulfilled, ready to archive.',
    accent: 'border-gray-400/50'
  },
  lost: {
    title: 'Closed lost',
    description: 'Opportunities not moving forward.',
    accent: 'border-red-400/60'
  }
};

const emptyDealForm: {
  brand: string;
  contact: string;
  email: string;
  value: string;
  status: PartnershipStatus;
  startDate: string;
  endDate: string;
  notes: string;
  deliverables: string;
} = {
  brand: '',
  contact: '',
  email: '',
  value: '',
  status: 'prospect',
  startDate: '',
  endDate: '',
  notes: '',
  deliverables: ''
};

export const PartnershipsModule = () => {
  const { toast } = useToast();
  const {
    settings,
    loading,
    saving,
    updateSettings
  } = useStudioEmbedSettings();

  const currency = settings.defaults?.currency ?? 'USD';
  const deals = settings.partnerships ?? [];

  const [dealForm, setDealForm] = useState(emptyDealForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<PartnershipDeal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    contact: '',
    email: '',
    value: '',
    startDate: '',
    endDate: '',
    notes: '',
    deliverables: ''
  });
  const [exporting, setExporting] = useState(false);

  const pipelineMetrics = useMemo(() => {
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);
    const signedValue = deals
      .filter((deal) => ['signed', 'active', 'completed'].includes(deal.status))
      .reduce((sum, deal) => sum + (deal.value ?? 0), 0);
    const activeCount = deals.filter((deal) => deal.status === 'active').length;
    const dealsWithValue = deals.filter((deal) => deal.value != null);
    const averageValue =
      dealsWithValue.length > 0
        ? totalValue / dealsWithValue.length
        : 0;

    return {
      totalValue,
      signedValue,
      activeCount,
      averageValue
    };
  }, [deals]);

  const groupedDeals = useMemo(() => {
    const groups: Record<PartnershipStatus, PartnershipDeal[]> = {
      prospect: [],
      negotiating: [],
      'awaiting-contract': [],
      signed: [],
      active: [],
      completed: [],
      lost: []
    };

    deals.forEach((deal) => {
      const status = deal.status in groups ? deal.status : 'prospect';
      groups[status as PartnershipStatus].push(deal);
    });

    return groups;
  }, [deals]);

  const handleCreateDeal = async () => {
    if (!dealForm.brand.trim() || !dealForm.contact.trim()) {
      toast({
        title: 'Missing information',
        description: 'Brand and primary contact are required.',
        variant: 'destructive'
      });
      return;
    }

    const valueNumber = dealForm.value.trim() ? Number(dealForm.value) : null;
    if (dealForm.value && Number.isNaN(valueNumber)) {
      toast({
        title: 'Invalid value',
        description: 'Enter a numeric deal value or leave blank.',
        variant: 'destructive'
      });
      return;
    }

    const deal: PartnershipDeal = {
      id: generateStudioId(),
      brand: dealForm.brand.trim(),
      contact: dealForm.contact.trim(),
      email: dealForm.email.trim() || undefined,
      value:
        valueNumber != null
          ? Math.round(valueNumber * 100) / 100
          : null,
      status: dealForm.status,
      startDate: dealForm.startDate || undefined,
      endDate: dealForm.endDate || undefined,
      notes: dealForm.notes.trim() || undefined,
      deliverables: dealForm.deliverables
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      lastUpdated: new Date().toISOString()
    };

    try {
      await updateSettings((prev) => ({
        ...prev,
        partnerships: [...(prev.partnerships ?? []), deal]
      }));
      toast({
        title: 'Partnership logged',
        description: `${deal.brand} added to your pipeline.`
      });
      setDealForm(emptyDealForm);
      setIsModalOpen(false);
    } catch (err) {
      toast({
        title: 'Unable to create partnership',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateDealStatus = async (dealId: string, status: PartnershipStatus) => {
    try {
      await updateSettings((prev) => ({
        ...prev,
        partnerships: (prev.partnerships ?? []).map((deal) =>
          deal.id === dealId
            ? { ...deal, status, lastUpdated: new Date().toISOString() }
            : deal
        )
      }));
    } catch (err) {
      toast({
        title: 'Unable to update status',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleOpenDealDetails = (deal: PartnershipDeal) => {
    setActiveDeal(deal);
    setDetailsForm({
      contact: deal.contact ?? '',
      email: deal.email ?? '',
      value: deal.value != null ? deal.value.toString() : '',
      startDate: deal.startDate ?? '',
      endDate: deal.endDate ?? '',
      notes: deal.notes ?? '',
      deliverables: (deal.deliverables ?? []).join('\n')
    });
    setDetailsOpen(true);
  };

  const handleSaveDealDetails = async () => {
    if (!activeDeal) return;

    const valueNumber = detailsForm.value.trim() ? Number(detailsForm.value) : null;
    if (detailsForm.value && Number.isNaN(valueNumber)) {
      toast({
        title: 'Invalid value',
        description: 'Enter a numeric value or leave blank.',
        variant: 'destructive'
      });
      return;
    }

    const deliverables = detailsForm.deliverables
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setDetailsSaving(true);
    try {
      await updateSettings((prev) => ({
        ...prev,
        partnerships: (prev.partnerships ?? []).map((deal) =>
          deal.id === activeDeal.id
            ? {
                ...deal,
                contact: detailsForm.contact.trim(),
                email: detailsForm.email.trim() || undefined,
                value:
                  valueNumber != null
                    ? Math.round(valueNumber * 100) / 100
                    : null,
                startDate: detailsForm.startDate || undefined,
                endDate: detailsForm.endDate || undefined,
                notes: detailsForm.notes.trim() || undefined,
                deliverables,
                lastUpdated: new Date().toISOString()
              }
            : deal
        )
      }));
      toast({
        title: 'Deal updated',
        description: `${activeDeal.brand} has been refreshed.`
      });
      setDetailsOpen(false);
    } catch (err) {
      toast({
        title: 'Unable to update deal',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleRemoveDeal = async (deal: PartnershipDeal) => {
    if (!window.confirm(`Archive ${deal.brand}? This removes it from the pipeline.`)) {
      return;
    }

    try {
      await updateSettings((prev) => ({
        ...prev,
        partnerships: (prev.partnerships ?? []).filter((item) => item.id !== deal.id)
      }));
      toast({
        title: 'Partnership archived'
      });
    } catch (err) {
      toast({
        title: 'Unable to remove partnership',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleExportDeals = async () => {
    if (!deals.length) {
      toast({
        title: 'Nothing to export',
        description: 'Log a partnership first.',
        variant: 'destructive'
      });
      return;
    }

    setExporting(true);
    try {
      const rows = deals.map((deal) => ({
        brand: deal.brand,
        contact: deal.contact,
        email: deal.email ?? '',
        status: deal.status,
        value: deal.value ?? '',
        start_date: deal.startDate ?? '',
        end_date: deal.endDate ?? '',
        deliverables: (deal.deliverables ?? []).join('; '),
        notes: deal.notes ?? '',
        last_updated: deal.lastUpdated
      }));

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const cell = (row as any)[header];
              if (cell === undefined || cell === null) return '';
              const text = String(cell).replace(/"/g, '""');
              return `"${text}"`;
            })
            .join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'partnerships.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: 'Unable to export',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partnerships & Mentorship</h1>
          <p className="text-muted-foreground">
            Track brand conversations, signed agreements, and mentorship opportunities in one pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportDeals} disabled={exporting || deals.length === 0}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>New partnership</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total pipeline</CardTitle>
            <CardDescription>Value of every active conversation.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrencyUtil(pipelineMetrics.totalValue, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Signed & active</CardTitle>
            <CardDescription>Value of signed or in-flight deals.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrencyUtil(pipelineMetrics.signedValue, currency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active engagements</CardTitle>
            <CardDescription>Deals being delivered right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pipelineMetrics.activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. deal size</CardTitle>
            <CardDescription>Average value across your pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrencyUtil(pipelineMetrics.averageValue || 0, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {deals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">
              Log your first brand opportunity to start tracking outreach, contracts, and deliverables.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>Add partnership</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {(
            Object.keys(partnershipStatusMeta) as PartnershipStatus[]
          ).map((status) => {
            const meta = partnershipStatusMeta[status];
            const dealsForStatus = groupedDeals[status] ?? [];
            return (
              <Card key={status} className={`flex h-full flex-col border-2 ${meta.accent}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{meta.title}</span>
                    <Badge variant="outline">{dealsForStatus.length}</Badge>
                  </CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {dealsForStatus.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Nothing here yet.
                    </div>
                  ) : (
                    dealsForStatus.map((deal) => (
                      <div
                        key={deal.id}
                        className="space-y-3 rounded-lg border bg-background/60 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-tight">{deal.brand}</p>
                              <p className="text-sm text-muted-foreground">
                                {deal.contact}
                                {deal.email ? ` · ${deal.email}` : ''}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {deal.value != null
                                ? formatCurrencyUtil(deal.value, currency)
                                : '—'}
                            </Badge>
                          </div>
                          {deal.deliverables?.length ? (
                            <p className="text-xs text-muted-foreground">
                              Deliverables: {deal.deliverables.join(', ')}
                            </p>
                          ) : null}
                          {deal.notes ? (
                            <p className="text-xs text-muted-foreground">{deal.notes}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Select
                            value={deal.status}
                            onValueChange={(value) =>
                              handleUpdateDealStatus(deal.id, value as PartnershipStatus)
                            }
                            disabled={saving}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(partnershipStatusMeta) as PartnershipStatus[]).map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {partnershipStatusMeta[option].title}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDealDetails(deal)}
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleRemoveDeal(deal)}
                              disabled={saving}
                            >
                              Archive
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log a partnership opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="deal-brand">Brand / partner</Label>
              <Input
                id="deal-brand"
                value={dealForm.brand}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, brand: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-contact">Primary contact</Label>
              <Input
                id="deal-contact"
                value={dealForm.contact}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, contact: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-email">Email (optional)</Label>
              <Input
                id="deal-email"
                type="email"
                value={dealForm.email}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-value">Deal value</Label>
              <Input
                id="deal-value"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 1500"
                value={dealForm.value}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, value: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-status">Status</Label>
              <Select
                id="deal-status"
                value={dealForm.status}
                onValueChange={(value) =>
                  setDealForm((prev) => ({
                    ...prev,
                    status: value as PartnershipStatus
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(partnershipStatusMeta) as PartnershipStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {partnershipStatusMeta[status].title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deal-start">Kickoff date</Label>
              <Input
                id="deal-start"
                type="date"
                value={dealForm.startDate}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="deal-end">Wrap date</Label>
              <Input
                id="deal-end"
                type="date"
                value={dealForm.endDate}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="deal-deliverables">Deliverables</Label>
              <Textarea
                id="deal-deliverables"
                placeholder="One deliverable per line"
                value={dealForm.deliverables}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, deliverables: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="deal-notes">Notes</Label>
              <Textarea
                id="deal-notes"
                placeholder="Negotiation history, expectations, or next steps"
                value={dealForm.notes}
                onChange={(event) =>
                  setDealForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeal}>Create partnership</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeDeal?.brand ?? 'Partnership details'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="details-contact">Primary contact</Label>
              <Input
                id="details-contact"
                value={detailsForm.contact}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, contact: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="details-email">Email</Label>
              <Input
                id="details-email"
                type="email"
                value={detailsForm.email}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="details-value">Deal value</Label>
              <Input
                id="details-value"
                type="number"
                inputMode="decimal"
                value={detailsForm.value}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, value: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="details-start">Kickoff</Label>
              <Input
                id="details-start"
                type="date"
                value={detailsForm.startDate}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="details-end">Wrap date</Label>
              <Input
                id="details-end"
                type="date"
                value={detailsForm.endDate}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="details-deliverables">Deliverables</Label>
              <Textarea
                id="details-deliverables"
                className="min-h-[120px]"
                value={detailsForm.deliverables}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, deliverables: event.target.value }))
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                One deliverable per line. This feeds future reminders.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="details-notes">Internal notes</Label>
              <Textarea
                id="details-notes"
                className="min-h-[120px]"
                value={detailsForm.notes}
                onChange={(event) =>
                  setDetailsForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailsOpen(false)} disabled={detailsSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDealDetails} disabled={detailsSaving}>
              {detailsSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
