import React, { useState, useEffect } from "react";
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
  ExternalLink,
  Power,
  AlertCircle,
  Eye,
  Heart,
  Share2,
  TrendingUp,
  Clock,
  CheckCircle,
  Edit,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ContentComposer } from "@/components/ContentComposer";
import { EnhancedConnections } from "@/components/EnhancedConnections";
import { UnifiedInbox } from "@/components/UnifiedInbox";

interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

const plugins: Plugin[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Sync with Instagram for content sharing and engagement',
    icon: Zap,
    status: 'connected',
    lastSync: '2 hours ago',
    metrics: [
      { label: 'Posts', value: 24 },
      { label: 'Followers', value: '2.1K' },
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Connect your YouTube channel for video uploads',
    icon: Zap,
    status: 'disconnected',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Sync with Spotify for artist insights',
    icon: Music,
    status: 'error',
    lastSync: '1 day ago',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Manage your Discord community',
    icon: MessageCircle,
    status: 'connected',
    lastSync: '15 minutes ago',
    metrics: [
      { label: 'Members', value: 156 },
      { label: 'Active', value: 23 },
    ]
  },
];

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

export const PluginsModule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
                          <div className="flex items-center gap-2">
                            {getStatusIcon(plugin.status)}
                            <Badge variant={getStatusColor(plugin.status)} className="text-xs">
                              {plugin.status}
                            </Badge>
                          </div>
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
                          <Button variant="outline" size="sm" className="flex-1">
                            <Settings className="h-3 w-3 mr-1" />
                            Settings
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="flex-1">
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

        <TabsContent value="inbox" className="space-y-6">
          <UnifiedInbox />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Analytics</CardTitle>
              <CardDescription>
                View analytics from all your connected platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postAnalytics.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
                  <p className="text-muted-foreground mb-4">
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