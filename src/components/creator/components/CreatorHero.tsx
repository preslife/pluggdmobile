import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { FeaturePrompt, useFeaturePrompt } from '@/components/FeaturePrompt';

import {
  MapPin,
  Calendar,
  ExternalLink,
  Share2,
  Heart,
  HeartHandshake,
  UserPlus,
  Play,
  ShoppingBag,
  Crown,
  CheckCircle,
  Music,
  Users,
  Eye,
  TrendingUp,
  Settings,
  Copy
} from 'lucide-react';

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
}

interface CreatorStats {
  total_followers: number;
  total_plays: number;
  total_releases: number;
  monthly_listeners: number;
  supporter_count: number;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
  visitCount: number;
}

interface CreatorHeroProps {
  profile: CreatorProfile;
  stats: CreatorStats | null;
  visitorStatus: VisitorStatus | null;
}

export const CreatorHero = ({ profile, stats, visitorStatus }: CreatorHeroProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(visitorStatus?.isFollowing || false);
  const [loading, setLoading] = useState(false);
  const { activePrompt, triggerPrompt, closePrompt } = useFeaturePrompt();

  // Determine visitor type and appropriate CTA
  const getVisitorType = () => {
    if (!user || visitorStatus?.isOwner) return 'owner';
    if (visitorStatus?.isSubscribed) return 'superfan';
    if (visitorStatus?.isFollowing || (visitorStatus?.visitCount || 0) > 1) return 'warm';
    return 'new';
  };

  const visitorType = getVisitorType();

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow creators",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.user_id);
        
        setIsFollowing(false);
        toast({ title: "Unfollowed", description: `You're no longer following ${profile.full_name || profile.username}` });
      } else {
        await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: profile.user_id
          });
        
        setIsFollowing(true);
        toast({ title: "Following!", description: `You're now following ${profile.full_name || profile.username}` });
        
        // Trigger feature prompt to check out their live sessions
        setTimeout(() => {
          triggerPrompt('live-after-follow');
        }, 1500);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out ${profile.full_name || profile.username} on Pluggd!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name || profile.username} - Creator`,
          text,
          url
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied!", description: "Profile link copied to clipboard" });
    }
  };

  const getPrimaryCTA = () => {
    switch (visitorType) {
      case 'owner':
        return (
          <Button asChild size="lg" className="font-semibold">
            <Link to="/creator/dashboard">
              <Settings className="w-5 h-5 mr-2" />
              Manage Profile
            </Link>
          </Button>
        );
      
      case 'superfan':
        return (
          <div className="flex gap-3">
            <Button size="lg" className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Crown className="w-5 h-5 mr-2" />
              VIP Access
            </Button>
            <Button variant="outline" size="lg" onClick={handleShare}>
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
        );
      
      case 'warm':
        return (
          <div className="flex gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link to={`/creator/${profile.username}/store`}>
                <ShoppingBag className="w-5 h-5 mr-2" />
                Buy/Support
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleFollow}
              disabled={loading}
            >
              <Heart className={`w-5 h-5 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        );
      
      case 'new':
      default:
        return (
          <div className="flex gap-3">
            <Button 
              size="lg" 
              onClick={handleFollow}
              disabled={loading}
              className="font-semibold"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" size="lg">
              <Play className="w-5 h-5 mr-2" />
              Listen
            </Button>
          </div>
        );
    }
  };

  const getSocialLinks = () => {
    if (!profile.social_links) return [];
    
    const socialPlatforms = [
      { key: 'spotify', icon: '🎵', name: 'Spotify' },
      { key: 'instagram', icon: '📷', name: 'Instagram' },
      { key: 'twitter', icon: '🐦', name: 'Twitter' },
      { key: 'youtube', icon: '📺', name: 'YouTube' },
      { key: 'tiktok', icon: '🎬', name: 'TikTok' },
      { key: 'twitch', icon: '🟣', name: 'Twitch' },
      { key: 'soundcloud', icon: '☁️', name: 'SoundCloud' }
    ];

    return socialPlatforms
      .filter(platform => profile.social_links?.[platform.key as keyof typeof profile.social_links])
      .map(platform => ({
        ...platform,
        url: profile.social_links![platform.key as keyof typeof profile.social_links]
      }));
  };

  return (
    <section className="relative">
      {/* Cover Image */}
      <div 
        className="h-64 md:h-80 lg:h-96 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 relative overflow-hidden"
        style={profile.cover_image_url ? {
          backgroundImage: `url(${profile.cover_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : undefined}
      >
        {profile.cover_image_url && (
          <div className="absolute inset-0 bg-black/30" />
        )}
        
        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              
              {/* Avatar */}
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-2xl">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-3xl">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Creator Info */}
              <div className="flex-1 text-white space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                      {profile.full_name || profile.username}
                    </h1>
                    {profile.is_verified && (
                      <CheckCircle className="w-8 h-8 text-blue-500 fill-current" />
                    )}
                  </div>
                  
                  <p className="text-lg md:text-xl text-white/90 mb-2">
                    @{profile.username}
                  </p>
                  
                  {profile.bio && (
                    <p className="text-base md:text-lg text-white/80 max-w-2xl leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Creator since {new Date(profile.created_at).getFullYear()}</span>
                  </div>
                  
                  {stats && (
                    <>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{stats.total_followers.toLocaleString()} followers</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{stats.monthly_listeners.toLocaleString()} monthly listeners</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Genres */}
                {profile.genres && profile.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.genres.slice(0, 4).map(genre => (
                      <Badge key={genre} variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        {genre}
                      </Badge>
                    ))}
                    {profile.genres.length > 4 && (
                      <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                        +{profile.genres.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 min-w-fit">
                {getPrimaryCTA()}
                
                {/* Social Links */}
                <div className="flex justify-center gap-2 flex-wrap max-w-xs">
                  {getSocialLinks().slice(0, 5).map((social) => (
                    <Button
                      key={social.key}
                      variant="outline"
                      size="sm"
                      asChild
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <a href={social.url} target="_blank" rel="noopener noreferrer">
                        <span className="text-sm mr-1">{social.icon}</span>
                        <span className="hidden sm:inline">{social.name}</span>
                      </a>
                    </Button>
                  ))}
                  
                  {profile.website_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {stats && (
        <div className="bg-background border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap justify-center md:justify-start gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.total_releases}</span>
                <span className="text-muted-foreground">Releases</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.total_plays.toLocaleString()}</span>
                <span className="text-muted-foreground">Total Plays</span>
              </div>
              
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{stats.supporter_count}</span>
                <span className="text-muted-foreground">Supporters</span>
              </div>

              {visitorType === 'new' && !user && (
                <div className="flex items-center gap-2 text-primary">
                  <span className="font-medium">Save 10% when you follow!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature Prompt */}
      {activePrompt && (
        <FeaturePrompt
          type={activePrompt}
          show={true}
          onClose={closePrompt}
          customActionPath={`/creator/${profile.username}#live`}
        />
      )}
    </section>
  );
};

export default CreatorHero;