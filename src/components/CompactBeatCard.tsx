import { useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Heart, Share2, Verified, ListPlus, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PurchaseButton } from '@/components/checkout/PurchaseButton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlaylistModal } from '@/components/PlaylistModal';

interface Beat {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  preview_url?: string;
  image_url: string;
  created_at: string;
  uploaded_by_admin: boolean;
  producer_name: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
  } | null;
}

interface CompactBeatCardProps {
  beat: Beat;
  viewMode: 'grid' | 'list';
  isPlaying?: boolean;
  onPlay?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  onShare?: () => void;
}

export const CompactBeatCard = ({
  beat,
  viewMode,
  isPlaying = false,
  onPlay,
  onFavorite,
  isFavorited = false,
  onShare
}: CompactBeatCardProps) => {
  const artistName = beat.uploaded_by_admin
    ? (beat.producer_name || 'Internal Producer')
    : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist');
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const playlistTrack = useMemo(
    () => ({
      id: beat.id,
      title: beat.title,
      artist: artistName,
      src: beat.audio_url || beat.preview_url || '',
      artwork: beat.image_url,
      type: 'beat' as const,
      userId: beat.user_id
    }),
    [beat.id, beat.title, artistName, beat.audio_url, beat.preview_url, beat.image_url, beat.user_id]
  );

  const openPlaylistModal = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsPlaylistModalOpen(true);
  };

  const closePlaylistModal = () => setIsPlaylistModalOpen(false);

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-elegant transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 rounded-xl overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Artwork - Small */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                {beat.image_url ? (
                  <img
                    src={beat.image_url}
                    alt={beat.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>
                )}
              </div>
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                <div className="flex items-center justify-end gap-1 p-1.5">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-white/90 text-black hover:bg-white"
                    onClick={openPlaylistModal}
                  >
                    <ListPlus className="w-3 h-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-white/90 text-black hover:bg-white"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onPlay && (
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onPlay();
                          }}
                        >
                          {isPlaying ? 'Pause preview' : 'Play preview'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={openPlaylistModal}>
                        Add to playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/beat/${beat.id}`}>View beat</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-center pb-1.5">
                  <Button
                    size="sm"
                    onClick={onPlay}
                    className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-black p-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Link to={`/beat/${beat.id}`} className="hover:text-primary transition-colors">
                    <h3 className="font-semibold text-sm truncate">{beat.title}</h3>
                  </Link>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{artistName}</p>
                    {beat.uploaded_by_admin && (
                      <Verified className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                      {beat.genre}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {beat.bpm ? `${beat.bpm} BPM` : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {beat.key || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="flex items-center gap-2 ml-2">
                  <div className="text-sm font-bold text-primary">
                    {beat.price === 0 ? 'FREE' : formatCurrency(beat.price)}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={onFavorite}
                    >
                      <Heart className={`w-3 h-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={onShare}
                    >
                      <Share2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={openPlaylistModal}
                    >
                      <ListPlus className="w-3 h-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onPlay && (
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onPlay();
                            }}
                          >
                            {isPlaying ? 'Pause preview' : 'Play preview'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={openPlaylistModal}>
                          Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onShare}>
                          Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <PurchaseButton
                      item={{
                        id: beat.id,
                        type: 'beat',
                        title: beat.title,
                        price: beat.price,
                        metadata: {
                          genre: beat.genre,
                          bpm: beat.bpm,
                          key: beat.key,
                          tags: beat.tags
                        }
                      }}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      showPrice={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <PlaylistModal isOpen={isPlaylistModalOpen} onClose={closePlaylistModal} track={playlistTrack} />
      </Card>
    );
  }

  // Grid view - Compact card
  return (
    <Card className="group hover:shadow-elegant transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 rounded-xl">
      <div className="relative">
        {/* Beat Artwork - Smaller */}
        <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
          {beat.image_url ? (
            <img 
              src={beat.image_url} 
              alt={beat.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
          )}
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Button
            size="lg"
            onClick={onPlay}
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black hover:scale-110 transition-all shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
        </div>
        
        {/* License Badge */}
        {beat.price > 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-primary text-white border-0 text-xs font-bold px-2 py-0.5 rounded-full">
              Lease
            </Badge>
          </div>
        )}
        
        {/* Free Badge */}
        {beat.price === 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-green-500 text-white border-0 text-xs font-bold px-2 py-0.5 rounded-full">
              FREE
            </Badge>
          </div>
        )}
        
        {/* Favorite Button */}
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm"
            onClick={onFavorite}
          >
            <Heart className={`w-3 h-3 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 w-6 p-0 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm"
            onClick={openPlaylistModal}
          >
            <ListPlus className="w-3 h-3 text-white" />
          </Button>
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <div>
          <Link to={`/beat/${beat.id}`} className="hover:text-primary transition-colors">
            <h3 className="font-semibold text-sm line-clamp-1">{beat.title}</h3>
          </Link>
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground truncate">{artistName}</p>
            {beat.uploaded_by_admin && (
              <Verified className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{beat.bpm ? `${beat.bpm}` : 'N/A'}</span>
            <span>•</span>
            <span>{beat.key || 'N/A'}</span>
          </div>
          <div className="text-sm font-bold text-primary">
            {beat.price === 0 ? 'FREE' : formatCurrency(beat.price)}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs px-1 py-0 h-4">{beat.genre}</Badge>
          {beat.tags && beat.tags.slice(0, 1).map((tag, tagIndex) => (
            <Badge key={tagIndex} variant="outline" className="text-xs px-1 py-0 h-4">
              #{tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onShare}
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={openPlaylistModal}
            >
              <ListPlus className="w-3 h-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPlay && (
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onPlay();
                    }}
                  >
                    {isPlaying ? 'Pause preview' : 'Play preview'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={openPlaylistModal}>
                  Add to playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <PurchaseButton
            item={{
              id: beat.id,
              type: 'beat',
              title: beat.title,
              price: beat.price,
              metadata: {
                genre: beat.genre,
                bpm: beat.bpm,
                key: beat.key,
                tags: beat.tags
              }
            }}
            size="sm"
            className="text-xs h-6 px-2"
            showPrice={false}
          />
        </div>
      </CardContent>
      <PlaylistModal isOpen={isPlaylistModalOpen} onClose={closePlaylistModal} track={playlistTrack} />
    </Card>
  );
};