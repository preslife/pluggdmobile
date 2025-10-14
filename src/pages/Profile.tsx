import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { StorefrontLayout } from "@/components/StorefrontLayout";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEOHelmet from "@/components/SEOHelmet";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Card, CardContent } from "@/components/ui/card";

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  location?: string | null;
  is_verified?: boolean;
  genres?: string[];
  social_links?: {
    website?: string;
    instagram?: string;
    twitter?: string;
    spotify?: string;
    youtube?: string;
  };
  created_at: string;
}

interface Beat {
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
  play_count?: number;
  purchase_count?: number;
  featured?: boolean;
  is_exclusive?: boolean;
}

interface Release {
  id: string;
  title: string;
  artist: string;
  description?: string;
  genre?: string;
  price: number;
  cover_art_url: string;
  audio_url?: string;
  created_at: string;
  play_count?: number;
  purchase_count?: number;
  featured?: boolean;
}


const Profile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [stats, setStats] = useState({
    total_plays: 0,
    total_sales: 0,
    monthly_listeners: 0,
    fan_funding_raised: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('fan_sub');
    const sessionId = params.get('session_id');
    if (status === 'success' && sessionId) {
      supabase.functions.invoke('verify-fan-subscription', {
        body: { sessionId, creatorId: userId },
      }).then(({ error }) => {
        if (!error) {
          toast({ title: 'Subscription activated', description: 'Thanks for supporting this creator!' });
        }
      }).finally(() => {
        // Clean the URL
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Fetch user's public beats
      const { data: beatsData } = await supabase
        .from('beats')
        .select('*')
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Fetch user's releases
      const { data: releasesData } = await supabase
        .from('releases')
        .select('*')
        .eq('user_id', userId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Fetch fan funding contributions for this creator
      const { data: fanFundingData, error: fanFundingError } = await supabase
        .from('campaign_supporters')
        .select(`
          contribution_amount_cents,
          status,
          campaigns!inner(creator_id)
        `)
        .eq('campaigns.creator_id', userId)
        .in('status', ['pledged', 'fulfilled']);

      if (fanFundingError) {
        throw fanFundingError;
      }

      // Calculate stats
      const totalPlays = (beatsData || []).reduce((sum, beat) => sum + (beat.play_count || 0), 0) +
                        (releasesData || []).reduce((sum, release) => sum + (release.play_count || 0), 0);

      const totalSales = (beatsData || []).reduce((sum, beat) => sum + (beat.purchase_count || 0), 0) +
                        (releasesData || []).reduce((sum, release) => sum + (release.purchase_count || 0), 0);

      type FanFundingRecord = { contribution_amount_cents: number | null };
      const totalFanFundingEntries = (fanFundingData as FanFundingRecord[] | null) ?? [];
      const totalFanFundingCents = totalFanFundingEntries.reduce((sum, supporter) => {
        return sum + (supporter.contribution_amount_cents ?? 0);
      }, 0);

      setProfile(profileData);
      setBeats(beatsData || []);
      setReleases(releasesData || []);
      setStats({
        total_plays: totalPlays,
        total_sales: totalSales,
        monthly_listeners: Math.floor(totalPlays * 0.3), // Estimate
        fan_funding_raised: totalFanFundingCents / 100
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <Navigate to="/directory" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <LoadingSkeleton count={8} variant="card" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Profile not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        config={{
          title: `${profile.full_name || profile.username || 'Creator'} | Pluggd Profile`,
          description: profile.bio || 'Discover beats, releases, and collaborations from this creator on Pluggd.',
          canonical: `/profile/${userId}`,
          keywords: [profile.username, profile.full_name, ...(profile.genres || []), 'artist profile'].filter(Boolean) as string[],
        }}
        artistData={{
          name: profile.full_name || profile.username || 'Creator',
          bio: profile.bio || undefined,
          image_url: profile.avatar_url || undefined,
          genres: profile.genres || undefined,
        }}
      />
      <DomainAwareNavigation />
      <StorefrontLayout 
        userId={userId!}
        profile={profile}
        beats={beats}
        releases={releases}
        stats={stats}
      />
    </div>
  );
};

export default Profile;
