import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  created_at?: string | null;
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [adminMap, setAdminMap] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      (p.username || "").toLowerCase().includes(q) ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.user_id || "").toLowerCase().includes(q)
    );
  }, [profiles, search]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, username, full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;
        setProfiles(data || []);
        // load admin roles
        const { data: roles, error: rErr } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "admin");
        if (rErr) throw rErr;
        const map: Record<string, boolean> = {};
        (roles || []).forEach((r: any) => { map[r.user_id] = true; });
        setAdminMap(map);
      } catch (e: any) {
        toast({ title: "Failed to load users", description: e.message || String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleAdmin = async (userId: string) => {
    try {
      setTogglingId(userId);
      if (adminMap[userId]) {
        const { error } = await supabase.from("user_roles").delete().match({ user_id: userId, role: "admin" });
        if (error) throw error;
        setAdminMap(prev => ({ ...prev, [userId]: false }));
      } else {
        const { error } = await supabase
          .from("user_roles")
          .upsert([{ user_id: userId, role: "admin" }], { onConflict: "user_id,role" });
        if (error) throw error;
        setAdminMap(prev => ({ ...prev, [userId]: true }));
      }
    } catch (e: any) {
      toast({ title: "Role update failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Users</h2>
        <div className="w-64"><Input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="rounded-md border divide-y">
          {filtered.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.full_name || p.username || p.user_id}</div>
                <div className="text-xs text-muted-foreground truncate">{p.username ? `@${p.username}` : p.user_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{adminMap[p.user_id] ? "Admin" : "User"}</span>
                <Button variant="outline" size="sm" onClick={() => toggleAdmin(p.user_id)} disabled={togglingId === p.user_id}>
                  {togglingId === p.user_id ? "Updating..." : adminMap[p.user_id] ? "Revoke Admin" : "Make Admin"}
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No users match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}


