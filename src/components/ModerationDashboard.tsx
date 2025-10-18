import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Eye, Check, X, Flag, Music, MessageSquare, Users } from 'lucide-react';
import { logger } from '@/lib/logger';
import { Checkbox } from '@/components/ui/checkbox';

type ModerationItem = {
  id: string;
  type: 'release' | 'comment' | 'profile' | 'report';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reported_by?: string;
  reason?: string;
  content: any;
  severity: 'low' | 'medium' | 'high';
};

type ContentStats = {
  pending_releases: number;
  pending_comments: number;
  pending_reports: number;
  total_actions_today: number;
};

const ModerationDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    pending_releases: 0,
    pending_comments: 0,
    pending_reports: 0,
    total_actions_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('releases');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const loggerMetadata = useMemo(() => ({ userId: user?.id ?? null }), [user?.id]);
  const { logger: moderationLogger, logUserAction } = useLogger({
    component: 'ModerationDashboard',
    feature: 'moderation',
    metadata: loggerMetadata,
  });

  useEffect(() => {
    if (user) {
      fetchModerationData();
    }
  }, [user]);

  const fetchModerationData = async () => {
    try {
      void moderationLogger.info('moderation_dashboard_fetch_start', {
        user_id: user?.id,
      });
      // Fetch moderation items
      const { data: moderationData, error: moderationError } = await supabase
        .from('moderation_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (moderationError) {
        console.error('Error fetching moderation items:', moderationError);
        void moderationLogger.error('moderation_dashboard_items_fetch_failed', {
          user_id: user?.id,
        }, toError(moderationError));
      }

      // Fetch content reports separately
      const { data: reportsData, error: reportsError } = await supabase
        .from('content_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        void moderationLogger.error('moderation_dashboard_reports_fetch_failed', {
          user_id: user?.id,
        }, toError(reportsError));
      }

      // Transform data to match component format
      const transformedItems: ModerationItem[] = [];

      // Add moderation items
      if (moderationData) {
        for (const item of moderationData) {
          let content: any = {};
          
          // Fetch related content based on item type
          if (item.item_type === 'release') {
            const { data: release } = await supabase
              .from('releases')
              .select('title, artist, description, genre')
              .eq('id', item.item_id)
              .single();
            
            if (release) {
              content = {
                title: release.title,
                artist: release.artist,
                description: release.description,
                genre: release.genre
              };
            }
          } else if (item.item_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content, post_id')
              .eq('id', item.item_id)
              .single();
            
            if (comment) {
              content = {
                text: comment.content,
                post_id: comment.post_id
              };
            }
          }

          transformedItems.push({
            id: item.id,
            type: item.item_type as 'release' | 'comment' | 'profile' | 'report',
            status: item.status as 'pending' | 'approved' | 'rejected',
            created_at: item.created_at,
            severity: item.severity as 'low' | 'medium' | 'high',
            reason: item.reason,
            reported_by: item.reported_by,
            content
          });
        }
      }

      // Add content reports as moderation items
      if (reportsData) {
        for (const report of reportsData) {
          const content: any = {
            target_type: report.target_type,
            description: report.description
          };

          // Fetch target content details
          if (report.target_type === 'release') {
            const { data: release } = await supabase
              .from('releases')
              .select('title, artist')
              .eq('id', report.target_id)
              .single();
            
            if (release) {
              content.target_title = release.title;
              content.target_artist = release.artist;
            }
          } else if (report.target_type === 'comment') {
            const { data: comment } = await supabase
              .from('comments')
              .select('content')
              .eq('id', report.target_id)
              .single();
            
            if (comment) {
              content.target_title = 'Comment';
              content.text = comment.content;
            }
          }

          transformedItems.push({
            id: report.id,
            type: 'report',
            status: 'pending',
            created_at: report.created_at,
            severity: 'medium',
            reason: report.reason,
            reported_by: report.reporter_id,
            content
          });
        }
      }

      setModerationItems(transformedItems);
      setSelectedItems(new Set());
      
      // Calculate real stats
      const pendingReleases = transformedItems.filter(item => item.type === 'release' && item.status === 'pending').length;
      const pendingComments = transformedItems.filter(item => item.type === 'comment' && item.status === 'pending').length;
      const pendingReports = transformedItems.filter(item => item.type === 'report' && item.status === 'pending').length;

      // Get today's moderation actions count
      const today = new Date().toISOString().split('T')[0];
      const { count: actionsToday } = await supabase
        .from('moderation_actions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        pending_releases: pendingReleases,
        pending_comments: pendingComments,
        pending_reports: pendingReports,
        total_actions_today: actionsToday || 0
      });
      void moderationLogger.info('moderation_dashboard_fetch_success', {
        user_id: user?.id,
        pending_releases: pendingReleases,
        pending_comments: pendingComments,
        pending_reports: pendingReports,
        actions_today: actionsToday || 0,
      });
    } catch (error) {
      console.error('Error fetching moderation data:', error);
      void moderationLogger.error('moderation_dashboard_fetch_failed', {
        user_id: user?.id,
      }, toError(error));
    } finally {
      setLoading(false);
    }
  };

  const updateStatsFromItems = (items: ModerationItem[]) => {
    const pendingReleases = items.filter(item => item.type === 'release' && item.status === 'pending').length;
    const pendingComments = items.filter(item => item.type === 'comment' && item.status === 'pending').length;
    const pendingReports = items.filter(item => item.type === 'report' && item.status === 'pending').length;

    setStats(prev => ({
      ...prev,
      pending_releases: pendingReleases,
      pending_comments: pendingComments,
      pending_reports: pendingReports,
    }));
  };

  const handleBatchModerationAction = async (itemIds: string[], action: 'approve' | 'close', reason?: string) => {
    if (!itemIds.length) {
      return;
    }

    setProcessing(true);

    try {
      void logger.userAction('moderation_batch_action_attempt', 'ModerationDashboard', {
        item_ids: itemIds,
        action,
        user_id: user?.id,
      });

      const { data, error } = await supabase.functions.invoke('moderation-review', {
        body: {
          action,
          itemIds,
          reason,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error as string);
      }

      const results = (data?.results as { itemId: string; status?: ModerationItem['status']; reportStatus?: string; success: boolean }[] | undefined) || [];
      const successfulIds = results.filter(result => result.success && result.status).map(result => result.itemId);

      if (!successfulIds.length) {
        throw new Error('No moderation items were updated');
      }

      setModerationItems(prev => {
        const updated = prev.map(item => {
          const result = results.find(r => r.itemId === item.id);
          if (!result || !result.status) {
            return item;
          }

          return {
            ...item,
            status: result.status,
            content: {
              ...item.content,
              report_status: result.reportStatus ?? item.content?.report_status,
            },
          };
        });

        updateStatsFromItems(updated);
        return updated;
      });

      setSelectedItems(new Set());

      toast({
        title: `Action complete`,
        description: `${successfulIds.length} item${successfulIds.length > 1 ? 's' : ''} ${action === 'approve' ? 'approved' : 'closed'} successfully.`,
      });

      void logger.info('moderation_batch_action_success', {
        item_ids: successfulIds,
        action,
        user_id: user?.id,
        reason,
      });

    } catch (error) {
      console.error('Error processing moderation action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process moderation action.',
        variant: 'destructive',
      });
      void logger.error('moderation_batch_action_failed', {
        item_ids: itemIds,
        action,
        user_id: user?.id,
        reason,
      }, toError(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleModerationAction = async (itemId: string, action: 'approve' | 'close', reason?: string) => {
    await handleBatchModerationAction([itemId], action, reason);
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const clearSelections = () => setSelectedItems(new Set());

  const selectVisible = () => {
    const ids = visibleItems
      .filter(item => item.status === 'pending')
      .map(item => item.id);

    setSelectedItems(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        next.add(id);
      }
      return next;
    });
  };

  const visibleItems = useMemo(() => {
    switch (selectedTab) {
      case 'releases':
        return moderationItems.filter(item => item.type === 'release');
      case 'comments':
        return moderationItems.filter(item => item.type === 'comment');
      case 'reports':
        return moderationItems.filter(item => item.type === 'report');
      case 'all':
      default:
        return moderationItems.filter(item => item.status === 'pending');
    }
  }, [moderationItems, selectedTab]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'release':
        return <Music className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'profile':
        return <Users className="w-4 h-4" />;
      case 'report':
        return <Flag className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const renderModerationItem = (item: ModerationItem) => (
    <Card key={item.id} className="bg-gradient-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="pt-1">
            <Checkbox
              data-testid={`moderation-select-${item.id}`}
              aria-label={`Select ${item.type} ${item.id}`}
              checked={selectedItems.has(item.id)}
              disabled={item.status !== 'pending'}
              onCheckedChange={() => toggleSelection(item.id)}
            />
          </div>
          <div className="flex-shrink-0">
            {getItemIcon(item.type)}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{item.type}</Badge>
                {getSeverityBadge(item.severity)}
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {item.type === 'release' && (
                <div>
                  <p className="font-medium">{item.content.title}</p>
                  <p className="text-sm text-muted-foreground">by {item.content.artist}</p>
                  <p className="text-sm">{item.content.description}</p>
                </div>
              )}

              {item.type === 'comment' && (
                <div>
                  <p className="text-sm font-medium">Comment on "{item.content.release_title}"</p>
                  <p className="text-sm">{item.content.text}</p>
                  <p className="text-xs text-muted-foreground">by {item.content.author}</p>
                </div>
              )}

              {item.type === 'report' && (
                <div>
                  <p className="text-sm font-medium">Report: {item.reason}</p>
                  <p className="text-sm">Target: {item.content.target_title}</p>
                  <p className="text-sm">{item.content.description}</p>
                </div>
              )}

              {item.reported_by && (
                <p className="text-xs text-muted-foreground">
                  Reported by: {item.reported_by} • Reason: {item.reason}
                </p>
              )}
            </div>

            {item.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processing}
                  onClick={() => handleModerationAction(item.id, 'approve')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={processing}
                  onClick={() => handleModerationAction(item.id, 'close')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
                <Button size="sm" variant="ghost">
                  <Eye className="w-4 h-4 mr-1" />
                  Review
                </Button>
              </div>
            )}

            {item.status !== 'pending' && (
              <Badge variant={item.status === 'approved' ? 'default' : 'destructive'} className="capitalize">
                {item.status === 'rejected' ? 'closed' : item.status}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Access Denied</h3>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Moderation Dashboard
        </h1>
        <p className="text-muted-foreground">Review and moderate platform content</p>
      </div>

      {selectedItems.size > 0 && (
        <Card className="border-border">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
            <div className="text-sm text-muted-foreground">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={processing}
                onClick={() => handleBatchModerationAction(Array.from(selectedItems), 'approve')}
              >
                <Check className="w-4 h-4 mr-1" /> Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={processing}
                onClick={() => handleBatchModerationAction(Array.from(selectedItems), 'close')}
              >
                <X className="w-4 h-4 mr-1" /> Close Selected
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelections}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending_releases}</p>
                <p className="text-sm text-muted-foreground">Pending Releases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending_comments}</p>
                <p className="text-sm text-muted-foreground">Pending Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending_reports}</p>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total_actions_today}</p>
                <p className="text-sm text-muted-foreground">Actions Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="all">All Pending</TabsTrigger>
        </TabsList>

        <div className="flex justify-end py-2">
          <Button size="sm" variant="ghost" onClick={selectVisible} disabled={processing || visibleItems.length === 0}>
            Select Visible
          </Button>
        </div>

        <TabsContent value="releases" className="space-y-4">
          {moderationItems
            .filter(item => item.type === 'release')
            .map(renderModerationItem)}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          {moderationItems
            .filter(item => item.type === 'comment')
            .map(renderModerationItem)}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {moderationItems
            .filter(item => item.type === 'report')
            .map(renderModerationItem)}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {moderationItems
            .filter(item => item.status === 'pending')
            .map(renderModerationItem)}
        </TabsContent>
      </Tabs>

      {moderationItems.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">No items pending moderation at this time.</p>
        </div>
      )}
    </div>
  );
};

export default ModerationDashboard;