
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessionFeedback, type FeedbackItem } from "@/hooks/useSessionFeedback";
import { useSessionMembership } from "@/hooks/useSessionMembership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseTimecode } from "@/utils/timecode";
type Props = {
  sessionId: string | undefined;
  session: any;
  onNewFeedback?: (item: FeedbackItem) => void;
};

const formatTime = (secs: number | null | undefined) => {
  if (secs == null || isNaN(secs)) return "";
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

// Attempt to find a primary audio element on the page
const getAudioEl = (): HTMLAudioElement | null => {
  return (document.querySelector("audio") as HTMLAudioElement | null) ?? null;
};

// Get current playback time from player (in seconds)
const getPlayerCurrentTime = (): number | null => {
  const el = getAudioEl();
  if (el && !Number.isNaN(el.currentTime)) return Math.floor(el.currentTime);
  return null;
};

// Seek the player to a specific time (in seconds)
const seekPlayer = (seconds: number) => {
  const el = getAudioEl();
  if (el) {
    el.currentTime = Math.max(0, seconds);
    // try to play if paused for instant feedback
    el.play?.().catch(() => {});
  }
};

const SessionFeedback = ({ sessionId, session, onNewFeedback }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items, loading, sending, add, remove } = useSessionFeedback(sessionId);
  const [text, setText] = useState("");
  const [timecode, setTimecode] = useState<string>("");
  const { canWrite } = useSessionMembership(sessionId);

  const onAdd = async () => {
    let seconds: number | undefined = undefined;
    if (timecode.trim()) {
      const parsed = parseTimecode(timecode);
      if (parsed == null) {
        toast({ title: "Invalid timecode", description: "Use seconds (e.g., 42) or mm:ss (e.g., 1:23).", variant: "destructive" });
        return;
      }
      seconds = parsed;
    }
    const { error } = await add(text, seconds);
    if (error) return toast({ title: "Failed to add feedback", description: error.message, variant: "destructive" });
    setText("");
    setTimecode("");
  };

  const canDelete = useMemo(() => {
    return (ownerId: string) => !!user && (user.id === ownerId || user.id === session?.host_id);
  }, [session?.host_id, user]);

  const onDelete = async (id: string) => {
    const { error } = await remove(id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  // Notify parent tab when new feedback arrives from others
  const seenIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const seen = seenIdsRef.current;
    const newOnes = items.filter((i) => !seen.has(i.id));
    if (newOnes.length) {
      newOnes.forEach((i) => {
        seen.add(i.id);
        if (i.user_id !== user?.id) {
          onNewFeedback?.(i);
        }
      });
    }
  }, [items, user?.id, onNewFeedback]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background/40 p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Textarea
              placeholder={!user ? "Sign in to leave feedback" : session?.status === "ended" ? "Session ended" : !canWrite ? "Join to leave feedback" : "Type feedback (e.g. mix notes, ideas)"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div className="flex gap-2 md:justify-end">
            <Input
              placeholder="ss or mm:ss"
              value={timecode}
              onChange={(e) => setTimecode(e.target.value)}
              disabled={!canWrite}
            />
            <Button
              variant="outline"
              onClick={() => {
                const sec = getPlayerCurrentTime();
                if (sec == null) {
                  toast({ title: "No player detected", description: "Start playback to capture the current time.", variant: "default" });
                  return;
                }
                setTimecode(formatTime(sec));
              }}
              disabled={!canWrite}
            >
              Set from Player
            </Button>
            <Button onClick={onAdd} disabled={!canWrite || !text.trim() || sending}>Add</Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Optional timecode supports seconds (e.g., 42) or mm:ss (e.g., 1:23).</p>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {loading && <p className="text-sm text-muted-foreground">Loading feedback…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No feedback yet. Be the first to leave a note.</p>
        )}
        {items.map((f) => (
          <div key={f.id} className="flex items-start justify-between gap-2 rounded-md border border-border bg-background/40 p-2">
            <div className="text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {f.timecode_seconds != null && (
                  <Button
                    size="sm"
                    variant="link"
                    className="p-0 font-mono"
                    onClick={() => seekPlayer(f.timecode_seconds!)}
                    aria-label={`Seek to ${formatTime(f.timecode_seconds)}`}
                  >
                    {formatTime(f.timecode_seconds)}
                  </Button>
                )}
                <span>•</span>
                <span>{new Date(f.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap">{f.content}</p>
            </div>
            {canDelete(f.user_id) && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(f.id)}>
                Delete
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionFeedback;
