import { useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedBadge } from '@/components/ui/badge-enhanced';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Download, Heart, ExternalLink, Play, Pause, ListPlus, MoreHorizontal } from 'lucide-react';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlaylistModal } from '@/components/PlaylistModal';

interface ReleaseCardProps {
  release: {
    id: string;
    title: string;
    artist: string;
    cover_art_url?: string;
    price?: number;
    download_price?: number;
    pay_what_you_want?: boolean;
    minimum_price?: number;
    genre?: string;
    total_plays?: number;
    preview_url?: string;
    download_url?: string;
    user_id: string;
  };
  showBuyButton?: boolean;
  className?: string;
  onPlayRelease?: (release: any) => void;
}

export const ReleaseCard = ({ 
  release, 
  showBuyButton = true, 
  className = '', 
  onPlayRelease
}: ReleaseCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const { state, actions } = useGlobalPlayer();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const isCurrentTrack = state.currentTrack?.id === release.id;
  const isPlaying = isCurrentTrack && state.isPlaying;
  const [customAmount, setCustomAmount] = useState(release.minimum_price || 0);
  const [showPayWhatYouWant, setShowPayWhatYouWant] = useState(false);

  const price = release.download_price || release.price || 0;
  const canPurchase = showBuyButton && (!user || user.id !== release.user_id);
  const isPWYW = release.pay_what_you_want;
  const audioSrc = release.download_url || release.preview_url;
  const hasAudio = !!audioSrc;
  const isTrackPlaying = isCurrentTrack && isPlaying;

  const playlistTrack = useMemo(
    () => ({
      id: release.id,
      title: release.title,
      artist: release.artist,
      src: audioSrc || '',
      artwork: release.cover_art_url,
      type: 'release' as const,
      releaseId: release.id,
      userId: release.user_id,
    }),
    [release.id, release.title, release.artist, audioSrc, release.cover_art_url, release.user_id]
  );

  const openPlaylistModal = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsPlaylistModalOpen(true);
  };

  const handlePurchase = async (amount?: number) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to purchase releases',
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(true);
    try {
      const finalAmount = amount || price;
      
      // Call the edge function to create a purchase
      const { data, error } = await supabase.functions.invoke('create-release-purchase', {
        body: {
          releaseId: release.id,
          amount: finalAmount
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      } else {
        toast({
          title: 'Purchase Successful!',
          description: 'Your download will be available in your dashboard',
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'Unable to process your purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handlePayWhatYouWant = () => {
    if (customAmount < (release.minimum_price || 0)) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum amount is ${formatCurrency(release.minimum_price || 0)}`,
        variant: 'destructive',
      });
      return;
    }
    handlePurchase(customAmount);
  };

  const handlePlay = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasAudio) {
      if (isCurrentTrack) {
        isPlaying ? actions.pause() : actions.resume();
      } else if (onPlayRelease) {
        onPlayRelease(release);
      } else {
        // Direct play if no custom handler
        actions.play({
          id: release.id,
          title: release.title,
          artist: release.artist,
          src: release.preview_url || release.download_url || '',
          artwork: release.cover_art_url,
          type: 'release',
          releaseId: release.id,
          price: release.price
        });
      }
    }
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          {release.cover_art_url ? (
            <img
              src={release.cover_art_url}
              alt={release.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-4xl">🎵</div>
            </div>
          )}
          
          {/* Global Audio Player Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm rounded-t-lg">
            <div className="flex items-center justify-end gap-2 p-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white"
                onClick={openPlaylistModal}
              >
                <ListPlus className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/90 text-black hover:bg-white"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasAudio && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        handlePlay(event);
                      }}
                    >
                      {isTrackPlaying ? 'Pause preview' : 'Play preview'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={openPlaylistModal}>
                    Add to playlist
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/release/${release.id}`}>View release</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {hasAudio && (
              <div className="flex items-center justify-center pb-4">
                <Button
                  size="lg"
                  onClick={handlePlay}
                  className="w-12 h-12 rounded-full bg-white/90 hover:bg-white text-black hover:scale-110 transition-all shadow-xl"
                >
                  {isTrackPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

    <CardContent className="p-3">
      <div className="space-y-2">
        <div>
          <Link to={`/release/${release.id}`}>
            <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors cursor-pointer">{release.title}</h3>
          </Link>
          <Link 
            to={`/profile/${release.user_id}`} 
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {release.artist}
          </Link>
        </div>
          
          <div className="flex items-center justify-between text-xs">
            {release.genre && (
              <EnhancedBadge variant="outline" className="text-xs px-1 py-0 h-4">
                {release.genre}
              </EnhancedBadge>
            )}
            {release.total_plays !== undefined && (
              <span className="text-muted-foreground">
                {release.total_plays} plays
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={openPlaylistModal}
            >
              <ListPlus className="w-3 h-3 mr-2" />
              Add to playlist
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hasAudio && (
                  <DropdownMenuItem onClick={handlePlay}>
                    {isTrackPlaying ? 'Pause preview' : 'Play preview'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={openPlaylistModal}>
                  Add to playlist
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/release/${release.id}`}>View details</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {canPurchase && (
            <div className="space-y-2">
              {/* Price Display */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {(release.price || 0) === 0 && (release.download_price || 0) === 0 ? 'Free' : (
                    isPWYW ? `From ${formatCurrency(release.minimum_price || 0)}` : formatCurrency(price)
                  )}
                </span>
                {isPWYW && (
                  <EnhancedBadge variant="secondary" className="text-xs px-1 py-0 h-4">
                    PWYW
                  </EnhancedBadge>
                )}
              </div>

              {/* Purchase Buttons */}
              {(release.price || 0) === 0 && (release.download_price || 0) === 0 ? (
                <Button 
                  className="w-full h-6 text-xs" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePurchase(0);
                  }}
                  disabled={purchasing}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Free Download
                </Button>
              ) : isPWYW ? (
                showPayWhatYouWant ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="amount" className="text-sm">Amount:</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                        min={release.minimum_price || 0}
                        step="0.01"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        className="flex-1 h-6 text-xs" 
                        size="sm"
                        onClick={handlePayWhatYouWant}
                        disabled={purchasing}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Buy {formatCurrency(customAmount)}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-6 text-xs"
                        size="sm"
                        onClick={() => setShowPayWhatYouWant(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Button 
                      className="w-full h-6 text-xs" 
                      size="sm"
                      onClick={() => handlePurchase(release.minimum_price)}
                      disabled={purchasing}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Buy {formatCurrency(release.minimum_price || 0)}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-6 text-xs" 
                      size="sm"
                      onClick={() => setShowPayWhatYouWant(true)}
                    >
                      PWYW
                    </Button>
                  </div>
                )
              ) : (
                <Button 
                  className="w-full h-6 text-xs" 
                  size="sm"
                  onClick={() => handlePurchase()}
                  disabled={purchasing}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Buy {formatCurrency(price)}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        track={playlistTrack}
      />
    </Card>
  );
};
