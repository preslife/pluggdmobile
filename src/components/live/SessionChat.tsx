import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSessionChat } from "@/hooks/useSessionChat";
import { useSessionMembership } from "@/hooks/useSessionMembership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Props = {
  sessionId: string | undefined;
  session: any;
};

const SessionChat = ({ sessionId, session }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, send, remove } = useSessionChat(sessionId);
  const { canWrite } = useSessionMembership(sessionId);
  const [chatInput, setChatInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onSend = async () => {
    const text = chatInput.trim();
    if (!text) return;
    const { error } = await send(text);
    if (error) return toast({ title: "Message failed", description: error.message, variant: "destructive" });
    setChatInput("");
  };

  const onDelete = async (id: string) => {
    const { error } = await remove(id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  return (
    <div>
      {!canWrite && (
        <p className="mb-2 text-xs text-muted-foreground">Join the session to participate in chat.</p>
      )}
      <div ref={listRef} className="mt-3 h-72 overflow-y-auto rounded-md border border-border bg-background/40 p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="mx-2">•</span>
              <span>{m.content}</span>
            </div>
            {(user?.id === m.user_id || user?.id === session?.host_id) && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(m.id)} disabled={!canWrite}>Delete</Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder={!user ? "Sign in to chat" : session?.status === 'ended' ? "Session ended" : !canWrite ? "Join to chat" : "Type a message"}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          disabled={!user || session?.status === 'ended' || !canWrite}
        />
        <Button onClick={onSend} disabled={!user || session?.status === 'ended' || !canWrite}>Send</Button>
      </div>
    </div>
  );
};

export default SessionChat;
