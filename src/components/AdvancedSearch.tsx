import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, X, Music, Users, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface SearchFilters {
  query: string;
  category: 'all' | 'beats' | 'projects' | 'users' | 'posts';
  genre: string;
  priceRange: [number, number];
  bpmRange: [number, number];
  userType: string;
  tags: string[];
  sortBy: 'relevance' | 'date' | 'price' | 'popularity';
}

interface SearchResult {
  id: string;
  type: 'beat' | 'project' | 'user' | 'post';
  title: string;
  description?: string;
  image?: string;
  price?: number;
  genre?: string;
  bpm?: number;
  tags?: string[];
  user?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
  created_at: string;
}

export const AdvancedSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    genre: '',
    priceRange: [0, 1000],
    bpmRange: [60, 200],
    userType: '',
    tags: [],
    sortBy: 'relevance'
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const performSearch = async () => {
    if (!filters.query.trim()) return;
    
    setLoading(true);
    saveRecentSearch(filters.query);
    
    try {
      let allResults: SearchResult[] = [];

      // Search beats
      if (filters.category === 'all' || filters.category === 'beats') {
        const { data: beats } = await supabase
          .from('beats')
          .select(`
            id, title, description, genre, bpm, price, tags, image_url, created_at, user_id
          `)
          .eq('is_published', true)
          .ilike('title', `%${filters.query}%`)
          .gte('price', filters.priceRange[0])
          .lte('price', filters.priceRange[1])
          .gte('bpm', filters.bpmRange[0])
          .lte('bpm', filters.bpmRange[1]);

        if (beats) {
          // Fetch user profiles for beats
          const beatsWithProfiles = await Promise.all(
            beats.map(async (beat) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('user_id', beat.user_id)
                .maybeSingle();

              return {
                id: beat.id,
                type: 'beat' as const,
                title: beat.title,
                description: beat.description,
                image: beat.image_url,
                price: beat.price,
                genre: beat.genre,
                bpm: beat.bpm,
                tags: beat.tags,
                user: profile,
                created_at: beat.created_at
              };
            })
          );
          allResults.push(...beatsWithProfiles);
        }
      }

      // Search collaboration projects
      if (filters.category === 'all' || filters.category === 'projects') {
        const { data: projects } = await supabase
          .from('collaboration_projects')
          .select(`
            id, title, description, genre, skills_needed, created_at, user_id
          `)
          .ilike('title', `%${filters.query}%`);

        if (projects) {
          // Fetch user profiles for projects
          const projectsWithProfiles = await Promise.all(
            projects.map(async (project) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('user_id', project.user_id)
                .maybeSingle();

              return {
                id: project.id,
                type: 'project' as const,
                title: project.title,
                description: project.description,
                genre: project.genre,
                tags: project.skills_needed,
                user: profile,
                created_at: project.created_at
              };
            })
          );
          allResults.push(...projectsWithProfiles);
        }
      }

      // Search users
      if (filters.category === 'all' || filters.category === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url, bio, user_type, created_at')
          .or(`full_name.ilike.%${filters.query}%, username.ilike.%${filters.query}%`);

        if (users) {
          allResults.push(...users.map(user => ({
            id: user.user_id,
            type: 'user' as const,
            title: user.full_name || user.username || 'User',
            description: user.bio,
            image: user.avatar_url,
            user: {
              full_name: user.full_name,
              username: user.username,
              avatar_url: user.avatar_url
            },
            created_at: user.created_at
          })));
        }
      }

      // Search posts
      if (filters.category === 'all' || filters.category === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            id, title, content, tags, created_at, user_id
          `)
          .ilike('title', `%${filters.query}%`);

        if (posts) {
          // Fetch user profiles for posts
          const postsWithProfiles = await Promise.all(
            posts.map(async (post) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('user_id', post.user_id)
                .maybeSingle();

              return {
                id: post.id,
                type: 'post' as const,
                title: post.title,
                description: post.content,
                tags: post.tags,
                user: profile,
                created_at: post.created_at
              };
            })
          );
          allResults.push(...postsWithProfiles);
        }
      }

      // Apply additional filters
      if (filters.genre) {
        allResults = allResults.filter(result => 
          result.genre?.toLowerCase().includes(filters.genre.toLowerCase())
        );
      }

      if (filters.tags.length > 0) {
        allResults = allResults.filter(result =>
          result.tags?.some(tag => 
            filters.tags.some(filterTag => 
              tag.toLowerCase().includes(filterTag.toLowerCase())
            )
          )
        );
      }

      // Sort results
      switch (filters.sortBy) {
        case 'date':
          allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'price':
          allResults.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        default:
          // Keep relevance order
          break;
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      genre: '',
      priceRange: [0, 1000],
      bpmRange: [60, 200],
      userType: '',
      tags: [],
      sortBy: 'relevance'
    });
    setResults([]);
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'beat':
        return <Music className="w-4 h-4" />;
      case 'project':
        return <Users className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Search Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Advanced Search</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Search Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Search Query</label>
              <Input
                placeholder="Search beats, projects, users..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              />
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setFilters(prev => ({ ...prev, query: search }))}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={filters.category} onValueChange={(value: any) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="beats">Beats</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="posts">Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Genre Filter */}
            <div>
              <label className="text-sm font-medium">Genre</label>
              <Input
                placeholder="Hip Hop, Electronic, Rock..."
                value={filters.genre}
                onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
              />
            </div>

            {/* Beat-specific filters - only show when searching beats */}
            {(filters.category === 'beats' || filters.category === 'all') && (
              <>
                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium">Price Range ({formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])})</label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                    max={1000}
                    step={10}
                    className="mt-2"
                  />
                </div>

                {/* BPM Range */}
                <div>
                  <label className="text-sm font-medium">BPM Range ({filters.bpmRange[0]} - {filters.bpmRange[1]})</label>
                  <Slider
                    value={filters.bpmRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, bpmRange: value as [number, number] }))}
                    min={60}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </>
            )}

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="mt-2"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="text-sm font-medium">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={performSearch} className="flex-1" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
              <Button onClick={clearFilters} variant="outline">
                Clear
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Search Results */}
      {results.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {result.image ? (
                          <img src={result.image} alt={result.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          getResultIcon(result.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{result.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {result.price !== undefined && (
                            <span>{formatCurrency(result.price)}</span>
                          )}
                          {result.genre && (
                            <span>{result.genre}</span>
                          )}
                          {result.bpm && (
                            <span>{result.bpm} BPM</span>
                          )}
                          {result.user && (
                            <span>by {result.user.full_name || result.user.username}</span>
                          )}
                        </div>
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {result.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
