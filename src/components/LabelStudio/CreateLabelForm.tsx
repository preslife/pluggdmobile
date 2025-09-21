import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type CreateLabelFormProps = {
  onCreated?: () => void;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateLabelForm({ onCreated }: CreateLabelFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [labelName, setLabelName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(labelName));
    }
  }, [labelName, slugTouched]);

  const canSubmit = useMemo(() => !!labelName && !!slug, [labelName, slug]);

  const uploadIfNeeded = async (file: File | null, kind: "logo" | "cover", folder: string) => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "png";
    // Path must start with user.id to satisfy RLS
    const path = `${folder}/${kind}-${Date.now()}.${ext}`;
  
    const { error: upErr } = await supabase.storage.from("artist-images").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) throw upErr;
  
    const { data } = supabase.storage.from("artist-images").getPublicUrl(path);
    return data.publicUrl || null;
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!canSubmit) {
      toast({ title: "Missing fields", description: "Please provide a label name and slug.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      // Ensure slug is unique in labels table
      const { data: existing, error: existingError } = await supabase
        .from("labels")
        .select("id")
        .eq("slug", slug)
        .limit(1);
      if (existingError) throw existingError;
      if (existing && existing.length > 0) {
        toast({ title: "Slug already in use", description: "Choose a different slug.", variant: "destructive" });
        setSaving(false);
        return;
      }

// Upload files if provided (folder MUST start with user.id for RLS)
let finalLogoUrl = logoUrl;
let finalCoverUrl = coverUrl;
const folder = `${user.id}/labels/${slug}`;

if (logoFile) {
  finalLogoUrl = (await uploadIfNeeded(logoFile, "logo", folder)) || finalLogoUrl;
}
if (coverFile) {
  finalCoverUrl = (await uploadIfNeeded(coverFile, "cover", folder)) || finalCoverUrl;
}


      // Create label via RPC (adds owner membership)
      const { data: created, error: createErr } = await supabase.rpc("create_label_for_current_user", {
        p_name: labelName,
        p_slug: slug,
        p_genre: null,
        p_contact_email: user.email,
        p_country: null,
        p_logo_url: finalLogoUrl || null,
        p_cover_image_url: finalCoverUrl || null,
      });
      if (createErr) throw createErr;

      toast({ title: "Label created", description: "Opening your label studio…" });

      // hard-redirect so the SPA can't keep you on the form
      window.location.replace(`/studio/label/${slug}`);
      // if your app uses /studio/label (no slug), use this instead:
      // window.location.replace(`/studio/label`);
      
      return; // stop running anything else after redirect
      
    } catch (err: any) {
      console.error("Create label failed", err);
      toast({ title: "Could not create label", description: err.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your Label</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="labelName">Label name</Label>
              <Input id="labelName" value={labelName} onChange={(e) => setLabelName(e.target.value)} placeholder="e.g., DreamSound Collective" />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="dreamsound-collective"
              />
            </div>
            <div>
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              <div className="mt-2">
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="or paste image URL" />
              </div>
            </div>
            <div>
              <Label htmlFor="cover">Cover image</Label>
              <Input id="cover" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              <div className="mt-2">
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="or paste image URL" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? "Creating..." : "Create Label"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}




