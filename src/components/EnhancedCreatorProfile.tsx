import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBadges } from '@/hooks/useBadges';
import { useGamification } from '@/hooks/useGamification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { FollowButton } from '@/components/FollowButton';
import { ReleasePurchaseButton } from '@/components/ReleasePurchaseButton';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { LeaderboardsWidget } from '@/components/LeaderboardsWidget';
import CreatorSupportCard from '@/components/CreatorSupportCard';
import { 
  User, 
  MapPin, 
  Calendar, 
  Music, 
  Trophy, 
  Star, 
  PlayCircle, 
  Download,
  MessageCircle,
  Settings,
  TrendingUp
} from 'lucide-react';

interface ProfileTheme {
  heroStyle: 'gradient' | 'image' | 'minimal';
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  backgroundImage?: string;
  layoutStyle: 'classic' | 'spotlight';
  showBadges: boolean;
  showAnalytics: boolean;
  highlightProductIds?: string[];
}

const DEFAULT_THEME: ProfileTheme = {
  heroStyle: 'gradient',
  gradientFrom: 'rgba(99,102,241,0.12)',
  gradientTo: 'rgba(45,212,191,0.10)',
  accentColor: '#6366f1',
  layoutStyle: 'classic',
  showBadges: true,
  showAnalytics: true,
};

interface CreatorProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  website_url?: string;
  location?: string;
  genres?: string[];
  social_links?: {
    instagram?: string;
    twitter?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
  };
  created_at: string;
  embed_settings?: Record<string, any> | null;
}

interface CreatorRelease {
  id: string;
  title: string;
  artist: string;
  cover_art_url: string;
  price: number;
  genre: string;
  total_plays: number;
  created_at: string;
}

interface CreatorStats {
  total_releases: number;
  total_plays: number;
  total_downloads: number;
  total_revenue: number;
  followers_count: number;
}

