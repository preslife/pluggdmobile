import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { setMeta } from '@/lib/seo';
import { formatCurrency } from '@/lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  User,
  MapPin,
  Calendar,
  Music,
  Play,
  Heart,
  Share2,
  ExternalLink,
  Mail,
  Bell,
  Star,
  Users,
  PlayCircle,
  ShoppingBag,
  BookOpen,
  Radio,
  MessageCircle,
  Trophy,
  DollarSign,
  Headphones,
  Download,
  TrendingUp,
  Clock,
  Eye,
  Zap,
  Gift
} from 'lucide-react';

// Creator-specific components
import { CreatorHero } from './components/CreatorHero';
import { CreatorTabSystem } from './components/CreatorTabSystem';
import { FeaturedRail } from './components/FeaturedRail';
import { MembershipWidget } from './components/MembershipWidget';
import { UpcomingLive } from './components/UpcomingLive';
import { CoursesBlock } from './components/CoursesBlock';
import { CollabOpenCard } from './components/CollabOpenCard';
import { EnhancedClipsHighlights } from './components/EnhancedClipsHighlights';
import { PlacementsTestimonials } from './components/PlacementsTestimonials';
import { SmartLinksBlock } from './components/SmartLinksBlock';
import { ConversionOptimizer } from './components/ConversionOptimizer';
import { SocialProofBar } from './components/SocialProofBar';
import { CreatorSEO } from './components/CreatorSEO';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';

interface CreatorProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  cover_image_url?: string;
  website_url?: string;
  location?: string;
  genres?: string[];
  is_creator: boolean;
  is_verified?: boolean;
  social_links?: {
    instagram?: string;
    twitter?: string;
    spotify?: string;
    soundcloud?: string;
    youtube?: string;
    tiktok?: string;
    twitch?: string;
  };
  created_at: string;
  updated_at: string;
}

interface CreatorStats {
  total_followers: number;
  total_plays: number;
  total_releases: number;
  total_courses: number;
  total_live_sessions: number;
  monthly_listeners: number;
  supporter_count: number;
  next_live_date?: string;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
  visitCount: number;
  lastVisit?: string;
}

