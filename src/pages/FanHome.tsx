import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Play, Headphones, TrendingUp, Users, BookOpen, Award, Clock } from "lucide-react";
import { formatCredits } from "@/hooks/useWallet";
import { TipModal } from "@/components/TipModal";
import { Progress } from "@/components/ui/progress";

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

interface CourseProgressItem {
  course_id: string;
  completion_percentage: number;
  last_accessed_at: string | null;
  courses: {
    title: string;
    thumbnail_url?: string;
    difficulty_level: string;
    duration_hours: number;
  } | null;
}

interface CourseCertificateItem {
  id: string;
  course_id: string;
  created_at: string;
  certificate_data: {
    course_title?: string;
    completion_date?: string;
  } | null;
  courses?: {
    title: string;
  } | null;
}

export default function FanHome() {
  const { user } = useAuth();
  const [followFeed, setFollowFeed] = useState<Activity[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [learningProgress, setLearningProgress] = useState<CourseProgressItem[]>([]);
  const [learningCertificates, setLearningCertificates] = useState<CourseCertificateItem[]>([]);

  useEffect(() => {
    if (user) {
      fetchFollowFeed();
      fetchLearningData();
    } else {
      setLearningProgress([]);
      setLearningCertificates([]);
    }
    // Trending list is visible to everyone
    fetchTrending();
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

  const fetchLearningData = async () => {
    if (!user) {
      setLearningProgress([]);
      setLearningCertificates([]);
      return;
    }

    try {
      const { data: progressData, error: progressError } = await supabase
        .from('user_course_progress')
        .select('course_id, completion_percentage, last_accessed_at, courses!inner(title, thumbnail_url, difficulty_level, duration_hours)')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false });

      if (progressError) throw progressError;
      setLearningProgress(progressData || []);
    } catch (error) {
      console.error('Error fetching learning progress:', error);
    }

    try {
      const { data: certificateData, error: certificateError } = await supabase
        .from('course_certificates')
        .select('id, course_id, certificate_data, created_at, courses!inner(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (certificateError) throw certificateError;
      setLearningCertificates(certificateData || []);
    } catch (error) {
      console.error('Error fetching learning certificates:', error);
    }
  };

  const learningStats = useMemo(() => {
    if (!learningProgress.length) {
      return { active: 0, completed: 0, hours: 0 };
    }

    const active = learningProgress.filter((progress) => progress.completion_percentage < 100).length;
    const completed = learningProgress.filter((progress) => progress.completion_percentage === 100).length;
    const hours = learningProgress.reduce((total, progress) => {
      const duration = progress.courses?.duration_hours ?? 0;
      return total + duration * (progress.completion_percentage / 100);
    }, 0);

    return {
      active,
      completed,
      hours: Math.round(hours),
    };
  }, [learningProgress]);

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

      {user && (
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5" />
              My Learning Snapshot
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your course progress and recently earned certificates.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/40">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Active Courses</span>
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-2xl font-semibold mt-2">{learningStats.active}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/40">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Completed</span>
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-2xl font-semibold mt-2">{learningStats.completed}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/40">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Hours Learned</span>
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-2xl font-semibold mt-2">{learningStats.hours}</p>
              </div>
            </div>

            {learningProgress.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    In Progress
                  </h3>
                  {learningProgress.slice(0, 3).map((progress) => {
                    const completion = progress.completion_percentage ?? 0;
                    return (
                      <div key={progress.course_id} className="border rounded-lg p-4 space-y-2 bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {progress.courses?.title || 'Course'}
                          </p>
                          <span className="text-sm text-muted-foreground">
                            {completion}%
                          </span>
                        </div>
                        <Progress value={completion} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{progress.courses?.difficulty_level || '–'}</span>
                          {progress.last_accessed_at && (
                            <span>Last studied {new Date(progress.last_accessed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/education'}>
                    Continue learning
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent Certificates
                  </h3>
                  {learningCertificates.length > 0 ? (
                    learningCertificates.slice(0, 3).map((certificate) => (
                      <div key={certificate.id} className="border rounded-lg p-4 bg-card">
                        <p className="font-medium">
                          {certificate.certificate_data?.course_title || certificate.courses?.title || 'Course Certificate'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Earned {new Date(certificate.certificate_data?.completion_date || certificate.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete a course to earn your first certificate.</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/education?tab=certificates'}>
                    View certificates
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg bg-muted/30">
                <p className="font-medium mb-2">Start your learning journey</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Enroll in your first course to see progress here.
                </p>
                <Button onClick={() => window.location.href = '/education'}>Browse Courses</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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