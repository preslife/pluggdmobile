import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface SubscriptionItem {
  creator_id: string;
  created_at: string;
  profile?: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const MySubscriptionsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      // Fetch active subscriptions for this fan
      const { data: subs, error: subErr } = await (supabase as any)
        .from("fan_subscriptions")
        .select("id, creator_id, created_at")
        .eq("fan_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (subErr) {
        console.error("Failed to load subscriptions:", subErr);
        setItems([]);
        setLoading(false);
        return;
      }

      const creatorIds = (subs || []).map((s: any) => s.creator_id);
      if (creatorIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch creator profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", creatorIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const merged: SubscriptionItem[] = (subs || []).map((s: any) => ({
        creator_id: s.creator_id,
        created_at: s.created_at,
        profile: profileMap.get(s.creator_id),
      }));

      setItems(merged);
      setLoading(false);
    };

    fetchData();
  }, [user?.id]);

  const onConfirmCancel = async (creatorId: string) => {
    if (!user?.id) return;
    try {
      setCancelingId(creatorId);
      const { error } = await supabase
        .from("fan_subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId)
        .eq("status", "active");
      if (error) {
        console.error("Cancel subscription error:", error);
        toast({
          title: "Cancellation failed",
          description: "We couldn't cancel your subscription. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setItems((prev) => prev.filter((i) => i.creator_id !== creatorId));
      toast({
        title: "Subscription canceled",
        description: "You've successfully canceled this creator subscription.",
      });
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Subscriptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading your subscriptions...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground">
            <p>You have no active subscriptions yet.</p>
            <div className="mt-3">
              <Button asChild size="sm">
                <Link to="/community" aria-label="Discover creators to support">
                  Discover creators
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.creator_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${item.creator_id}`} className="shrink-0" aria-label={`View ${item.profile?.full_name || item.profile?.username || "creator"} profile`}>
                    <Avatar>
                      <AvatarImage src={item.profile?.avatar_url || undefined} alt={item.profile?.full_name || item.profile?.username || "Creator"} />
                      <AvatarFallback>
                        {(item.profile?.full_name || item.profile?.username || "C").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <div className="font-medium">
                      <Link to={`/profile/${item.creator_id}`} className="hover:underline">
                        {item.profile?.full_name || item.profile?.username || item.creator_id}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Subscribed {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" aria-label="Subscription status active">Active</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelingId === item.creator_id}
                        aria-label={`Cancel subscription to ${item.profile?.full_name || item.profile?.username || "creator"}`}
                      >
                        {cancelingId === item.creator_id ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            Canceling
                          </>
                        ) : (
                          "Cancel"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately cancel your support for this creator. You can resubscribe anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onConfirmCancel(item.creator_id)}>
                          Confirm cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default MySubscriptionsList;
