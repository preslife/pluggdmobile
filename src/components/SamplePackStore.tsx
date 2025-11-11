import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Download, Music, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionGatedContent } from '@/components/SubscriptionGatedContent';

interface SamplePack {
  id: string;
  user_id: string;
  owner_id?: string | null;
  owner_type?: 'user' | 'label' | null;
  title: string;
  description: string;
  cover_art_url: string;
  price: number;
  price_pence?: number;
  genre: string;
  bpm_range: string;
  sample_count: number;
  download_url: string;
  preview_url: string;
  tags: string[];
  is_featured: boolean;
  total_downloads: number;
  created_at: string;
}

export const SamplePackStore = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getTierLimits } = useSubscription();
  const [samplePacks, setSamplePacks] = useState<SamplePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const tierLimits = getTierLimits();

  useEffect(() => {
    fetchSamplePacks();
  }, [selectedGenre, sortBy]);

  const fetchSamplePacks = async () => {
    try {
      let query = supabase
        .from('sample_packs')
        .select('*');

      if (selectedGenre !== 'all') {
        query = query.eq('genre', selectedGenre);
      }

      switch (sortBy) {
        case 'popular':
          query = query.order('total_downloads', { ascending: false });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setSamplePacks(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading sample packs",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPacks = samplePacks.filter(pack =>
    pack.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pack.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pack.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const playPreview = async (previewUrl: string) => {
    try {
      const audio = new Audio(previewUrl);
      audio.play();
      
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 30000); // 30 second preview
    } catch (error) {
      toast({
        title: "Preview unavailable",
        description: "Could not play preview for this sample pack",
        variant: "destructive"
      });
    }
  };

  const purchaseSamplePack = async (packId: string, pricePence: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase sample packs",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-sample-pack-purchase', {
        body: {
          samplePackId: packId,
          pricePence
        }
      });

      if (error) throw error;

      if (data?.free) {
        toast({
          title: "Download started",
          description: "Your free sample pack download has begun"
        });
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        }
      } else if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const downloadFree = async (packId: string, downloadUrl: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to download sample packs",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create download record
      await supabase.from('sample_pack_purchases').insert({
        user_id: user.id,
        sample_pack_id: packId,
        amount_paid: 0,
        download_url: downloadUrl
      });

      // Trigger download
      window.open(downloadUrl, '_blank');
      
      toast({
        title: "Download started",
        description: "Your sample pack download has begun"
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sample Pack Store</h1>
          <p className="text-muted-foreground">
            Professional sample packs from top producers
          </p>
        </div>
        
        {tierLimits.canSellSamplePacks && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              My Packs
            </Button>
            <Button onClick={() => window.location.href = '/sample-pack/upload'}>
              Upload Sample Pack
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search sample packs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              <SelectItem value="trap">Trap</SelectItem>
              <SelectItem value="hip-hop">Hip Hop</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="techno">Techno</SelectItem>
              <SelectItem value="ambient">Ambient</SelectItem>
              <SelectItem value="experimental">Experimental</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sample Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPacks.map((pack) => {
          const membershipOwnerId = pack.owner_id ?? pack.user_id;
          const membershipCtaHref =
            pack.owner_type === 'label'
              ? `/label/${membershipOwnerId}#membership`
              : `/creator/${membershipOwnerId}#membership`;

          return (
            <SubscriptionGatedContent
              key={pack.id}
              contentId={pack.id}
              contentType="sample_pack"
              creatorId={membershipOwnerId}
              ctaHref={membershipCtaHref}
              fallbackText="Join this creator's membership to unlock the full sample pack and downloads."
              previewContent={
                pack.preview_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => playPreview(pack.preview_url)}
                  >
                    <Play className="w-4 h-4" />
                    Play 30s preview
                  </Button>
                ) : undefined
              }
              minimalWrapper
              className="h-full"
            >
              <Card className="group hover:shadow-lg transition-all duration-200 h-full">
                <CardHeader className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    {pack.cover_art_url ? (
                      <img
                        src={pack.cover_art_url}
                        alt={pack.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Music className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {pack.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    
                    {pack.preview_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => playPreview(pack.preview_url)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 h-full">
                  <div className="space-y-3">
                    <div>
                      <CardTitle className="text-lg leading-tight">{pack.title}</CardTitle>
                      <CardDescription className="text-sm">
                        by Producer
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {pack.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {pack.genre}
                        </Badge>
                      )}
                      {pack.bpm_range && (
                        <Badge variant="outline" className="text-xs">
                          {pack.bpm_range} BPM
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {pack.sample_count} samples
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {pack.total_downloads} downloads
                      </div>
                      <div className="text-lg font-bold">
                        {(pack.price_pence || pack.price * 100) > 0 ? `£${((pack.price_pence || pack.price * 100) / 100).toFixed(2)}` : 'Free'}
                      </div>
                    </div>

                    {(pack.price_pence || pack.price * 100) > 0 ? (
                      <Button 
                        className="w-full" 
                        onClick={() => purchaseSamplePack(pack.id, pack.price_pence || pack.price * 100)}
                      >
                        Purchase £{((pack.price_pence || pack.price * 100) / 100).toFixed(2)}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => downloadFree(pack.id, pack.download_url)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Free
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SubscriptionGatedContent>
          );
        })}
      </div>

      {filteredPacks.length === 0 && !loading && (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No sample packs found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or check back later for new packs.
          </p>
        </div>
      )}
    </div>
  );
};
