import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Share, 
  MessageCircle, 
  Repeat2, 
  Plus, 
  ExternalLink,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useShare } from '@/hooks/useShare';
import { useToast } from '@/hooks/use-toast';
import { PlaylistModal } from '@/components/PlaylistModal';

type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
  artwork?: string | null;
  duration?: number;
  releaseId?: string;
  userId?: string;
  type?: 'beat' | 'release';
};

interface PlayerOptionsMenuProps {
  track: Track;
}

export const PlayerOptionsMenu: React.FC<PlayerOptionsMenuProps> = ({
  track
}) => {
  const { shareToSocial, nativeShare, generateShareableLink } = useShare();
  const { toast } = useToast();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const handleShare = () => {
    const shareUrl = track.type === 'beat' 
      ? generateShareableLink(track.id)
      : track.releaseId 
        ? `${window.location.origin}/release/${track.releaseId}`
        : generateShareableLink(track.id);

    nativeShare({
      title: track.title,
      text: `Check out "${track.title}" by ${track.artist}`,
      url: shareUrl
    });
  };

  const handleRepost = () => {
    const shareUrl = track.type === 'beat' 
      ? generateShareableLink(track.id)
      : track.releaseId 
        ? `${window.location.origin}/release/${track.releaseId}`
        : generateShareableLink(track.id);

    shareToSocial('twitter', {
      title: track.title,
      text: `🔥 Just discovered "${track.title}" by ${track.artist} - this is fire!`,
      url: shareUrl
    });
  };

  const handleAddToPlaylist = () => {
    setIsPlaylistModalOpen(true);
  };

  const getTrackUrl = () => {
    if (track.type === 'beat') {
      return `/beat/${track.id}`;
    } else if (track.releaseId) {
      return `/release/${track.releaseId}`;
    }
    return '#';
  };

  const getArtistUrl = () => {
    if (track.userId) {
      return `/profile/${track.userId}`;
    }
    return '#';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="w-8 h-8"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleRepost}>
            <Repeat2 className="w-4 h-4 mr-2" />
            Repost
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to={getTrackUrl()}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Comments
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleShare}>
            <Share className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleAddToPlaylist}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Playlist
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem asChild>
            <Link to={getTrackUrl()}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Track
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to={getArtistUrl()}>
              <User className="w-4 h-4 mr-2" />
              Go to Artist
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        track={track}
      />
    </>
  );
};