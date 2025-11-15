import { useState, useEffect, useCallback } from "react";
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
  const [isInteractionBlocked, setIsInteractionBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUserId && userId !== currentUserId) {
      checkFollowStatus();
      getFollowerCount();
      void checkBlockRelationship();
    } else {
      setIsInteractionBlocked(false);
    }
  }, [currentUserId, userId, checkBlockRelationship]);

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

  const checkBlockRelationship = useCallback(async () => {
    if (!currentUserId || userId === currentUserId) {
      setIsInteractionBlocked(false);
      return;
    }

    try {
      setCheckingBlock(true);
      const { data, error } = await supabase.rpc("is_user_blocked", {
        p_actor: currentUserId,
        p_target: userId,
      });

      if (error) {
        console.error("Error checking block relationship:", error);
        setIsInteractionBlocked(false);
        return;
      }

      setIsInteractionBlocked(Boolean(data));
    } catch (error) {
      console.error("Error checking block relationship:", error);
      setIsInteractionBlocked(false);
    } finally {
      setCheckingBlock(false);
    }
  }, [currentUserId, userId]);

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
        if (isInteractionBlocked) {
          toast({
            title: "Follow blocked",
            description: "One of you has blocked the other. Unblock to follow again.",
            variant: "destructive",
          });
          return;
        }

        const { data: blockStatus, error: blockCheckError } = await supabase.rpc("is_user_blocked", {
          p_actor: currentUserId,
          p_target: userId,
        });

        if (blockCheckError) {
          throw blockCheckError;
        }

        if (blockStatus) {
          setIsInteractionBlocked(true);
          toast({
            title: "Follow blocked",
            description: "One of you has blocked the other. Unblock to follow again.",
            variant: "destructive",
          });
          return;
        }

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
      <div className="flex flex-col gap-1">
        <Button
          onClick={handleFollow}
          disabled={isLoading || checkingBlock || isInteractionBlocked}
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
        {isInteractionBlocked && (
          <p className="text-xs text-muted-foreground">
            Interactions blocked. Unblock to follow.
          </p>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </div>
    </div>
  );
};
