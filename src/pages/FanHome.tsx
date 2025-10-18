import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Play, Download, Headphones, TrendingUp, Users } from "lucide-react";
import { formatCredits } from "@/hooks/useWallet";
import { TipModal } from "@/components/TipModal";
import { useToast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/usePageMetadata";

interface Activity {
  id: string;
  type: 'release' | 'beat' | 'post';
  title: string;
  creator_name: string;
  creator_id: string;
  creator_avatar?: string;
  artwork_url?: string;
  price?: number;
  created_at: string;
  audio_url?: string;
  genre?: string;
}

interface TrendingItem {
  id: string;
  title: string;
  creator_name: string;
  creator_id: string;
  artwork_url?: string;
  play_count?: number;
  type: 'release' | 'beat';
  price?: number;
  genre?: string;
}

export default function FanHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followFeed, setFollowFeed] = useState<Activity[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMetadata({
    title: "Fan Home — Pluggd",
    description: "Follow your favorite creators, discover trending releases, and support artists directly on Pluggd.",
    path: "/home",
  });

  useEffect(() => {
    if (user) {
      fetchFollowFeed();
      fetchTrending();
    } else {
      // For non-authenticated users, just show trending
      fetchTrending();
    }
  }, [user]);

  const fetchFollowFeed = async () => {
    if (!user) return;

    try {
      // Get followed creators
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!follows?.length) {
        setFollowFeed([]);
        return;
      }

      const followingIds = follows.map(f => f.following_id);

      // Get recent releases from followed creators
        const { data: releases } = await supabase
          .from('releases')
          .select(`
            id, title, artist, cover_art_url, price, created_at, genre, preview_url,
            user_id, profiles!inner(full_name, avatar_url)
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(10);

        // Get recent beats from followed creators
        const { data: beats } = await supabase
          .from('beats')
          .select(`
            id, title, producer_name, image_url, price, created_at, genre, audio_url,
            user_id
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(10);

      // Combine and sort by date
        const activities: Activity[] = [
          ...(releases || []).map(r => ({
            id: r.id,
            type: 'release' as const,
            title: r.title,
            creator_name: r.profiles.full_name || r.artist,
            creator_id: r.user_id,
            creator_avatar: r.profiles.avatar_url,
            artwork_url: r.cover_art_url,
            price: r.price,
            created_at: r.created_at,
            audio_url: r.preview_url,
            genre: r.genre
          })),
          ...(beats || []).map(b => ({
            id: b.id,
            type: 'beat' as const,
            title: b.title,
            creator_name: b.producer_name || 'Unknown',
            creator_id: b.user_id,
            creator_avatar: undefined,
            artwork_url: b.image_url,
            price: b.price,
            created_at: b.created_at,
            audio_url: b.audio_url,
            genre: b.genre
          }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFollowFeed(activities);
    } catch (error) {
      console.error('Error fetching follow feed:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      // Mock trending data - in real app this would use play counts, engagement scores
      const { data: trendingReleases } = await supabase
        .from('releases')
        .select(`
          id, title, artist, cover_art_url, price, genre,
          user_id, profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: trendingBeats } = await supabase
        .from('beats')
        .select(`
          id, title, producer_name, image_url, price, genre,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const trendingItems: TrendingItem[] = [
        ...(trendingReleases || []).map(r => ({
          id: r.id,
          title: r.title,
          creator_name: r.profiles.full_name || r.artist,
          creator_id: r.user_id,
          artwork_url: r.cover_art_url,
          type: 'release' as const,
          price: r.price,
          genre: r.genre,
          play_count: Math.floor(Math.random() * 10000) + 1000 // Mock data
        })),
        ...(trendingBeats || []).map(b => ({
          id: b.id,
          title: b.title,
          creator_name: b.producer_name || 'Unknown',
          creator_id: b.user_id,
          artwork_url: b.image_url,
          type: 'beat' as const,
          price: b.price,
          genre: b.genre,
          play_count: Math.floor(Math.random() * 10000) + 1000 // Mock data
        }))
      ].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

      setTrending(trendingItems);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Discover Music</h1>
        <p className="text-muted-foreground">
          Follow your favorite creators and discover the latest releases
        </p>
      </div>

      <Tabs defaultValue={user ? "following" : "trending"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="following" disabled={!user}>
            <Users className="w-4 h-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">Sign in to see updates from creators you follow</p>
                <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
              </CardContent>
            </Card>
          ) : followFeed.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  No updates from followed creators. Start following some creators to see their latest releases!
                </p>
                <Button onClick={() => window.location.href = '/directory'}>Browse Creators</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {followFeed.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <div className="space-y-4">
            {trending.map((item) => (
              <TrendingCard key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
              {activity.artwork_url ? (
                <img
                  src={activity.artwork_url}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{activity.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={activity.creator_avatar} />
                    <AvatarFallback>{activity.creator_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate">
                    {activity.creator_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {activity.type}
                  </Badge>
                  {activity.genre && (
                    <Badge variant="outline" className="text-xs">
                      {activity.genre}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {activity.price && (
                  <span className="text-sm font-medium">
                    {formatCredits(activity.price)}
                  </span>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline">
                    <Play className="w-4 h-4" />
                  </Button>
                  <TipModal creatorId={activity.creator_id} creatorName={activity.creator_name}>
                    <Button size="sm" variant="outline">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </TipModal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingCard({ item }: { item: TrendingItem }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
              {item.artwork_url ? (
                <img
                  src={item.artwork_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{item.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {item.creator_name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.type}
                  </Badge>
                  {item.genre && (
                    <Badge variant="outline" className="text-xs">
                      {item.genre}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Headphones className="w-3 h-3" />
                    {item.play_count?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {item.price && (
                  <span className="text-sm font-medium">
                    {formatCredits(item.price)}
                  </span>
                )}
                <div className="flex gap-1">
                  <Button size="sm" variant="outline">
                    <Play className="w-4 h-4" />
                  </Button>
                  <TipModal creatorId={item.creator_id} creatorName={item.creator_name}>
                    <Button size="sm" variant="outline">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </TipModal>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}