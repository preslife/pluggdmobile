import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Music, Play, ShoppingCart, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";

interface Release {
  id: string;
  title: string;
  artist: string;
  cover_art_url?: string;
  dsp_links: any;
  price?: number;
  download_price?: number;
  preview_url?: string;
  description?: string;
  genre?: string;
  explicit?: boolean;
  is_instrumental?: boolean;
  user_id: string;
}

export const SmartLinkPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRelease = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from('releases')
          .select('*')
          .eq('smartlink_slug', slug)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        setRelease(data);
        
        // Set SEO meta tags
        setMeta(
          `${data.title} by ${data.artist} — Pluggd`,
          data.description || `Listen to ${data.title} by ${data.artist} on all streaming platforms`,
          `/r/${slug}`
        );
      } catch (error) {
        console.error('Error fetching release:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound || !release) {
    return <Navigate to="/404" replace />;
  }

  const dspPlatforms = [
    { key: 'spotify', name: 'Spotify', color: 'bg-green-500' },
    { key: 'apple', name: 'Apple Music', color: 'bg-gray-900' },
    { key: 'youtube', name: 'YouTube Music', color: 'bg-red-500' }
  ];

  const availablePlatforms = dspPlatforms.filter(
    platform => release.dsp_links?.[platform.key]
  );

  const hasPluggdPrice = release.price !== undefined && release.price !== null;

  return (
    <>
      {/* SEO Meta Tags */}
      <meta property="og:title" content={`${release.title} by ${release.artist}`} />
      <meta property="og:description" content={release.description || `Listen to ${release.title} by ${release.artist} on all streaming platforms`} />
      <meta property="og:image" content={release.cover_art_url || '/placeholder.svg'} />
      <meta property="og:type" content="music.song" />
      <meta property="og:url" content={`${window.location.origin}/r/${slug}`} />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${release.title} by ${release.artist}`} />
      <meta name="twitter:description" content={release.description || `Listen to ${release.title} by ${release.artist} on all streaming platforms`} />
      <meta name="twitter:image" content={release.cover_art_url || '/placeholder.svg'} />

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <Link to="/" className="text-muted-foreground hover:text-primary">
                ← Back to Pluggd
              </Link>
            </div>

            {/* Main Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Cover Art Section */}
                <div className="relative">
                  <img
                    src={release.cover_art_url || '/placeholder.svg'}
                    alt={`${release.title} cover art`}
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h1 className="text-3xl font-bold mb-2">{release.title}</h1>
                    <p className="text-xl opacity-90">{release.artist}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      {release.explicit && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          Explicit
                        </Badge>
                      )}
                      {release.is_instrumental && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          Instrumental
                        </Badge>
                      )}
                      {release.genre && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          {release.genre}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 space-y-6">
                  {/* Description */}
                  {release.description && (
                    <div>
                      <p className="text-muted-foreground">{release.description}</p>
                    </div>
                  )}

                  {/* Preview Player */}
                  {release.preview_url && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Preview</p>
                            <p className="text-sm text-muted-foreground">30 second preview</p>
                          </div>
                        </div>
                        <audio controls className="max-w-xs">
                          <source src={release.preview_url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    </div>
                  )}

                  {/* Streaming Platform Links */}
                  {availablePlatforms.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center">
                        <Music className="w-5 h-5 mr-2" />
                        Stream on
                      </h3>
                      <div className="grid gap-3">
                        {availablePlatforms.map((platform) => (
                          <Button
                            key={platform.key}
                            asChild
                            variant="outline"
                            className="justify-between h-12"
                          >
                            <a
                              href={release.dsp_links[platform.key]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <div className="flex items-center">
                                <div 
                                  className={`w-6 h-6 rounded ${platform.color} mr-3`}
                                ></div>
                                {platform.name}
                              </div>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pluggd Purchase Section */}
                  {hasPluggdPrice && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Buy on Pluggd
                      </h3>
                      <div className="space-y-3">
                        <Button asChild className="w-full h-12">
                          <Link to={`/release/${release.id}`}>
                            {release.price === 0 ? (
                              "Download Free"
                            ) : (
                              `Buy for £${release.price?.toFixed(2)}`
                            )}
                          </Link>
                        </Button>
                        <p className="text-sm text-muted-foreground text-center">
                          High-quality download + support the artist directly
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Powered by
                    </p>
                    <Link 
                      to="/" 
                      className="inline-flex items-center space-x-2 text-primary hover:text-primary/80"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="font-semibold">Pluggd</span>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default SmartLinkPage;