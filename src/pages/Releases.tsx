import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Music, Play, Eye, Heart, Share, Filter } from "lucide-react";
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

  useEffect(() => {
    setMeta(
      "Releases | Music Streaming Platform",
      "Discover the latest releases from talented artists. Stream, purchase, and support independent music.",
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

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="pt-24 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Music className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Releases</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Discover the latest music from independent artists around the world
            </p>
          </div>

          {/* Filters */}
          <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5" />
              <h3 className="font-semibold">Filter & Sort</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                placeholder="Search releases, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="col-span-1 lg:col-span-2"
              />
              
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {genres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
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
            </div>
          </div>

          {/* Featured Releases */}
          {releases.some(r => r.is_featured) && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Featured Releases</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {releases.filter(r => r.is_featured).slice(0, 3).map((release) => (
                  <div key={release.id} className="relative">
                    <ReleaseCard
                      release={release}
                      showBuyButton={true}
                      onPlayRelease={handlePlayRelease}
                    />
                    <Badge className="absolute top-2 left-2 z-10" variant="default">
                      Featured
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Releases */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                All Releases ({filteredReleases.length})
              </h2>
            </div>
            
            {filteredReleases.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No releases found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredReleases.map((release) => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    showBuyButton={true}
                    onPlayRelease={handlePlayRelease}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Releases;