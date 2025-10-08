import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  Download,
  Tag,
  MessageSquare,
  TrendingUp,
  Calendar,
  Search,
  MoreVertical,
  Send,
  Eye,
  RefreshCw,
  CloudUpload,
  Loader2
} from 'lucide-react';

interface Contact {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  tags: string[];
  total_spent: number;
  lifetime_value: number;
  last_interaction?: string | null;
  first_interaction?: string | null;
  order_count: number;
  membership_status?: string | null;
  membership_value?: number;
  membership_since?: string | null;
  student_value?: number;
  student_since?: string | null;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  filters: any;
  manual_contact_ids: string[];
  contact_count: number;
  refreshed_at?: string | null;
}

interface SupporterEvent {
  id: string;
  supporterId?: string | null;
  supporterName: string;
  supporterEmail?: string;
  amount: number;
  status: string;
  contributedAt: string;
  fulfilledAt?: string | null;
  refundedAt?: string | null;
  campaignTitle: string;
  rewardTitle?: string | null;
}

/**
 * EnhancedCRMModule - Customer Relationship Management
 * Manage fans, followers, customers, and email lists
 */
export const EnhancedCRMModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contactsLoading, setContactsLoading] = useState(true);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentMembers, setSegmentMembers] = useState<Record<string, Set<string>>>({});
  const [segmentMembersLoading, setSegmentMembersLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('all');
  const [segmentDraft, setSegmentDraft] = useState({
    name: '',
    description: '',
    source: 'all',
    minSpend: '',
    minOrders: ''
  });
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mailchimpSyncing, setMailchimpSyncing] = useState(false);
  const [substackSyncing, setSubstackSyncing] = useState(false);
  const [refreshingSegmentId, setRefreshingSegmentId] = useState<string | null>(null);

  const selectedSegment = useMemo(() => {
    if (selectedSegmentId === 'all') {
      return null;
    }

    return segments.find((segment) => segment.id === selectedSegmentId) ?? null;
  }, [segments, selectedSegmentId]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    try {
      setContactsLoading(true);
      const { data, error } = await supabase.rpc('get_crm_contacts', { p_creator_id: user.id });

      if (error) {
        throw error;
      }

      const normalized: Contact[] = (data || []).map((contact: any) => {
        const sourceTags = Array.isArray(contact.sources) ? contact.sources : [];
        const tags = new Set<string>(sourceTags);
        const totalSpend = Number(contact.total_spend ?? 0);

        if (totalSpend >= 100) {
          tags.add('vip');
        }

        if ((contact.membership_status || '').toLowerCase() === 'active') {
          tags.add('active_member');
        }

        return {
          id: contact.contact_id,
          email: contact.email ?? '',
          username: contact.username ?? undefined,
          full_name: contact.full_name ?? undefined,
          tags: Array.from(tags),
          total_spent: totalSpend,
          lifetime_value: Number(contact.lifetime_value ?? totalSpend),
          last_interaction: contact.last_interaction,
          first_interaction: contact.first_interaction,
          order_count: contact.order_count ?? 0,
          membership_status: contact.membership_status ?? null,
          membership_value: contact.membership_value ? Number(contact.membership_value) : 0,
          membership_since: contact.membership_since ?? null,
          student_value: contact.student_value ? Number(contact.student_value) : 0,
          student_since: contact.student_since ?? null
        } as Contact;
      });

      setContacts(normalized);
    } catch (error: any) {
      console.error('Error fetching CRM contacts:', error);
      toast({
        title: 'Error loading contacts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setContactsLoading(false);
    }
  }, [toast, user]);

  const fetchSegments = useCallback(async () => {
    if (!user) return;

    try {
      setSegmentsLoading(true);
      const { data, error } = await supabase
        .from('crm_segments')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mapped: Segment[] = (data || []).map((segment: any) => ({
        id: segment.id,
        name: segment.name,
        description: segment.description ?? '',
        filters: segment.filters ?? {},
        manual_contact_ids: segment.manual_contact_ids ?? [],
        contact_count: segment.contact_count ?? 0,
        refreshed_at: segment.refreshed_at ?? null
      }));

      setSegments(mapped);
    } catch (error: any) {
      console.error('Error fetching CRM segments:', error);
      toast({
        title: 'Error loading segments',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSegmentsLoading(false);
    }
  }, [toast, user]);

  const loadSegmentMembers = useCallback(async (segmentId: string) => {
    if (!user || segmentId === 'all') return;

    try {
      setSegmentMembersLoading(true);
      const { data, error } = await supabase
        .from('crm_segment_members')
        .select('contact_id')
        .eq('segment_id', segmentId);

      if (error) {
        throw error;
      }

      setSegmentMembers((prev) => ({
        ...prev,
        [segmentId]: new Set((data || []).map((row) => row.contact_id))
      }));
    } catch (error: any) {
      console.error('Error loading segment members:', error);
      toast({
        title: 'Unable to load segment members',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSegmentMembersLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) return;
    fetchContacts();
    fetchSegments();
  }, [fetchContacts, fetchSegments, user]);

  useEffect(() => {
    if (selectedSegmentId !== 'all') {
      loadSegmentMembers(selectedSegmentId);
    }
  }, [loadSegmentMembers, selectedSegmentId]);

  const stats = useMemo(() => {
    const totalRevenue = contacts.reduce((sum, contact) => sum + (contact.total_spent ?? 0), 0);
    const customerCount = contacts.filter((contact) => contact.tags.includes('customer')).length;
    const vipContacts = contacts.filter((contact) => contact.tags.includes('vip')).length;
    const activeThreshold = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days
    const activeContacts = contacts.filter((contact) => {
      if (!contact.last_interaction) return false;
      return new Date(contact.last_interaction).getTime() >= activeThreshold;
    }).length;
    const emailSubscribers = contacts.filter((contact) => !!contact.email).length;

    return {
      totalContacts: contacts.length,
      activeContacts,
      vipContacts,
      totalRevenue,
      avgOrderValue: customerCount > 0 ? totalRevenue / customerCount : 0,
      emailSubscribers
    };
  }, [contacts]);

  const describeFilters = useCallback((filters: Record<string, any>) => {
    if (!filters) return 'All contacts';

    const parts: string[] = [];

    if (filters.sources?.length) {
      parts.push(`Sources: ${filters.sources.join(', ')}`);
    }

    if (filters.min_total_spend) {
      parts.push(`Min spend $${Number(filters.min_total_spend).toFixed(0)}`);
    }

    if (filters.min_orders) {
      parts.push(`Min orders ${filters.min_orders}`);
    }

    if (filters.membership_status) {
      parts.push(`Membership ${filters.membership_status}`);
    }

    if (filters.max_days_since_last_interaction) {
      parts.push(`Active within ${filters.max_days_since_last_interaction} days`);
    }

    return parts.length ? parts.join(' · ') : 'All contacts';
  }, []);

  const handleBulkEmail = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: 'No contacts selected',
        description: 'Please select contacts to email',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (user && selectedContacts.length >= 100) {
        await supabase.rpc('log_system_event', {
          p_level: 1,
          p_message: `Manual broadcast initiated for ${selectedContacts.length} contacts`,
          p_component: 'crm',
          p_action: 'manual_bulk_email',
          p_metadata: {
            selected_contacts: selectedContacts.length
          },
          p_user_id: user.id
        });
      }

      toast({
        title: 'Email campaign queued',
        description: `Sending to ${selectedContacts.length} contacts`
      });
    } catch (error: any) {
      toast({
        title: 'Unable to queue email',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleExportContacts = async () => {
    if (!user) return;

    try {
      setExporting(true);
      const filters: Record<string, any> = {};
      if (filterTag !== 'all') {
        filters.sources = [filterTag];
      }
      if (searchQuery) {
        filters.query = searchQuery;
      }

      const { data, error } = await supabase.functions.invoke('crm-export-contacts', {
        body: {
          creator_id: user.id,
          filters,
          segment_id: selectedSegmentId !== 'all' ? selectedSegmentId : null
        }
      });

      if (error) {
        throw error;
      }

      const csv = data?.csv as string | undefined;
      const count = data?.count as number | undefined;

      if (!csv) {
        throw new Error('No export data returned');
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crm-contacts-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Contacts exported',
        description: `Exported ${count ?? contacts.length} contacts to CSV`
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message ?? 'Unable to export contacts',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleMailchimpSync = async () => {
    if (!user) return;

    try {
      setMailchimpSyncing(true);
      const { data, error } = await supabase.functions.invoke('mailchimp-export-audience', {
        body: {
          creator_id: user.id,
          segment_id: selectedSegmentId !== 'all' ? selectedSegmentId : null
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const targetSegmentName = data?.segment_name ?? selectedSegment?.name ?? null;

      if (data?.total_audience && data.total_audience >= 500) {
        await supabase.rpc('log_system_event', {
          p_level: 1,
          p_message: targetSegmentName
            ? `Mailchimp audience sync queued for segment "${targetSegmentName}" (${data.total_audience} contacts)`
            : `Mailchimp audience sync queued (${data.total_audience} contacts)`,
          p_component: 'crm',
          p_action: 'mailchimp_sync',
          p_metadata: {
            processed: data.processed,
            errors: data.errors,
            segment_id: selectedSegmentId !== 'all' ? selectedSegmentId : null,
            segment_name: targetSegmentName
          },
          p_user_id: user.id
        });
      }

      toast({
        title: 'Mailchimp sync started',
        description: targetSegmentName
          ? `Processed ${data?.processed ?? 0} contacts for ${targetSegmentName}`
          : `Processed ${data?.processed ?? 0} contacts`
      });
    } catch (error: any) {
      toast({
        title: 'Mailchimp sync failed',
        description: error.message ?? 'Unable to sync with Mailchimp',
        variant: 'destructive'
      });
    } finally {
      setMailchimpSyncing(false);
    }
  };

  const handleSubstackSync = async () => {
    if (!user) return;

    try {
      setSubstackSyncing(true);
      const { data, error } = await supabase.functions.invoke('substack-sync-audience', {
        body: {
          creator_id: user.id,
          segment_id: selectedSegmentId !== 'all' ? selectedSegmentId : null
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.prepared_contacts && data.prepared_contacts >= 500) {
        await supabase.rpc('log_system_event', {
          p_level: 1,
          p_message: `Substack sync queued (${data.prepared_contacts} contacts)`,
          p_component: 'crm',
          p_action: 'substack_sync',
          p_metadata: {
            segment_id: selectedSegmentId !== 'all' ? selectedSegmentId : undefined
          },
          p_user_id: user.id
        });
      }

      toast({
        title: 'Substack sync queued',
        description: `Prepared ${data?.prepared_contacts ?? 0} contacts`
      });
    } catch (error: any) {
      toast({
        title: 'Substack sync failed',
        description: error.message ?? 'Unable to sync with Substack',
        variant: 'destructive'
      });
    } finally {
      setSubstackSyncing(false);
    }
  };

  const handleCreateSegment = async () => {
    if (!user) return;

    if (!segmentDraft.name.trim()) {
      toast({
        title: 'Segment name required',
        description: 'Please provide a name for the segment',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCreatingSegment(true);
      const filters: Record<string, any> = {};

      if (segmentDraft.source === 'vip') {
        filters.sources = ['customer'];
        filters.min_total_spend = Number(segmentDraft.minSpend || 100);
      } else if (segmentDraft.source === 'active_member') {
        filters.sources = ['member'];
        filters.membership_status = 'active';
      } else if (segmentDraft.source !== 'all') {
        filters.sources = [segmentDraft.source];
      }

      if (segmentDraft.minSpend) {
        filters.min_total_spend = Number(segmentDraft.minSpend);
      }

      if (segmentDraft.minOrders) {
        filters.min_orders = Number(segmentDraft.minOrders);
      }

      const manualIds = selectedContacts.length > 0 ? selectedContacts : [];

      const { data, error } = await supabase
        .from('crm_segments')
        .insert({
          creator_id: user.id,
          name: segmentDraft.name.trim(),
          description: segmentDraft.description.trim(),
          filters,
          manual_contact_ids: manualIds
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        await supabase.rpc('refresh_crm_segment', { p_segment_id: data.id });
        await fetchSegments();
        setSelectedSegmentId(data.id);
        await loadSegmentMembers(data.id);
      }

      toast({
        title: 'Segment created',
        description: 'Audience segment saved and refreshed'
      });

      setSegmentDraft({ name: '', description: '', source: 'all', minSpend: '', minOrders: '' });
      setSelectedContacts([]);
    } catch (error: any) {
      toast({
        title: 'Unable to create segment',
        description: error.message ?? 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setCreatingSegment(false);
    }
  };

  const handleRefreshSegment = async (segmentId: string) => {
    try {
      setRefreshingSegmentId(segmentId);
      await supabase.rpc('refresh_crm_segment', { p_segment_id: segmentId });
      await fetchSegments();
      if (selectedSegmentId === segmentId) {
        await loadSegmentMembers(segmentId);
      }
      toast({
        title: 'Segment refreshed',
        description: 'Membership counts updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Unable to refresh segment',
        description: error.message ?? 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setRefreshingSegmentId(null);
    }
  };

  const filteredContacts = useMemo(() => {
    if (selectedSegmentId !== 'all' && segmentMembersLoading) {
      return [];
    }

    const membershipFilter = selectedSegmentId !== 'all' ? segmentMembers[selectedSegmentId] : null;
    const loweredSearch = searchQuery.toLowerCase();

    return contacts.filter((contact) => {
      if (membershipFilter && !membershipFilter.has(contact.id)) {
        return false;
      }

      const email = contact.email ? contact.email.toLowerCase() : '';
      const username = contact.username ? contact.username.toLowerCase() : '';
      const fullName = contact.full_name ? contact.full_name.toLowerCase() : '';

      const matchesSearch = loweredSearch === '' ||
        email.includes(loweredSearch) ||
        username.includes(loweredSearch) ||
        fullName.includes(loweredSearch);

      if (!matchesSearch) {
        return false;
      }

      if (filterTag !== 'all' && !contact.tags.includes(filterTag)) {
        return false;
      }

      return true;
    });
  }, [contacts, filterTag, searchQuery, segmentMembers, selectedSegmentId, segmentMembersLoading]);

  if (contactsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">CRM & Audience</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary rounded" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CRM & Audience</h1>
          <p className="text-muted-foreground">Manage your fans, followers, and customers</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleMailchimpSync}
            disabled={mailchimpSyncing}
          >
            {mailchimpSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4 mr-2" />
            )}
            Mailchimp
          </Button>
          <Button
            variant="outline"
            onClick={handleSubstackSync}
            disabled={substackSyncing}
          >
            {substackSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4 mr-2" />
            )}
            Substack
          </Button>
          <Button
            variant="outline"
            onClick={handleExportContacts}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VIP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vipContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Email Subs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailSubscribers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Crowdfund Raised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.crowdfundingRaised.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Supporters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.crowdfundingSupporters}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="campaigns">Email Campaigns</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Crowdfunding supporters</CardTitle>
                  <CardDescription>Latest contributions and fulfillment updates.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {supporterEvents.length === 0 ? (
                <div className="text-center py-10">
                  <Gift className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No supporters yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supporterEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{event.supporterName}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.campaignTitle}{event.rewardTitle ? ` • ${event.rewardTitle}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Pledged on {new Date(event.contributedAt).toLocaleDateString()}
                        </p>
                        {event.fulfilledAt && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Fulfilled {new Date(event.fulfilledAt).toLocaleDateString()}
                          </p>
                        )}
                        {event.refundedAt && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Refunded {new Date(event.refundedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-semibold">£{event.amount.toFixed(2)}</p>
                        <Badge variant={supporterStatusVariant(event.status)} className="capitalize">
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Contact List</CardTitle>
                  <CardDescription>All your fans, followers, and customers</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Select
                    value={selectedSegmentId}
                    onValueChange={(value) => {
                      setSelectedSegmentId(value);
                    }}
                    disabled={segmentsLoading}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All segments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Segments</SelectItem>
                      {segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Filter by tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      <SelectItem value="follower">Followers</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="member">Members</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="active_member">Active Members</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedContacts.length > 0 && (
                    <Button onClick={handleBulkEmail}>
                      <Send className="w-4 h-4 mr-2" />
                      Email ({selectedContacts.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedSegmentId !== 'all' && segmentMembersLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading segment contacts…</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No contacts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => {
                    const displayName = contact.full_name || contact.username || contact.email || 'Contact';
                    const avatarLetter = displayName.charAt(0).toUpperCase();
                    const lastInteraction = contact.last_interaction
                      ? new Date(contact.last_interaction).toLocaleDateString()
                      : '—';

                    return (
                      <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedContacts([...selectedContacts, contact.id]);
                              } else {
                                setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                              }
                            }}
                            className="rounded"
                          />
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {avatarLetter}
                          </div>
                          <div>
                            <p className="font-medium">{displayName}</p>
                            <p className="text-sm text-muted-foreground">{contact.email || 'No email on file'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.map((tag) => (
                              <Badge
                                key={`${contact.id}-${tag}`}
                                variant={tag === 'vip' ? 'default' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {tag.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${contact.total_spent.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Last: {lastInteraction}</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Audience Segment</CardTitle>
              <CardDescription>Combine filters and manual selections for targeted outreach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="VIP customers"
                    value={segmentDraft.name}
                    onChange={(e) => setSegmentDraft((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary source</Label>
                  <Select
                    value={segmentDraft.source}
                    onValueChange={(value) => setSegmentDraft((prev) => ({ ...prev, source: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="follower">Followers</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="member">Members</SelectItem>
                      <SelectItem value="active_member">Active Members</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="vip">VIP Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="High-value customers who purchased more than $100"
                    value={segmentDraft.description}
                    onChange={(e) => setSegmentDraft((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum spend ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={segmentDraft.minSpend}
                    onChange={(e) => setSegmentDraft((prev) => ({ ...prev, minSpend: e.target.value }))}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum orders</Label>
                  <Input
                    type="number"
                    min="0"
                    value={segmentDraft.minOrders}
                    onChange={(e) => setSegmentDraft((prev) => ({ ...prev, minOrders: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedContacts.length > 0
                  ? `${selectedContacts.length} contact${selectedContacts.length === 1 ? '' : 's'} selected will be pinned to this segment.`
                  : 'Select contacts in the list to pin them to the segment manually.'}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSegmentDraft({ name: '', description: '', source: 'all', minSpend: '', minOrders: '' });
                  }}
                  disabled={creatingSegment}
                >
                  Reset
                </Button>
                <Button onClick={handleCreateSegment} disabled={creatingSegment}>
                  {creatingSegment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Tag className="w-4 h-4 mr-2" />
                  )}
                  Save Segment
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved segments</CardTitle>
              <CardDescription>Refresh counts and open segments to review matching contacts</CardDescription>
            </CardHeader>
            <CardContent>
              {segmentsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading segments…</p>
                </div>
              ) : segments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No segments yet</p>
                  <p className="text-sm text-muted-foreground">Create a segment to group contacts for campaigns.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {segments.map((segment) => (
                    <div key={segment.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{segment.name}</h4>
                          <Badge>{segment.contact_count} contacts</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{segment.description || 'No description provided'}</p>
                        <p className="text-xs text-muted-foreground">
                          {describeFilters(segment.filters)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {segment.refreshed_at
                            ? `Last refreshed ${new Date(segment.refreshed_at).toLocaleString()}`
                            : 'Not refreshed yet'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSegmentId(segment.id);
                            loadSegmentMembers(segment.id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshSegment(segment.id)}
                          disabled={refreshingSegmentId === segment.id}
                        >
                          {refreshingSegmentId === segment.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Refresh
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Create and manage email marketing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Email campaign builder coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Design beautiful emails and track engagement
                </p>
                <Button className="mt-4">
                  <Mail className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Automation</CardTitle>
              <CardDescription>Set up automated workflows and sequences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Automation workflows coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Welcome series, abandoned cart, and more
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCRMModule;
