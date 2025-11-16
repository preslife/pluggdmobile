import { useState, useEffect, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Music, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";

import spotifyIcon from "@/assets/spotify-icon.svg";
import appleMusicIcon from "@/assets/apple-music-icon.svg";
import youtubeIcon from "@/assets/youtube-icon.svg";
import soundcloudIcon from "@/assets/soundcloud-icon.svg";
import { PlugProvider } from "@/features/fanMap/contexts/PlugContext";
import MapModal from "@/features/fanMap/components/MapModal";

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

interface Release {
  id: string;
  title: string;
  artist: string;
  description: string;
  release_date: string;
  cover_art_url: string;
  spotify_url: string;
  apple_music_url: string;
  youtube_url: string;
  soundcloud_url: string;
  genre: string;
}

const Artist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchArtistData();
    }
  }, [id]);

  const fetchArtistData = async () => {
    try {
      const [artistRes, releasesRes] = await Promise.all([
        supabase.from('artists').select('*').eq('id', id).maybeSingle(),
        supabase.from('releases').select('*').eq('artist', artist?.name || '').order('release_date', { ascending: false })
      ]);

      if (artistRes.error && artistRes.error.code !== 'PGRST116') {
        throw artistRes.error;
      }

      if (artistRes.data) {
        setArtist(artistRes.data);
        
        // Fetch releases for this artist
        const artistReleasesRes = await supabase
          .from('releases')
          .select('*')
          .eq('artist', artistRes.data.name)
          .order('release_date', { ascending: false });
          
        if (artistReleasesRes.error) throw artistReleasesRes.error;
        setReleases(artistReleasesRes.data || []);
      } else {
        toast({
          title: "Artist not found",
          description: "The requested artist could not be found.",
          variant: "destructive",
        });
        navigate('/label');
      }
    } catch (error) {
      console.error('Error fetching artist:', error);
      toast({
        title: "Error",
        description: "Failed to load artist information",
        variant: "destructive",
      });
      navigate('/label');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const SocialLinks = () => (
    <div className="flex gap-3 mt-6">
      {artist?.spotify_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer">
            <img src={spotifyIcon} alt="Spotify" className="w-6 h-6" />
          </a>
        </Button>
      )}
      {artist?.apple_music_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={artist.apple_music_url} target="_blank" rel="noopener noreferrer">
            <img src={appleMusicIcon} alt="Apple Music" className="w-6 h-6" />
          </a>
        </Button>
      )}
      {artist?.youtube_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer">
            <img src={youtubeIcon} alt="YouTube" className="w-6 h-6" />
          </a>
        </Button>
      )}
      {artist?.soundcloud_url && (
        <Button variant="ghost" size="sm" asChild className="p-2 hover:bg-white/10">
          <a href={artist.soundcloud_url} target="_blank" rel="noopener noreferrer">
            <img src={soundcloudIcon} alt="SoundCloud" className="w-6 h-6" />
          </a>
        </Button>
      )}
    </div>
  );

  useEffect(() => {
    if (!artist) return;
    const description = artist.bio
      ? artist.bio.slice(0, 155)
      : `Explore music, releases, and social links from ${artist.name} on Pluggd.`;
    setMeta(
      `${artist.name} — Artist Profile | Pluggd`,
      description,
      id ? `/artist/${id}` : undefined,
      artist.image_url || undefined
    );
  }, [artist, id]);

  let content: ReactNode;

  if (loading) {
    content = (
      <div className="min-h-screen bg-black text-white">
        <div className="pt-8 flex items-center justify-center">
          <Music className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  } else if (!artist) {
    content = (
      <div className="min-h-screen bg-black text-white">
        <div className="pt-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Artist not found</h1>
          <Button onClick={() => navigate('/label')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Label
          </Button>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <section className="pt-8 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <Button 
              onClick={() => navigate('/label')}
              variant="ghost" 
              className="mb-8 hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Label
            </Button>
            
            <div className="flex flex-col lg:flex-row gap-12 items-start">
              <div className="flex-shrink-0">
                <div className="w-80 h-80 overflow-hidden rounded-lg bg-zinc-800">
                  {artist.image_url ? (
                    <img 
                      src={artist.image_url} 
                      alt={`${artist.name} photo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-zinc-600">
                      {artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 w-full">
                <h1 className="text-6xl font-bold mb-6">{artist.name.charAt(0).toUpperCase() + artist.name.slice(1).toLowerCase()}</h1>
                {artist.bio && (
                  <p className="text-xl text-white/90 mb-6 leading-relaxed">
                    {artist.bio}
                  </p>
                )}
                <SocialLinks />

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_15px_45px_-15px_rgba(0,0,0,0.7)]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/70 uppercase tracking-wide mb-1">Fan Map</p>
                      <p className="text-lg font-semibold">
                        See where supporters are plugging in for {artist.name}
                      </p>
                      <p className="text-sm text-white/70 mt-1">
                        Explore global messages and featured tips in real time.
                      </p>
                    </div>
                    <Button
                      className="gap-2 bg-white text-black hover:bg-white/90"
                      onClick={() => setIsMapOpen(true)}
                    >
                      <MapPin className="w-4 h-4" />
                      Open Fan Map
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Releases Section */}
        <section className="py-16 px-6 bg-zinc-900">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12">Releases</h2>
            {releases.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {releases.map((release) => (
                  <div 
                    key={release.id} 
                    className="group cursor-pointer"
                    onClick={() => navigate(`/release/${release.id}`)}
                  >
                    <div className="aspect-square overflow-hidden mb-3 bg-zinc-800 rounded">
                      {release.cover_art_url ? (
                        <img 
                          src={release.cover_art_url} 
                          alt={`${release.title} cover art`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-gold transition-colors">
                      {release.title}
                    </h3>
                    <p className="text-sm text-zinc-400">{formatDate(release.release_date)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Music className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                <p className="text-zinc-400">No releases found for this artist</p>
              </div>
            )}
          </div>
        </section>

        <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </div>
    );
  }

  return <PlugProvider creatorId={id ?? null}>{content}</PlugProvider>;
};

export default Artist;
