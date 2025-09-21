import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Filter, 
  Star, 
  StarOff, 
  Trash2, 
  BarChart3, 
  TrendingUp,
  Package,
  Music,
  Album,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CatalogItem {
  id: string;
  title: string;
  artist?: string;
  producer_name?: string;
  price: number;
  type: 'beat' | 'release' | 'sample_pack';
  isFeatured?: boolean;
  isActive?: boolean;
  downloads?: number;
  revenue?: number;
  createdAt: string;
  genre?: string;
  imageUrl?: string;
}

export const AdminCatalogEnhanced = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    featured: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  useEffect(() => {
    fetchCatalogItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  const fetchCatalogItems = async () => {
    setLoading(true);
    try {
      // Fetch beats
      const { data: beats, error: beatsError } = await supabase
        .from('beats')
        .select('id, title, genre, price, is_featured, is_published, created_at, image_url, user_id')
        .order('created_at', { ascending: false });

      if (beatsError) throw beatsError;

      // Fetch releases
      const { data: releases, error: releasesError } = await supabase
        .from('releases')
        .select('id, title, artist, genre, price, is_featured, created_at, cover_art_url, user_id')
        .order('created_at', { ascending: false });

      if (releasesError) throw releasesError;

      // Fetch sample packs
      const { data: samplePacks, error: samplePacksError } = await supabase
        .from('sample_packs')
        .select('id, title, genre, price, is_featured, created_at, cover_art_url, user_id')
        .order('created_at', { ascending: false });

      if (samplePacksError) throw samplePacksError;

      // Fetch download analytics
      const { data: downloadStats } = await supabase
        .from('download_events')
        .select('purchase_id, purchase_type')
        .order('created_at', { ascending: false });

      // Transform data to unified format
      const unifiedItems: CatalogItem[] = [
        ...(beats || []).map(beat => ({
          id: beat.id,
          title: beat.title || 'Untitled Beat',
          type: 'beat' as const,
          price: beat.price || 0,
          isFeatured: beat.is_featured || false,
          isActive: beat.is_published || false,
          createdAt: beat.created_at,
          genre: beat.genre,
          imageUrl: beat.image_url,
          downloads: downloadStats?.filter(d => d.purchase_id === beat.id && d.purchase_type === 'beat').length || 0
        })),
        ...(releases || []).map(release => ({
          id: release.id,
          title: release.title || 'Untitled Release',
          artist: release.artist,
          type: 'release' as const,
          price: release.price || 0,
          isFeatured: release.is_featured || false,
          isActive: true,
          createdAt: release.created_at,
          genre: release.genre,
          imageUrl: release.cover_art_url,
          downloads: downloadStats?.filter(d => d.purchase_id === release.id && d.purchase_type === 'release').length || 0
        })),
        ...(samplePacks || []).map(pack => ({
          id: pack.id,
          title: pack.title || 'Untitled Sample Pack',
          type: 'sample_pack' as const,
          price: pack.price || 0,
          isFeatured: pack.is_featured || false,
          isActive: true,
          createdAt: pack.created_at,
          genre: pack.genre,
          imageUrl: pack.cover_art_url,
          downloads: downloadStats?.filter(d => d.purchase_id === pack.id && d.purchase_type === 'sample_pack').length || 0
        }))
      ];

      setItems(unifiedItems);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch catalog items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.artist?.toLowerCase().includes(searchLower) ||
        item.genre?.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Featured filter
    if (filters.featured !== 'all') {
      filtered = filtered.filter(item => 
        filters.featured === 'featured' ? item.isFeatured : !item.isFeatured
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'downloads':
          aValue = a.downloads || 0;
          bValue = b.downloads || 0;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredItems(filtered);
  };

  const handleBulkAction = async (action: 'feature' | 'unfeature' | 'delete') => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const itemId of selectedItems) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        switch (action) {
          case 'feature':
            await supabase
              .from(item.type === 'sample_pack' ? 'sample_packs' : `${item.type}s`)
              .update({ is_featured: true })
              .eq('id', itemId);
            break;
          case 'unfeature':
            await supabase
              .from(item.type === 'sample_pack' ? 'sample_packs' : `${item.type}s`)
              .update({ is_featured: false })
              .eq('id', itemId);
            break;
          case 'delete':
            await supabase
              .from(item.type === 'sample_pack' ? 'sample_packs' : `${item.type}s`)
              .delete()
              .eq('id', itemId);
            break;
        }
      }

      toast({
        title: "Bulk action completed",
        description: `Successfully ${action}d ${selectedItems.length} items`
      });

      setSelectedItems([]);
      fetchCatalogItems();
    } catch (error: any) {
      toast({
        title: "Bulk action failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'beat': return <Music className="w-4 h-4" />;
      case 'release': return <Album className="w-4 h-4" />;
      case 'sample_pack': return <Package className="w-4 h-4" />;
      default: return <Download className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'beat': return 'bg-blue-100 text-blue-800';
      case 'release': return 'bg-green-100 text-green-800';
      case 'sample_pack': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading catalog...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">
                  {items.filter(i => i.isFeatured).length}
                </div>
                <div className="text-xs text-muted-foreground">Featured</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {items.reduce((sum, item) => sum + (item.downloads || 0), 0)}
                </div>
                <div className="text-xs text-muted-foreground">Downloads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(items.reduce((sum, item) => sum + item.price, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Catalog Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search catalog..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="beat">Beats</SelectItem>
                <SelectItem value="release">Releases</SelectItem>
                <SelectItem value="sample_pack">Sample Packs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.featured} onValueChange={(value) => setFilters(prev => ({ ...prev, featured: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
                <SelectItem value="not_featured">Not Featured</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedItems.length} items selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('feature')}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Feature
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('unfeature')}
                >
                  <StarOff className="w-4 h-4 mr-1" />
                  Unfeature
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems(prev => [...prev, item.id]);
                    } else {
                      setSelectedItems(prev => prev.filter(id => id !== item.id));
                    }
                  }}
                />
                
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getTypeColor(item.type)}>
                      {getTypeIcon(item.type)}
                      <span className="ml-1 capitalize">{item.type.replace('_', ' ')}</span>
                    </Badge>
                    {item.isFeatured && (
                      <Badge variant="outline" className="text-yellow-600">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-sm truncate">{item.title}</h3>
                  {item.artist && (
                    <p className="text-xs text-muted-foreground truncate">by {item.artist}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{formatCurrency(item.price)}</span>
                    <span>{item.downloads || 0} downloads</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No items found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};