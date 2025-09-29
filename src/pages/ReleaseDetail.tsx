import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Calendar, Clock, Eye, Download, Share, Music, TrendingUp } from "lucide-react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReleasePlayer } from "@/components/ReleasePlayer";
import { ReleasePurchaseButton } from "@/components/ReleasePurchaseButton";
import { ArtistTipButton } from "@/components/ArtistTipButton";
import { ReleasePreviewPlayer } from "@/components/ReleasePreviewPlayer";
import { ReleaseComments } from "@/components/ReleaseComments";
import { TracksManager } from "@/components/TracksManager";
import ReleaseShareModal from "@/components/ReleaseShareModal";
import { DistributionExporter } from "@/components/DistributionExporter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SEOHelmet from "@/components/SEOHelmet";

interface Track {
  id: string;
  title: string;
  duration: number;
  track_number: number;
  audio_url: string;
  play_count?: number;
}

interface Release {
  id: string;
  title: string;
  artist: string;
  description: string;
  genre: string;
  release_type: string;
  release_date: string;
  cover_art_url: string;
  price: number;
  download_price?: number;
  pay_what_you_want: boolean;
  minimum_price: number;
  total_plays: number;
  total_revenue: number;
  is_premium_content: boolean;
  approval_status: string;
  scheduled_publish_date: string | null;
  spotify_url: string;
  apple_music_url: string;
  youtube_url: string;
  soundcloud_url: string;
  preview_url?: string;
  user_id?: string; // Creator of the release
}

const ReleaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchReleaseData();
      checkAccess();
    }
  }, [id, user]);

  useEffect(() => {
    if (searchParams.get('purchased') === 'true') {
      toast.success('Purchase successful! Thank you for your support.');
    }
    if (searchParams.get('tip_sent') === 'true') {
      toast.success('Tip sent successfully! The artist will appreciate your support.');
    }
  }, [searchParams]);

  const fetchReleaseData = async () => {
    try {
      // Fetch release
      const { data: releaseData, error: releaseError } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single();

      if (releaseError) throw releaseError;
      setRelease(releaseData);

      // Fetch tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', id)
        .order('track_number');

      if (tracksError) {
        console.error('Error fetching tracks:', tracksError);
        // Don't throw error if tracks don't exist yet
      } else {
        setTracks(tracksData || []);
      }
    } catch (error) {
      console.error('Error fetching release:', error);
      toast.error('Failed to load release');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-release-access', {
        body: { releaseId: id }
      });

      if (error) throw error;

      setHasAccess(data.hasAccess);
      setHasPurchased(data.hasPurchased);
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
        <main className="pt-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="aspect-square bg-muted rounded-lg" />
                </div>
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
        <main className="pt-24 px-4">
          <div className="max-w-6xl mx-auto text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Release Not Found</h1>
            <p className="text-muted-foreground">The release you're looking for doesn't exist or has been removed.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        config={{
          title: `${release.title} — ${release.artist} | Pluggd`,
          description: release.description || `${release.release_type} by ${release.artist}`,
          canonical: `/release/${release.id}`,
          keywords: [release.artist, release.title, release.genre, 'music release'].filter(Boolean) as string[],
        }}
        releaseData={{
          title: release.title,
          artist: release.artist,
          description: release.description,
          cover_art_url: release.cover_art_url,
          genre: release.genre,
          release_date: release.release_date,
          duration: totalDuration,
          price: Math.round((release.price || 0) * 100),
        }}
      />
      <DomainAwareNavigation />
      <main className="pt-24 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <img
                  src={release.cover_art_url || '/placeholder.svg'}
                  alt={`${release.title} cover art`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {!hasAccess && release.price > 0 && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-white text-center">
                      <Download className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-semibold">Purchase to Download</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Standalone Audio Preview Player */}
              {release.preview_url && (
                <div className="mt-4">
                  <ReleasePreviewPlayer
                    previewUrl={release.preview_url}
                    title={release.title}
                    artist={release.artist}
                    standalone={true}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{release.release_type}</Badge>
                  <Badge variant="outline">{release.genre}</Badge>
                  {release.is_premium_content && (
                    <Badge variant="default">Premium</Badge>
                  )}
                </div>
                <h1 className="text-4xl font-bold mb-2">{release.title}</h1>
                <p className="text-xl text-muted-foreground mb-4">by {release.artist}</p>
                
                {release.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {release.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(release.release_date)}
                </div>
                {tracks.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Music className="h-4 w-4" />
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                  </div>
                )}
                {totalDuration > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(totalDuration)}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {release.total_plays.toLocaleString()} plays
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <ReleasePurchaseButton
                  releaseId={release.id}
                  price={release.price}
                  download_price={release.download_price}
                  payWhatYouWant={release.pay_what_you_want}
                  minimumPrice={release.minimum_price}
                  title={release.title}
                  artist={release.artist}
                  hasPurchased={hasPurchased}
                />
                
                <ArtistTipButton
                  artistId={user?.id || ''} // This should be the actual artist's user ID
                  artistName={release.artist}
                  releaseId={release.id}
                />

                <Button
                  variant="outline"
                  onClick={() => setShareModalOpen(true)}
                  className="gap-2"
                >
                  <Share className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Streaming Links */}
              {(release.spotify_url || release.apple_music_url || release.youtube_url || release.soundcloud_url) && (
                <div>
                  <p className="text-sm font-medium mb-2">Available on:</p>
                  <div className="flex flex-wrap gap-2">
                    {release.spotify_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={release.spotify_url} target="_blank" rel="noopener noreferrer">
                          Spotify
                        </a>
                      </Button>
                    )}
                    {release.apple_music_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={release.apple_music_url} target="_blank" rel="noopener noreferrer">
                          Apple Music
                        </a>
                      </Button>
                    )}
                    {release.youtube_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={release.youtube_url} target="_blank" rel="noopener noreferrer">
                          YouTube
                        </a>
                      </Button>
                    )}
                    {release.soundcloud_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer">
                          SoundCloud
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Content Tabs */}
          <Tabs defaultValue="player" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="player">Player</TabsTrigger>
              <TabsTrigger value="tracklist">Tracklist</TabsTrigger>
              <TabsTrigger value="tracks">Manage</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="player" className="space-y-6">
              {tracks.length > 0 ? (
                <ReleasePlayer
                  releaseId={release.id}
                  tracks={tracks.map(track => ({
                    ...track,
                    audio_url: track.audio_url
                  }))}
                  hasAccess={hasAccess}
                  onPlayStart={() => {
                    // Track play started
                  }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tracks available for this release yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracklist" className="space-y-4">
              {tracks.length > 0 ? (
                <div className="space-y-2">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium w-8 text-center">
                          {track.track_number}
                        </span>
                        <div>
                          <h4 className="font-medium">{track.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDuration(track.duration || 0)}</span>
                           <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {(track.play_count || 0).toLocaleString()} plays
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tracks have been added to this release yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracks" className="space-y-6">
              <TracksManager 
                releaseId={release.id}
                tracks={tracks}
                onTracksUpdate={setTracks}
                canEdit={user?.id === release.user_id} // Allow release owner to edit
              />
            </TabsContent>

            <TabsContent value="distribution" className="space-y-6">
              {user?.id === release.user_id ? (
                <DistributionExporter
                  releaseId={release.id}
                  releaseTitle={release.title}
                  platforms={{
                    spotify: !!release.spotify_url,
                    apple_music: !!release.apple_music_url,
                    youtube_music: !!release.youtube_url
                  }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Distribution management is only available to the release owner.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments">
              <ReleaseComments releaseId={release.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ReleaseShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={release.title}
        artist={release.artist}
        url={window.location.href}
        description={release.description || `Check out this ${release.release_type} by ${release.artist} on Pluggd`}
        coverArt={release.cover_art_url}
        releaseType={release.release_type}
        genre={release.genre}
      />
    </div>
  );
};

export default ReleaseDetail;
