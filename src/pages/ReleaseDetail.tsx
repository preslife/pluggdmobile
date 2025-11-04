import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Calendar, Clock, Eye, Download, Share, Music, TrendingUp, Users, FileText } from "lucide-react";
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
import ReportButton from "@/components/ReportButton";
import { DistributionExporter } from "@/components/DistributionExporter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import SEOHelmet from "@/components/SEOHelmet";
import { SecureDownloadButton } from "@/components/SecureDownloadButton";
import { setMeta } from "@/lib/seo";
import { buildEntityOgImageUrl } from "@/lib/og";

type PurchaseMetadata = {
  id: string;
  type: "release" | "beat" | "sample_pack";
};

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
  currency?: string | null;
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
  contributors?: unknown;
  lyrics?: string | null;
  digital_release_date?: string | null;
  preorder_enabled?: boolean | null;
  preorder_available_at?: string | null;
  preorder_inventory?: number | null;
  allow_gifting?: boolean | null;
  gift_message_template?: string | null;
}

interface ReleaseContributor {
  name: string;
  role?: string;
  profileUrl?: string;
}

interface ReleaseCredit {
  id: string;
  release_id: string;
  name: string;
  role: string;
  contribution_type?: string | null;
  profile_url?: string | null;
  metadata?: Record<string, unknown> | null;
}

const parseContributors = (value: unknown): ReleaseContributor[] => {
  if (!value) return [];

  const normaliseEntry = (entry: any): ReleaseContributor | null => {
    if (!entry) return null;

    if (typeof entry === 'string') {
      return { name: entry };
    }

    if (typeof entry === 'object') {
      const name = (entry.name || entry.full_name || entry.displayName || '').toString().trim();
      if (!name) return null;

      const role = entry.role || entry.title || entry.contribution;
      const profileUrl = entry.profileUrl || entry.profile_url || entry.url;

      return {
        name,
        role: role ? String(role) : undefined,
        profileUrl: profileUrl ? String(profileUrl) : undefined
      };
    }

    return null;
  };

  if (Array.isArray(value)) {
    return value
      .map(normaliseEntry)
      .filter(Boolean) as ReleaseContributor[];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseContributors(parsed);
    } catch (error) {
      console.warn('Unable to parse contributors JSON', error);
      return [];
    }
  }

  return [];
};

const ReleaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseMetadata, setPurchaseMetadata] = useState<PurchaseMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [credits, setCredits] = useState<ReleaseCredit[]>([]);
  const [contributors, setContributors] = useState<ReleaseContributor[]>([]);
  const [preorderPending, setPreorderPending] = useState(false);
  const [availableAt, setAvailableAt] = useState<string | null>(null);
  const [isPreorderPurchase, setIsPreorderPurchase] = useState(false);
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
      setContributors(parseContributors(releaseData?.contributors));

      const [tracksResponse, creditsResponse] = await Promise.all([
        supabase
          .from('tracks')
          .select('*')
          .eq('release_id', id)
          .order('track_number'),
        supabase
          .from('release_credits')
          .select('id, release_id, name, role, contribution_type, profile_url, metadata')
          .eq('release_id', id)
          .order('created_at', { ascending: true })
      ]);

      const { data: tracksData, error: tracksError } = tracksResponse;
      if (tracksError) {
        console.error('Error fetching tracks:', tracksError);
      } else {
        setTracks(tracksData || []);
      }

      const { data: creditsData, error: creditsError } = creditsResponse;
      if (creditsError) {
        console.error('Error fetching release credits:', creditsError);
      } else {
        setCredits(creditsData || []);
      }
    } catch (error) {
      console.error('Error fetching release:', error);
      toast.error('Failed to load release');
      setCredits([]);
      setContributors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!release) {
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pluggd.fm';
    const canonicalPath = `/release/${release.id}`;
    const shareDescription =
      release.description?.trim() ||
      `Listen to "${release.title}" by ${release.artist} on Pluggd.`;
    const ogUrl = buildEntityOgImageUrl('release', release.id, {
      resourceUrl: `${origin}${canonicalPath}`,
    });

    setMeta(
      `${release.title} by ${release.artist} | Pluggd`,
      shareDescription,
      canonicalPath,
      ogUrl,
    );
  }, [release]);

  const checkAccess = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase.functions.invoke('verify-release-access', {
        body: { releaseId: id }
      });

      if (error) throw error;

      const access = Boolean(data.hasAccess);
      const purchased = Boolean(data.hasPurchased);

      setHasAccess(access);
      setHasPurchased(purchased);
      setPreorderPending(Boolean(data.preorderPending));
      setAvailableAt(data.availableAt ?? null);
      setIsPreorderPurchase(Boolean(data.isPreorder));

      if (purchased && data.latestPurchaseId && data.latestPurchaseType) {
        setPurchaseMetadata({
          id: data.latestPurchaseId,
          type: data.latestPurchaseType,
        });
      } else {
        setPurchaseMetadata(null);
      }
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

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  const handlePurchaseSuccess = (payload: { immediateAccess?: boolean }) => {
    if (payload?.immediateAccess) {
      setHasPurchased(true);
      setHasAccess(true);
      toast.success('Purchase complete! Your download is now available.');
      void checkAccess();
    }
  };

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

              <div className="flex flex-col gap-4">
                {release.preorder_enabled && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {preorderPending
                      ? `You pre-ordered this release. It unlocks on ${
                          availableAt ? formatDateTime(availableAt) : formatDate(release.release_date)
                        }.`
                      : `Pre-order now to reserve your copy.${
                          availableAt ? ` Unlocks on ${formatDateTime(availableAt)}.` : ""
                        }`}
                  </div>
                )}

                {release.allow_gifting && (
                  <div className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 py-3 text-xs text-fuchsia-100">
                    Want to surprise someone? Choose “Send as Gift” at checkout and we’ll deliver it on your behalf.
                  </div>
                )}

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
                    allowGifting={Boolean(release.allow_gifting)}
                    giftMessageTemplate={release.gift_message_template}
                    preorderEnabled={Boolean(release.preorder_enabled)}
                    preorderAvailableAt={release.preorder_available_at}
                    preorderPending={preorderPending}
                    currency={release.currency ?? 'GBP'}
                    onSuccess={handlePurchaseSuccess}
                  />

                  <ArtistTipButton
                    artistId={user?.id || ''} // This should be the actual artist's user ID
                    artistName={release.artist}
                    releaseId={release.id}
                  />

                  {purchaseMetadata && hasAccess && (
                    <SecureDownloadButton
                      releaseId={release.id}
                      purchaseId={purchaseMetadata.id}
                      purchaseType={purchaseMetadata.type}
                      title={release.title}
                      disabled={tracks.length === 0}
                      className="gap-2"
                    />
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShareModalOpen(true)}
                    className="gap-2"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                  <ReportButton
                    targetType="release"
                    targetId={release.id}
                    className="gap-2"
                  />
                </div>
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
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="player">Player</TabsTrigger>
              <TabsTrigger value="tracklist">Tracklist</TabsTrigger>
              <TabsTrigger value="tracks">Manage</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
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
            <TabsContent value="credits" className="space-y-6">
              {contributors.length > 0 && (
                <section aria-labelledby="release-contributors-heading" className="space-y-3">
                  <h3 id="release-contributors-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Contributors
                  </h3>
                  <ul className="grid gap-3 md:grid-cols-2" role="list">
                    {contributors.map((contributor, index) => (
                      <li key={`${contributor.name}-${index}`} className="rounded-lg border bg-card p-4 shadow-sm">
                        <p className="font-medium text-foreground">{contributor.name}</p>
                        {contributor.role && (
                          <p className="text-sm text-muted-foreground">{contributor.role}</p>
                        )}
                        {contributor.profileUrl && (
                          <a
                            href={contributor.profileUrl}
                            className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View profile
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {credits.length > 0 && (
                <section aria-labelledby="release-credits-heading" className="space-y-3">
                  <h3 id="release-credits-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Detailed credits
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2" role="list">
                    {credits.map((credit) => (
                      <article key={credit.id} className="rounded-lg border bg-card p-4 shadow-sm" role="listitem">
                        <p className="font-semibold text-foreground">{credit.name}</p>
                        <p className="text-sm text-muted-foreground">{credit.role}</p>
                        {credit.contribution_type && (
                          <p className="text-xs text-muted-foreground">{credit.contribution_type}</p>
                        )}
                        {credit.profile_url && (
                          <a
                            href={credit.profile_url}
                            className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View contributor
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {contributors.length === 0 && credits.length === 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 p-8 text-center text-muted-foreground"
                >
                  <Users className="h-10 w-10" aria-hidden="true" />
                  <p className="text-base font-medium text-foreground">Credits not available</p>
                  <p className="text-sm max-w-md">
                    The artist hasn't added credits for this release yet. Check back soon for detailed collaborator information.
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="lyrics" className="space-y-4">
              {release.lyrics ? (
                <article
                  aria-label="Release lyrics"
                  className="rounded-lg border bg-muted/30 p-6 text-left"
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {release.lyrics}
                  </pre>
                </article>
              ) : (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 p-8 text-center text-muted-foreground"
                >
                  <FileText className="h-10 w-10" aria-hidden="true" />
                  <p className="text-base font-medium text-foreground">Lyrics not available</p>
                  <p className="text-sm max-w-md">
                    Lyrics for this release have not been shared yet. When they are published you'll find them here in full.
                  </p>
                </div>
              )}
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
