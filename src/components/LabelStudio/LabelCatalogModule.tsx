import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Grid,
  List,
  Search,
  Filter,
  Music,
  Package,
  Disc,
  ShoppingBag,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Calendar,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface CatalogItem {
  id: string;
  title: string;
  artwork_url?: string;
  image_url?: string;
  price?: number;
  status: string;
  created_at: string;
  type: 'release' | 'beat' | 'pack' | 'product';
}

export default function LabelCatalogModule() {
  const { label: activeLabel, loading: labelLoading } = useActiveLabel();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (activeLabel?.id) {
      fetchCatalogItems();
    }
  }, [activeLabel]);

  useEffect(() => {
    filterItems();
  }, [items, activeTab, searchQuery]);

  const fetchCatalogItems = async () => {
    if (!activeLabel?.id) return;

    setLoading(true);
    try {
      const allItems: CatalogItem[] = [];

      // Releases (required)
      const releasesRes = await supabase
        .from('releases')
        .select('id, title, cover_art_url, price, status, created_at')
        .eq('owner_type', 'label')
        .eq('owner_id', activeLabel.id)
        .order('created_at', { ascending: false });
      if (releasesRes.error) throw releasesRes.error;
      releasesRes.data?.forEach((item: any) => {
        const artwork = item.cover_art_url || null;
        allItems.push({
          id: item.id,
          title: item.title,
          type: 'release',
          artwork_url: artwork,
          price: item.price || 0,
          status: item.status || 'draft',
          created_at: item.created_at,
        });
      });

      // Beats (optional owner columns)
      const beatsRes = await supabase
        .from('beats')
        .select('id, title, image_url, price, is_published, status, created_at, owner_type, owner_id')
        .eq('owner_type', 'label')
        .eq('owner_id', activeLabel.id)
        .order('created_at', { ascending: false });
      if (!beatsRes.error) {
        beatsRes.data?.forEach((item: any) => {
          const beatStatus = typeof item.status === 'string'
            ? item.status
            : item.is_published
            ? 'published'
            : 'draft';
          allItems.push({
            id: item.id,
            title: item.title,
            type: 'beat',
            artwork_url: item.image_url,
            price: item.price || 0,
            status: beatStatus,
            created_at: item.created_at,
          });
        });
      } else if (beatsRes.error.code !== '42703') {
        throw beatsRes.error;
      }

      // Sample packs (optional owner columns)
      const packsRes = await supabase
        .from('sample_packs')
        .select('id, title, cover_art_url, price, status, created_at, owner_type, owner_id')
        .eq('owner_type', 'label')
        .eq('owner_id', activeLabel.id)
        .order('created_at', { ascending: false });
      if (!packsRes.error) {
        packsRes.data?.forEach((item: any) => {
          const artwork = item.cover_art_url || null;
          allItems.push({
            id: item.id,
            title: item.title,
            type: 'pack',
            artwork_url: artwork,
            price: item.price || 0,
            status: item.status || 'draft',
            created_at: item.created_at,
          });
        });
      } else if (packsRes.error.code !== '42703') {
        throw packsRes.error;
      }

      // Store products (optional owner columns)
      const productsRes = await supabase
        .from('store_products')
        .select('id, title, image_url, price, status, created_at, owner_type, owner_id')
        .eq('owner_type', 'label')
        .eq('owner_id', activeLabel.id)
        .order('created_at', { ascending: false });
      if (!productsRes.error) {
        productsRes.data?.forEach((item: any) => {
          allItems.push({
            id: item.id,
            title: item.title,
            type: 'product',
            artwork_url: item.image_url,
            price: item.price || 0,
            status: item.status || 'draft',
            created_at: item.created_at,
          });
        });
      } else if (productsRes.error.code !== '42703') {
        throw productsRes.error;
      }

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      toast({
        title: "Error",
        description: "Failed to load catalog items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Filter by type
    if (activeTab !== "all") {
      const typeMap: Record<string, CatalogItem['type']> = {
        releases: 'release',
        beats: 'beat',
        packs: 'pack',
        products: 'product'
      };
      filtered = filtered.filter(item => item.type === typeMap[activeTab]);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleEdit = (item: CatalogItem) => {
    // Navigate to appropriate edit form based on type
    const routeMap: Record<CatalogItem['type'], string> = {
      release: `/release/${item.id}/edit`,
      beat: `/beat/${item.id}/edit`,
      pack: `/sample-pack/${item.id}/edit`,
      product: `/store/product/${item.id}/edit`
    };
    navigate(routeMap[item.type]);
  };

  const handleToggleStatus = async (item: CatalogItem) => {
    const tableMap: Record<CatalogItem['type'], string> = {
      release: 'releases',
      beat: 'beats',
      pack: 'sample_packs',
      product: 'store_products'
    };

    const newStatus = item.status === 'published' ? 'draft' : 'published';

    try {
      const { error } = await supabase
        .from(tableMap[item.type])
        .update({ status: newStatus })
        .eq('id', item.id);

      if (error) {
        if (error.code === '42703') {
          toast({
            title: "Status toggle not supported",
            description: "This content type does not expose a publish toggle yet.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: `Item ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`
      });

      // Refresh catalog
      fetchCatalogItems();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    const tableMap: Record<CatalogItem['type'], string> = {
      release: 'releases',
      beat: 'beats',
      pack: 'sample_packs',
      product: 'store_products'
    };

    try {
      const { error } = await supabase
        .from(tableMap[item.type])
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item deleted successfully"
      });

      // Refresh catalog
      fetchCatalogItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: CatalogItem['type']) => {
    switch (type) {
      case 'release': return <Disc className="w-4 h-4" />;
      case 'beat': return <Music className="w-4 h-4" />;
      case 'pack': return <Package className="w-4 h-4" />;
      case 'product': return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: CatalogItem['type']) => {
    switch (type) {
      case 'release': return 'bg-purple-500/10 text-purple-500';
      case 'beat': return 'bg-blue-500/10 text-blue-500';
      case 'pack': return 'bg-green-500/10 text-green-500';
      case 'product': return 'bg-orange-500/10 text-orange-500';
    }
  };

  if (labelLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading catalog...</div>
      </div>
    );
  }

  if (!activeLabel) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No active label found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Label Catalog</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button size="sm" onClick={() => navigate('/release/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({items.length})
          </TabsTrigger>
          <TabsTrigger value="releases">
            Releases ({items.filter(i => i.type === 'release').length})
          </TabsTrigger>
          <TabsTrigger value="beats">
            Beats ({items.filter(i => i.type === 'beat').length})
          </TabsTrigger>
          <TabsTrigger value="packs">
            Packs ({items.filter(i => i.type === 'pack').length})
          </TabsTrigger>
          <TabsTrigger value="products">
            Products ({items.filter(i => i.type === 'product').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredItems.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No {activeTab === 'all' ? 'items' : activeTab} found
              </p>
              <Button onClick={() => navigate('/release/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Item
              </Button>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative bg-muted">
                    {item.artwork_url || item.image_url ? (
                      <img
                        src={item.artwork_url || item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 ${getTypeColor(item.type)}`}>
                      {item.type}
                    </Badge>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm line-clamp-1">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.price ? formatCurrency(item.price) : 'Free'}
                      </span>
                      <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {item.status === 'published' ?
                        <EyeOff className="w-3 h-3" /> :
                        <Eye className="w-3 h-3" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {item.artwork_url || item.image_url ? (
                        <img
                          src={item.artwork_url || item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        getTypeIcon(item.type)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge className={getTypeColor(item.type)} variant="secondary">
                          {item.type}
                        </Badge>
                        <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {item.price ? formatCurrency(item.price) : 'Free'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                      >
                        {item.status === 'published' ?
                          <EyeOff className="w-4 h-4" /> :
                          <Eye className="w-4 h-4" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
