import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, ExternalLink, Heart } from "lucide-react";
import { formatCredits } from "@/hooks/useWallet";

interface Beat {
  id: string;
  title: string;
  producer_name: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  price?: number;
  genre?: string | null;
  bpm?: number | null;
  user_id: string;
}

export default function EmbedBeat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchBeat = async () => {
      try {
        const { data, error } = await supabase
          .from('beats')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setBeat(data);
      } catch (error) {
        console.error('Error fetching beat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBeat();
  }, [id]);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  const togglePlay = () => {
    if (!beat?.audio_url) return;

    if (!audio) {
      const newAudio = new Audio(beat.audio_url);
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
    window.open(`https://pluggd.fm/beat/${id}`, '_parent');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Beat not found</p>
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
            {/* Artwork and Play Button */}
            <div className="relative">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {beat.image_url ? (
                  <img
                    src={beat.image_url}
                    alt={beat.title}
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
              
              {beat.audio_url && (
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

            {/* Beat Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight">{beat.title}</h3>
              <p className="text-muted-foreground text-sm">by {beat.producer_name || 'Unknown'}</p>
              
              <div className="flex flex-wrap gap-2">
                {beat.genre && (
                  <Badge variant="secondary" className="text-xs">
                    {beat.genre}
                  </Badge>
                )}
                {beat.bpm && (
                  <Badge variant="outline" className="text-xs">
                    {beat.bpm} BPM
                  </Badge>
                )}
              </div>

              {beat.price && beat.price > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="font-medium">{formatCredits(beat.price)} Credits</span>
                </div>
              )}
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