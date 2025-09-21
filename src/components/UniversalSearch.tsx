import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  Music, 
  User, 
  Album,
  Headphones,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'beat' | 'release' | 'artist' | 'user' | 'sample_pack';
  title: string;
  subtitle?: string;
  image_url?: string;
  href: string;
  metadata?: Record<string, any>;
}

interface SearchFilters {
  type: string[];
  genre: string[];
  priceRange: [number, number];
  dateRange: string;
}

export const UniversalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    genre: [],
    priceRange: [0, 1000],
    dateRange: 'all'
  });

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, filters]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search beats
      if (filters.type.length === 0 || filters.type.includes('beat')) {
        const { data: beats } = await supabase
          .from('beats')
          .select('id, title, genre, price, image_url')
          .or(`title.ilike.%${searchQuery}%, genre.ilike.%${searchQuery}%`)
          .eq('is_published', true)
          .limit(10);

        beats?.forEach(beat => {
          searchResults.push({
            id: beat.id,
            type: 'beat',
            title: beat.title,
            subtitle: beat.genre || 'Beat',
            image_url: beat.image_url,
            href: `/marketplace/${beat.id}`,
            metadata: { genre: beat.genre, price: beat.price }
          });
        });
      }

      // Search releases
      if (filters.type.length === 0 || filters.type.includes('release')) {
        const { data: releases } = await supabase
          .from('releases')
          .select('id, title, artist, cover_art_url, genre')
          .or(`title.ilike.%${searchQuery}%, artist.ilike.%${searchQuery}%, genre.ilike.%${searchQuery}%`)
          .limit(10);

        releases?.forEach(release => {
          searchResults.push({
            id: release.id,
            type: 'release',
            title: release.title,
            subtitle: release.artist,
            image_url: release.cover_art_url,
            href: `/releases/${release.id}`,
            metadata: { genre: release.genre }
          });
        });
      }

      // Search users/artists
      if (filters.type.length === 0 || filters.type.includes('user')) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, user_type')
          .or(`full_name.ilike.%${searchQuery}%, username.ilike.%${searchQuery}%`)
          .limit(10);

        profiles?.forEach(profile => {
          searchResults.push({
            id: profile.user_id,
            type: 'user',
            title: profile.full_name || profile.username || 'Unknown User',
            subtitle: profile.user_type || 'User',
            href: `/profile/${profile.user_id}`,
            metadata: { user_type: profile.user_type }
          });
        });
      }

      // Search sample packs
      if (filters.type.length === 0 || filters.type.includes('sample_pack')) {
        const { data: samplePacks } = await supabase
          .from('sample_packs')
          .select('id, title, genre, cover_art_url, price')
          .or(`title.ilike.%${searchQuery}%, genre.ilike.%${searchQuery}%`)
          .limit(10);

        samplePacks?.forEach(pack => {
          searchResults.push({
            id: pack.id,
            type: 'sample_pack',
            title: pack.title,
            subtitle: pack.genre,
            image_url: pack.cover_art_url,
            href: `/sample-pack-store/${pack.id}`,
            metadata: { genre: pack.genre, price: pack.price }
          });
        });
      }

      setResults(searchResults);
      
      // Save to recent searches
      if (searchQuery.length >= 2) {
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'beat':
        return <Music className="w-4 h-4" />;
      case 'release':
        return <Album className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'sample_pack':
        return <Headphones className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'beat':
        return 'text-blue-500';
      case 'release':
        return 'text-green-500';
      case 'user':
        return 'text-purple-500';
      case 'sample_pack':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    // Apply genre filter
    if (filters.genre.length > 0) {
      filtered = filtered.filter(result => 
        filters.genre.some(genre => 
          result.metadata?.genre?.toLowerCase().includes(genre.toLowerCase())
        )
      );
    }

    // Apply price range filter
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
      filtered = filtered.filter(result => {
        const price = result.metadata?.price || 0;
        return price >= filters.priceRange[0] && price <= filters.priceRange[1];
      });
    }

    return filtered;
  }, [results, filters]);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search beats, releases, artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="h-6 w-6"
          >
            <Filter className="h-3 w-3" />
          </Button>
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results or Recent Searches */}
      {(query.length >= 2 || recentSearches.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Loading State */}
            {loading && (
              <div className="p-4 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* Search Results */}
            {!loading && query.length >= 2 && (
              <div>
                {filteredResults.length > 0 ? (
                  <div className="space-y-1">
                    {filteredResults.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        to={result.href}
                        className="block p-3 hover:bg-muted transition-colors"
                        onClick={clearSearch}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("flex-shrink-0", getTypeColor(result.type))}>
                            {getTypeIcon(result.type)}
                          </div>
                          {result.image_url && (
                            <img 
                              src={result.image_url} 
                              alt=""
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                            {result.metadata?.price && (
                              <span className="text-xs text-muted-foreground">
                                ${result.metadata.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for "{query}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Recent Searches */}
            {!loading && query.length < 2 && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="block w-full text-left p-2 text-sm hover:bg-muted rounded transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {!loading && query.length < 2 && (
              <div className="p-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Hip Hop', 'Trap', 'R&B', 'Pop', 'Rock'].map((trend) => (
                    <Badge
                      key={trend}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setQuery(trend)}
                    >
                      {trend}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-40">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Advanced Filters</h4>
            <div className="space-y-4">
              {/* Content Type Filter */}
              <div>
                <label className="text-sm font-medium">Content Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['beat', 'release', 'user', 'sample_pack'].map((type) => (
                    <Badge
                      key={type}
                      variant={filters.type.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          type: prev.type.includes(type)
                            ? prev.type.filter(t => t !== type)
                            : [...prev.type, type]
                        }));
                      }}
                    >
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="text-sm font-medium">Genre</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Hip Hop', 'Trap', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz'].map((genre) => (
                    <Badge
                      key={genre}
                      variant={filters.genre.includes(genre) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          genre: prev.genre.includes(genre)
                            ? prev.genre.filter(g => g !== genre)
                            : [...prev.genre, genre]
                        }));
                      }}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    type: [],
                    genre: [],
                    priceRange: [0, 1000],
                    dateRange: 'all'
                  })}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};