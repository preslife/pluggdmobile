import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type LabelRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
};

export default function AdminLabelsPage() {
  const { toast } = useToast();
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, slug, logo_url, cover_image_url")
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load labels", description: error.message, variant: "destructive" });
    } else {
      setLabels(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const createLabel = async () => {
    if (!createName || !createSlug || !ownerUserId) {
      toast({ title: "Missing fields", description: "Name, slug, and owner user ID are required.", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      // Prefer secure RPC that runs with SECURITY DEFINER
      const { error } = await supabase.rpc("admin_create_managed_label", {
        p_owner_email: null,
        p_name: createName,
        p_slug: createSlug,
        p_logo_url: logoUrl || null,
        p_cover_image_url: coverUrl || null,
        p_contact_email: null,
        p_country: null,
      });
      if (error) throw error;
      toast({ title: "Label created", description: "New label profile added." });
      setCreateName("");
      setCreateSlug("");
      setOwnerUserId("");
      setLogoUrl("");
      setCoverUrl("");
      load();
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UILabel htmlFor="lname">Label name</UILabel>
            <Input id="lname" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          </div>
          <div>
            <UILabel htmlFor="lslug">Slug</UILabel>
            <Input id="lslug" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} />
          </div>
          <div>
            <UILabel htmlFor="owner">Owner user ID</UILabel>
            <Input id="owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} placeholder="UUID of the owner user" />
          </div>
          <div>
            <UILabel htmlFor="logo">Logo URL</UILabel>
            <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <UILabel htmlFor="cover">Cover image URL</UILabel>
            <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex items-end">
            <Button onClick={createLabel} disabled={creating}>
              {creating ? "Creating..." : "Create Label"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(loading ? Array.from({ length: 4 }) : labels).map((l: any, i: number) => (
            <Card key={l?.id || i}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{l?.name || "(unnamed label)"}</span>
                  <span className="text-xs text-muted-foreground">{l?.slug || "no-slug"}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Label</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


