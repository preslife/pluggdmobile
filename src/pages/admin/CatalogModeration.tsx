import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/usePageMetadata";

type Item = {
  id: string;
  title?: string | null;
  owner_type?: string | null;
  owner_id?: string | null;
  status?: string | null;
  table: string;
};

export default function AdminCatalogModerationPage() {
  usePageMetadata({
    title: "Catalog Moderation — Pluggd Admin",
    description: "Review and approve marketplace submissions across releases, beats, and digital products.",
    path: "/admin/catalog/moderation",
  });

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const queries = [
          supabase.from("releases").select("id, title, owner_type, owner_id, status").limit(100),
          supabase.from("beats").select("id, title, owner_type, owner_id, status").limit(100),
          supabase.from("sample_packs").select("id, title, owner_type, owner_id, status").limit(100),
          supabase.from("store_products").select("id, title, owner_type, owner_id, status").limit(100),
        ];
        const [r, b, p, sp] = await Promise.all(queries);
        const merged: Item[] = [];
        if (!r.error) merged.push(...(r.data || []).map((x: any) => ({ ...x, table: "releases" })));
        if (!b.error) merged.push(...(b.data || []).map((x: any) => ({ ...x, table: "beats" })));
        if (!p.error) merged.push(...(p.data || []).map((x: any) => ({ ...x, table: "sample_packs" })));
        if (!sp.error) merged.push(...(sp.data || []).map((x: any) => ({ ...x, table: "store_products" })));
        setItems(merged);
      } catch (e: any) {
        toast({ title: "Failed to load catalog", description: e.message || String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => (i.title || "").toLowerCase().includes(q) || (i.table || "").includes(q));
  }, [items, search]);

  const setStatus = async (table: string, id: string, status: string) => {
    try {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
      setItems(prev => prev.map(i => (i.table === table && i.id === id ? { ...i, status } : i)));
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message || String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Catalog Moderation</h2>
        <div className="w-64"><Input placeholder="Search title or table" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="rounded-md border divide-y">
          {filtered.map((i) => (
            <div key={`${i.table}:${i.id}`} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{i.title || i.id}</div>
                <div className="text-xs text-muted-foreground truncate">{i.table} · {i.status || "unknown"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStatus(i.table, i.id, "approved")}>Approve</Button>
                <Button variant="outline" size="sm" onClick={() => setStatus(i.table, i.id, "rejected")}>Reject</Button>
                <Button variant="outline" size="sm" onClick={() => setStatus(i.table, i.id, "hidden")}>Hide</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No items match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}


