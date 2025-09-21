import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessionNotes } from "@/hooks/useSessionNotes";
import { useSessionMembership } from "@/hooks/useSessionMembership";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Props = {
  sessionId: string | undefined;
  session: any;
};

const SessionNotes = ({ sessionId, session }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { content, setContent, save, saving, loading: notesLoading, pendingRemote, pendingEditorName, applyIncoming } = useSessionNotes(sessionId);
  const { canWrite } = useSessionMembership(sessionId);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize autosave once notes have loaded
  useEffect(() => {
    if (!notesLoading && !initialized) setInitialized(true);
  }, [notesLoading, initialized]);

  // Debounced autosave for notes
  useEffect(() => {
    if (!initialized || !user || !canWrite) return;
    const handle = setTimeout(async () => {
      const res = await save(content);
      if ((res as any) && !(res as any).error) {
        setLastSavedAt(new Date());
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [content, initialized, user, canWrite, save]);

  const onSaveNotes = async () => {
    const { error } = await save(content);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Notes saved" });
  };

  return (
    <div>
      <Textarea
        className="mt-3 min-h-[18rem]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Capture timestamped feedback, links, and takeaways…"
        disabled={!canWrite}
      />
      {pendingRemote && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground">
            {pendingEditorName ? `Remote update by ${pendingEditorName}` : "A remote update is available."}
          </p>
          <Button size="sm" variant="outline" onClick={() => { applyIncoming(); setLastSavedAt(new Date()); }}>
            View incoming
          </Button>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={onSaveNotes} disabled={saving || !canWrite}>
          {saving ? 'Saving…' : 'Save Now'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave enabled'}
        </p>
      </div>
    </div>
  );
};

export default SessionNotes;
