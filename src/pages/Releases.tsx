import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Music, Play, Eye, Heart, Share, Filter, Search, TrendingUp, Flame, Star, Headphones, RotateCcw, Grid3X3, List, Disc3 } from "lucide-react";
import { motion } from "framer-motion";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { setMeta } from "@/lib/seo";
import { ReleaseCard } from "@/components/ReleaseCard";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";

interface Release {
  id: string;
  title: string;
  artist: string;
  description: string;
  genre: string;
  release_type: string;
  release_date: string;
  cover_art_url: string;
  price: number;
  download_price?: number;
  pay_what_you_want?: boolean;
  minimum_price?: number;
  total_plays: number;
  is_premium_content: boolean;
  is_featured: boolean;
  user_id: string;
  preview_url?: string;
  download_url?: string;
}

const Releases = () => {
  const { state, actions } = useGlobalPlayer();
  const [releases, setReleases] = useState<Release[]>([]);
  const [filteredReleases, setFilteredReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMeta(
      "New Music Releases | Pluggd",
      "Discover the latest releases from independent artists. Stream, purchase, and support creators directly.",
      "/releases"
    );
    fetchReleases();
  }, []);

  useEffect(() => {
    filterAndSortReleases();
  }, [releases, searchQuery, selectedGenre, selectedType, sortBy]);

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('approved', true)
        .eq('status', 'live')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortReleases = () => {
    let filtered = [...releases];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(release =>
        release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        release.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        release.genre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Genre filter
    if (selectedGenre !== "all") {
      filtered = filtered.filter(release => release.genre === selectedGenre);
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(release => release.release_type === selectedType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        case "oldest":
          return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
        case "most_played":
          return b.total_plays - a.total_plays;
        case "title":
          return a.title.localeCompare(b.title);
        case "artist":
          return a.artist.localeCompare(b.artist);
        default:
          return 0;
      }
    });

    setFilteredReleases(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPlays = (plays: number) => {
    if (plays >= 1000000) {
      return `${(plays / 1000000).toFixed(1)}M`;
    } else if (plays >= 1000) {
      return `${(plays / 1000).toFixed(1)}K`;
    }
    return plays.toString();
  };

  const handlePlayRelease = (release: Release) => {
    const audioSrc = release.download_url || release.preview_url;
    if (!audioSrc) return;
    
    // Set up the entire releases collection as the queue first
    const allTracks = filteredReleases.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      src: r.download_url || r.preview_url,
      artwork: r.cover_art_url,
      releaseId: r.id,
      userId: r.user_id,
      type: 'release' as const,
      price: r.price
    })).filter(t => t.src); // Only include releases with audio URLs
    
    // Find the index of the clicked release in the queue
    const clickedReleaseIndex = allTracks.findIndex(t => t.id === release.id);
    
    if (clickedReleaseIndex >= 0) {
      // Start playing the selected track with the full queue
      actions.play(allTracks[clickedReleaseIndex], allTracks, clickedReleaseIndex);
    }
  };

  const genres = [...new Set(releases.map(r => r.genre).filter(Boolean))];
  const types = [...new Set(releases.map(r => r.release_type))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
        <main className="pt-24 px-4">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-96" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Get featured and trending releases
  const featuredReleases = releases.filter(r => r.is_featured).slice(0, 4);
  const trendingReleases = [...releases]
    .sort((a, b) => b.total_plays - a.total_plays)
    .slice(0, 6);
  const newReleases = [...releases]
    .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
    .slice(0, 8);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenre("all");
    setSelectedType("all");
    setSortBy("newest");
  };

  const hasActiveFilters = searchQuery || selectedGenre !== "all" || selectedType !== "all";

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      
      {/* Hero Section */}
      <div className="relative pt-masthead pb-12 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Disc3 className="w-3 h-3 mr-1" />
              Fresh drops daily
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Discover <span className="text-primary">New Music</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Stream and purchase the latest releases from independent artists. 
              Support creators directly and own the music you love.
            </p>
            
            {/* Quick Genre Tags */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['All', 'Hip-Hop', 'R&B', 'Afrobeats', 'Pop', 'Electronic', 'Drill'].map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre || (genre === 'All' && selectedGenre === 'all') ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGenre(genre === 'All' ? 'all' : genre)}
                  className="rounded-full transition-all"
                >
                  {genre}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 pb-12">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Search & Filters Bar */}
          <div className="sticky top-16 z-30 -mx-4 px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search releases, artists, genres..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/50 border-border/50 focus:bg-background"
                  />
                </div>
                
                {/* Filters */}
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="w-[130px] bg-muted/50">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {genres.map(genre => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[120px] bg-muted/50">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="most_played">Most Played</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                    <SelectItem value="artist">Artist A-Z</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}

                {/* View Toggle */}
                <div className="ml-auto flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-7 w-7 p-0"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-7 w-7 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                
                <span className="text-sm text-muted-foreground">
                  {filteredReleases.length} releases
                </span>
              </div>
            </div>
          </div>

          {/* Featured Releases - Hero Banner Style */}
          {featuredReleases.length > 0 && !hasActiveFilters && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-primary to-amber-500 rounded-xl">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Featured Releases</h2>
                <Badge variant="secondary" className="ml-2">Editor's Pick</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredReleases.map((release, idx) => (
                  <motion.div 
                    key={release.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300" />
                    <div className="relative">
                      <ReleaseCard
                        release={release}
                        showBuyButton={true}
                        onPlayRelease={handlePlayRelease}
                      />
                    </div>
                    <Badge className="absolute top-3 left-3 z-10 bg-gradient-to-r from-primary to-amber-500 border-0 shadow-lg">
                      ⭐ Featured
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Trending Now */}
          {trendingReleases.length > 0 && !hasActiveFilters && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Trending Now</h2>
                <div className="flex gap-0.5 ml-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <Flame className="w-3 h-3 text-orange-400" />
                  <Flame className="w-2 h-2 text-orange-300" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {trendingReleases.map((release, idx) => (
                  <motion.div 
                    key={release.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative"
                  >
                    <ReleaseCard
                      release={release}
                      showBuyButton={true}
                      onPlayRelease={handlePlayRelease}
                    />
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
                      <Headphones className="w-3 h-3" />
                      {formatPlays(release.total_plays)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* New This Week */}
          {newReleases.length > 0 && !hasActiveFilters && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">New This Week</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {newReleases.map((release, idx) => (
                  <motion.div 
                    key={release.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <ReleaseCard
                      release={release}
                      showBuyButton={false}
                      onPlayRelease={handlePlayRelease}
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* All Releases */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-xl">
                  <Music className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold">
                  {hasActiveFilters ? 'Search Results' : 'All Releases'}
                </h2>
                <span className="text-muted-foreground">({filteredReleases.length})</span>
              </div>
            </div>
            
            {filteredReleases.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 bg-muted/20">
                <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">No releases found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  We couldn't find any releases matching your criteria. Try adjusting your filters or search terms.
                </p>
                <Button onClick={clearFilters} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "space-y-3"
              }>
                {filteredReleases.map((release, idx) => (
                  <motion.div
                    key={release.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  >
                    <ReleaseCard
                      release={release}
                      showBuyButton={true}
                      onPlayRelease={handlePlayRelease}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* CTA Section */}
          {!hasActiveFilters && (
            <section className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-purple-900/10 p-10 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.15),transparent_50%)]" />
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Got music to share?</h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Upload your releases, set your prices, and earn directly from your fans. No middlemen, no waiting.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-amber-500" asChild>
                    <Link to="/studio">Upload Your Music →</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/signup?intent=create">Create Account</Link>
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Releases;