import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 10;

type ActivityRow = Database['public']['Tables']['activity_feed']['Row'];
type ProfileRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Activity = {
  id: string;
  type: string;
  actor_id: string;
  actor_name: string;
  actor_avatar?: string;
  content: string;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
  metadata?: Record<string, any>;
};

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

const buildActivityContent = (type: string, metadata: Record<string, any>, entityType?: string) => {
  const sanitizedType = (type || entityType || '').toLowerCase();
  if (sanitizedType.includes('follow')) {
    const followedName = metadata.following_name || metadata.target_name || 'a new creator';
    return `followed ${followedName}`;
  }
  if (sanitizedType.includes('release')) {
    return metadata.title ? `released “${metadata.title}”` : 'released a new drop';
  }
  if (sanitizedType.includes('beat')) {
    return metadata.title ? `uploaded “${metadata.title}”` : 'uploaded a new beat';
  }
  if (sanitizedType.includes('post')) {
    return metadata.title ? `shared “${metadata.title}”` : 'shared a new update';
  }
  if (sanitizedType.includes('purchase')) {
    return metadata.title ? `purchased “${metadata.title}”` : 'supported a creator';
  }

  return metadata.summary || metadata.description || 'has new activity';
};

const mapActivityRowToFeedItem = (
  row: ActivityRow,
  profileMap: Map<string, ProfileRow>
): Activity => {
  const metadata = (row.data as Record<string, any> | null) ?? {};
  const actorProfile = profileMap.get(row.actor_id);
  const actorName =
    actorProfile?.full_name || actorProfile?.username || metadata.actor_name || 'Creator';

  return {
    id: row.id,
    type: row.type ?? row.entity_type ?? 'update',
    actor_id: row.actor_id,
    actor_name: actorName,
    actor_avatar: actorProfile?.avatar_url ?? metadata.actor_avatar ?? undefined,
    content: buildActivityContent(row.type, metadata, row.entity_type),
    entity_id: row.entity_id ?? undefined,
    entity_type: row.entity_type ?? undefined,
    created_at: row.created_at,
    metadata
  };
};

const buildDiscoverReleaseActivity = (release: any): Activity => ({
  id: `discover-release-${release.id}`,
  type: 'release',
  actor_id: release.user_id,
  actor_name: release.profiles?.full_name || release.artist || 'Creator',
  actor_avatar: release.profiles?.avatar_url || undefined,
  content: release.title ? `released “${release.title}”` : 'released a new drop',
  entity_id: release.id,
  entity_type: 'release',
  created_at: release.created_at,
  metadata: {
    cover_art_url: release.cover_art_url,
    genre: release.genre,
    price: release.price,
    link: `/releases/${release.id}`
  }
});

const buildDiscoverBeatActivity = (beat: any, profile?: ProfileRow | null): Activity => ({
  id: `discover-beat-${beat.id}`,
  type: 'beat_upload',
  actor_id: beat.user_id,
  actor_name: beat.producer_name || profile?.full_name || profile?.username || 'Producer',
  actor_avatar: profile?.avatar_url || undefined,
  content: beat.title ? `uploaded “${beat.title}”` : 'uploaded a new beat',
  entity_id: beat.id,
  entity_type: 'beat',
  created_at: beat.created_at,
  metadata: {
    cover_art_url: beat.image_url,
    genre: beat.genre,
    price: beat.price,
    link: `/beats/${beat.id}`
  }
});

