import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Music, Users, Disc, Filter, Play, Pause, Heart, Share2, TrendingUp, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setMeta } from "@/lib/seo";
import { Link } from "react-router-dom";
import { 
  MusicFilters, 
  BeatsFilters, 
  CreatorsFilters, 
  DiscoveryPanel, 
  CollaborationsCarousel, 
  RecommendationBands 
} from "@/components/search";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";

interface SearchResults {
  creators: any[];
  releases: any[];
  beats: any[];
}

interface SearchFilters {
  music: {
    genre: string;
    priceRange: [number, number];
    format: string;
  };
  beats: {
    genre: string;
    bpmRange: [number, number];
    key: string;
    priceRange: [number, number];
    licenseType: string;
  };
  creators: {
    genre: string;
    type: string;
    verified: boolean;
  };
}

type FilterTab = keyof SearchFilters;

const DEFAULT_FILTERS: SearchFilters = {
  music: {
    genre: 'all',
    priceRange: [0, 100],
    format: 'all'
  },
  beats: {
    genre: 'all',
    bpmRange: [60, 180],
    key: 'all',
    priceRange: [0, 100],
    licenseType: 'all'
  },
  creators: {
    genre: 'all',
    type: 'all',
    verified: false
  }
};

const createDefaultFilters = (): SearchFilters => ({
  music: {
    ...DEFAULT_FILTERS.music,
    priceRange: [...DEFAULT_FILTERS.music.priceRange] as [number, number],
  },
  beats: {
    ...DEFAULT_FILTERS.beats,
    bpmRange: [...DEFAULT_FILTERS.beats.bpmRange] as [number, number],
    priceRange: [...DEFAULT_FILTERS.beats.priceRange] as [number, number],
  },
  creators: { ...DEFAULT_FILTERS.creators },
});

const PAGE_SIZE = 12;

