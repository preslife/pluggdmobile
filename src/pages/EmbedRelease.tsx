import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, ExternalLink, Heart, Download } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

interface Release {
  id: string;
  title: string;
  artist: string;
  cover_art_url?: string | null;
  preview_url?: string | null;
  price?: number | null;
  download_price?: number | null;
  genre?: string | null;
  user_id: string | null;
}

export default function EmbedRelease() {
  const { slug } = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const title = release ? `${release.title} — ${release.artist} | Pluggd` : 'Embedded Release Player — Pluggd';
  const description = release
    ? `Stream "${release.title}" by ${release.artist} and support the artist directly on Pluggd.`
    : 'Preview music releases directly within the Pluggd embeddable player.';

  usePageMetadata({
    title,
    description,
    path: slug ? `/embed/release/${slug}` : '/embed/release',
    image: release?.cover_art_url ?? undefined,
  });

  useEffect(() => {
    if (!slug) return;

    const fetchRelease = async () => {
      try {
        const { data, error } = await supabase
          .from('releases')
          .select('*')
          .eq('id', slug)
          .single();

        if (error) throw error;
        setRelease(data);
      } catch (error) {
        console.error('Error fetching release:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [slug]);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const togglePlay = () => {
    if (!release?.preview_url) return;

    if (!audio) {
      const newAudio = new Audio(release.preview_url);
      newAudio.addEventListener('ended', () => setPlaying(false));
      setAudio(newAudio);
      newAudio.play();
      setPlaying(true);
    } else {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        audio.play();
        setPlaying(true);
      }
    }
  };

  const openInPluggd = () => {
    window.open(`https://pluggd.fm/release/${slug}`, '_parent');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Release not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Cover Art and Play Button */}
            <div className="relative">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                {release.cover_art_url ? (
                  <img
                    src={release.cover_art_url}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                )}
              </div>
              
              {release.preview_url && (
                <Button
                  onClick={togglePlay}
                  size="lg"
                  className="absolute bottom-3 right-3 rounded-full w-12 h-12 p-0"
                >
                  {playing ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </Button>
              )}
            </div>

            {/* Release Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight">{release.title}</h3>
              <p className="text-muted-foreground text-sm">by {release.artist}</p>
              
              {release.genre && (
                <Badge variant="secondary" className="text-xs">
                  {release.genre}
                </Badge>
              )}

              <div className="flex flex-col gap-1">
                {release.price && release.price > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Stream:</span>
                    <span className="text-sm font-medium">£{release.price}</span>
                  </div>
                )}
                {release.download_price && release.download_price > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Download:</span>
                    <span className="text-sm font-medium">£{release.download_price}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={openInPluggd} className="flex-1" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on PLUGGD
              </Button>
              <Button variant="outline" size="sm" onClick={openInPluggd}>
                <Heart className="w-4 h-4" />
              </Button>
              {release.download_price && (
                <Button variant="outline" size="sm" onClick={openInPluggd}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Branding */}
            <div className="text-center pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Powered by{" "}
                <button
                  onClick={openInPluggd}
                  className="text-primary hover:underline font-medium"
                >
                  PLUGGD.fm
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}