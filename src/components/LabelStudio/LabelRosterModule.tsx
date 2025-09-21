import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useActiveLabel } from "@/hooks/useActiveLabel";

type Member = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function LabelRosterModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { label: activeLabel } = useActiveLabel();
  const labelId = activeLabel?.id || null;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [usernameToAdd, setUsernameToAdd] = useState("");

  const canManage = useMemo(() => !!labelId && !!user, [labelId, user]);

  useEffect(() => {
    const init = async () => {
      if (!user) { setLoading(false); return; }
      if (labelId) {
        await loadMembers(labelId);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, labelId]);

  const loadMembers = async (lid: string) => {
    const { data: rows, error } = await supabase
      .from("label_members")
      .select("user_id, role")
      .eq("label_id", lid);
    if (error) {
      toast({ title: "Failed to load roster", description: error.message, variant: "destructive" });
      return;
    }
    const userIds = (rows || []).map(r => r.user_id);
    if (userIds.length === 0) { setMembers([]); return; }
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, username, full_name, avatar_url")
      .in("user_id", userIds);
    if (pErr) {
      toast({ title: "Failed to load profiles", description: pErr.message, variant: "destructive" });
      return;
    }
    const map = new Map<string, any>();
    (profiles || []).forEach(p => map.set(p.user_id, p));
    setMembers((rows || []).map(r => ({
      user_id: r.user_id,
      username: map.get(r.user_id)?.username ?? null,
      full_name: map.get(r.user_id)?.full_name ?? null,
      avatar_url: map.get(r.user_id)?.avatar_url ?? null,
      role: r.role ?? null,
    })));
  };

  const handleAdd = async () => {
    if (!canManage) return;
    if (!usernameToAdd.trim()) {
      toast({ title: "Enter a username", variant: "destructive" });
      return;
    }
    try {
      setAdding(true);
      // Lookup by username to get user_id
      const { data: profile, error: findErr } = await supabase
        .from("profiles")
        .select("user_id, username")
        .eq("username", usernameToAdd.trim())
        .single();
      if (findErr) throw findErr;

      const { error: upsertErr } = await supabase
        .from("label_members")
        .upsert([{ label_id: labelId, user_id: profile.user_id, role: "manager" }], { onConflict: "label_id,user_id" });
      if (upsertErr) throw upsertErr;
      toast({ title: "Added to roster", description: `@${profile.username} added.` });
      setUsernameToAdd("");
      await loadMembers(labelId!);
    } catch (err: any) {
      toast({ title: "Could not add member", description: err.message || String(err), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberUserId: string) => {
    try {
      const { error } = await supabase
        .from("label_members")
        .delete()
        .match({ label_id: labelId, user_id: memberUserId });
      if (error) throw error;
      toast({ title: "Removed from roster" });
      await loadMembers(labelId!);
    } catch (err: any) {
      toast({ title: "Could not remove member", description: err.message || String(err), variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-4"><h2 className="text-2xl font-semibold">Roster</h2><p>Loading...</p></div>;
  }

  if (!labelId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Roster</h2>
        <p className="text-muted-foreground">No label selected. Create a label in the Label Studio overview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Roster</h2>
        <p className="text-muted-foreground">Add existing users by username. Invites by email can be added next.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-xl">
            <Input placeholder="username" value={usernameToAdd} onChange={(e) => setUsernameToAdd(e.target.value)} />
            <Button onClick={handleAdd} disabled={adding}>{adding ? "Adding..." : "Add"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No members yet.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.full_name || m.username || m.user_id}</div>
                    <div className="text-xs text-muted-foreground truncate">@{m.username || "unknown"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{m.role || "member"}</span>
                    <Button variant="destructive" onClick={() => handleRemove(m.user_id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