const SORT_OPTIONS: Record<FilterTab, { value: string; label: string }[]> = {
  music: [
    { value: "trending", label: "Trending" },
    { value: "new", label: "Newest" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
  ],
  beats: [
    { value: "trending", label: "Trending" },
    { value: "new", label: "Newest" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "bpm_low", label: "BPM: Low to High" },
    { value: "bpm_high", label: "BPM: High to Low" },
  ],
  creators: [
    { value: "recommended", label: "Recommended" },
    { value: "new", label: "Newest" },
    { value: "name", label: "Name A-Z" },
  ],
};

const DEFAULT_SORTS: Record<FilterTab, string> = {
  music: "trending",
  beats: "trending",
  creators: "recommended",
};

const parseNumber = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const filtersAreEqual = (a: SearchFilters, b: SearchFilters) => JSON.stringify(a) === JSON.stringify(b);

export const SearchPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as FilterTab) || 'music';
  const initialSortParam = searchParams.get('sort');
  const allowedInitialSort = initialSortParam && SORT_OPTIONS[initialTab].some((option) => option.value === initialSortParam)
    ? initialSortParam
    : DEFAULT_SORTS[initialTab];
  const initialPageParam = Number(searchParams.get('page') ?? '1');
  const initialPage = Number.isFinite(initialPageParam) && initialPageParam > 0 ? initialPageParam : 1;

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResults>({
    creators: [],
    releases: [],
    beats: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(createDefaultFilters);
  const [sort, setSort] = useState<string>(allowedInitialSort);
  const [page, setPage] = useState<number>(initialPage);
  const [hasMore, setHasMore] = useState({ music: false, beats: false, creators: false });
  const [resultCounts, setResultCounts] = useState({ music: 0, beats: 0, creators: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  useEffect(() => {
    setMeta(
      query ? `Search results for "${query}" — Pluggd` : "Search — Pluggd",
      query ? `Find creators, releases, and beats matching "${query}"` : "Search for creators, releases, and beats on Pluggd",
      "/search"
    );
  }, [query]);

  // Search context preservation
  const preserveSearchContext = useCallback(() => {
    return new URLSearchParams(searchParams).toString();
  }, [searchParams]);

  useEffect(() => {
    const queryParam = searchParams.get('q');
    const tabParam = (searchParams.get('tab') as FilterTab) || 'music';
    const sortParam = searchParams.get('sort');
    const pageParamValue = Number(searchParams.get('page') ?? '1');
    const nextPage = Number.isFinite(pageParamValue) && pageParamValue > 0 ? pageParamValue : 1;

    if (tabParam !== activeTab) {
      setActiveTab(tabParam);
    }

    const nextSort = sortParam && SORT_OPTIONS[tabParam].some((option) => option.value === sortParam)
      ? sortParam
      : DEFAULT_SORTS[tabParam];
    if (nextSort !== sort) {
      setSort(nextSort);
    }

    if (nextPage !== page) {
      setPage(nextPage);
    }

    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
      performSearch(queryParam, { tab: tabParam, page: nextPage, sort: nextSort });
    }

    setFilters((prev) => {
      const next: SearchFilters = {
        music: {
          genre: searchParams.get('musicGenre') || DEFAULT_FILTERS.music.genre,
          priceRange: [
            parseNumber(searchParams.get('musicPriceMin'), DEFAULT_FILTERS.music.priceRange[0]),
            parseNumber(searchParams.get('musicPriceMax'), DEFAULT_FILTERS.music.priceRange[1])
          ],
          format: searchParams.get('musicFormat') || DEFAULT_FILTERS.music.format
        },
        beats: {
          genre: searchParams.get('beatsGenre') || DEFAULT_FILTERS.beats.genre,
          bpmRange: [
            parseNumber(searchParams.get('beatsBpmMin'), DEFAULT_FILTERS.beats.bpmRange[0]),
            parseNumber(searchParams.get('beatsBpmMax'), DEFAULT_FILTERS.beats.bpmRange[1])
          ],
          key: searchParams.get('beatsKey') || DEFAULT_FILTERS.beats.key,
          priceRange: [
            parseNumber(searchParams.get('beatsPriceMin'), DEFAULT_FILTERS.beats.priceRange[0]),
            parseNumber(searchParams.get('beatsPriceMax'), DEFAULT_FILTERS.beats.priceRange[1])
          ],
          licenseType: searchParams.get('beatsLicense') || DEFAULT_FILTERS.beats.licenseType
        },
        creators: {
          genre: searchParams.get('creatorsGenre') || DEFAULT_FILTERS.creators.genre,
          type: searchParams.get('creatorsType') || DEFAULT_FILTERS.creators.type,
          verified: searchParams.get('creatorsVerified')
            ? searchParams.get('creatorsVerified') === 'true'
            : DEFAULT_FILTERS.creators.verified
        }
      };

      return filtersAreEqual(prev, next) ? prev : next;
    });
  }, [searchParams, activeTab, page, performSearch, query, sort]);

  const fetchReleases = async (
    searchQuery: string,
    musicFilters: SearchFilters["music"],
    pageNumber: number,
    sortOption: string,
  ) => {
    let query = supabase
      .from('releases')
      .select('id,title,artist,genre,cover_art_url,preview_url,price,total_plays,created_at', { count: 'exact' })
      .eq('status', 'live')
      .eq('approved', true)
      .or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (musicFilters.genre !== 'all') {
      query = query.eq('genre', musicFilters.genre);
    }

    const [minPrice, maxPrice] = musicFilters.priceRange;
    if (minPrice > 0) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice < 100) {
      query = query.lte('price', maxPrice);
    }

    switch (sortOption) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_low':
        query = query.order('price', { ascending: true, nullsFirst: false });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false, nullsFirst: true });
        break;
      case 'trending':
      default:
        query = query.order('total_plays', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false });
        break;
    }

    const from = (pageNumber - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return {
      data: data ?? [],
      count: count ?? (data?.length ?? 0),
    };
  };

  const fetchBeats = async (
    searchQuery: string,
    beatFilters: SearchFilters['beats'],
    pageNumber: number,
    sortOption: string,
  ) => {
    let query = supabase
      .from('beats')
      .select('id,title,producer_name,genre,price,image_url,audio_url,bpm,key,created_at,is_featured', { count: 'exact' })
      .eq('is_published', true)
      .or(`title.ilike.%${searchQuery}%,producer_name.ilike.%${searchQuery}%,genre.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (beatFilters.genre !== 'all') {
      query = query.eq('genre', beatFilters.genre);
    }
    if (beatFilters.key !== 'all') {
      query = query.eq('key', beatFilters.key);
    }

    const [minBpm, maxBpm] = beatFilters.bpmRange;
    if (minBpm > 0) {
      query = query.gte('bpm', minBpm);
    }
    if (maxBpm < 999) {
      query = query.lte('bpm', maxBpm);
    }

    const [minPrice, maxPrice] = beatFilters.priceRange;
    if (minPrice > 0) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice < 100) {
      query = query.lte('price', maxPrice);
    }

    switch (sortOption) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_low':
        query = query.order('price', { ascending: true, nullsFirst: false });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false, nullsFirst: true });
        break;
      case 'bpm_low':
        query = query.order('bpm', { ascending: true, nullsFirst: false });
        break;
      case 'bpm_high':
        query = query.order('bpm', { ascending: false, nullsFirst: true });
        break;
      case 'trending':
      default:
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    const from = (pageNumber - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return {
      data: data ?? [],
      count: count ?? (data?.length ?? 0),
    };
  };

  const fetchCreators = async (
    searchQuery: string,
    creatorFilters: SearchFilters['creators'],
    pageNumber: number,
    sortOption: string,
  ) => {
    let query = supabase
      .from('profiles')
      .select('user_id, username, full_name, bio, avatar_url, is_verified, created_at', { count: 'exact' })
      .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);

    if (creatorFilters.verified) {
      query = query.eq('is_verified', true);
    }

    switch (sortOption) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'name':
        query = query.order('full_name', { ascending: true, nullsFirst: false });
        break;
      case 'recommended':
      default:
        query = query.order('is_verified', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    const from = (pageNumber - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return {
      data: data ?? [],
      count: count ?? (data?.length ?? 0),
    };
  };

  const performSearch = useCallback(
    async (rawQuery: string, options?: { page?: number; sort?: string; tab?: FilterTab; filtersOverride?: SearchFilters }) => {
      const trimmed = rawQuery.trim();
      if (!trimmed) {
        setResults({ creators: [], releases: [], beats: [] });
        setResultCounts({ music: 0, beats: 0, creators: 0 });
        setHasMore({ music: false, beats: false, creators: false });
        return;
      }

      setLoading(true);

      const effectiveTab = options?.tab ?? activeTab;
      const effectiveFilters = options?.filtersOverride ?? filters;
      const pageByTab: Record<FilterTab, number> = {
        music: effectiveTab === "music" ? options?.page ?? page : 1,
        beats: effectiveTab === "beats" ? options?.page ?? page : 1,
        creators: effectiveTab === "creators" ? options?.page ?? page : 1,
      };

      const sortByTab: Record<FilterTab, string> = {
        music: effectiveTab === "music" ? options?.sort ?? sort : DEFAULT_SORTS.music,
        beats: effectiveTab === "beats" ? options?.sort ?? sort : DEFAULT_SORTS.beats,
        creators: effectiveTab === "creators" ? options?.sort ?? sort : DEFAULT_SORTS.creators,
      };

      try {
        const [releaseResult, beatResult, creatorResult] = await Promise.all([
          fetchReleases(trimmed, effectiveFilters.music, pageByTab.music, sortByTab.music),
          fetchBeats(trimmed, effectiveFilters.beats, pageByTab.beats, sortByTab.beats),
          fetchCreators(trimmed, effectiveFilters.creators, pageByTab.creators, sortByTab.creators),
        ]);

        setResults({
          releases: releaseResult.data,
          beats: beatResult.data,
          creators: creatorResult.data,
        });

        setResultCounts({
          music: releaseResult.count,
          beats: beatResult.count,
          creators: creatorResult.count,
        });

        setHasMore({
          music: releaseResult.count > pageByTab.music * PAGE_SIZE,
          beats: beatResult.count > pageByTab.beats * PAGE_SIZE,
          creators: creatorResult.count > pageByTab.creators * PAGE_SIZE,
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, filters, page, sort],
  );

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (value !== DEFAULT_SORTS[activeTab]) {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    setSearchParams(params, { replace: true });

    if (query.trim()) {
      performSearch(query.trim(), { sort: value, page: 1, tab: activeTab });
    }
  };

  const changePage = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) {
      params.set('page', String(newPage));
    } else {
      params.delete('page');
    }
    setSearchParams(params, { replace: true });

    if (query.trim()) {
      performSearch(query.trim(), { page: newPage, tab: activeTab });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams(searchParams);
      params.set('q', query.trim());
      params.delete('page');
      const defaultSort = DEFAULT_SORTS[activeTab];
      if (sort !== defaultSort) {
        params.set('sort', sort);
      } else {
        params.delete('sort');
      }
      setSearchParams(params);
      setPage(1);
      performSearch(query.trim(), { page: 1 });
    }
  };

  const handleTabChange = (tab: string) => {
    const tabValue = tab as FilterTab;
    setActiveTab(tabValue);
    const defaultSort = DEFAULT_SORTS[tabValue];
    setSort(defaultSort);
    setPage(1);

    const params = new URLSearchParams(searchParams);
    if (tabValue !== 'music') {
      params.set('tab', tabValue);
    } else {
      params.delete('tab');
    }
    params.delete('page');
    params.delete('sort');
    setSearchParams(params, { replace: true });

    if (query.trim()) {
      performSearch(query.trim(), { tab: tabValue, page: 1, sort: defaultSort });
    }
  };

  const updateFilterParams = useCallback((tabName: FilterTab, tabFilters: any) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    if (tabName === 'music') {
      const defaults = DEFAULT_FILTERS.music;
      if (tabFilters.genre && tabFilters.genre !== defaults.genre) {
        params.set('musicGenre', tabFilters.genre);
      } else {
        params.delete('musicGenre');
      }

      const [minPrice, maxPrice] = tabFilters.priceRange || defaults.priceRange;
      if (minPrice !== defaults.priceRange[0]) {
        params.set('musicPriceMin', String(minPrice));
      } else {
        params.delete('musicPriceMin');
      }
      if (maxPrice !== defaults.priceRange[1]) {
        params.set('musicPriceMax', String(maxPrice));
      } else {
        params.delete('musicPriceMax');
      }

      if (tabFilters.format && tabFilters.format !== defaults.format) {
        params.set('musicFormat', tabFilters.format);
      } else {
        params.delete('musicFormat');
      }
    }

    if (tabName === 'beats') {
      const defaults = DEFAULT_FILTERS.beats;
      if (tabFilters.genre && tabFilters.genre !== defaults.genre) {
        params.set('beatsGenre', tabFilters.genre);
      } else {
        params.delete('beatsGenre');
      }

      const [minBpm, maxBpm] = tabFilters.bpmRange || defaults.bpmRange;
      if (minBpm !== defaults.bpmRange[0]) {
        params.set('beatsBpmMin', String(minBpm));
      } else {
        params.delete('beatsBpmMin');
      }
      if (maxBpm !== defaults.bpmRange[1]) {
        params.set('beatsBpmMax', String(maxBpm));
      } else {
        params.delete('beatsBpmMax');
      }

      if (tabFilters.key && tabFilters.key !== defaults.key) {
        params.set('beatsKey', tabFilters.key);
      } else {
        params.delete('beatsKey');
      }

      const [minPrice, maxPrice] = tabFilters.priceRange || defaults.priceRange;
      if (minPrice !== defaults.priceRange[0]) {
        params.set('beatsPriceMin', String(minPrice));
      } else {
        params.delete('beatsPriceMin');
      }
      if (maxPrice !== defaults.priceRange[1]) {
        params.set('beatsPriceMax', String(maxPrice));
      } else {
        params.delete('beatsPriceMax');
      }

      if (tabFilters.licenseType && tabFilters.licenseType !== defaults.licenseType) {
        params.set('beatsLicense', tabFilters.licenseType);
      } else {
        params.delete('beatsLicense');
      }
    }

    if (tabName === 'creators') {
      const defaults = DEFAULT_FILTERS.creators;
      if (tabFilters.genre && tabFilters.genre !== defaults.genre) {
        params.set('creatorsGenre', tabFilters.genre);
      } else {
        params.delete('creatorsGenre');
      }

      if (tabFilters.type && tabFilters.type !== defaults.type) {
        params.set('creatorsType', tabFilters.type);
      } else {
        params.delete('creatorsType');
      }

      if (typeof tabFilters.verified === 'boolean') {
        if (tabFilters.verified !== defaults.verified) {
          params.set('creatorsVerified', tabFilters.verified ? 'true' : 'false');
        } else {
          params.delete('creatorsVerified');
        }
      }
    }

    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleFiltersChange = (tabFilters: any, tabName: FilterTab) => {
    const nextFilters: SearchFilters = {
      music: tabName === 'music' ? tabFilters : filters.music,
      beats: tabName === 'beats' ? tabFilters : filters.beats,
      creators: tabName === 'creators' ? tabFilters : filters.creators,
    };

    setFilters(nextFilters);
    setPage(1);
    updateFilterParams(tabName, tabFilters);
    if (query.trim()) {
      performSearch(query.trim(), { tab: tabName, page: 1, filtersOverride: nextFilters });
    }
  };

  const totalResults = resultCounts.creators + resultCounts.music + resultCounts.beats;

  const currentResults = useMemo(() => {
    if (!query.trim()) return [];
    if (activeTab === 'beats') {
      return results.beats.map((beat, index) => ({ id: beat.id, elementId: `search-result-beat-${index}` }));
    }
    if (activeTab === 'creators') {
      return results.creators.map((creator, index) => ({ id: creator.user_id || creator.username || `creator-${index}`, elementId: `search-result-creator-${index}` }));
    }
    return results.releases.map((release, index) => ({ id: release.id, elementId: `search-result-music-${index}` }));
  }, [activeTab, query, results]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHighlightedIndex(null);
      setLoading(false);
      setResults({ creators: [], releases: [], beats: [] });
      return;
    }

    const handler = window.setTimeout(() => {
      setPage(1);
      performSearch(trimmed, { page: 1, tab: activeTab, sort });
    }, 300);

    return () => window.clearTimeout(handler);
  }, [query, performSearch, activeTab, sort]);

  useEffect(() => {
    setHighlightedIndex(null);
  }, [activeTab, currentResults.length]);

  useEffect(() => {
    if (highlightedIndex === null) return;
    const target = currentResults[highlightedIndex];
    if (!target) return;
    const el = document.getElementById(target.elementId);
    el?.focus();
  }, [highlightedIndex, currentResults]);

const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (!currentResults.length) return;

  if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev === null) return 0;
        return (prev + 1) % currentResults.length;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev === null) return currentResults.length - 1;
        return (prev - 1 + currentResults.length) % currentResults.length;
      });
    } else if (event.key === 'Enter' && highlightedIndex !== null) {
      event.preventDefault();
      const target = currentResults[highlightedIndex];
      const el = document.getElementById(target.elementId);
      if (el) {
        const actionable = el.querySelector('a,button');
        if (actionable instanceof HTMLElement) {
          actionable.click();
        } else if (el instanceof HTMLElement) {
          el.click();
        }
      }
    } else if (event.key === 'Escape') {
      setHighlightedIndex(null);
  }
};

return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Discover on Pluggd
          </h1>
          <p className="text-lg text-muted-foreground">
            Find music, beats, and creators that inspire your creativity
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-6 h-6" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search for music, beats, artists, and more..."
                className="pl-12 pr-20 h-14 text-lg border-2 focus:border-primary transition-colors"
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>
        </div>

        {/* Discovery Panel - Show when no search query */}
        {!query && <DiscoveryPanel />}

        {/* Collaborations Carousel - Show when no search or in creators tab */}
        {(!query || activeTab === 'creators') && <CollaborationsCarousel />}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-muted-foreground">Searching...</p>
          </div>
        )}

        {/* Results */}
        {!loading && query && (
          <div className="space-y-6">
            {/* Results Summary and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-lg">
                  {totalResults === 0 
                    ? <span className="text-muted-foreground">No results found for <span className="font-semibold text-foreground">"${query}"</span></span>
                    : <span className="text-muted-foreground">Found <span className="font-bold text-foreground">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for <span className="font-semibold text-foreground">"${query}"</span></span>
                  }
                </p>
              </div>
              
              {totalResults > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="self-start sm:self-center"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              )}
            </div>

            {totalResults > 0 && (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Filters Sidebar */}
                <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                  <div className="sticky top-4 space-y-4">
                    {activeTab === 'music' && (
                      <MusicFilters 
                        filters={filters.music}
                        onFiltersChange={(newFilters) => handleFiltersChange(newFilters, 'music')}
                      />
                    )}
                    {activeTab === 'beats' && (
                      <BeatsFilters 
                        filters={filters.beats}
                        onFiltersChange={(newFilters) => handleFiltersChange(newFilters, 'beats')}
                      />
                    )}
                    {activeTab === 'creators' && (
                      <CreatorsFilters 
                        filters={filters.creators}
                        onFiltersChange={(newFilters) => handleFiltersChange(newFilters, 'creators')}
                      />
                    )}
                    
                    {/* Recommendation Bands */}
                    <RecommendationBands userId={user?.id} activeTab={activeTab} />
                  </div>
                </div>
                
                {/* Main Content */}
                <div className="flex-1">
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="music" className="text-sm sm:text-base">
                        <Music className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Music</span>
                        <span className="sm:hidden">Music</span>
                        <span className="ml-1 sm:ml-2">({resultCounts.music})</span>
                      </TabsTrigger>
                      <TabsTrigger value="beats" className="text-sm sm:text-base">
                        <Disc className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Beats</span>
                        <span className="sm:hidden">Beats</span>
                        <span className="ml-1 sm:ml-2">({resultCounts.beats})</span>
                      </TabsTrigger>
                      <TabsTrigger value="creators" className="text-sm sm:text-base">
                        <Users className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Creators</span>
                        <span className="sm:hidden">Creators</span>
                        <span className="ml-1 sm:ml-2">({resultCounts.creators})</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="music" className="space-y-4">
                      {activeTab === 'music' && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by</span>
                            <Select value={sort} onValueChange={handleSortChange}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sort releases" />
                              </SelectTrigger>
                              <SelectContent>
                                {SORT_OPTIONS.music.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <PaginationControls
                            currentPage={page}
                            total={resultCounts.music}
                            pageItems={results.releases.length}
                            hasPrev={page > 1}
                            hasNext={hasMore.music}
                            onPrev={() => changePage(page - 1)}
                            onNext={() => changePage(page + 1)}
                          />
                        </div>
                      )}
                      {results.releases.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                          {results.releases.map((release, index) => (
                            <EnhancedReleaseCard
                              key={release.id}
                              release={release}
                              searchContext={preserveSearchContext()}
                              elementId={`search-result-music-${index}`}
                              isHighlighted={highlightedIndex === index && activeTab === 'music'}
                              onHover={() => setHighlightedIndex(index)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No music found</h3>
                          <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="beats" className="space-y-4">
                      {activeTab === 'beats' && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by</span>
                            <Select value={sort} onValueChange={handleSortChange}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sort beats" />
                              </SelectTrigger>
                              <SelectContent>
                                {SORT_OPTIONS.beats.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <PaginationControls
                            currentPage={page}
                            total={resultCounts.beats}
                            pageItems={results.beats.length}
                            hasPrev={page > 1}
                            hasNext={hasMore.beats}
                            onPrev={() => changePage(page - 1)}
                            onNext={() => changePage(page + 1)}
                          />
                        </div>
                      )}
                      {results.beats.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                          {results.beats.map((beat, index) => (
                            <EnhancedBeatCard
                              key={beat.id}
                              beat={beat}
                              searchContext={preserveSearchContext()}
                              elementId={`search-result-beat-${index}`}
                              isHighlighted={highlightedIndex === index && activeTab === 'beats'}
                              onHover={() => setHighlightedIndex(index)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Disc className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No beats found</h3>
                          <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="creators" className="space-y-4">
                      {activeTab === 'creators' && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by</span>
                            <Select value={sort} onValueChange={handleSortChange}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sort creators" />
                              </SelectTrigger>
                              <SelectContent>
                                {SORT_OPTIONS.creators.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <PaginationControls
                            currentPage={page}
                            total={resultCounts.creators}
                            pageItems={results.creators.length}
                            hasPrev={page > 1}
                            hasNext={hasMore.creators}
                            onPrev={() => changePage(page - 1)}
                            onNext={() => changePage(page + 1)}
                          />
                        </div>
                      )}
                      {results.creators.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                          {results.creators.map((creator, index) => (
                            <EnhancedCreatorCard
                              key={creator.user_id}
                              creator={creator}
                              searchContext={preserveSearchContext()}
                              elementId={`search-result-creator-${index}`}
                              isHighlighted={highlightedIndex === index && activeTab === 'creators'}
                              onHover={() => setHighlightedIndex(index)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No creators found</h3>
                          <p className="text-muted-foreground">Try adjusting your search or filters</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State - Replaced by Discovery Panel and Collaborations Carousel */}
      </div>
    </div>
  );
};

// Enhanced component for creator results
const EnhancedCreatorCard = ({
  creator,
  searchContext,
  elementId,
  isHighlighted,
  onHover,
}: {
  creator: any;
  searchContext: string;
  elementId: string;
  isHighlighted: boolean;
  onHover: () => void;
}) => (
  <Card
    id={elementId}
    tabIndex={0}
    onMouseEnter={onHover}
    className={`group hover:shadow-lg transition-all duration-300 border-2 ${
      isHighlighted ? 'border-primary ring-2 ring-primary/50' : 'hover:border-primary/20'
    }`}
  >
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <img
            src={creator.avatar_url || '/placeholder.svg'}
            alt={creator.full_name || creator.username}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-background group-hover:ring-primary/20 transition-all"
          />
          {creator.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">✓</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
              {creator.full_name || creator.username}
            </h4>
            {creator.is_verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
          </div>
          {creator.username && creator.full_name && (
            <p className="text-sm text-muted-foreground mb-2">@{creator.username}</p>
          )}
          {creator.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {creator.bio}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="default" size="sm" className="group-hover:shadow-md transition-all">
            <Link to={`/profile/${creator.username || creator.user_id}?${searchContext}`}>
              View Profile
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Heart className="w-4 h-4 mr-1" />
            Follow
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Enhanced component for release results
interface PaginationControlsProps {
  currentPage: number;
  total: number;
  pageItems: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const PaginationControls = ({ currentPage, total, pageItems, hasPrev, hasNext, onPrev, onNext }: PaginationControlsProps) => {
  const start = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = total === 0 ? 0 : Math.min(start + pageItems - 1, total);

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      {total > 0 && (
        <span>
          {start}-{end} of {total}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!hasPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />Prev
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
          Next<ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const EnhancedReleaseCard = ({
  release,
  searchContext,
  elementId,
  isHighlighted,
  onHover,
}: {
  release: any;
  searchContext: string;
  elementId: string;
  isHighlighted: boolean;
  onHover: () => void;
}) => {
  const { state, actions } = useGlobalPlayer();
  const isTrending = release.total_plays > 1000;
  const isCurrentTrack = state.currentTrack?.id === release.id;
  const playing = isCurrentTrack && state.isPlaying;

  const handlePlayClick = () => {
    if (release.preview_url || release.audio_url) {
      if (isCurrentTrack) {
        if (playing) {
          actions.pause();
        } else {
          actions.resume();
        }
      } else {
        actions.play({
          id: release.id,
          title: release.title,
          artist: release.artist,
          src: release.preview_url || release.audio_url,
          artwork: release.cover_art_url,
          type: 'release',
          releaseId: release.id,
          price: release.price,
        });
      }
    }
  };

  return (
    <Card
      id={elementId}
      tabIndex={0}
      onMouseEnter={onHover}
      className={`group hover:shadow-lg transition-all duration-300 border-2 ${
        isHighlighted ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary/20'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <img
              src={release.cover_art_url || '/placeholder.svg'}
              alt={`${release.title} cover`}
              className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform shadow-md"
            />
            {isTrending && (
              <div className="absolute -top-2 -right-2">
                <Badge variant="default" className="bg-gradient-to-r from-pink-500 to-orange-500 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />Hot
                </Badge>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg mb-1 truncate group-hover:text-primary transition-colors">{release.title}</h4>
            <p className="text-muted-foreground mb-2">{release.artist}</p>
            <div className="flex items-center gap-2 mb-2">
              {release.genre && (
                <Badge variant="secondary" className="text-xs">{release.genre}</Badge>
              )}
              {release.total_plays && (
                <Badge variant="outline" className="text-xs">{release.total_plays.toLocaleString()} plays</Badge>
              )}
            </div>
            {release.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{release.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {release.price !== undefined && (
              <div className="text-right">
                <p className="font-bold text-lg">
                  {release.price === 0 ? (
                    <span className="text-green-500">Free</span>
                  ) : (
                    <span>£{release.price.toFixed(2)}</span>
                  )}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              {(release.preview_url || release.audio_url) && (
                <Button variant="outline" size="sm" onClick={handlePlayClick}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button asChild variant="default" size="sm" className="group-hover:shadow-md transition-all">
                <Link to={`/release/${release.id}?${searchContext}`}>
                  View
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced component for beat results
const EnhancedBeatCard = ({
  beat,
  searchContext,
  elementId,
  isHighlighted,
  onHover,
}: {
  beat: any;
  searchContext: string;
  elementId: string;
  isHighlighted: boolean;
  onHover: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const { state, actions } = useGlobalPlayer();
  const isTrending = new Date(beat.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const isCurrentTrack = state.currentTrack?.id === beat.id;
  const playing = isCurrentTrack && state.isPlaying;

  const handlePlayClick = () => {
    if (beat.audio_url || beat.preview_url) {
      if (isCurrentTrack) {
        if (playing) {
          actions.pause();
        } else {
          actions.resume();
        }
      } else {
        actions.play({
          id: beat.id,
          title: beat.title,
          artist: beat.producer_name || beat.artist,
          src: beat.audio_url || beat.preview_url,
          artwork: beat.image_url,
          type: 'beat',
          price: beat.price,
        });
      }
    }
  };

  return (
    <Card
      id={elementId}
      tabIndex={0}
      className={`group border-2 transition-all overflow-hidden ${
        isHighlighted ? 'border-primary ring-2 ring-primary/40' : 'hover:border-primary/20'
      }`}
      onMouseEnter={() => {
        setHovered(true);
        onHover();
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            {beat.image_url ? (
              <img
                src={beat.image_url}
                alt={beat.title}
                className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform shadow-md"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <Disc className="w-8 h-8 text-white" />
              </div>
            )}
            {isTrending && (
              <div className="absolute -top-2 -right-2">
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-blue-500 text-xs">
                  New
                </Badge>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-lg mb-1 truncate group-hover:text-primary transition-colors">{beat.title}</h4>
            <p className="text-muted-foreground mb-2">by {beat.producer_name || beat.artist}</p>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {beat.genre && (
                <Badge variant="secondary" className="text-xs">{beat.genre}</Badge>
              )}
              {beat.bpm && (
                <Badge variant="outline" className="text-xs">{beat.bpm} BPM</Badge>
              )}
              {beat.key && beat.key !== 'Unknown' && (
                <Badge variant="outline" className="text-xs">Key: {beat.key}</Badge>
              )}
            </div>
            {beat.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{beat.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            {beat.price !== undefined && (
              <div className="text-right">
                <p className="font-bold text-lg">
                  {beat.price === 0 ? (
                    <span className="text-green-500">Free</span>
                  ) : (
                    <span>£{beat.price.toFixed(2)}</span>
                  )}
                </p>
                {beat.license_prices && (
                  <p className="text-xs text-muted-foreground">+ licenses</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {(beat.audio_url || beat.preview_url) && (
                <Button variant="outline" size="sm" onClick={handlePlayClick}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button asChild variant="default" size="sm" className="group-hover:shadow-md transition-all">
                <Link to={`/beat/${beat.id}?${searchContext}`}>
                  View
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchPage;

// Note: The following components are imported and need to be created:
// - MusicFilters, BeatsFilters, CreatorsFilters from @/components/search/
// - DiscoveryPanel, CollaborationsCarousel, RecommendationBands from @/components/search/
