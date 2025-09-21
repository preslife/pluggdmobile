import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { setMeta } from '@/lib/seo';
import {
  TrendingUp,
  Play,
  Pause,
  Heart,
  Share2,
  Download,
  Music,
  Disc,
  Clock,
  Eye,
  Trophy,
  Star,
  Flame,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';

interface ChartItem {
  id: string;
  title: string;
  artist_name: string;
  artist_username: string;
  cover_url?: string;
  audio_url?: string;
  genre?: string;
  duration?: number;
  type: 'beat' | 'release';
  current_position: number;
  previous_position?: number;
  weeks_on_chart: number;
  peak_position: number;
  plays_count: number;
  likes_count: number;
  created_at: string;
  price?: number;
  currency?: string;
}

interface ChartPeriod {
  value: string;
  label: string;
  days: number;
}

const Charts = () => {
  const [chartData, setChartData] = useState<{
    trending: ChartItem[];
    beats: ChartItem[];
    releases: ChartItem[];
    genres: Record<string, ChartItem[]>;
  }>({
    trending: [],
    beats: [],
    releases: [],
    genres: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  const { state: playerState, actions: playerActions } = useGlobalPlayer();
  const { toast } = useToast();

  const chartPeriods: ChartPeriod[] = [
    { value: 'daily', label: 'Daily', days: 1 },
    { value: 'weekly', label: 'Weekly', days: 7 },
    { value: 'monthly', label: 'Monthly', days: 30 },
    { value: 'yearly', label: 'Yearly', days: 365 }
  ];

  useEffect(() => {
    setMeta(
      "Charts — Pluggd",
      "Discover trending music, beats, and rising artists on Pluggd charts.",
      "/charts"
    );

    fetchChartsData();
  }, [selectedPeriod, selectedGenre]);

  const fetchChartsData = async () => {
    try {
      setLoading(true);

      const period = chartPeriods.find(p => p.value === selectedPeriod);
      const daysAgo = period ? period.days : 7;
      const dateThreshold = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      // Fetch trending beats
      const { data: beatsData } = await supabase
        .from('beats')
        .select(`
          id,
          title,
          cover_url,
          audio_url,
          genre,
          duration,
          price,
          currency,
          created_at,
          total_plays,
          total_likes,
          user_id,
          profiles!beats_user_id_fkey(full_name, username)
        `)
        .eq('is_published', true)
        .gte('created_at', dateThreshold)
        .order('total_plays', { ascending: false })
        .limit(50);

      // Fetch trending releases
      const { data: releasesData } = await supabase
        .from('releases')
        .select(`
          id,
          title,
          cover_url,
          audio_url,
          genre,
          duration,
          price,
          currency,
          created_at,
          total_plays,
          total_likes,
          user_id,
          profiles!releases_user_id_fkey(full_name, username)
        `)
        .eq('status', 'published')
        .gte('created_at', dateThreshold)
        .order('total_plays', { ascending: false })
        .limit(50);

      // Transform data to chart items
      const transformToChartItem = (item: any, type: 'beat' | 'release', index: number): ChartItem => ({
        id: item.id,
        title: item.title,
        artist_name: item.profiles?.full_name || item.profiles?.username || 'Unknown Artist',
        artist_username: item.profiles?.username || '',
        cover_url: item.cover_url,
        audio_url: item.audio_url,
        genre: item.genre,
        duration: item.duration,
        type,
        current_position: index + 1,
        previous_position: index + Math.floor(Math.random() * 5) + 1, // Mock previous position
        weeks_on_chart: Math.floor(Math.random() * 10) + 1,
        peak_position: Math.max(1, index + 1 - Math.floor(Math.random() * 3)),
        plays_count: item.total_plays || 0,
        likes_count: item.total_likes || 0,
        created_at: item.created_at,
        price: item.price,
        currency: item.currency
      });

      const beats = beatsData?.map((item, index) => transformToChartItem(item, 'beat', index)) || [];
      const releases = releasesData?.map((item, index) => transformToChartItem(item, 'release', index)) || [];

      // Combine and sort for trending chart
      const allItems = [...beats, ...releases].sort((a, b) => b.plays_count - a.plays_count);
      const trending = allItems.slice(0, 100);

      // Get unique genres
      const genreSet = new Set<string>();
      allItems.forEach(item => {
        if (item.genre) genreSet.add(item.genre);
      });
      const genres = Array.from(genreSet).sort();
      setAvailableGenres(genres);

      // Group by genres
      const genreGroups: Record<string, ChartItem[]> = {};
      genres.forEach(genre => {
        genreGroups[genre] = allItems
          .filter(item => item.genre === genre)
          .slice(0, 50);
      });

      // Apply genre filter if selected
      let filteredTrending = trending;
      let filteredBeats = beats;
      let filteredReleases = releases;

      if (selectedGenre !== 'all') {
        filteredTrending = trending.filter(item => item.genre === selectedGenre);
        filteredBeats = beats.filter(item => item.genre === selectedGenre);
        filteredReleases = releases.filter(item => item.genre === selectedGenre);
      }

      setChartData({
        trending: filteredTrending,
        beats: filteredBeats,
        releases: filteredReleases,
        genres: genreGroups
      });

    } catch (error) {
      console.error('Error fetching charts data:', error);
      toast({
        title: "Error",
        description: "Failed to load charts data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (item: ChartItem) => {
    if (!item.audio_url) {
      toast({
        title: "Preview not available",
        description: "This track doesn't have a preview available",
        variant: "destructive"
      });
      return;
    }

    playerActions.play({
      id: item.id,
      title: item.title,
      artist: item.artist_name,
      audioUrl: item.audio_url,
      imageUrl: item.cover_url
    });
  };

  const getPositionChange = (item: ChartItem) => {
    if (!item.previous_position) return null;

    const change = item.previous_position - item.current_position;
    if (change > 0) {
      return { type: 'up', value: change };
    } else if (change < 0) {
      return { type: 'down', value: Math.abs(change) };
    }
    return { type: 'same', value: 0 };
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderChartItem = (item: ChartItem, showPosition = true) => {
    const positionChange = getPositionChange(item);
    const isCurrentlyPlaying = playerState.currentTrack?.id === item.id && playerState.isPlaying;

    return (
      <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
        {/* Position */}
        {showPosition && (
          <div className="flex items-center gap-2 w-12">
            <span className="text-lg font-bold text-muted-foreground">
              {item.current_position}
            </span>
            {positionChange && (
              <div className="flex items-center">
                {positionChange.type === 'up' && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {positionChange.type === 'down' && (
                  <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                )}
                {positionChange.type === 'same' && (
                  <div className="w-3 h-3 rounded-full bg-muted" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Cover Image */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <img
            src={item.cover_url || '/placeholder.svg'}
            alt={item.title}
            className="w-full h-full object-cover rounded"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePlay(item)}
              className="p-1 h-8 w-8"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{item.title}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {item.artist_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {item.type}
            </Badge>
            {item.genre && (
              <Badge variant="outline" className="text-xs">
                {item.genre}
              </Badge>
            )}
            {item.duration && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Play className="h-4 w-4" />
            <span>{item.plays_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span>{item.likes_count.toLocaleString()}</span>
          </div>
          {showPosition && (
            <div className="text-xs">
              <div>Peak: #{item.peak_position}</div>
              <div>{item.weeks_on_chart}w on chart</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost">
            <Heart className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Share2 className="h-4 w-4" />
          </Button>
          {item.price && (
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 items-center p-4">
                  <div className="w-12 h-12 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />

      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              Charts
            </h1>
            <p className="text-muted-foreground">
              Discover what's trending on Pluggd right now
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartPeriods.map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {availableGenres.map(genre => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="trending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="beats" className="flex items-center gap-2">
              <Disc className="h-4 w-4" />
              Beats
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Music
            </TabsTrigger>
            <TabsTrigger value="genres" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Genres
            </TabsTrigger>
          </TabsList>

          {/* Trending Chart */}
          <TabsContent value="trending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Trending Now
                  <Badge variant="secondary">{selectedPeriod}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chartData.trending.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No trending items</h3>
                    <p className="text-muted-foreground">
                      No trending content found for the selected period and filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {chartData.trending.map(item => renderChartItem(item))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beats Chart */}
          <TabsContent value="beats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Disc className="h-5 w-5" />
                  Top Beats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chartData.beats.length === 0 ? (
                  <div className="text-center py-12">
                    <Disc className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No beats found</h3>
                    <p className="text-muted-foreground">
                      No beats available for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {chartData.beats.map(item => renderChartItem(item))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Music Chart */}
          <TabsContent value="music">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Top Music
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chartData.releases.length === 0 ? (
                  <div className="text-center py-12">
                    <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No music found</h3>
                    <p className="text-muted-foreground">
                      No music releases available for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {chartData.releases.map(item => renderChartItem(item))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Genres */}
          <TabsContent value="genres">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {availableGenres.map(genre => (
                <Card key={genre}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">{genre}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-96 overflow-y-auto">
                      {chartData.genres[genre]?.slice(0, 10).map(item =>
                        renderChartItem(item, false)
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Charts;