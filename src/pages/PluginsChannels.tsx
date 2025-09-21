import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { setMeta } from '@/lib/seo';

import {
  Zap,
  Calendar,
  MessageCircle,
  BarChart3,
  Globe,
  Settings,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Eye,
  TrendingUp,
  Users,
  Heart,
  Share2
} from 'lucide-react';

// Import components
import { ContentComposer } from '@/components/ContentComposer';
import { EnhancedConnections } from '@/components/EnhancedConnections';
import { UnifiedInbox } from '@/components/UnifiedInbox';

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: 'scheduled' | 'published' | 'failed';
  created_at: string;
}

interface PostAnalytics {
  post_id: string;
  platform: string;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  comments: number;
  engagement_rate: number;
  created_at: string;
}

const PluginsChannels = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('composer');

  useEffect(() => {
    setMeta(
      "Plug-ins & Channels — Pluggd",
      "Manage your social media presence, schedule posts, and track performance across all platforms.",
      "/studio/plugins"
    );
    
    if (user) {
      fetchScheduledPosts();
      fetchPostAnalytics();
    }
  }, [user]);

  const fetchScheduledPosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('creator_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setScheduledPosts(data || []);
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    }
  };

  const fetchPostAnalytics = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('post_analytics')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPostAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching post analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (post: any) => {
    toast({
      title: "Post created!",
      description: "Your content has been saved and is ready to publish."
    });
    fetchScheduledPosts();
  };

  const handleScheduleCreated = (schedule: any) => {
    toast({
      title: "Post scheduled!",
      description: "Your content will be published at the scheduled time."
    });
    fetchScheduledPosts();
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    if (diff < 60000) return 'In 1 minute';
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} minutes`;
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`;
    return date.toLocaleDateString();
  };

  const getTotalEngagement = () => {
    return postAnalytics.reduce((total, post) => 
      total + post.likes + post.shares + post.comments, 0
    );
  };

  const getTotalImpressions = () => {
    return postAnalytics.reduce((total, post) => total + post.impressions, 0);
  };

  const getAverageEngagementRate = () => {
    if (postAnalytics.length === 0) return 0;
    const totalRate = postAnalytics.reduce((total, post) => total + post.engagement_rate, 0);
    return (totalRate / postAnalytics.length).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Plug-ins & Channels</h1>
          <p className="text-muted-foreground mt-2">
            Manage your social media presence, schedule posts, and track performance across all platforms.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled Posts</p>
                  <p className="text-2xl font-bold">{scheduledPosts.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Impressions</p>
                  <p className="text-2xl font-bold">{getTotalImpressions().toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Engagement</p>
                  <p className="text-2xl font-bold">{getTotalEngagement().toLocaleString()}</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Engagement Rate</p>
                  <p className="text-2xl font-bold">{getAverageEngagementRate()}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="composer">Composer</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>

          {/* Content Composer */}
          <TabsContent value="composer">
            <ContentComposer
              onPostCreated={handlePostCreated}
              onScheduleCreated={handleScheduleCreated}
            />
          </TabsContent>

          {/* Scheduler */}
          <TabsContent value="scheduler">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Scheduled Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No scheduled posts</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first scheduled post using the Composer tab.
                    </p>
                    <Button onClick={() => setActiveTab('composer')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledPosts.map((post) => (
                      <Card key={post.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(post.status)}
                              <Badge className={getStatusColor(post.status)}>
                                {post.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatScheduledTime(post.scheduled_for)}
                              </span>
                            </div>
                            
                            <h4 className="font-medium mb-2">{post.title || 'Untitled Post'}</h4>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {post.base_content}
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

          {/* Unified Inbox */}
          <TabsContent value="inbox">
            <UnifiedInbox />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Post Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {postAnalytics.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No analytics data</h3>
                    <p className="text-muted-foreground">
                      Analytics will appear here once you start posting content.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {postAnalytics.map((analytics) => (
                      <Card key={analytics.post_id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{analytics.platform}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(analytics.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {analytics.engagement_rate}% engagement
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
                            <p className="text-2xl font-bold text-red-600">{analytics.likes.toLocaleString()}</p>
                            <p className="text-muted-foreground">Likes</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{analytics.shares.toLocaleString()}</p>
                            <p className="text-muted-foreground">Shares</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">{analytics.comments.toLocaleString()}</p>
                            <p className="text-muted-foreground">Comments</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connections */}
          <TabsContent value="connections">
            <EnhancedConnections />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PluginsChannels;
