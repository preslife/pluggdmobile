import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeToUnifiedCatalog, UnifiedCatalogItem } from "@/utils/catalogNormalizer";
import { Music, Disc, Package, Search, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";

interface UnifiedCatalogProps {
  showFeaturedOnly?: boolean;
  maxItems?: number;
  className?: string;
}

export const UnifiedCatalog = ({ showFeaturedOnly = false, maxItems, className }: UnifiedCatalogProps) => {
  const [items, setItems] = useState<UnifiedCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetchCatalogItems();
  }, [showFeaturedOnly]);

  const fetchCatalogItems = async () => {
    setLoading(true);
    try {
      let beatsQuery = supabase.from('beats').select('*').eq('is_published', true);
      let releasesQuery = supabase.from('releases').select('*');
      let samplePacksQuery = supabase.from('sample_packs').select('*');

      if (showFeaturedOnly) {
        beatsQuery = beatsQuery.eq('is_featured', true);
        releasesQuery = releasesQuery.eq('is_featured', true);
        samplePacksQuery = samplePacksQuery.eq('is_featured', true);
      }

      const [beatsResponse, releasesResponse, samplePacksResponse] = await Promise.all([
        beatsQuery,
        releasesQuery,
        samplePacksQuery
      ]);

      const beats = beatsResponse.data || [];
      const releases = releasesResponse.data || [];
      const samplePacks = samplePacksResponse.data || [];

      const normalizedItems = normalizeToUnifiedCatalog(beats, releases, samplePacks);
      setItems(maxItems ? normalizedItems.slice(0, maxItems) : normalizedItems);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.genre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesGenre = genreFilter === "all" || item.genre === genreFilter;
    
    return matchesSearch && matchesType && matchesGenre;
  });

  const handleAddToCart = (item: UnifiedCatalogItem) => {
    addItem({
      productId: item.id,
      title: item.title,
      price: item.price,
      image_url: item.imageUrl
    });
    toast({
      title: "Added to cart",
      description: `${item.title} has been added to your cart.`,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'beat': return <Music className="h-4 w-4" />;
      case 'release': return <Disc className="h-4 w-4" />;
      case 'sample_pack': return <Package className="h-4 w-4" />;
      default: return <Music className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'beat': return 'Beat';
      case 'release': return 'Release';
      case 'sample_pack': return 'Sample Pack';
      default: return type;
    }
  };

  const genres = [...new Set(items.map(item => item.genre).filter(Boolean))];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="aspect-square bg-muted rounded-md mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {!showFeaturedOnly && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search beats, releases, and sample packs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="beat">Beats</SelectItem>
                <SelectItem value="release">Releases</SelectItem>
                <SelectItem value="sample_pack">Sample Packs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre!}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              {item.imageUrl && (
                <div className="aspect-square relative mb-4 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.isFeatured && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(item.type)}
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(item.type)}
                  </Badge>
                  {item.genre && (
                    <Badge variant="outline" className="text-xs">{item.genre}</Badge>
                  )}
                </div>
                
                <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.artist}</p>
                
                {item.bpm && (
                  <p className="text-xs text-muted-foreground">{item.bpm} BPM</p>
                )}
                
                {item.sampleCount && (
                  <p className="text-xs text-muted-foreground">{item.sampleCount} samples</p>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <div className="text-lg font-bold">
                    {item.payWhatYouWant ? (
                      <span className="text-sm">
                        Pay what you want
                        {item.minimumPrice && (
                          <span className="text-xs text-muted-foreground block">
                            Min: £{item.minimumPrice.toFixed(2)}
                          </span>
                        )}
                      </span>
                    ) : item.price === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `£${item.price.toFixed(2)}`
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    className="shrink-0"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No items found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};