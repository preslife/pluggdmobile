import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, TrendingUp, Clock, Users, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { SubscriptionGatedContent } from "@/components/SubscriptionGatedContent";

interface Post {
  id: string;
  title: string;
  content: string;
  user_id: string;
  type: string;
  created_at: string;
  tags?: string[];
  likes_count?: number;
  comments_count?: number;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface ActivityStats {
  total_posts: number;
  active_members: number;
  growth_percentage: number;
}

export const CommunityActivity = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    total_posts: 0,
    active_members: 0,
    growth_percentage: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    fetchActivityStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
      }, () => {
        fetchPosts();
        fetchActivityStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('id, title, content, user_id, type, created_at, tags')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Get profiles for all users
      const userIds = [...new Set(postsData?.map(post => post.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Get engagement data for each post
      const postsWithEngagement = await Promise.all(
        (postsData || []).map(async (post) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const profile = profilesMap.get(post.user_id);
          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            profiles: profile ? {
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url
            } : null
          };
        })
      );

      setPosts(postsWithEngagement);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error loading community posts",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityStats = async () => {
    try {
      // Get total posts
      const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      // Get active members (users who posted in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsers } = await supabase
        .from('posts')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const uniqueActiveUsers = new Set(activeUsers?.map(p => p.user_id) || []).size;

      // Calculate growth (posts this week vs last week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { count: thisWeekPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      const { count: lastWeekPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString());

      const growthPercentage = lastWeekPosts > 0 
        ? Math.round(((thisWeekPosts || 0) - (lastWeekPosts || 0)) / (lastWeekPosts || 1) * 100)
        : 0;

      setActivityStats({
        total_posts: totalPosts || 0,
        active_members: uniqueActiveUsers,
        growth_percentage: growthPercentage
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'showcase': return 'bg-accent/20 text-accent-foreground border-accent';
      case 'collaboration': return 'bg-secondary/20 text-secondary-foreground border-secondary';
      case 'discussion': return 'bg-primary/20 text-primary-foreground border-primary';
      case 'question': return 'bg-muted/20 text-muted-foreground border-muted';
      default: return 'bg-muted/20 text-muted-foreground border-muted';
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'showcase': return '✨';
      case 'collaboration': return '🤝';
      case 'discussion': return '💬';
      case 'question': return '❓';
      default: return '📝';
    }
  };

  const toggleLike = (postId: string) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
    } else {
      newLiked.add(postId);
      toast({
        title: "Post liked!",
        description: "Thanks for engaging with the community",
      });
    }
    setLikedPosts(newLiked);
  };

  const sharePost = async (post: Post) => {
    try {
      await navigator.share({
        title: post.title,
        text: post.content.substring(0, 100) + '...',
        url: `${window.location.origin}/community/post/${post.id}`
      });
    } catch (error) {
      navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`);
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-muted animate-pulse rounded w-56"></div>
            <div className="h-10 bg-muted animate-pulse rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Community Activity</h2>
            <p className="text-muted-foreground">See what's happening in the Pluggd community</p>
          </div>
          <Link to="/community">
            <Button>Join Community</Button>
          </Link>
        </div>

        {/* Activity Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center p-6">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary mb-2">
              <MessageCircle className="w-6 h-6" />
              {activityStats.total_posts}
            </div>
            <p className="text-sm text-muted-foreground">Total Posts</p>
          </Card>
          <Card className="text-center p-6">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-secondary mb-2">
              <Users className="w-6 h-6" />
              {activityStats.active_members}
            </div>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </Card>
          <Card className="text-center p-6">
            <div className={`flex items-center justify-center gap-2 text-2xl font-bold mb-2 ${
              activityStats.growth_percentage >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              <TrendingUp className="w-6 h-6" />
              {activityStats.growth_percentage >= 0 ? '+' : ''}{activityStats.growth_percentage}%
            </div>
            <p className="text-sm text-muted-foreground">Growth This Week</p>
          </Card>
        </div>

        {posts.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
              <p className="text-muted-foreground mb-4">Be the first to share something with the community!</p>
              <Link to="/community">
                <Button>Create Post</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback>
                          {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={getPostTypeColor(post.type)}>
                      <span className="mr-1">{getPostTypeIcon(post.type)}</span>
                      {post.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <SubscriptionGatedContent
                  contentId={post.id}
                  contentType="post"
                  creatorId={post.user_id}
                  ctaHref={`/creator/${post.user_id}#membership`}
                  fallbackText="Join this creator's membership to read the full post and unlock discussions."
                  previewContent={
                    <p className="text-sm text-muted-foreground line-clamp-4">{post.content}</p>
                  }
                  minimalWrapper
                  className="px-6 pb-6"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center space-x-4 text-muted-foreground">
                        <button
                          className={`flex items-center space-x-1 hover:text-primary transition-colors ${
                            likedPosts.has(post.id) ? 'text-red-500' : ''
                          }`}
                          onClick={() => toggleLike(post.id)}
                        >
                          <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                          <span className="text-xs">{(post.likes_count || 0) + (likedPosts.has(post.id) ? 1 : 0)}</span>
                        </button>
                        <button className="flex items-center space-x-1 hover:text-primary transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{post.comments_count || 0}</span>
                        </button>
                      </div>
                      <button
                        className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => sharePost(post)}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SubscriptionGatedContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
