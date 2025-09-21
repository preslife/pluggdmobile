import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, BookOpen, Video, Link2, Download, Heart, Share2, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ResourcePost {
  id: string;
  title: string;
  content: string;
  type?: string;
  tags: string[];
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  likes_count?: number;
  user_has_liked?: boolean;
}

const CommunityResources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourcePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const resourceCategories = [
    { value: 'tutorial', label: 'Tutorials', icon: BookOpen },
    { value: 'sample-pack', label: 'Sample Packs', icon: Download },
    { value: 'video', label: 'Videos', icon: Video },
    { value: 'tool', label: 'Tools & Software', icon: Link2 },
    { value: 'tip', label: 'Tips & Tricks', icon: Heart },
  ];

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      // Fetch posts with type 'resource' or tags related to resources
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .or('type.eq.resource,tags.cs.{"tutorial"},tags.cs.{"sample-pack"},tags.cs.{"tool"},tags.cs.{"tip"},tags.cs.{"guide"}')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for all users
      const userIds = [...new Set(postsData?.map(post => post.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Get engagement data for each post
      const resourcesWithEngagement = await Promise.all(
        (postsData || []).map(async (post) => {
          // Get like count and user's like status
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          let userHasLiked = false;
          if (user) {
            const { data: userLike } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            userHasLiked = !!userLike;
          }

          const profile = profilesMap.get(post.user_id);
          return {
            ...post,
            likes_count: likesCount || 0,
            user_has_liked: userHasLiked,
            profiles: profile ? {
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url
            } : null
          };
        })
      );

      setResources(resourcesWithEngagement);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: "Error",
        description: "Failed to load community resources",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to like resources.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
      }

      // Update local state optimistically
      setResources(prev => prev.map(resource => 
        resource.id === postId 
          ? { 
              ...resource, 
              user_has_liked: !resource.user_has_liked,
              likes_count: resource.user_has_liked ? (resource.likes_count || 0) - 1 : (resource.likes_count || 0) + 1
            }
          : resource
      ));

    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like.",
        variant: "destructive"
      });
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           resource.tags?.includes(selectedCategory) ||
                           resource.type === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (tags: string[]) => {
    for (const category of resourceCategories) {
      if (tags.includes(category.value)) {
        const IconComponent = category.icon;
        return <IconComponent className="w-4 h-4" />;
      }
    }
    return <BookOpen className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-gradient-card border-border animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-3 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Community Resources</h2>
          <p className="text-muted-foreground">Tutorials, tools, and tips shared by the community</p>
        </div>
        <Button variant="hero">
          <BookOpen className="w-4 h-4 mr-2" />
          Share Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-md text-sm"
        >
          <option value="all">All Categories</option>
          {resourceCategories.map(category => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="bg-gradient-card border-border hover:shadow-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={resource.profiles?.avatar_url} />
                  <AvatarFallback>
                    {resource.profiles?.full_name?.[0] || resource.profiles?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate flex items-center gap-2" title={resource.title}>
                    {getCategoryIcon(resource.tags || [])}
                    {resource.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    by {resource.profiles?.full_name || resource.profiles?.username || 'Anonymous'}
                    {" • "}
                    {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Content Preview */}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {resource.content}
              </p>

              {/* Tags */}
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {resource.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{resource.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Engagement */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(resource.id)}
                    className={`h-8 px-2 ${resource.user_has_liked ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-4 h-4 mr-1 ${resource.user_has_liked ? 'fill-current' : ''}`} />
                    {resource.likes_count || 0}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </Button>
                </div>
                <Button variant="outline" size="sm">
                  Read More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== 'all'
              ? "Try adjusting your search or filters."
              : "No community resources have been shared yet."}
          </p>
          <Button variant="outline" className="mt-4">
            Share the First Resource
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunityResources;