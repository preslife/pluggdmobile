import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import spotifyIcon from "@/assets/spotify-icon.svg";
import appleMusicIcon from "@/assets/apple-music-icon.svg";
import youtubeIcon from "@/assets/youtube-icon.svg";
import soundcloudIcon from "@/assets/soundcloud-icon.svg";
import ReportButton from "./ReportButton";
import { getCreatorIdFromArtistName } from "@/utils/artistCreatorMapping";

interface Artist {
  id: string;
  name: string;
  bio: string;
  image_url: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  apple_music_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  is_featured: boolean;
}

interface ArtistCardProps {
  artist: Artist;
}

export const ArtistCard = ({ artist }: ArtistCardProps) => {
  const navigate = useNavigate();

  const SocialLinks = () => (
    <div className="flex gap-2 mt-3">
      {artist.spotify_url && (
        <Button variant="ghost" size="sm" asChild className="p-1">
          <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer">
            <img src={spotifyIcon} alt="Spotify" className="w-4 h-4" />
          </a>
        </Button>
      )}
      {artist.apple_music_url && (
        <Button variant="ghost" size="sm" asChild className="p-1">
          <a href={artist.apple_music_url} target="_blank" rel="noopener noreferrer">
            <img src={appleMusicIcon} alt="Apple Music" className="w-4 h-4" />
          </a>
        </Button>
      )}
      {artist.youtube_url && (
        <Button variant="ghost" size="sm" asChild className="p-1">
          <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer">
            <img src={youtubeIcon} alt="YouTube" className="w-4 h-4" />
          </a>
        </Button>
      )}
      {artist.soundcloud_url && (
        <Button variant="ghost" size="sm" asChild className="p-1">
          <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer">
            <img src={soundcloudIcon} alt="SoundCloud" className="w-4 h-4" />
          </a>
        </Button>
      )}
    </div>
  );

  const handleClick = () => {
    const creatorId = getCreatorIdFromArtistName(artist.name);
    if (creatorId) {
      navigate(`/creator/${creatorId}`);
    } else {
      navigate(`/artist/${artist.id}`);
    }
  };

  return (
    <div 
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="aspect-square overflow-hidden mb-3 bg-zinc-800 rounded">
        {artist.image_url ? (
          <img 
            src={artist.image_url} 
            alt={`${artist.name} photo`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            {artist.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-sm group-hover:text-gold transition-colors flex-1">
          {artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase()}
        </h3>
        <ReportButton 
          targetType="artist" 
          targetId={artist.id} 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      {artist.bio && (
        <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{artist.bio}</p>
      )}
      <SocialLinks />
    </div>
  );
};