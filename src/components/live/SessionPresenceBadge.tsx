import { Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSessionPresence } from "@/hooks/useSessionPresence";

type Props = {
  sessionId: string | undefined;
};

const SessionPresenceBadge = ({ sessionId }: Props) => {
  const { users, count } = useSessionPresence(sessionId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Active: {count}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Active now ({count})</p>
          <div className="max-h-60 space-y-1 overflow-auto">
            {users.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one online yet.</p>
            ) : (
              users.map((u, idx) => (
                <div key={`${u.user_id}-${idx}`} className="flex items-center justify-between rounded-md border border-border/50 bg-card/50 px-2 py-1">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{u.name || u.user_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">since {new Date(u.online_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SessionPresenceBadge;
