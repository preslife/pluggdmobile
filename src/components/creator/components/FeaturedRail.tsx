import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { formatCurrency } from '@/lib/utils';

import {
  Play,
  Pause,
  Star,
  Eye,
  Heart,
  Download,
  Music,
  Disc,
  ShoppingBag,
  BookOpen,
  Clock,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface FeaturedItem {
  id: string;
  type: 'release' | 'beat' | 'course' | 'product';
  title: string;
  description?: string;
  image_url?: string;
  audio_url?: string;
  price?: number;
  currency?: string;
  plays_count?: number;
  likes_count?: number;
  created_at: string;
  metadata?: {
    artist?: string;
    genre?: string;
    bpm?: number;
    duration?: number;
    tags?: string[];
  };
}

interface ProductRow {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price_cents?: number | null;
  created_at: string;
  status?: string | null;
  product_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface FeaturedRailProps {
  creatorId: string;
}

const productTableFallbacks = ['products', 'store_products'] as const;

const isMissingRelationError = (error: any, tableName: string) => {
  if (!error) return false;
  const normalizedTable = tableName.toLowerCase();
  const candidates = [
    (error.message || '').toString().toLowerCase(),
    (error.details || '').toString().toLowerCase(),
    (error.hint || '').toString().toLowerCase()
  ];

  return (
    error.code === '42P01' ||
    candidates.some((text) => text.includes('does not exist') && text.includes(normalizedTable))
  );
};

export const FeaturedRail = ({ creatorId }: FeaturedRailProps) => {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play } 
  } = useGlobalPlayer();

  useEffect(() => {
    fetchFeaturedContent();
  }, [creatorId]);

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true);

      const fetchFeaturedProducts = async () => {
        for (const tableName of productTableFallbacks) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .eq('creator_id', creatorId)
              .eq('is_featured', true)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(2);

            if (error) {
              if (isMissingRelationError(error, tableName)) {
                continue;
              }
              throw error;
            }

            return data || [];
          } catch (error: any) {
            if (isMissingRelationError(error, tableName)) {
              continue;
            }
            console.error('Error fetching featured products:', error);
            return [];
          }
        }

        return [];
      };

      // Fetch different types of featured content in parallel
      const [
        { data: featuredReleases },
        { data: featuredBeats },
        { data: featuredCourses },
        featuredProducts
      ] = await Promise.all([
        supabase
          .from('releases')
          .select('*')
          .eq('user_id', creatorId)
          .eq('is_featured', true)
          .eq('status', 'live')
          .eq('approved', true)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('beats')
          .select('*')
          .eq('user_id', creatorId)
          .eq('is_featured', true)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('courses')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('is_featured', true)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(2),

        fetchFeaturedProducts()
      ]);

      // Transform and combine all featured items
      const safeFeaturedProducts = (featuredProducts as ProductRow[]) || [];

      const items: FeaturedItem[] = [
        ...(featuredReleases?.map(release => ({
          id: release.id,
          type: 'release' as const,
          title: release.title,
          description: release.description,
          image_url: release.cover_art_url,
          audio_url: release.preview_url,
          price: release.price,
          plays_count: release.total_plays,
          likes_count: release.total_likes,
          created_at: release.created_at,
          metadata: {
            artist: release.artist,
            genre: release.genre,
            duration: release.duration,
            tags: release.tags
          }
        })) || []),

        ...(featuredBeats?.map(beat => ({
          id: beat.id,
          type: 'beat' as const,
          title: beat.title,
          description: beat.description,
          image_url: beat.image_url,
          audio_url: beat.audio_url,
          price: beat.price,
          plays_count: beat.plays_count,
          created_at: beat.created_at,
          metadata: {
            genre: beat.genre,
            bpm: beat.bpm,
            tags: beat.tags
          }
        })) || []),

        ...(featuredCourses?.map(course => ({
          id: course.id,
          type: 'course' as const,
          title: course.title,
          description: course.description,
          image_url: course.thumbnail_url,
          price: course.price_cents ? course.price_cents / 100 : 0,
          created_at: course.created_at,
          metadata: {
            duration: course.duration_minutes
          }
        })) || []),

        ...(safeFeaturedProducts.map((product) => ({
          id: product.id,
          type: 'product' as const,
          title: product.name,
          description: product.description,
          image_url: product.image_url,
          price: product.price_cents ? product.price_cents / 100 : 0,
          created_at: product.created_at
        })) || [])
      ];

      // Sort by creation date (newest first) and take top 8
      const sortedItems = items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);

      setFeaturedItems(sortedItems);
    } catch (error) {
      console.error('Error fetching featured content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = (item: FeaturedItem) => {
    if (!item.audio_url) return;

    const track = {
      id: item.id,
      title: item.title,
      artist: item.metadata?.artist || 'Unknown Artist',
      src: item.audio_url,
      artwork: item.image_url
    };

    if (currentTrack?.id === item.id && isPlaying) {
      // Pause if currently playing
      play(track, false);
    } else {
      play(track);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'release': return Music;
      case 'beat': return Disc;
      case 'course': return BookOpen;
      case 'product': return ShoppingBag;
      default: return Music;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'release': return 'bg-blue-500';
      case 'beat': return 'bg-purple-500';
      case 'course': return 'bg-green-500';
      case 'product': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getItemLink = (item: FeaturedItem) => {
    switch (item.type) {
      case 'release': return `/release/${item.id}`;
      case 'beat': return `/beat/${item.id}`;
      case 'course': return `/course/${item.id}`;
      case 'product': return `/product/${item.id}`;
      default: return '#';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-48"></div>
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-64 h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (featuredItems.length === 0) {
    return null; // Don't show if no featured content
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Featured Content</h2>
            <p className="text-muted-foreground">Handpicked highlights from this creator</p>
          </div>
        </div>
        <Badge variant="secondary" className="hidden sm:flex">
          {featuredItems.length} Featured
        </Badge>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {featuredItems.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            const isCurrentTrack = currentTrack?.id === item.id;
            const isItemPlaying = isCurrentTrack && isPlaying;

            return (
              <CarouselItem key={item.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                  <CardContent className="p-0">
                    <div className="relative">
                      {/* Image/Cover */}
                      <div className="aspect-square overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 relative">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <TypeIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="flex gap-2">
                            {item.audio_url && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePlayToggle(item);
                                }}
                                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
                              >
                                {isItemPlaying ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
                            >
                              <Link to={getItemLink(item)}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Type Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className={`${getTypeColor(item.type)} text-white capitalize`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {item.type}
                          </Badge>
                        </div>

                        {/* Featured Star */}
                        <div className="absolute top-3 right-3">
                          <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <Link to={getItemLink(item)} className="block">
                          <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-1">
                            {item.title}
                          </h3>
                        </Link>

                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-3">
                            {item.plays_count !== undefined && (
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {item.plays_count.toLocaleString()}
                              </div>
                            )}
                            
                            {item.metadata?.genre && (
                              <span>{item.metadata.genre}</span>
                            )}
                            
                            {item.metadata?.bpm && (
                              <span>{item.metadata.bpm} BPM</span>
                            )}
                          </div>
                        </div>

                        {/* Price & CTA */}
                        <div className="flex items-center justify-between">
                          {item.price !== undefined && (
                            <span className="font-semibold text-sm">
                              {item.price === 0 ? 'Free' : formatCurrency(item.price)}
                            </span>
                          )}
                          
                          <Button size="sm" variant="outline" asChild>
                            <Link to={getItemLink(item)}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        <CarouselPrevious className="-left-12" />
        <CarouselNext className="-right-12" />
      </Carousel>
    </section>
  );
};

export default FeaturedRail;
