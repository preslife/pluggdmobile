import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BlockUserButtonProps {
  userId: string;
  displayName?: string | null;
  size?: "sm" | "default";
  variant?: "ghost" | "secondary" | "outline" | "destructive" | "default";
  className?: string;
}

type BlockRecord = {
  id: string;
  status: string;
  reason: string | null;
  updated_at: string | null;
};

export const BlockUserButton = ({
  userId,
  displayName,
  size = "sm",
  variant = "outline",
  className,
}: BlockUserButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockRecord, setBlockRecord] = useState<BlockRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [initializing, setInitializing] = useState(false);

  const isBlocked = useMemo(() => blockRecord?.status === "active", [blockRecord]);

  const fetchStatus = useCallback(async () => {
    if (!user || !userId || user.id === userId) {
      setBlockRecord(null);
      return;
    }

    try {
      setInitializing(true);
      const { data, error } = await supabase
        .from("user_blocks")
        .select("id, status, reason, updated_at")
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load block status", error);
        return;
      }

      if (data) {
        setBlockRecord(data as BlockRecord);
        setNotes((data as BlockRecord).reason ?? "");
      } else {
        setBlockRecord(null);
        setNotes("");
      }
    } finally {
      setInitializing(false);
    }
  }, [user, userId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleBlock = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to manage blocks.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("block-user", {
        body: {
          blockedUserId: userId,
          reason: notes.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to block user");
      }

      toast({
        title: "User blocked",
        description: `${displayName ?? "User"} will no longer be able to interact with you.`,
      });

      setDialogOpen(false);
      setBlockRecord({ id: "temp", status: "active", reason: notes.trim() || null, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to block user", err);
      toast({
        title: "Unable to block user",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      void fetchStatus();
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("unblock-user", {
        body: {
          blockedUserId: userId,
          notes: notes.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to unblock user");
      }

      toast({
        title: "User unblocked",
        description: `${displayName ?? "User"} can interact with you again.`,
      });

      setDialogOpen(false);
      setBlockRecord(null);
      setNotes("");
    } catch (err) {
      console.error("Failed to unblock user", err);
      toast({
        title: "Unable to unblock user",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      void fetchStatus();
    }
  };

  const disabled = !user || user.id === userId || initializing;

  const triggerLabel = isBlocked ? "Unblock" : "Block";
  const triggerIcon = isBlocked ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />;

  return (
    <AlertDialog open={dialogOpen} onOpenChange={(open) => {
      if (!loading) {
        setDialogOpen(open);
        if (open) {
          setNotes(blockRecord?.reason ?? "");
        }
      }
    }}>
      <AlertDialogTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className={className}
          disabled={disabled}
        >
          {triggerIcon}
          <span>{triggerLabel}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isBlocked ? `Unblock ${displayName ?? "this user"}` : `Block ${displayName ?? "this user"}`}</AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? "They will regain the ability to follow, message, or interact with you."
              : "They will be prevented from following, messaging, or interacting with you across Pluggd."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={isBlocked ? "Optional notes about this unblock" : "Optional reason for blocking"}
            rows={3}
          />
          {blockRecord?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(blockRecord.updated_at).toLocaleString()}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={isBlocked ? handleUnblock : handleBlock}
            disabled={loading}
            className={isBlocked ? "bg-primary" : "bg-destructive"}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : triggerIcon}
            {triggerLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockUserButton;
