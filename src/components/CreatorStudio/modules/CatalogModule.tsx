import React, { useState, useEffect, useCallback } from "react";
import "./catalog-v2.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  HeadphonesIcon,
  Package,
  ShoppingBag,
  Gift,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudioContext } from "@/contexts/StudioContext";

interface CatalogItem {
  id: string;
  title: string;
  type: 'release' | 'beat' | 'pack' | 'bundle' | 'merch' | 'collectible';
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'live';
  price: number;
  sales: number;
  revenue: number;
  created_at: string;
  updated_at: string;
  cover_art_url?: string;
  image_url?: string;
  description?: string;
  genre?: string;
  bpm?: number;
  key?: string;
}

const statusColors = {
  draft: "secondary",
  submitted: "outline", 
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  live: "default",
  scheduled: "outline",
} as const;

const typeIcons = {
  release: Music,
  beat: HeadphonesIcon,
  pack: Package,
  bundle: ShoppingBag,
  merch: Gift,
  collectible: TrendingUp,
};

export const CatalogModule: React.FC = () => {
  const ENABLE_EXTENDED_TYPES = true; // Enable merchandise, bundles, and collectibles
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { mode, activeLabel } = useStudioContext();
  const isLabelWorkspace = mode === "label" && !!activeLabel;

  // Get tab from query parameter
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab') || 'releases';

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [filterStatus, setFilterStatus] = useState("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Update active tab when URL changes
  useEffect(() => {
    const newTab = searchParams.get('tab') || 'releases';
    setActiveTab(newTab);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setHighlightId(highlight);
      const timer = setTimeout(() => setHighlightId(null), 3000);
      return () => clearTimeout(timer);
    }

    setHighlightId(null);
  }, [location.search]);

  const resolveOwner = useCallback(() => {
    if (isLabelWorkspace && activeLabel) {
      return { ownerType: 'label' as const, ownerId: activeLabel.id };
    }
    if (user) {
      return { ownerType: 'profile' as const, ownerId: user.id };
    }
    return null;
  }, [isLabelWorkspace, activeLabel?.id, user?.id]);

  useEffect(() => {
    const owner = resolveOwner();
    if (owner) {
      fetchCatalogItems(owner);
    }
  }, [resolveOwner, activeTab]);

  const fetchCatalogItems = async (owner: { ownerType: 'label' | 'profile'; ownerId: string }) => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      switch (activeTab) {
        case "releases":
          // Fetch all releases from unified releases table
          const { data: releases, error: releasesError } = await supabase
            .from('releases')
            .select('*')
            .eq('owner_type', owner.ownerType)
            .eq('owner_id', owner.ownerId);
          
          if (releasesError) throw releasesError;
          
          // Process releases with proper status handling
          const allReleases = (releases || []).map(release => {
            // Check if approved release date has passed to make it live
            let status = release.status || 'draft';
            if (status === 'approved' && release.release_date) {
              const releaseDate = new Date(release.release_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (releaseDate <= today) {
                status = 'live';
              }
            }
            
            return {
              ...release,
              type: 'release' as const,
              price: release.price || 0,
              sales: release.total_plays || 0,
              revenue: (release.price || 0) * (release.total_plays || 0),
              status,
            };
          });
          
          data = allReleases;
          break;

        case "beats":
          let beatsQuery = supabase.from('beats').select('*');
          if (owner.ownerType === 'label') {
            beatsQuery = beatsQuery
              .eq('owner_type', 'label')
              .eq('owner_id', owner.ownerId);
          } else {
            beatsQuery = beatsQuery.eq('user_id', owner.ownerId);
          }
          const { data: beats, error: beatsError } = await beatsQuery;
          if (beatsError && beatsError.code !== '42703') throw beatsError;
          
          data = (beats || []).map(beat => ({
            ...beat,
            type: 'beat' as const,
            price: beat.price || 0,
            sales: beat.total_plays || 0,
            revenue: (beat.price || 0) * (beat.total_plays || 0),
            status: beat.is_published ? 'live' : 'draft',
          }));
          break;

        case "sound-packs":
          let packsQuery = supabase.from('sample_packs').select('*');
          if (owner.ownerType === 'label') {
            packsQuery = packsQuery
              .eq('owner_type', 'label')
              .eq('owner_id', owner.ownerId);
          } else {
            packsQuery = packsQuery.eq('user_id', owner.ownerId);
          }
          const { data: packs, error: packsError } = await packsQuery;
          if (packsError) throw packsError;
          
          data = (packs || []).map(pack => ({
            ...pack,
            type: 'pack' as const,
            price: pack.price || 0,
            sales: pack.download_count || 0,
            revenue: (pack.price || 0) * (pack.download_count || 0),
            status: pack.status || 'draft',
          }));
          break;
          
        case "merch":
          let merchQuery = supabase.from('creator_merchandise').select('*');
          if (owner.ownerType === 'label') {
            merchQuery = merchQuery
              .eq('owner_type', 'label')
              .eq('owner_id', owner.ownerId);
          } else {
            merchQuery = merchQuery.eq('user_id', owner.ownerId);
          }
          const { data: merchandise, error: merchError } = await merchQuery;
          if (merchError) throw merchError;
          
          data = (merchandise || []).map(item => ({
            ...item,
            type: 'merch' as const,
            price: item.price || 0,
            sales: item.sales_count || 0,
            revenue: item.revenue_total || 0,
            status: item.status || 'draft',
          }));
          break;

        case "bundles":
          const { data: bundles, error: bundlesError } = await supabase
            .from('creator_bundles')
            .select('*')
            .eq(owner.ownerType === 'label' ? 'owner_id' : 'user_id', owner.ownerId)
            .eq(owner.ownerType === 'label' ? 'owner_type' : 'owner_type', owner.ownerType);
          if (bundlesError) throw bundlesError;
          
          data = (bundles || []).map(item => ({
            ...item,
            type: 'bundle' as const,
            price: item.bundle_price || 0,
            sales: item.sales_count || 0,
            revenue: item.revenue_total || 0,
            status: item.status || 'draft',
          }));
          break;

        case "collectibles":
          const { data: collectibles, error: collectiblesError } = await supabase
            .from('creator_collectibles')
            .select('*')
            .eq(owner.ownerType === 'label' ? 'owner_id' : 'user_id', owner.ownerId)
            .eq(owner.ownerType === 'label' ? 'owner_type' : 'owner_type', owner.ownerType);
          if (collectiblesError) throw collectiblesError;
          
          data = (collectibles || []).map(item => ({
            ...item,
            type: 'collectible' as const,
            price: item.price || 0,
            sales: item.sales_count || 0,
            revenue: item.revenue_total || 0,
            status: item.status || 'draft',
          }));
          break;
          
        default:
          // Default to empty data if tab not recognized
          data = [];
          break;
      }

      setCatalogItems(data);
    } catch (error: any) {
      toast({
        title: "Error loading catalog",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLabelWorkspace && activeLabel) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/30">
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Label workspace</p>
              <h1 className="text-3xl font-bold mt-1">Catalog management</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Catalog editing for {activeLabel.name || activeLabel.slug} lives inside Label Studio. Switch there to upload new releases, manage roster-owned beats, or update storefront settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate(`/studio/label/${activeLabel.slug}/catalog`)}>
                <Package className="h-4 w-4 mr-2" /> Open Label Catalog
              </Button>
              <Button variant="outline" onClick={() => navigate(`/studio/label/${activeLabel.slug}/storefront`)}>
                <ShoppingBag className="h-4 w-4 mr-2" /> Customize Storefront
              </Button>
              <Button variant="outline" onClick={() => navigate(`/studio/label/${activeLabel.slug}/roster`)}>
                <Users className="h-4 w-4 mr-2" /> Manage Roster Access
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const filteredItems = catalogItems.filter(item => {
    const title = (item.title || '').toString();
    const description = (item.description || '').toString();
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const safeNum = (n: any) => {
      const v = Number(n);
      return Number.isFinite(v) ? v : 0;
    };
    switch (sortBy) {
      case "title":
        return (a.title || "").localeCompare(b.title || "");
      case "revenue":
        return safeNum(b.revenue) - safeNum(a.revenue);
      case "sales":
        return safeNum(b.sales) - safeNum(a.sales);
      case "updated_at": {
        const bt = new Date(b.updated_at || 0).getTime();
        const at = new Date(a.updated_at || 0).getTime();
        return safeNum(bt) - safeNum(at);
      }
      default: {
        const bt = new Date(b.created_at || 0).getTime();
        const at = new Date(a.created_at || 0).getTime();
        return safeNum(bt) - safeNum(at);
      }
    }
  });

  const getCreateUrl = (tab: string) => {
    switch (tab) {
      case "releases":
        return "/release/new";
      case "beats":
        return "/producer";
      case "sound-packs":
        return "/sample-pack/upload";
      case "merch":
        return "/studio/catalog/merchandise/new";
      case "bundles":
        return "/studio/catalog/bundles/new";
      case "collectibles":
        return "/studio/catalog/collectibles/new";
      default:
        return "/studio/catalog";
    }
  };

  const handleDelete = async (itemId: string, item: CatalogItem) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      let error;
      
      switch (activeTab) {
        case "releases":
          // Delete from unified releases table
          ({ error } = await supabase.from('releases').delete().eq('id', itemId));
          break;
        case "beats":
          ({ error } = await supabase.from('beats').delete().eq('id', itemId));
          break;
        case "sound-packs":
          ({ error } = await supabase.from('sample_packs').delete().eq('id', itemId));
          break;
        // Add other cases as needed
      }

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: "The item has been successfully deleted.",
      });

      fetchCatalogItems();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resolveCatalogPath = (type: CatalogItem['type']) => {
    switch (type) {
      case 'merch':
        return 'merchandise';
      case 'bundle':
        return 'bundles';
      case 'collectible':
        return 'collectibles';
      default:
        return type;
    }
  };

  const getViewUrl = (item: CatalogItem) => {
    switch (item.type) {
      case "release":
        // Route to different pages based on status
        if (item.status === 'draft' || item.status === 'submitted') {
          return `/release/new?edit=${item.id}`; // Edit drafts using query param
        }
        return `/release/${item.id}`; // View live releases
      case "beat":
        return `/beat/${item.id}`; // View beat details
      case "pack":
        return `/sample-pack/${item.id}`;
      default:
        return `/studio/catalog/${resolveCatalogPath(item.type)}/${item.id}`;
    }
  };

  const getEditUrl = (item: CatalogItem) => {
    switch (item.type) {
      case "release":
        return `/release/new?edit=${item.id}`; // Edit all releases using query param
      case "beat":
        return `/producer?edit=${item.id}`; // Edit beats in producer page
      case "pack":
        return `/sample-pack/${item.id}/edit`;
      default:
        return `/studio/catalog/${resolveCatalogPath(item.type)}/${item.id}/edit`;
    }
  };

  const renderStats = (items: CatalogItem[]) => {
    const safeNum = (n: any) => {
      const v = Number(n);
      return Number.isFinite(v) ? v : 0;
    };
    const totalSales = items.reduce((s, i) => s + safeNum(i.sales), 0);
    const totalRevenue = items.reduce((s, i) => s + safeNum(i.revenue), 0);
    const approved = items.filter(i => i.status === 'approved').length;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {[
          { label: 'Total Items', value: items.length },
          { label: 'Total Sales', value: totalSales },
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Approved', value: approved },
        ].map((stat) => (
          <div key={stat.label} className="rounded-md border border-border bg-transparent p-3">
            <div className="text-xs font-medium text-muted-foreground tracking-wide">{stat.label}</div>
            <div className="text-xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderCatalogGrid = (items: CatalogItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => {
        const Icon = typeIcons[item.type];
        const isHighlighted = item.id === highlightId;
        return (
          <div
            key={item.id}
            className={`group relative rounded-xl overflow-hidden border border-border bg-transparent transition-all ${
              isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
            }`}
          >
            <div className="aspect-square relative">
              {(item.cover_art_url || item.image_url) ? (
                <img src={item.cover_art_url || item.image_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20">
                  <Icon className="w-10 h-10" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge variant={(statusColors as any)[item.status] || 'secondary'} className="capitalize">
                  {item.status}
                </Badge>
              </div>
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="bg-background/70 backdrop-blur border border-border hover:bg-background">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(getViewUrl(item))}>
                      <Eye className="h-4 w-4 mr-2" />
                      {item.status === 'draft' || item.status === 'submitted' ? 'Edit' : 'View'}
                    </DropdownMenuItem>
                    {(item.status !== 'draft' && item.status !== 'submitted') && (
                      <DropdownMenuItem onClick={() => navigate(getEditUrl(item))}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDelete(item.id, item)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="px-1 pt-2 pb-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <h3 className="font-medium leading-tight line-clamp-1">{item.title}</h3>
                <span className="font-semibold">${Number(item.price || 0).toFixed(2)}</span>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" />{item.sales}</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{Number(item.revenue || 0).toFixed(0)}</span>
                </div>
                <span>Updated {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="catalog-scope min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catalog Management</h1>
          <p className="text-muted-foreground">
            Manage all your content across releases, beats, sample packs, bundles, and merchandise.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        try {
          setActiveTab(v);
          // Update URL with new tab parameter
          const newSearchParams = new URLSearchParams(location.search);
          newSearchParams.set('tab', v);
          navigate(`/studio/catalog?${newSearchParams.toString()}`, { replace: true });
        } catch (e) {
          console.error('Tab change error', e);
        }
      }}>
        <TabsList className="flex flex-wrap w-full bg-transparent border-b border-border p-0">
          <TabsTrigger value="releases" className="flex items-center gap-1 text-xs md:text-sm">
            <Music className="h-3 w-3 md:h-4 md:w-4" />
            Releases
          </TabsTrigger>
          <TabsTrigger value="beats" className="flex items-center gap-1 text-xs md:text-sm">
            <HeadphonesIcon className="h-3 w-3 md:h-4 md:w-4" />
            Beats
          </TabsTrigger>
          <TabsTrigger value="sound-packs" className="flex items-center gap-1 text-xs md:text-sm">
            <Package className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Sound Packs</span>
            <span className="sm:hidden">Packs</span>
          </TabsTrigger>
          {ENABLE_EXTENDED_TYPES && (
            <>
              <TabsTrigger value="merch" className="flex items-center gap-1 text-xs md:text-sm">
                <Gift className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Merchandise</span>
                <span className="sm:hidden">Merch</span>
              </TabsTrigger>
              <TabsTrigger value="bundles" className="flex items-center gap-1 text-xs md:text-sm">
                <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                Bundles
              </TabsTrigger>
              <TabsTrigger value="collectibles" className="flex items-center gap-1 text-xs md:text-sm">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Collectibles</span>
                <span className="sm:hidden">NFTs</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Filters and Controls */}
        <div className="sticky top-16 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border py-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 max-w-md items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={() => navigate(getCreateUrl(activeTab))}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
            {activeTab === 'merch' && (
              <Button
                onClick={() => navigate('/studio/catalog/merchandise/new')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Merchandise
              </Button>
            )}
            {activeTab === 'bundles' && (
              <Button
                onClick={() => navigate('/studio/catalog/bundles/new')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Bundle
              </Button>
            )}
            {activeTab === 'collectibles' && (
              <Button
                onClick={() => navigate('/studio/catalog/collectibles/new')}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Collectible
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="releases" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No releases yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your catalog by creating your first release
              </p>
              <Button onClick={() => navigate("/release/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Release
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="beats" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <HeadphonesIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No beats yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your beat catalog by uploading your first beat
              </p>
              <Button onClick={() => navigate("/producer")}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Beat
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sound-packs" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sample packs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first sample pack to get started
              </p>
              <Button onClick={() => navigate("/sample-pack/upload")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Sample Pack
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="merch" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No merchandise yet</h3>
              <p className="text-muted-foreground mb-4">
                Start selling merchandise to your fans
              </p>
              <Button onClick={() => navigate("/studio/catalog/merchandise/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Merchandise
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bundles" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No bundles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create product bundles to increase sales
              </p>
              <Button onClick={() => navigate("/studio/catalog/bundles/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Bundle
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="collectibles" className="space-y-6">
          {renderStats(sortedItems)}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sortedItems.length > 0 ? (
            renderCatalogGrid(sortedItems)
          ) : (
            <Card className="p-8 text-center bg-background">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No collectibles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create digital collectibles and NFTs for your fans
              </p>
              <Button onClick={() => navigate("/studio/catalog/collectibles/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Collectible
              </Button>
            </Card>
          )}
        </TabsContent>

      </Tabs>
      </div>
    </div>
  );
};
