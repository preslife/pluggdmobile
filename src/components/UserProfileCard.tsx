import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Music, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { BlockUserButton } from "@/components/BlockUserButton";
import { useAuth } from "@/hooks/useAuth";
import { FavNicknameDisplay } from "@/components/FavNicknameDisplay";

interface UserProfile {
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  user_type: 'artist' | 'producer' | 'industry';
  created_at: string;
}

interface SocialStats {
  followersCount: number;
  followingCount: number;
  beatsCount: number;
  collaborationsCount: number;
}

interface UserProfileCardProps {
  userId: string;
  className?: string;
}

export const UserProfileCard = ({ userId, className }: UserProfileCardProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchSocialStats();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSocialStats = async () => {
    try {
      // Get followers count
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      // Get following count
      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      // Get beats count (for producers)
      const { count: beatsCount } = await supabase
        .from('beats')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_published', true);

      // Get collaborations count
      const { count: collaborationsCount } = await supabase
        .from('collaboration_projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setStats({
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        beatsCount: beatsCount || 0,
        collaborationsCount: collaborationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching social stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'producer':
        return <Badge variant="default">Producer</Badge>;
      case 'industry':
        return <Badge variant="secondary">Industry Pro</Badge>;
      default:
        return <Badge variant="outline">Artist</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardHeader className="text-center">
        <div className="relative mx-auto mb-4">
          <Avatar className="w-20 h-20 mx-auto border-2 border-primary">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            <AvatarFallback>
              {profile.full_name?.split(' ').map(n => n[0]).join('') || profile.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            {profile.full_name || profile.username}
          </h3>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {getUserTypeBadge(profile.user_type)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {profile.bio && (
          <p className="text-sm text-muted-foreground text-center line-clamp-3">
            {profile.bio}
          </p>
        )}
        
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>

        {/* FAV Nicknames */}
        <FavNicknameDisplay userId={userId} variant="profile" />

        {/* Social Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{stats.followersCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{stats.followingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            {profile.user_type === 'producer' && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{stats.beatsCount}</span>
                </div>
                <p className="text-xs text-muted-foreground">Beats</p>
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{stats.collaborationsCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <FollowButton
            userId={userId}
            currentUserId={user?.id || null}
            className="w-full"
          />
          <BlockUserButton
            userId={userId}
            displayName={profile.full_name || profile.username}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};