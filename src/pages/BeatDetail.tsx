import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Heart, 
  Share2, 
  Download, 
  Music, 
  Mic, 
  Radio, 
  Video,
  Users,
  ArrowLeft,
  ShoppingCart
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UniversalAudioPlayer } from '@/components/UniversalAudioPlayer';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import BeatRecommendations from '@/components/BeatRecommendations';
import ShareModal from '@/components/ShareModal';
import BeatLicensingModal from '@/components/BeatLicensingModal';
import { formatCurrency } from '@/lib/utils';
import SEOHelmet from '@/components/SEOHelmet';
import { SubscriptionGatedContent } from '@/components/SubscriptionGatedContent';
import { usePageMetadata } from '@/hooks/usePageMetadata';

type Beat = {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  created_at: string;
  user_id: string;
  uploaded_by_admin: boolean;
  producer_name: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
  } | null;
  owner_id?: string | null;
  owner_type?: string | null;
};

type LicenseOption = {
  id: string;
  name: string;
  price: number;
  formats: string[];
  features: string[];
  icon: React.ReactNode;
};

const BeatDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<{
    id: string;
    title: string;
    artist: string;
    src: string;
    artwork?: string | null;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [relatedBeats, setRelatedBeats] = useState<Beat[]>([]);
  const [isLicensingModalOpen, setIsLicensingModalOpen] = useState(false);

  const resolvedArtistName = beat
    ? beat.uploaded_by_admin
      ? beat.producer_name || 'Internal Producer'
      : beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist'
    : undefined;
  const beatDescription = beat?.description ? beat.description.slice(0, 160) : 'Browse exclusive beats on Pluggd.';
  const canonicalPath = beat ? `/beat/${beat.id}` : '/beat';

  usePageMetadata({
    title: beat ? `${beat.title} — ${resolvedArtistName ?? 'Pluggd Creator'} | Pluggd` : 'Beat Detail — Pluggd',
    description: beatDescription,
    path: canonicalPath,
    image: beat?.image_url ?? undefined,
  });


  useEffect(() => {
    if (id) {
      fetchBeat();
    }
  }, [id]);

  const fetchBeat = async () => {
    try {
      const { data: beatData, error: beatError } = await supabase
        .from('beats')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

       if (beatError) throw beatError;
       if (!beatData) throw new Error('Beat not found');

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('user_id', beatData.user_id)
         .maybeSingle();

      if (profileError) throw profileError;

      const beatWithProfile = {
        ...beatData,
        profiles: profileData
      };

      setBeat(beatWithProfile);

      // Fetch related beats from same artist
      const { data: relatedData } = await supabase
        .from('beats')
        .select('*')
        .eq('user_id', beatData.user_id)
        .eq('is_published', true)
        .neq('id', id)
        .limit(8);

      if (relatedData) {
        // Map with the same profile data since they're from the same user
        const relatedWithProfiles = relatedData.map(beat => ({
          ...beat,
          profiles: profileData
        }));
        setRelatedBeats(relatedWithProfiles);
      }
    } catch (error: any) {
      console.error('Error fetching beat:', error);
      toast({
        title: "Error",
        description: "Failed to load beat details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!beat) {
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pluggd.fm';
    const canonicalPath = `/beat/${beat.id}`;
    const byline = beat.producer_name ? ` by ${beat.producer_name}` : '';
    const description = beat.description?.trim() || `Discover the beat "${beat.title}"${byline} on Pluggd.`;
    const ogUrl = buildEntityOgImageUrl('beat', beat.id, {
      resourceUrl: `${origin}${canonicalPath}`,
    });

    setMeta(
      `${beat.title}${byline} | Pluggd`,
      description,
      canonicalPath,
      ogUrl,
    );
  }, [beat]);

  const handlePlayBeat = () => {
    if (!beat?.audio_url) return;
    
    const track = {
      id: beat.id,
      title: beat.title,
      artist: beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist'),
      src: beat.audio_url,
      artwork: beat.image_url
    };

    if (currentTrack?.id === beat.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTrackEnd = () => {
    setIsPlaying(false);
  };

  const handleLicenseClick = () => {
    setIsLicensingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-96">
              <LoadingSkeleton count={1} variant="card" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Beat Not Found</h1>
            <Link to="/marketplace">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const artistName = resolvedArtistName ?? 'Pluggd Creator';
  const membershipCreatorId = beat.owner_id || beat.user_id || 'unknown';
  const membershipCtaHref = beat.owner_id
    ? `/creator/${beat.owner_id}#membership`
    : `/creator/${beat.user_id}#membership`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <SEOHelmet
        config={{
          title: `${beat.title} — ${artistName} | Pluggd`,
          description: beatDescription,
          canonical: `/beat/${beat.id}`,
          keywords: [beat.title, artistName, beat.genre, `${beat.bpm} bpm`, 'instrumental beat'].filter(Boolean) as string[],
          ogType: 'music.song',
        }}
        artistData={{
          name: artistName,
          bio: beatDescription,
          image_url: beat.image_url,
          genres: beat.genre ? [beat.genre] : [],
        }}
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Link to="/marketplace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Beat Info */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden">
                <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-secondary/20">
                  {beat.image_url ? (
                    <img 
                      src={beat.image_url} 
                      alt={beat.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={handlePlayBeat}
                      className="w-16 h-16 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      {currentTrack?.id === beat.id && isPlaying ? (
                        <Pause className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold">{beat.title}</h1>
                       <p className="text-muted-foreground">
                         by {beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username)}
                       </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Button variant="ghost" size="sm">
                        <Heart className="w-4 h-4 mr-1" />
                        5
                      </Button>
                      <ShareModal beat={beat}>
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </ShareModal>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download for free
                      </Button>
                    </div>

                    <Separator />

                    {/* Track Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Published</p>
                          <p>{new Date(beat.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Genre</p>
                          <p>{beat.genre}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">BPM</p>
                          <p>{beat.bpm || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Key</p>
                          <p>{beat.key || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {beat.tags && beat.tags.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {beat.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Description */}
                    {beat.description && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            About
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {beat.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Licensing Options */}
            <SubscriptionGatedContent
              contentId={beat.id}
              contentType="track"
              creatorId={membershipCreatorId}
              ctaHref={membershipCtaHref}
              fallbackText="Become a member to unlock licensing, stems, and full downloads."
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Professional Licensing</CardTitle>
                  <p className="text-muted-foreground">
                    License this beat for commercial use with secure contract generation
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">Secure Beat Licensing</h3>
                      <p className="text-muted-foreground mb-4">
                        Get instant access to professional licensing with digital contracts,
                        fair pricing, and secure payments.
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Digital Contracts
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Secure Payments
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Fair Commission
                        </div>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full max-w-md"
                      onClick={handleLicenseClick}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      License This Beat
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Multiple license types available • Secure contract generation • Instant download
                    </p>
                  </div>
                </CardContent>
              </Card>
            </SubscriptionGatedContent>
          </div>

          {/* AI-Powered Recommendations */}
          <div className="mt-12">
            <BeatRecommendations currentBeat={beat} limit={6} />
          </div>

          {/* Related Beats */}
          {relatedBeats.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  More from {beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username)}
                </h2>
                <Link to={`/marketplace?artist=${beat.user_id}`}>
                  <Button variant="outline" size="sm">See all tracks</Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {relatedBeats.slice(0, 6).map((relatedBeat) => (
                  <Link key={relatedBeat.id} to={`/beat/${relatedBeat.id}`}>
                    <Card className="group hover:shadow-lg transition-shadow">
                      <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
                        {relatedBeat.image_url ? (
                          <img 
                            src={relatedBeat.image_url} 
                            alt={relatedBeat.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎵</div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-1">{relatedBeat.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(relatedBeat.price)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Beat Licensing Modal */}
      {beat && (
        <BeatLicensingModal
          isOpen={isLicensingModalOpen}
          onClose={() => setIsLicensingModalOpen(false)}
          beat={{
            id: beat.id,
            title: beat.title,
            user_id: beat.user_id,
            price: beat.price || 0
          }}
        />
      )}

      {/* Universal Audio Player */}
      <UniversalAudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onTrackEnd={handleTrackEnd}
      />
    </div>
  );
};

export default BeatDetail;
