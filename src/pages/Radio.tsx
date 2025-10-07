import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { setMeta } from '@/lib/seo';
import { logAnalyticsEvent } from '@/lib/analytics';
import {
  Radio as RadioIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Shuffle,
  RotateCcw,
  Music,
  Disc,
  Star,
  Zap,
  Clock,
  Users,
  TrendingUp,
  Bookmark
} from 'lucide-react';

interface RadioTrack {
  id: string;
  title: string;
  artist_name: string;
  artist_username: string;
  cover_url?: string;
  audio_url?: string;
  genre?: string;
  duration?: number;
  type: 'beat' | 'release';
  bpm?: number;
  key_signature?: string;
  plays_count?: number;
  created_at: string;
}

interface RadioStation {
  id: string;
  name: string;
  description: string;
  genre?: string;
  seed_type: 'genre' | 'artist' | 'track' | 'mood';
  seed_value: string;
  icon: React.ComponentType<any>;
  color: string;
}

const Radio = () => {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [queue, setQueue] = useState<RadioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [recommendationMode, setRecommendationMode] = useState<'similar' | 'discovery' | 'trending'>('similar');

  const { state: playerState, actions: playerActions } = useGlobalPlayer();
  const { toast } = useToast();

  // Predefined radio stations
  const defaultStations: RadioStation[] = [
    {
      id: 'trending-now',
      name: 'Trending Now',
      description: 'The hottest tracks on Pluggd right now',
      seed_type: 'mood',
      seed_value: 'trending',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-red-500 to-orange-500'
    },
    {
      id: 'new-releases',
      name: 'New Releases',
      description: 'Fresh music and beats from emerging artists',
      seed_type: 'mood',
      seed_value: 'new',
      icon: Zap,
      color: 'bg-gradient-to-r from-blue-500 to-purple-500'
    },
    {
      id: 'chill-vibes',
      name: 'Chill Vibes',
      description: 'Relaxed beats for focus and relaxation',
      genre: 'Chill',
      seed_type: 'mood',
      seed_value: 'chill',
      icon: Clock,
      color: 'bg-gradient-to-r from-green-500 to-teal-500'
    },
    {
      id: 'hip-hop-central',
      name: 'Hip Hop Central',
      description: 'The best in hip hop beats and tracks',
      genre: 'Hip Hop',
      seed_type: 'genre',
      seed_value: 'Hip Hop',
      icon: Music,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500'
    },
    {
      id: 'electronic-pulse',
      name: 'Electronic Pulse',
      description: 'Electronic music and beats',
      genre: 'Electronic',
      seed_type: 'genre',
      seed_value: 'Electronic',
      icon: Disc,
      color: 'bg-gradient-to-r from-cyan-500 to-blue-500'
    }
  ];

  const [stations, setStations] = useState<RadioStation[]>(defaultStations);
  const [genresLoaded, setGenresLoaded] = useState(false);
  const [bookmarkedStations, setBookmarkedStations] = useState<string[]>([]);
  const preferencesHydratedRef = useRef(false);
  const savedStationIdRef = useRef<string | null>(null);
  const lastLoggedStationIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMeta(
      "Radio — Pluggd",
      "Discover new music with Pluggd Radio. Personalized stations based on your taste.",
      "/radio"
    );

    fetchGenres();
  }, []);

  useEffect(() => {
    if (!currentStation) return;
    void generateQueue(true);
  }, [currentStation, generateQueue]);

  useEffect(() => {
    if (!currentStation) return;
    void generateQueue(false);
  }, [currentStation, recommendationMode, generateQueue]);

  useEffect(() => {
    if (typeof window === 'undefined' || preferencesHydratedRef.current) return;

    try {
      const stored = localStorage.getItem('pluggd-radio-preferences');
      if (!stored) {
        preferencesHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed.bookmarks)) {
        setBookmarkedStations(parsed.bookmarks);
      }

      if (parsed.stationId) {
        savedStationIdRef.current = parsed.stationId;
      } else {
        preferencesHydratedRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load radio preferences:', error);
      preferencesHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!savedStationIdRef.current) {
      if (!preferencesHydratedRef.current && genresLoaded) {
        preferencesHydratedRef.current = true;
      }
      return;
    }

    const matchedStation = stations.find((station) => station.id === savedStationIdRef.current);
    if (matchedStation) {
      setCurrentStation(matchedStation);
      savedStationIdRef.current = null;
      preferencesHydratedRef.current = true;
    } else if (genresLoaded) {
      savedStationIdRef.current = null;
      preferencesHydratedRef.current = true;
    }
  }, [stations, genresLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined' || !preferencesHydratedRef.current) return;

    const payload = {
      stationId: currentStation?.id || null,
      bookmarks: bookmarkedStations
    };

    localStorage.setItem('pluggd-radio-preferences', JSON.stringify(payload));
  }, [currentStation, bookmarkedStations]);

  const fetchGenres = async () => {
    try {
      const { data: beats } = await supabase
        .from('beats')
        .select('genre')
        .not('genre', 'is', null)
        .eq('is_published', true);

      const { data: releases } = await supabase
        .from('releases')
        .select('genre')
        .not('genre', 'is', null)
        .eq('status', 'published');

      const genreSet = new Set<string>();
      [...(beats || []), ...(releases || [])].forEach(item => {
        if (item.genre) genreSet.add(item.genre);
      });

      const genres = Array.from(genreSet).sort();
      setAvailableGenres(genres);

      // Add genre-based stations
      const genreStations = genres.slice(0, 8).map(genre => ({
        id: `genre-${genre.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${genre} Radio`,
        description: `Best ${genre.toLowerCase()} music and beats`,
        genre,
        seed_type: 'genre' as const,
        seed_value: genre,
        icon: Star,
        color: `bg-gradient-to-r from-${['indigo', 'violet', 'emerald', 'amber', 'rose', 'sky', 'orange', 'teal'][Math.floor(Math.random() * 8)]}-500 to-${['purple', 'pink', 'blue', 'yellow', 'red', 'cyan', 'lime', 'fuchsia'][Math.floor(Math.random() * 8)]}-500`
      }));

      setStations([...defaultStations, ...genreStations]);
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setGenresLoaded(true);
    }
  };

  const playTrack = useCallback((track: RadioTrack) => {
    if (!track.audio_url) return;

    playerActions.play({
      id: track.id,
      title: track.title,
      artist: track.artist_name,
      audioUrl: track.audio_url,
      imageUrl: track.cover_url
    });

    setIsPlaying(true);
  }, [playerActions]);

  const generateQueue = useCallback(async (logSessionEvent: boolean = false) => {
    if (!currentStation) return;

    try {
      setIsLoading(true);

      const beatSelect = `
        id, title, cover_url, audio_url, genre, duration, bpm, key_signature, total_plays, created_at,
        profiles!beats_user_id_fkey(full_name, username)
      `;

      const releaseSelect = `
        id, title, cover_url, audio_url, genre, duration, total_plays, created_at,
        profiles!releases_user_id_fkey(full_name, username)
      `;

      let beatQuery = supabase
        .from('beats')
        .select(beatSelect)
        .eq('is_published', true);

      let releaseQuery = supabase
        .from('releases')
        .select(releaseSelect)
        .eq('status', 'published');

      if (currentStation.seed_type === 'genre') {
        beatQuery = beatQuery.eq('genre', currentStation.seed_value);
        releaseQuery = releaseQuery.eq('genre', currentStation.seed_value);
      } else if (currentStation.seed_type === 'mood') {
        if (currentStation.seed_value === 'trending') {
          beatQuery = beatQuery.not('total_plays', 'is', null);
          releaseQuery = releaseQuery.not('total_plays', 'is', null);
        } else if (currentStation.seed_value === 'new') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          beatQuery = beatQuery.gte('created_at', thirtyDaysAgo.toISOString());
          releaseQuery = releaseQuery.gte('created_at', thirtyDaysAgo.toISOString());
        }
      }

      const applyRecommendationFilters = (query: any) => {
        switch (recommendationMode) {
          case 'trending':
            return query
              .not('total_plays', 'is', null)
              .order('total_plays', { ascending: false });
          case 'discovery':
            return query
              .or('total_plays.lte.1000,total_plays.is.null')
              .order('created_at', { ascending: false });
          case 'similar':
          default:
            return query.order('created_at', { ascending: false });
        }
      };

      const preparedBeatQuery = applyRecommendationFilters(beatQuery).limit(50);
      const preparedReleaseQuery = applyRecommendationFilters(releaseQuery).limit(50);

      const [beatResult, releaseResult] = await Promise.all([preparedBeatQuery, preparedReleaseQuery]);

      if (beatResult.error) throw beatResult.error;
      if (releaseResult.error) throw releaseResult.error;

      const mappedBeats =
        beatResult.data?.map((item: any) => ({
          ...item,
          artist_name: item.profiles?.full_name || item.profiles?.username || 'Unknown',
          artist_username: item.profiles?.username || '',
          type: 'beat' as const,
          plays_count: item.total_plays || 0
        })) || [];

      const mappedReleases =
        releaseResult.data?.map((item: any) => ({
          ...item,
          artist_name: item.profiles?.full_name || item.profiles?.username || 'Unknown',
          artist_username: item.profiles?.username || '',
          type: 'release' as const,
          plays_count: item.total_plays || 0
        })) || [];

      const combined = [...mappedBeats, ...mappedReleases];
      const uniqueMap = new Map<string, RadioTrack>();

      combined.forEach((track) => {
        if (!track.audio_url) return;
        const key = `${track.type}-${track.id}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, track);
        }
      });

      const deduped = Array.from(uniqueMap.values());
      const shuffled = [...deduped].sort(() => Math.random() - 0.5);
      const limited = shuffled.slice(0, 30);

      setQueue(limited);
      setCurrentTrackIndex(0);

      if (limited.length > 0) {
        const firstTrack = limited[0];
        playTrack(firstTrack);

        if (logSessionEvent && currentStation.id !== lastLoggedStationIdRef.current) {
          await logAnalyticsEvent('radio_session_started', {
            station_id: currentStation.id,
            station_name: currentStation.name,
            station_seed_type: currentStation.seed_type,
            station_seed_value: currentStation.seed_value,
            recommendation_mode: recommendationMode
          });
          lastLoggedStationIdRef.current = currentStation.id;
        }
      } else {
        setIsPlaying(false);
      }

    } catch (error) {
      console.error('Error generating queue:', error);
      toast({
        title: "Error",
        description: "Failed to generate radio queue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentStation, recommendationMode, playTrack, toast]);

  const handleStationSelect = (station: RadioStation) => {
    const isSameStation = currentStation?.id === station.id;

    lastLoggedStationIdRef.current = null;
    setQueue([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);

    if (isSameStation) {
      void generateQueue(true);
      return;
    }

    setCurrentStation(station);
  };

  const handlePlayPause = () => {
    if (queue.length === 0) return;

    const currentTrack = queue[currentTrackIndex];
    if (!currentTrack) return;

    if (isPlaying) {
      playerActions.pause();
      setIsPlaying(false);
    } else {
      playTrack(currentTrack);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex < queue.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(nextIndex);
      playTrack(queue[nextIndex]);
    } else {
      // Generate more tracks or restart
      void generateQueue(false);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(prevIndex);
      playTrack(queue[prevIndex]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      setVolume([0]);
    } else {
      setVolume([75]);
    }
  };

  const toggleBookmark = (stationId: string) => {
    setBookmarkedStations((prev) => {
      if (prev.includes(stationId)) {
        return prev.filter((id) => id !== stationId);
      }
      return [...prev, stationId];
    });
  };

  const currentTrack = queue[currentTrackIndex];
  const stationOrder = new Map(stations.map((station, index) => [station.id, index]));
  const sortedStations = [...stations].sort((a, b) => {
    const aBookmarked = bookmarkedStations.includes(a.id) ? 1 : 0;
    const bBookmarked = bookmarkedStations.includes(b.id) ? 1 : 0;

    if (aBookmarked === bBookmarked) {
      return (stationOrder.get(a.id) ?? 0) - (stationOrder.get(b.id) ?? 0);
    }

    return bBookmarked - aBookmarked;
  });

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />

      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <RadioIcon className="h-8 w-8" />
            Pluggd Radio
          </h1>
          <p className="text-muted-foreground">
            Discover new music tailored to your taste
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Radio Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Track */}
            {currentTrack ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 flex-shrink-0">
                      <img
                        src={currentTrack.cover_url || '/placeholder.svg'}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold mb-1">{currentTrack.title}</h2>
                        <p className="text-lg text-muted-foreground">{currentTrack.artist_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="capitalize">
                            {currentTrack.type}
                          </Badge>
                          {currentTrack.genre && (
                            <Badge variant="outline">{currentTrack.genre}</Badge>
                          )}
                          {currentTrack.bpm && (
                            <Badge variant="outline">{currentTrack.bpm} BPM</Badge>
                          )}
                        </div>
                      </div>

                      {/* Player Controls */}
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={currentTrackIndex === 0}
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>

                        <Button
                          size="lg"
                          onClick={handlePlayPause}
                          disabled={isLoading}
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleNext}
                          disabled={currentTrackIndex >= queue.length - 1 && !isLoading}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-2 ml-auto">
                          <Button size="sm" variant="ghost" onClick={toggleMute}>
                            {isMuted || volume[0] === 0 ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Slider
                            value={isMuted ? [0] : volume}
                            onValueChange={handleVolumeChange}
                            max={100}
                            step={1}
                            className="w-24"
                          />
                        </div>

                        <Button size="sm" variant="ghost">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Station Info */}
                  {currentStation && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${currentStation.color} flex items-center justify-center`}>
                          <currentStation.icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">{currentStation.name}</p>
                          <p className="text-sm text-muted-foreground">{currentStation.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <RadioIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Select a Radio Station</h3>
                  <p className="text-muted-foreground">
                    Choose a station from the sidebar to start listening
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Queue */}
            {queue.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Up Next</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {queue.slice(currentTrackIndex + 1, currentTrackIndex + 11).map((track, index) => (
                      <div key={track.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer"
                           onClick={() => {
                             setCurrentTrackIndex(currentTrackIndex + 1 + index);
                             playTrack(track);
                           }}>
                        <img
                          src={track.cover_url || '/placeholder.svg'}
                          alt={track.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {track.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stations Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RadioIcon className="h-5 w-5" />
                  Radio Stations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {sortedStations.map((station) => {
                    const IconComponent = station.icon;
                    const isActive = currentStation?.id === station.id;
                    const isBookmarked = bookmarkedStations.includes(station.id);

                    return (
                      <div
                        key={station.id}
                        className={`group flex items-center gap-2 rounded-lg p-3 transition-colors ${
                          isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleStationSelect(station)}
                          className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                        >
                          <div className={`w-10 h-10 rounded-lg ${station.color} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{station.name}</p>
                            <p className="text-xs opacity-70 truncate">{station.description}</p>
                          </div>
                        </button>
                        <Button
                          type="button"
                          size="icon"
                          variant={isActive ? 'secondary' : 'ghost'}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleBookmark(station.id);
                          }}
                          aria-pressed={isBookmarked}
                          aria-label={
                            isBookmarked
                              ? `Remove ${station.name} from bookmarks`
                              : `Bookmark ${station.name}`
                          }
                        >
                          <Bookmark
                            className="h-4 w-4"
                            fill={isBookmarked ? 'currentColor' : 'none'}
                          />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Radio Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Discovery Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recommendation Mode</label>
                    <Select value={recommendationMode} onValueChange={(value: any) => setRecommendationMode(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="similar">Similar Music</SelectItem>
                        <SelectItem value="discovery">Discovery Mode</SelectItem>
                        <SelectItem value="trending">Trending Now</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radio;
