import { formatCurrency } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Calendar, ArrowLeft, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePageMetadata } from "@/hooks/usePageMetadata";

import { ReleasePreviewPlayer } from "@/components/ReleasePreviewPlayer";
import { SubscriptionGatedContent } from "@/components/SubscriptionGatedContent";
import spotifyIcon from "@/assets/spotify-icon.svg";
import appleMusicIcon from "@/assets/apple-music-icon.svg";
import youtubeIcon from "@/assets/youtube-icon.svg";
import soundcloudIcon from "@/assets/soundcloud-icon.svg";
import { fetchMembershipAccessRules } from "@/services/memberships/accessRules";

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
  is_featured: boolean;
  download_url: string;
  download_price: number;
  featured_artist: string;
  release_type: string;
  preview_url: string;
  owner_id?: string | null;
  owner_type?: string | null;
  user_id?: string | null;
  perk_access?: string | null;
}

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_url: string;
  duration: number;
}

interface TierSummary {
  id: string;
  name: string;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string | null;
}

const formatTierPrice = (tier: TierSummary | null) => {
  if (!tier) return null;
  const price = tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime;
  if (price == null) return null;
  const value = price >= 1000 ? price / 100 : price;
  return formatCurrency(value, tier.currency ?? "USD");
};

const Release = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateRule, setGateRule] = useState<Awaited<ReturnType<typeof fetchMembershipAccessRules>> | null>(null);
  const [gateTiers, setGateTiers] = useState<TierSummary[]>([]);

  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const { toast } = useToast();

  const metaTitle = release ? `${release.title} — ${release.artist} | Pluggd` : 'Release — Pluggd';
  const metaDescription = release?.description
    ? release.description.slice(0, 160)
    : 'Discover exclusive music releases and support creators on Pluggd.';

  usePageMetadata({
    title: metaTitle,
    description: metaDescription,
    path: id ? `/release/${id}` : '/release',
    image: release?.cover_art_url ?? undefined,
  });
  const { user } = useAuth();

  const handlePreviewPlay = (releaseId: string) => {
    setPreviewPlayingId(releaseId);
  };

  const handlePreviewPause = () => {
    setPreviewPlayingId(null);
  };

  const handleBuyNow = async () => {
    if (!release) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase this release." });
      navigate(`/auth?redirect=/release/${id}`);
      return;
    }
    if (!isStoreProduct) {
      toast({
        title: "Not available",
        description: "This release is not available for purchase yet.",
      });
      return;
    }

    try {
      toast({ title: "Redirecting to checkout...", description: "Secure payment via Stripe" });
      const { data, error } = await supabase.functions.invoke('create-store-checkout', {
        body: { cartItems: [{ productId: release.id, quantity: 1 }] }
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message || "Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (id) {
      fetchRelease(id);
      fetchTracks(id);
    }
  }, [id]);

  const fetchRelease = async (releaseId: string) => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .eq('id', releaseId)
        .maybeSingle();

       if (error) throw error;
       if (!data) throw new Error('Release not found');

      let releaseWithGate = data;
      try {
        const accessRule = await fetchMembershipAccessRules('release', releaseId);
        setGateRule(accessRule ?? null);
        if (accessRule) {
          releaseWithGate = {
            ...data,
            owner_id: accessRule.owner_id ?? data.owner_id ?? data.user_id ?? null,
            owner_type: accessRule.owner_type ?? data.owner_type ?? null,
          };
        }
      } catch (lookupError) {
        console.error('Failed to load membership access rules', lookupError);
        setGateRule(null);
      }

      setRelease(releaseWithGate);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load release",
        variant: "destructive",
      });
      navigate('/label');
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async (releaseId: string) => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('release_id', releaseId)
        .order('track_number');

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  useEffect(() => {
    let active = true;
    const loadTiers = async () => {
      if (!gateRule?.owner_id || !gateRule.owner_type) {
        if (active) setGateTiers([]);
        return;
      }

      const { data, error } = await supabase
        .from("membership_tiers")
        .select("id, name, tier_order, price_monthly, price_yearly, price_lifetime, currency")
        .eq("owner_id", gateRule.owner_id)
        .eq("owner_type", gateRule.owner_type)
        .eq("status", "active")
        .order("tier_order", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Failed to load gating tier metadata", error);
        setGateTiers([]);
      } else {
        setGateTiers((data as TierSummary[]) ?? []);
      }
    };

    void loadTiers();
    return () => {
      active = false;
    };
  }, [gateRule]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const previewSourceUrl = release?.preview_url || tracks[0]?.audio_url || null;

  const membershipCreatorId = release?.owner_id || release?.user_id || "unknown";
  const membershipCtaHref = release?.owner_id
    ? `/creator/${release.owner_id}#membership`
    : release?.user_id
    ? `/creator/${release.user_id}#membership`
    : "/subscription";

  const gateSummary = useMemo(() => {
    if (!gateRule) return null;

    const allowedNames = gateRule.allowed_tier_ids?.map((id) => {
      const tier = gateTiers.find((t) => t.id === id);
      return tier?.name;
    }).filter(Boolean) as string[] | undefined;

    const minimumTier = gateRule.minimum_tier_id
      ? gateTiers.find((tier) => tier.id === gateRule.minimum_tier_id) ?? null
      : null;

    switch (gateRule.gate_type) {
      case "any_tier":
        return "Any active membership unlocks this release.";
      case "specific_tier":
        if (!allowedNames || allowedNames.length === 0) {
          return "Exclusive to select membership tiers.";
        }
        if (allowedNames.length === 1) {
          return `Exclusive to ${allowedNames[0]} members.`;
        }
        return `Exclusive to ${allowedNames.slice(0, -1).join(", ")} or ${allowedNames.slice(-1)} members.`;
      case "tier_or_higher": {
        const base = minimumTier ? `Unlocked at ${minimumTier.name} tier or above.` : "Unlocked above a specific tier.";
        const price = formatTierPrice(minimumTier);
        return price ? `${base} Starts at ${price}.` : base;
      }
      default:
        return null;
    }
  }, [gateRule, gateTiers]);

  // Check if this release is also available as a store product
  const [isStoreProduct, setIsStoreProduct] = useState(false);
  const [storeProduct, setStoreProduct] = useState<any>(null);

  useEffect(() => {
    const checkStoreProduct = async () => {
      if (!release?.id) return;
      
      const { data: product } = await supabase
        .from('store_products')
        .select('*')
        .eq('id', release.id)
        .maybeSingle();
        
      if (product) {
        setIsStoreProduct(true);
        setStoreProduct(product);
      }
    };

    checkStoreProduct();
  }, [release?.id]);

  const StreamingLinks = ({ release }: { release: Release }) => (
    <div className="flex gap-2 flex-wrap">
      {release.spotify_url && (
        <Button variant="outline" size="sm" asChild className="p-2">
          <a href={release.spotify_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={spotifyIcon} 
              alt="Spotify" 
              className="w-5 h-5" 
            />
          </a>
        </Button>
      )}
      {release.apple_music_url && (
        <Button variant="outline" size="sm" asChild className="p-2">
          <a href={release.apple_music_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={appleMusicIcon} 
              alt="Apple Music" 
              className="w-5 h-5" 
              style={{ filter: 'invert(0.2) sepia(1) saturate(3) hue-rotate(350deg) brightness(1.2)' }}
            />
          </a>
        </Button>
      )}
      {release.youtube_url && (
        <Button variant="outline" size="sm" asChild className="p-2">
          <a href={release.youtube_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={youtubeIcon} 
              alt="YouTube" 
              className="w-5 h-5" 
              style={{ filter: 'invert(0.2) sepia(1) saturate(3) hue-rotate(350deg) brightness(1.2)' }}
            />
          </a>
        </Button>
      )}
      {release.soundcloud_url && (
        <Button variant="outline" size="sm" asChild className="p-2">
          <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={soundcloudIcon} 
              alt="SoundCloud" 
              className="w-5 h-5" 
            />
          </a>
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="flex items-center justify-center py-24">
          <Music className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Release not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/label')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Label
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Artwork and Purchase */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              {release.cover_art_url && (
                <div className="aspect-square overflow-hidden">
                  <img 
                    src={release.cover_art_url} 
                    alt={`${release.title} cover art`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
               <CardContent className="p-6">
                 {release.download_url && (
                   <div className="space-y-3">
                     <div className="text-center mb-4">
                         <div className="text-2xl font-bold text-primary">
                          {formatCurrency(release.download_price || 0)}
                        </div>
                       <div className="text-sm text-muted-foreground">
                         One-time purchase
                       </div>
                     </div>
                     
                      {/* Purchase Actions */}
                      {release.download_url && (release.download_price || 0) > 0 && isStoreProduct && (
                        <div className="space-y-2">
                          <Button onClick={handleBuyNow} className="w-full">
                            Buy Now
                          </Button>
                          <Button variant="outline" asChild className="w-full">
                            <a href={`/product/${release.id}`}>View in Store</a>
                          </Button>
                        </div>
                      )}

                      {/* Free download */}
                      {release.download_url && ((release.download_price || 0) <= 0) && (
                        <div className="space-y-2">
                          <Button asChild className="w-full">
                            <a href={release.download_url} target="_blank" rel="noopener noreferrer">Download Free</a>
                          </Button>
                          {isStoreProduct && (
                            <Button variant="outline" asChild className="w-full">
                              <a href={`/product/${release.id}`}>View in Store</a>
                            </Button>
                          )}
                        </div>
                      )}
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>

          {/* Release Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold">{release.title}</h1>
                {release.is_featured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
              </div>
              <p className="text-2xl text-primary font-medium mb-2">{release.artist.charAt(0).toUpperCase() + release.artist.slice(1).toLowerCase()}</p>
              {release.featured_artist && (
                <p className="text-lg text-muted-foreground mb-4">
                  feat. {release.featured_artist.charAt(0).toUpperCase() + release.featured_artist.slice(1).toLowerCase()}
                </p>
              )}
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(release.release_date)}
                </div>
                {release.genre && (
                  <Badge variant="outline">{release.genre}</Badge>
                )}
                <Badge variant="outline">{release.release_type}</Badge>
              </div>

              {release.description && (
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {release.description}
                </p>
              )}

              {gateRule && (
                <div className="mb-6 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      Membership exclusive
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {gateSummary ?? "Only members of this creator can unlock the full experience."}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <a href={membershipCtaHref}>View membership</a>
                  </Button>
                </div>
              )}

            <SubscriptionGatedContent
              contentId={release.id}
              contentType="release"
              creatorId={membershipCreatorId}
              ctaHref={membershipCtaHref}
              fallbackText="Join this creator's membership to unlock the full release experience."
              previewContent={
                previewSourceUrl ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4" />
                      <span className="text-sm font-medium">Preview</span>
                    </div>
                    <ReleasePreviewPlayer
                      previewUrl={previewSourceUrl}
                      title={release.title}
                      artist={release.artist}
                      isPlaying={previewPlayingId === release.id}
                      onPlay={() => handlePreviewPlay(release.id)}
                      onPause={handlePreviewPause}
                      standalone
                    />
                  </div>
                ) : undefined
              }
              className="space-y-6"
            >
              <div className="p-6 space-y-6">
                {release.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {release.description}
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Streaming Platforms</h3>
                    <StreamingLinks release={release} />
                  </div>

                  {previewSourceUrl && (
                    <div className="rounded-lg border border-dashed border-primary/30 bg-muted/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Play className="w-4 h-4" />
                        <span className="text-sm font-medium">Full Preview</span>
                      </div>
                      <ReleasePreviewPlayer
                        previewUrl={previewSourceUrl}
                        title={release.title}
                        artist={release.artist}
                        isPlaying={previewPlayingId === release.id}
                        onPlay={() => handlePreviewPlay(release.id)}
                        onPause={handlePreviewPause}
                        standalone
                      />
                    </div>
                  )}
                </div>

                {tracks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Track List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-6">
                                {track.track_number}
                              </span>
                              <Play className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{track.title}</span>
                            </div>
                            {track.duration && (
                              <span className="text-sm text-muted-foreground">
                                {formatDuration(track.duration)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </SubscriptionGatedContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Release;