export const WorldClassCreatorPage = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [visitorStatus, setVisitorStatus] = useState<VisitorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchCreatorData();
    }
  }, [username]);

  useEffect(() => {
    if (profile) {
      updateSEO();
      trackVisit();
    }
  }, [profile]);

  const fetchCreatorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch creator profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_creator', true)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Creator not found');
        } else {
          throw profileError;
        }
        return;
      }

      setProfile(profileData);

      // Fetch stats in parallel
      const [
        { count: followersCount },
        { data: releases },
        { data: courses },
        { data: liveSessions },
        { count: supporterCount }
      ] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profileData.user_id),
        supabase.from('releases').select('total_plays').eq('user_id', profileData.user_id),
        supabase.from('courses').select('id').eq('creator_id', profileData.user_id).eq('status', 'published'),
        supabase.from('live_sessions').select('id, scheduled_for').eq('creator_id', profileData.user_id).gte('scheduled_for', new Date().toISOString()),
        supabase.from('fan_subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', profileData.user_id).eq('status', 'active')
      ]);

      const totalPlays = releases?.reduce((sum, release) => sum + (release.total_plays || 0), 0) || 0;
      const nextLiveDate = liveSessions?.[0]?.scheduled_for;

      setStats({
        total_followers: followersCount || 0,
        total_plays: totalPlays,
        total_releases: releases?.length || 0,
        total_courses: courses?.length || 0,
        total_live_sessions: liveSessions?.length || 0,
        monthly_listeners: Math.floor(totalPlays * 0.3), // Estimate
        supporter_count: supporterCount || 0,
        next_live_date: nextLiveDate
      });

      // Fetch visitor status if user is logged in
      if (user) {
        await fetchVisitorStatus(profileData.user_id);
      }

    } catch (error) {
      console.error('Error fetching creator data:', error);
      setError('Failed to load creator page');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitorStatus = async (creatorId: string) => {
    if (!user) return;

    try {
      const [
        { data: followData },
        { data: subscriptionData }
      ] = await Promise.all([
        supabase.from('followers').select('*').eq('follower_id', user.id).eq('following_id', creatorId).maybeSingle(),
        supabase.from('fan_subscriptions').select('*').eq('user_id', user.id).eq('creator_id', creatorId).eq('status', 'active').maybeSingle()
      ]);

      setVisitorStatus({
        isOwner: user.id === creatorId,
        isFollowing: !!followData,
        isSubscribed: !!subscriptionData,
        visitCount: 1, // Could track this in a separate table
        lastVisit: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching visitor status:', error);
    }
  };

  const trackVisit = async () => {
    if (!profile || !user) return;

    try {
      // Track page visit for analytics
      await supabase.from('creator_page_views').insert({
        creator_id: profile.user_id,
        visitor_id: user?.id,
        page_type: 'creator_profile',
        referrer: document.referrer || null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      // Don't throw error for analytics failures
      console.warn('Failed to track visit:', error);
    }
  };

  const updateSEO = () => {
    if (!profile) return;

    const title = `${profile.full_name || profile.username} — Creator Storefront`;
    const description = profile.bio || `Explore ${profile.full_name || profile.username}'s music, courses, and exclusive content. Support their journey as a creator.`;
    const imageUrl = profile.avatar_url || '/default-creator-cover.jpg';

    setMeta(title, description, `/creator/${profile.username}`, imageUrl);

    // Add structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": ["Person", "MusicGroup"],
      "name": profile.full_name || profile.username,
      "alternateName": profile.username,
      "description": profile.bio,
      "image": profile.avatar_url,
      "url": `${window.location.origin}/creator/${profile.username}`,
      "sameAs": Object.values(profile.social_links || {}).filter(Boolean),
      "address": profile.location ? { "@type": "Place", "name": profile.location } : undefined,
      "genre": profile.genres,
      "foundingDate": profile.created_at
    };

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading creator profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <User className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Creator Not Found</h1>
            <p className="text-muted-foreground max-w-md">
              {error || "This creator profile doesn't exist or has been removed."}
            </p>
            <Button asChild>
              <Link to="/directory">Browse Creators</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Enhancement - Per Spec Requirement */}
      {profile && (
        <CreatorSEO 
          profile={profile} 
          stats={stats || undefined}
        />
      )}
      
      <DomainAwareNavigation />
      
      {/* Hero Section */}
      <CreatorHero 
        profile={profile}
        stats={stats}
        visitorStatus={visitorStatus}
      />

      {/* Social Proof Bar */}
      <SocialProofBar 
        stats={stats}
        profile={profile}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Content */}
          <div className="lg:col-span-1 space-y-6">
            {/* Membership Widget */}
            <MembershipWidget 
              creatorId={profile.user_id}
              visitorStatus={visitorStatus}
            />

            {/* Upcoming Live */}
            <UpcomingLive 
              creatorId={profile.user_id}
              nextLiveDate={stats?.next_live_date}
            />

            {/* Smart Links */}
            <SmartLinksBlock 
              profile={profile}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Featured Rail */}
            <FeaturedRail 
              creatorId={profile.user_id}
            />

            {/* Dynamic Tab System */}
            <CreatorTabSystem 
              profile={profile}
              stats={stats}
              visitorStatus={visitorStatus}
            />

            {/* Additional Content Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collab Open Card */}
              <CollabOpenCard 
                creatorId={profile.user_id}
              />

              {/* Clips Highlights */}
              <EnhancedClipsHighlights 
                creatorId={profile.user_id} 
              />
            </div>

            {/* Testimonials */}
            <PlacementsTestimonials 
              creatorId={profile.user_id} 
            />
          </div>
        </div>
      </div>

      {/* Conversion Optimizer (floating elements) */}
      <ConversionOptimizer 
        profile={profile}
        visitorStatus={visitorStatus}
      />
    </div>
  );
};

export default WorldClassCreatorPage;