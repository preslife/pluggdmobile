import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/usePageMetadata";

export default function AdminRolesPage() {
  usePageMetadata({
    title: "Roles & Permissions — Pluggd Admin",
    description: "Assign advanced roles and manage privileged access across the Pluggd platform.",
    path: "/admin/roles",
  });

  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [upserting, setUpserting] = useState(false);

  const assign = async () => {
    if (!userId || !role) { toast({ title: "Missing", description: "User ID and role are required.", variant: "destructive" }); return; }
    try {
      setUpserting(true);
      const { error } = await supabase.from("user_roles").upsert([{ user_id: userId, role }], { onConflict: "user_id,role" });
      if (error) throw error;
      toast({ title: "Role assigned" });
      setUserId(""); setRole("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setUpserting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Roles & Permissions</h2>
      <div className="flex flex-col md:flex-row gap-2 max-w-xl">
        <Input placeholder="User ID (uuid)" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Input placeholder="Role (e.g., admin, finance_admin)" value={role} onChange={(e) => setRole(e.target.value)} />
        <Button onClick={assign} disabled={upserting}>{upserting ? "Saving..." : "Assign"}</Button>
      </div>
      <p className="text-sm text-muted-foreground">Use Users page for quick Admin toggle; use this page for advanced roles.</p>
    </div>
  );
}