export const EnhancedCreatorProfile = () => {
  const { creatorId, username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userStats } = useGamification();
  const { userBadges, getTierIcon, getTierColor } = useBadges();
  
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [releases, setReleases] = useState<CreatorRelease[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isPremiumCreator, setIsPremiumCreator] = useState(false);
  const [theme, setTheme] = useState<ProfileTheme>(DEFAULT_THEME);
  const [spotlightRelease, setSpotlightRelease] = useState<CreatorRelease | null>(null);
  const [earningsHistory, setEarningsHistory] = useState<Record<string, number>>({});

  useEffect(() => {
    if (creatorId || username) {
      fetchCreatorData();
    }
  }, [creatorId, username]);

  useEffect(() => {
    if (profile) {
      setIsOwner(user?.id === profile.user_id);
    }
  }, [user, profile]);

  const fetchCreatorData = async () => {
    try {
      // Fetch profile - support both username and userId lookup
      let profileQuery = supabase.from('profiles').select('*');
      
      if (username) {
        profileQuery = profileQuery.eq('username', username);
      } else if (creatorId) {
        profileQuery = profileQuery.eq('user_id', creatorId);
      } else {
        throw new Error('No identifier provided');
      }

      const { data: profileData, error: profileError } = await profileQuery.maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Profile not found');
      
      setProfile(profileData);

      const embedSettings = (profileData.embed_settings as Record<string, any> | null) ?? null;
      const themeFromProfile = embedSettings?.profile_theme && typeof embedSettings.profile_theme === 'object'
        ? { ...DEFAULT_THEME, ...embedSettings.profile_theme }
        : DEFAULT_THEME;

      // Fetch releases - filter by user_id to show only this creator's releases
      const { data: releasesDataRaw, error: releasesError } = await supabase
        .from('releases')
        .select('*')
        .eq('user_id', profileData.user_id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (releasesError) throw releasesError;

      const releasesData: CreatorRelease[] = (releasesDataRaw || []).map((release: any) => ({
        id: release.id,
        title: release.title,
        artist: release.artist || profileData.full_name || profileData.username,
        cover_art_url: release.cover_art_url,
        price: release.download_price ?? release.price ?? 0,
        genre: release.genre || 'Uncategorized',
        total_plays: release.total_plays || 0,
        created_at: release.created_at,
      }));
      setReleases(releasesData);

      if (user?.id === profileData.user_id) {
        const { data: analyticsData } = await supabase.rpc('get_release_analytics', {
          p_user_id: profileData.user_id,
          p_days: 30
        });
        setAnalytics(analyticsData);
      }

      const [subscriptionRes, followerRes, orderItemsRes] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('tier, status')
          .eq('user_id', profileData.user_id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('user_follows')
          .select('id', { head: true, count: 'exact' })
          .eq('following_id', profileData.user_id),
        supabase
          .from('order_items')
          .select('price, quantity, created_at, product_id, kind')
          .eq('creator_id', profileData.user_id),
      ]);

      if (subscriptionRes.error && subscriptionRes.error.code !== 'PGRST116') throw subscriptionRes.error;
      if (followerRes.error) throw followerRes.error;
      if (orderItemsRes.error) throw orderItemsRes.error;

      const isPremium = subscriptionRes.data?.tier === 'pro' && subscriptionRes.data?.status === 'active';
      setIsPremiumCreator(isPremium);
      const resolvedTheme = isPremium ? themeFromProfile : DEFAULT_THEME;
      setTheme(resolvedTheme);

      const orderItems = orderItemsRes.data || [];
      const totalDownloads = orderItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
      const totalPlays = releasesData.reduce((sum, release) => sum + release.total_plays, 0);

      setStats({
        total_releases: releasesData.length,
        total_plays: totalPlays,
        total_downloads: totalDownloads,
        total_revenue: totalRevenue,
        followers_count: followerRes.count ?? 0,
      });

      const earningsMap = orderItems.reduce<Record<string, number>>((acc, item) => {
        if (!item.created_at) return acc;
        const dayKey = item.created_at.split('T')[0];
        acc[dayKey] = (acc[dayKey] ?? 0) + (item.price ?? 0) * (item.quantity ?? 1);
        return acc;
      }, {});
      setEarningsHistory(earningsMap);

      resolveSpotlight(orderItems, releasesData, resolvedTheme, isPremium);

    } catch (error) {
      console.error('Error fetching creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveSpotlight = (
    orderItems: Array<{ price: number | null; quantity: number | null; product_id: string | null }>,
    releasesData: CreatorRelease[],
    resolvedTheme: ProfileTheme,
    isPremium: boolean,
  ) => {
    const earningsByProduct = new Map<string, number>();
    orderItems.forEach((item) => {
      if (!item.product_id) return;
      const amount = (item.price ?? 0) * (item.quantity ?? 1);
      earningsByProduct.set(item.product_id, (earningsByProduct.get(item.product_id) ?? 0) + amount);
    });

    let defaultSpotlight: CreatorRelease | null = null;
    let highestEarning = -Infinity;
    earningsByProduct.forEach((earnings, productId) => {
      const release = releasesData.find((r) => r.id === productId);
      if (release && earnings > highestEarning) {
        highestEarning = earnings;
        defaultSpotlight = release;
      }
    });

    if (isPremium && resolvedTheme.highlightProductIds?.length) {
      const highlightedId = resolvedTheme.highlightProductIds.find((id) => releasesData.some((release) => release.id === id));
      if (highlightedId) {
        const highlightedRelease = releasesData.find((release) => release.id === highlightedId) ?? null;
        setSpotlightRelease(highlightedRelease ?? defaultSpotlight);
        return;
      }
    }

    setSpotlightRelease(defaultSpotlight);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
        <div className="pt-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="pt-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Creator not found</h2>
              <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="pt-20">
        {/* Hero Section */}
        <div
          className={`relative py-12 ${theme.heroStyle === 'minimal' ? 'border-b border-border' : ''}`}
          style={
            theme.heroStyle === 'image' && theme.backgroundImage
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${theme.backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : theme.heroStyle === 'gradient'
              ? {
                  backgroundImage: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                }
              : undefined
          }
        >
          <div className="max-w-6xl mx-auto px-6">
            <div className={`flex flex-col md:flex-row items-start gap-6 ${theme.heroStyle === 'image' ? 'text-white' : ''}`}>
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className={`text-3xl font-bold ${theme.heroStyle === 'image' ? 'text-white' : ''}`}>
                    {profile.full_name || profile.username}
                  </h1>
                  <p className={`text-lg ${theme.heroStyle === 'image' ? 'text-white/80' : 'text-muted-foreground'}`}>
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className={`${theme.heroStyle === 'image' ? 'text-white/80' : 'text-muted-foreground'} mt-2`}>
                      {profile.bio}
                    </p>
                  )}
                </div>
                
                <div className={`flex flex-wrap items-center gap-4 text-sm ${theme.heroStyle === 'image' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.created_at).getFullYear()}
                  </span>
                  {profile.genres && profile.genres.length > 0 && (
                    <div className="flex gap-1">
                      {profile.genres.slice(0, 3).map(genre => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isOwner && <FollowButton userId={profile.user_id} currentUserId={user?.id || ''} />}
                  {isOwner && (
                    <Button variant="outline" onClick={() => navigate('/profile')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                  <Button variant="outline" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 min-w-48">
                {stats && (
                  <>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total_releases}</div>
                        <div className="text-sm text-muted-foreground">Releases</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total_plays.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Total Plays</div>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.followers_count}</div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </CardContent>
                    </Card>
                    {userStats && (
                      <Card className="text-center">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Trophy className="w-5 h-5 text-primary" />
                            <span className="text-2xl font-bold">{userStats.level}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">Level</div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                
                {/* Creator Support Card */}
                <CreatorSupportCard 
                  creatorId={profile.user_id} 
                  className="md:col-span-2" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Tabs defaultValue="releases" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="releases">Releases</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              {isOwner && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="releases" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {releases.map((release) => (
                  <Card key={release.id} className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader className="p-0">
                      <div className="relative aspect-square overflow-hidden rounded-t-lg">
                        {release.cover_art_url ? (
                          <img
                            src={release.cover_art_url}
                            alt={release.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Music className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-medium truncate">{release.title}</h3>
                          <p className="text-sm text-muted-foreground">{release.artist}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {release.genre}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {release.total_plays} plays
                          </span>
                        </div>
                        <ReleasePurchaseButton
                          releaseId={release.id}
                          price={release.price}
                          title={release.title}
                          artist={release.artist}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="badges" className="mt-6">
              <BadgeShowcase />
            </TabsContent>

            {isOwner && (
              <TabsContent value="analytics" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {analytics ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Performance Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-2xl font-bold">{analytics.total_plays}</div>
                              <div className="text-sm text-muted-foreground">Total Plays</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{analytics.total_downloads}</div>
                              <div className="text-sm text-muted-foreground">Downloads</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">${analytics.total_revenue}</div>
                              <div className="text-sm text-muted-foreground">Revenue</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold">{analytics.unique_listeners}</div>
                              <div className="text-sm text-muted-foreground">Listeners</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Analytics data will appear as your content gets plays and engagement.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <div>
                    <LeaderboardsWidget />
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="about" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile.bio ? (
                        <p className="text-muted-foreground">{profile.bio}</p>
                      ) : (
                        <p className="text-muted-foreground italic">No bio available</p>
                      )}
                      
                      {profile.genres && profile.genres.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Genres</h4>
                          <div className="flex flex-wrap gap-2">
                            {profile.genres.map(genre => (
                              <Badge key={genre} variant="secondary">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          Website
                        </a>
                      )}
                      {Object.entries(profile.social_links || {}).map(([platform, url]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline capitalize"
                          >
                            {platform}
                          </a>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userBadges.slice(0, 5).map((badge) => (
                      <div key={badge.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                        <div className="text-2xl">{getTierIcon('bronze')}</div>
                        <div>
                          <p className="font-medium">{badge.achievement_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(badge.unlocked_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {userBadges.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};
