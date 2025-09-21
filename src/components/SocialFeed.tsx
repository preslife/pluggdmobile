import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Music, 
  Heart, 
  MessageCircle, 
  Share2, 
  Play,
  UserPlus,
  UserMinus,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'follow' | 'release' | 'beat_upload' | 'collaboration' | 'purchase';
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  content: string;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  user_type: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  mutual_connections: number;
}

export const SocialFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('following');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSocialData();
    }
  }, [user, activeTab]);

  const fetchSocialData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Simulate activity feed data for now since activity_feed table doesn't exist
      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'release',
          actor_id: 'user1',
          actor_name: 'John Producer',
          actor_avatar: '',
          content: 'released "Fire Beat Vol. 1"',
          created_at: new Date().toISOString(),
          metadata: { title: 'Fire Beat Vol. 1' }
        },
        {
          id: '2',
          type: 'beat_upload',
          actor_id: 'user2',
          actor_name: 'Beat Maker',
          actor_avatar: '',
          content: 'uploaded a new beat "Trap Vibes"',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          metadata: { title: 'Trap Vibes' }
        }
      ];

      setActivities(mockActivities);

      // Fetch suggested users from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, user_type, avatar_url')
        .neq('user_id', user.id)
        .limit(5);

      if (profilesError) {
        console.error('Suggested users error:', profilesError);
      } else {
        const suggested: SuggestedUser[] = (profilesData || []).map(profile => ({
          id: profile.user_id,
          name: profile.full_name || profile.username || 'Unknown User',
          username: profile.username || '',
          avatar_url: profile.avatar_url,
          user_type: profile.user_type || 'user',
          follower_count: Math.floor(Math.random() * 100), // Mock data
          following_count: Math.floor(Math.random() * 50), // Mock data
          is_following: false,
          mutual_connections: Math.floor(Math.random() * 10) // Mock data
        }));
        setSuggestedUsers(suggested);
      }

    } catch (error) {
      console.error('Social feed error:', error);
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (error) throw error;

      // Update suggested users list
      setSuggestedUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, is_following: true, follower_count: u.follower_count + 1 }
            : u
        )
      );

      toast({
        title: "Following",
        description: "You are now following this user",
      });

    } catch (error) {
      console.error('Follow error:', error);
      toast({
        title: "Follow Failed",
        description: "Failed to follow user",
        variant: "destructive",
      });
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;

      // Update suggested users list
      setSuggestedUsers(prev => 
        prev.map(u => 
          u.id === userId 
            ? { ...u, is_following: false, follower_count: Math.max(0, u.follower_count - 1) }
            : u
        )
      );

      toast({
        title: "Unfollowed",
        description: "You are no longer following this user",
      });

    } catch (error) {
      console.error('Unfollow error:', error);
      toast({
        title: "Unfollow Failed",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'release':
        return <Music className="w-4 h-4 text-green-500" />;
      case 'beat_upload':
        return <Play className="w-4 h-4 text-purple-500" />;
      case 'collaboration':
        return <Users className="w-4 h-4 text-orange-500" />;
      case 'purchase':
        return <Heart className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feed Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Social Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="following">Following</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
            </TabsList>

            <TabsContent value="following" className="mt-6">
              <ActivityFeed 
                activities={activities} 
                getActivityIcon={getActivityIcon}
                emptyMessage="Follow some users to see their activity here!"
              />
            </TabsContent>

            <TabsContent value="discover" className="mt-6">
              <ActivityFeed 
                activities={activities} 
                getActivityIcon={getActivityIcon}
                emptyMessage="Discover new activity from the community!"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Suggested Users */}
      {suggestedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Suggested for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestedUsers.map((suggestedUser) => (
                <div key={suggestedUser.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={suggestedUser.avatar_url} />
                      <AvatarFallback>
                        {suggestedUser.name?.charAt(0) || suggestedUser.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {suggestedUser.name || suggestedUser.username}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{suggestedUser.user_type}</Badge>
                        <span>{suggestedUser.follower_count} followers</span>
                        {suggestedUser.mutual_connections > 0 && (
                          <span>• {suggestedUser.mutual_connections} mutual</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={suggestedUser.is_following ? "outline" : "default"}
                    size="sm"
                    onClick={() => suggestedUser.is_following 
                      ? unfollowUser(suggestedUser.id)
                      : followUser(suggestedUser.id)
                    }
                  >
                    {suggestedUser.is_following ? (
                      <>
                        <UserMinus className="w-3 h-3 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface ActivityFeedProps {
  activities: Activity[];
  getActivityIcon: (type: string) => React.ReactNode;
  emptyMessage: string;
}

const ActivityFeed = ({ activities, getActivityIcon, emptyMessage }: ActivityFeedProps) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.actor_avatar} />
                <AvatarFallback>
                  {activity.actor_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getActivityIcon(activity.type)}
                  <p className="text-sm">
                    <Link 
                      to={`/profile/${activity.actor_id}`}
                      className="font-medium hover:underline"
                    >
                      {activity.actor_name}
                    </Link>
                    {' '}
                    <span className="text-muted-foreground">{activity.content}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(activity.created_at).toLocaleDateString()}</span>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Heart className="w-3 h-3 mr-1" />
                      Like
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Comment
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Share2 className="w-3 h-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};