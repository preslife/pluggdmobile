import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, ShoppingCart, Heart, Share2, Search, Filter, Grid3X3, List, TrendingUp, Flame, Star, AlertTriangle, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PaymentButton } from '@/components/PaymentButton';
import { MarketplaceFilters } from '@/components/MarketplaceFilters';
import { CompactBeatCard } from '@/components/CompactBeatCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { useFavorites } from '@/hooks/useFavorites';
import BeatRecommendations from '@/components/BeatRecommendations';
import ShareModal from '@/components/ShareModal';
import beatHeroBg from '@/assets/beat-hero-bg.jpg';
import { formatCurrency } from '@/lib/utils';
import { setMeta } from "@/lib/seo";

type Beat = {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  created_at: string;
  uploaded_by_admin: boolean;
  producer_name: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
  } | null;
};

const Marketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { state, actions } = useGlobalPlayer();
  const { currentTrack, isPlaying } = state;
  const { toggleFavorite, isFavorited } = useFavorites();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [filteredBeats, setFilteredBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    searchTerm: '',
    timeFilter: 'all',
    genres: [],
    trackTypes: [],
    priceFilter: 'all',
    moods: [],
    bpmRange: [0, 200],
    bpmRangeType: 'all',
    instruments: [],
    keys: [],
    duration: 'any',
    sortBy: 'recent',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    setMeta(
      "Pluggd Marketplace — Buy Exclusive Beats",
      "Shop exclusive beats and instrumentals on Pluggd.",
      "/marketplace"
    );
  }, []);

  useEffect(() => {
    fetchBeats();
    handlePaymentResult();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [beats, filters]);

  const handlePaymentResult = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "Payment successful!",
        description: "Your beat purchase has been completed. You can now download it from your library.",
        duration: 5000
      });
      // Clean up URL
      window.history.replaceState({}, '', '/marketplace');
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive"
      });
      // Clean up URL
      window.history.replaceState({}, '', '/marketplace');
    }
  };

  const fetchBeats = async () => {
    try {
      setError(null);
      // First get beats, then fetch profile data separately
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (beatsError) throw beatsError;

      // Get unique user IDs from beats
      const userIds = [...new Set(beatsData?.map(beat => beat.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine beats with profile data
      const beatsWithProfiles = beatsData?.map(beat => ({
        ...beat,
        profiles: profilesData?.find(profile => profile.user_id === beat.user_id) || null
      })) || [];

      setBeats(beatsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching beats:', error);
      setError('Failed to load beats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...beats];

    // Search filter
    if (filters.searchTerm) {
      filtered = filtered.filter(beat => 
        beat.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        beat.genre.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        beat.tags?.some(tag => tag.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        beat.profiles?.full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        beat.profiles?.username?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Time filter
    if (filters.timeFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.timeFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(beat => new Date(beat.created_at) >= startDate);
    }

    // Genre filter
    if (filters.genres.length > 0) {
      filtered = filtered.filter(beat => 
        filters.genres.some(genre => beat.genre.toLowerCase() === genre.toLowerCase())
      );
    }

    // Track Type filter (for now, filter by tags or genre)
    if (filters.trackTypes.length > 0) {
      filtered = filtered.filter(beat => 
        filters.trackTypes.some(type => 
          beat.tags?.some(tag => tag.toLowerCase().includes(type.toLowerCase())) ||
          beat.genre.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // Mood filter (filter by tags or title/description)
    if (filters.moods.length > 0) {
      filtered = filtered.filter(beat => 
        filters.moods.some(mood => 
          beat.tags?.some(tag => tag.toLowerCase().includes(mood.toLowerCase())) ||
          beat.title.toLowerCase().includes(mood.toLowerCase()) ||
          beat.description?.toLowerCase().includes(mood.toLowerCase())
        )
      );
    }

    // Instruments filter (filter by tags)
    if (filters.instruments.length > 0) {
      filtered = filtered.filter(beat => 
        filters.instruments.some(instrument => 
          beat.tags?.some(tag => tag.toLowerCase().includes(instrument.toLowerCase())) ||
          beat.title.toLowerCase().includes(instrument.toLowerCase())
        )
      );
    }

    // Price filter
    if (filters.priceFilter !== 'all') {
      switch (filters.priceFilter) {
        case 'free':
          filtered = filtered.filter(beat => beat.price === 0);
          break;
        case 'premium':
          filtered = filtered.filter(beat => beat.price > 0);
          break;
        case 'under25':
          filtered = filtered.filter(beat => beat.price < 25);
          break;
        case 'under50':
          filtered = filtered.filter(beat => beat.price < 50);
          break;
        case 'over50':
          filtered = filtered.filter(beat => beat.price >= 50);
          break;
      }
    }

    // BPM filter
    filtered = filtered.filter(beat => {
      const bpm = beat.bpm || 0;
      return bpm >= filters.bpmRange[0] && bpm <= filters.bpmRange[1];
    });

    // Key filter
    if (filters.keys.length > 0) {
      filtered = filtered.filter(beat => 
        beat.key && filters.keys.includes(beat.key)
      );
    }

    // Duration filter (mock implementation - would need actual duration data)
    if (filters.duration !== 'any') {
      // For now, just keep all beats since we don't have duration data
      // In a real implementation, you'd filter based on actual audio duration
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'price_low':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'price_high':
          aValue = a.price;
          bValue = b.price;
          return bValue - aValue; // Reverse for high to low
        case 'popular':
          // For now, use price as a proxy for popularity
          aValue = a.price;
          bValue = b.price;
          return bValue - aValue;
        default: // 'recent'
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          return bValue - aValue; // Most recent first
      }

      return aValue > bValue ? 1 : -1;
    });

    setFilteredBeats(filtered);
  };

  const handlePlayBeat = (beat: Beat) => {
    if (!beat.audio_url) return;
    
    // Set up the entire beats collection as the queue first
    const allTracks = filteredBeats.map(b => ({
      id: b.id,
      title: b.title,
      artist: b.uploaded_by_admin ? (b.producer_name || 'Internal Producer') : (b.profiles?.full_name || b.profiles?.username || 'Unknown Artist'),
      src: b.audio_url,
      artwork: b.image_url,
      userId: b.uploaded_by_admin ? null : b.user_id,
      type: 'beat' as const
    })).filter(t => t.src); // Only include beats with audio
    
    // Find the index of the clicked beat in the queue
    const clickedBeatIndex = allTracks.findIndex(t => t.id === beat.id);
    
    // Set queue with the correct starting index
    actions.setQueue(allTracks, clickedBeatIndex >= 0 ? clickedBeatIndex : 0);
    
    // Start playing
    if (clickedBeatIndex >= 0) {
      actions.play(allTracks[clickedBeatIndex]);
    }
  };

  const genres = [...new Set(beats.map(beat => beat.genre))];
  
  // Get trending beats (top 5 by price for demo, could be based on purchases/views)
  const trendingBeats = [...filteredBeats]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);
  
  // Get regular beats (excluding trending)
  const regularBeats = filteredBeats.filter(beat => 
    !trendingBeats.some(trending => trending.id === beat.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                Beat Marketplace
              </h1>
              <p className="text-muted-foreground text-lg">
                Loading exclusive beats...
              </p>
            </div>
            <LoadingSkeleton count={8} variant="card" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Failed to load marketplace</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchBeats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative pb-8 pt-masthead overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{ backgroundImage: 'url(/lovable-uploads/6299467a-f115-4657-9015-ec1f1939e292.png)' }}
        ></div>
        
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Your Next Anthem
            </span>
            <br />
            <span className="text-foreground">Starts Here</span>
          </h1>
          
          {/* Trending Tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['afro', 'bouncy', 'party', 'trap soul', 'finesse', 'UK', 'instrumental', 'emotional', '808 heavy'].map((tag) => (
              <Button
                key={tag}
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, searchTerm: tag }))}
                className="rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/20 border-primary/30 transition-all"
              >
                #{tag}
              </Button>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8 py-4 text-lg rounded-2xl bg-gradient-primary hover:opacity-90 transition-all">
              Browse Beats
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg rounded-2xl border-2 hover:bg-background/20 transition-all">
              Sell Your Beats
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Marketplace Filters - Moved to top */}
          <div className="mb-8">
            <MarketplaceFilters
              onFiltersChange={setFilters}
              availableGenres={genres}
              totalResults={filteredBeats.length}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">All Beats</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Trending Tracks Section */}
          {trendingBeats.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold">Trending Tracks</h2>
                <div className="flex gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <Flame className="w-3 h-3 text-orange-400" />
                  <Flame className="w-2 h-2 text-orange-300" />
                </div>
              </div>
              
              {/* Compact Trending Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {trendingBeats.map((beat) => (
                  <CompactBeatCard
                    key={beat.id}
                    beat={beat}
                    viewMode="grid"
                    isPlaying={currentTrack?.id === beat.id && isPlaying}
                    onPlay={() => handlePlayBeat(beat)}
                    onFavorite={() => toggleFavorite(beat.id)}
                    isFavorited={isFavorited(beat.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Beats Grid/List */}
          {filteredBeats.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No beats found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or browse all beats.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {filteredBeats.map((beat) => (
                    <CompactBeatCard
                      key={beat.id}
                      beat={beat}
                      viewMode="list"
                      isPlaying={currentTrack?.id === beat.id && isPlaying}
                      onPlay={() => handlePlayBeat(beat)}
                      onFavorite={() => toggleFavorite(beat.id)}
                      isFavorited={isFavorited(beat.id)}
                      onShare={() => {}} // TODO: Implement share functionality
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredBeats.map((beat) => (
                    <CompactBeatCard
                      key={beat.id}
                      beat={beat}
                      viewMode="grid"
                      isPlaying={currentTrack?.id === beat.id && isPlaying}
                      onPlay={() => handlePlayBeat(beat)}
                      onFavorite={() => toggleFavorite(beat.id)}
                      isFavorited={isFavorited(beat.id)}
                      onShare={() => {}} // TODO: Implement share functionality
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feature Highlights Section */}
          <div className="mb-16 py-16 relative overflow-hidden rounded-3xl">
            {/* Background Images Collage */}
            <div className="absolute inset-0 grid grid-cols-3 gap-0">
              <div 
                className="bg-cover bg-center opacity-60"
                style={{ backgroundImage: 'url(/lovable-uploads/695d06f7-2a64-4b9c-9cd1-34dd538fc6d9.png)' }}
              ></div>
              <div 
                className="bg-cover bg-center opacity-60"
                style={{ backgroundImage: 'url(/lovable-uploads/392a1a2d-81d9-4106-95aa-a5347c293bc3.png)' }}
              ></div>
              <div 
                className="bg-cover bg-center opacity-60"
                style={{ backgroundImage: 'url(/lovable-uploads/71e3dd35-ce08-4e48-a0c2-a16d8388010c.png)' }}
              ></div>
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/90 to-background/85"></div>
            
            <div className="relative z-10 max-w-6xl mx-auto px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Instant Licensing</h3>
                  <p className="text-muted-foreground text-sm">Secure exclusive or lease rights in seconds</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Chart-Ready Quality</h3>
                  <p className="text-muted-foreground text-sm">Mixed, mastered, and ready for vocals</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Trusted by Artists Worldwide</h3>
                  <p className="text-muted-foreground text-sm">Used on festival stages & streaming hits</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-glow">
                    <ShoppingCart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Earn with Every Play</h3>
                  <p className="text-muted-foreground text-sm">For producers: fast payouts + featured placement</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-12 py-20 relative text-center overflow-hidden rounded-3xl">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: 'url(/lovable-uploads/71e3dd35-ce08-4e48-a0c2-a16d8388010c.png)' }}
            ></div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/70 to-background/90"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto px-8">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Whether you're recording your first mixtape or headlining festivals,<br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">we've got the beat for you.</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Plug in. Build your sound. Break the mold.
              </p>
              <Button size="lg" className="px-12 py-4 text-lg rounded-2xl bg-gradient-primary hover:opacity-90 transition-all shadow-glow">
                Start Building Your Legacy
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Marketplace;