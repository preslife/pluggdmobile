import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  currentUserId: string | null;
  className?: string;
}

export const FollowButton = ({ userId, currentUserId, className }: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUserId && userId !== currentUserId) {
      checkFollowStatus();
      getFollowerCount();
    }
  }, [currentUserId, userId]);

  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to real-time updates for follow changes
    const channel = supabase
      .channel('follow-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${userId}`
        },
        () => {
          getFollowerCount();
          if (currentUserId) {
            checkFollowStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, userId]);

  const checkFollowStatus = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
        return;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const getFollowerCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) {
        console.error('Error getting follower count:', error);
        return;
      }

      setFollowerCount(count || 0);
    } catch (error) {
      console.error('Error getting follower count:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    if (userId === currentUserId) return;

    setIsLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUserId,
            following_id: userId
          });

        if (error) throw error;

        setIsFollowing(true);
        toast({
          title: "Following",
          description: "You are now following this user",
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show follow button for self
  if (!currentUserId || userId === currentUserId) {
    return (
      <div className="text-sm text-muted-foreground">
        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleFollow}
        disabled={isLoading}
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        className={className}
      >
        {isFollowing ? (
          <>
            <UserMinus className="w-4 h-4 mr-2" />
            Unfollow
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Follow
          </>
        )}
      </Button>
      <div className="text-sm text-muted-foreground">
        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </div>
    </div>
  );
};