export const SocialFeed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedActivities, setFeedActivities] = useState<Activity[]>([]);
  const [discoverActivities, setDiscoverActivities] = useState<Activity[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [activeTab, setActiveTab] = useState('following');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const resetObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => () => resetObserver(), [resetObserver]);

  const loadFeed = useCallback(
    async (pageToLoad: number, isInitial = false) => {
      if (!user?.id) {
        setFeedActivities([]);
        setHasMore(false);
        setInitialLoading(false);
        return;
      }

      if (isInitial) {
        setInitialLoading(true);
        setHasMore(true);
        setPage(0);
      } else {
        setLoadingMore(true);
      }

      const from = pageToLoad * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('activity_feed')
        .select('id, actor_id, type, entity_type, entity_id, data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Social feed error:', error);
        if (isInitial) {
          toast({
            title: 'Unable to load feed',
            description: 'Please try again in a few moments.',
            variant: 'destructive'
          });
        }
        setHasMore(false);
        setInitialLoading(false);
        setLoadingMore(false);
        return;
      }

      const actorIds = Array.from(new Set((data ?? []).map(row => row.actor_id)));
      let profileMap = new Map<string, ProfileRow>();

      if (actorIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', actorIds);

        profileMap = new Map((profileRows ?? []).map(profile => [profile.user_id, profile]));
      }

      const mapped = (data ?? []).map(row => mapActivityRowToFeedItem(row, profileMap));

      setFeedActivities(prev => {
        if (pageToLoad === 0) {
          return mapped;
        }

        const existingIds = new Set(prev.map(activity => activity.id));
        const merged = [...prev];

        for (const activity of mapped) {
          if (!existingIds.has(activity.id)) {
            merged.push(activity);
          }
        }

        return merged;
      });

      setHasMore((data ?? []).length === PAGE_SIZE);
      setPage(pageToLoad);
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [toast, user?.id]
  );

  useEffect(() => {
    loadFeed(0, true);
  }, [loadFeed]);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      resetObserver();

      if (!node || !hasMore || initialLoading || typeof window === 'undefined') {
        return;
      }

      if (typeof IntersectionObserver === 'undefined') {
        return;
      }

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadFeed(page + 1);
        }
      }, { rootMargin: '200px' });

      observerRef.current.observe(node);
    },
    [hasMore, initialLoading, loadFeed, loadingMore, page, resetObserver]
  );

  const fetchDiscoverHighlights = useCallback(async () => {
    try {
      const { data: releaseRows, error: releaseError } = await supabase
        .from('releases')
        .select(`
          id, title, artist, cover_art_url, price, genre, created_at, user_id,
          profiles!inner(full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(8);

      if (releaseError) {
        throw releaseError;
      }

      const releaseActivities = (releaseRows ?? []).map(buildDiscoverReleaseActivity);

      const { data: beatRows, error: beatError } = await supabase
        .from('beats')
        .select('id, title, producer_name, image_url, price, genre, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(8);

      if (beatError) {
        throw beatError;
      }

      let beatProfiles = new Map<string, ProfileRow>();
      const beatOwnerIds = Array.from(new Set((beatRows ?? []).map(row => row.user_id).filter(Boolean)));
      if (beatOwnerIds.length) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', beatOwnerIds);
        beatProfiles = new Map((profileRows ?? []).map(profile => [profile.user_id, profile]));
      }

      const beatActivities = (beatRows ?? []).map(beat =>
        buildDiscoverBeatActivity(beat, beatProfiles.get(beat.user_id) ?? null)
      );

      const combined = [...releaseActivities, ...beatActivities].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDiscoverActivities(combined.slice(0, 12));
    } catch (error) {
      console.error('Discover feed error:', error);
    }
  }, []);

  useEffect(() => {
    fetchDiscoverHighlights();
  }, [fetchDiscoverHighlights]);

  const fetchSuggestedUsers = useCallback(async () => {
    if (!user?.id) {
      setSuggestedUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, user_type, avatar_url')
        .neq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const userIds = (data ?? []).map(profile => profile.user_id);

      const { data: followingRows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);

      const followingSet = new Set((followingRows ?? []).map(row => row.following_id));

      const suggested = await Promise.all(
        (data ?? []).map(async profile => {
          const { count } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profile.user_id);

          return {
            id: profile.user_id,
            name: profile.full_name || profile.username || 'Unknown User',
            username: profile.username || '',
            avatar_url: profile.avatar_url || undefined,
            user_type: profile.user_type || 'creator',
            follower_count: count ?? 0,
            following_count: 0,
            is_following: followingSet.has(profile.user_id),
            mutual_connections: 0
          } satisfies SuggestedUser;
        })
      );

      setSuggestedUsers(suggested);
    } catch (error) {
      console.error('Suggested users error:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  const followUser = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: user.id,
        following_id: userId
      });

      if (error) throw error;

      setSuggestedUsers(prev =>
        prev.map(candidate =>
          candidate.id === userId
            ? { ...candidate, is_following: true, follower_count: candidate.follower_count + 1 }
            : candidate
        )
      );

      toast({ title: 'Following', description: 'Added to your feed.' });
      void loadFeed(0, true);
    } catch (error) {
      console.error('Follow error:', error);
      toast({
        title: 'Follow failed',
        description: 'Unable to follow this user right now.',
        variant: 'destructive'
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

      setSuggestedUsers(prev =>
        prev.map(candidate =>
          candidate.id === userId
            ? {
                ...candidate,
                is_following: false,
                follower_count: Math.max(0, candidate.follower_count - 1)
              }
            : candidate
        )
      );

      toast({ title: 'Unfollowed', description: 'Removed from your feed.' });
      void loadFeed(0, true);
    } catch (error) {
      console.error('Unfollow error:', error);
      toast({
        title: 'Unfollow failed',
        description: 'Unable to update follow status.',
        variant: 'destructive'
      });
    }
  };

  const followingEmptyAction = useMemo(() => {
    if (user) {
      return (
        <Button asChild size="sm">
          <Link to="/marketplace">Discover creators</Link>
        </Button>
      );
    }

    return (
      <Button asChild size="sm">
        <Link to="/auth">Sign in to personalize</Link>
      </Button>
    );
  }, [user]);

  if (initialLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
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

            <TabsContent value="following" className="mt-6 space-y-4">
              <ActivityFeed
                activities={feedActivities}
                getActivityIcon={getActivityIcon}
                emptyMessage={user ? 'Follow creators to fill your feed.' : 'Sign in to personalize your feed.'}
                emptyAction={followingEmptyAction}
              />
              {hasMore && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading more
                    </span>
                  ) : (
                    'Keep scrolling for more activity'
                  )}
                </div>
              )}
              {!hasMore && feedActivities.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">You're all caught up.</p>
              )}
            </TabsContent>

            <TabsContent value="discover" className="mt-6">
              <ActivityFeed
                activities={discoverActivities}
                getActivityIcon={getActivityIcon}
                emptyMessage="Trending releases and beats will appear here soon."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {suggestedUsers.length > 0 && user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Suggested for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestedUsers.map(suggestedUser => (
                <div key={suggestedUser.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={suggestedUser.avatar_url} />
                      <AvatarFallback>
                        {suggestedUser.name?.charAt(0) || suggestedUser.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{suggestedUser.name || suggestedUser.username}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{suggestedUser.user_type}</Badge>
                        <span>{suggestedUser.follower_count} followers</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={suggestedUser.is_following ? 'outline' : 'default'}
                    size="sm"
                    onClick={() =>
                      suggestedUser.is_following
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
  emptyAction?: React.ReactNode;
}

const ActivityFeed = ({ activities, getActivityIcon, emptyMessage, emptyAction }: ActivityFeedProps) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground space-y-3">
        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map(activity => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.actor_avatar} />
                <AvatarFallback>{activity.actor_name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getActivityIcon(activity.type)}
                  <p className="text-sm">
                    <Link to={`/profile/${activity.actor_id}`} className="font-medium hover:underline">
                      {activity.actor_name}
                    </Link>{' '}
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
    case 'post':
      return <MessageCircle className="w-4 h-4 text-amber-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};
