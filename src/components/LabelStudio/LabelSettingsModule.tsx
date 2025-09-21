import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { AlertTriangle } from "lucide-react";

export default function LabelSettingsModule() {
  const { label: activeLabel } = useActiveLabel();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeLabel) {
      setName(activeLabel.name || "");
      setSlug(activeLabel.slug || "");
      setLogoUrl(activeLabel.logo_url || "");
      setCoverUrl(activeLabel.cover_image_url || "");
    }
  }, [activeLabel?.id]);

  const upload = async (file: File | null, pathPrefix: string) => {
    if (!file || !activeLabel) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${pathPrefix}/${activeLabel.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("artist-images").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("artist-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSave = async () => {
    if (!activeLabel) return;
    try {
      setSaving(true);
      let newLogo = logoUrl;
      let newCover = coverUrl;
      if (logoFile) newLogo = (await upload(logoFile, "labels/logo")) || newLogo;
      if (coverFile) newCover = (await upload(coverFile, "labels/cover")) || newCover;

      const { error } = await supabase
        .from("labels")
        .update({ name, slug, logo_url: newLogo || null, cover_image_url: newCover || null })
        .eq("id", activeLabel.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Label settings updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeLabel) return;
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_label_as_owner", {
        p_label_id: activeLabel.id,
      });
      if (error) throw error;

      toast({
        title: "Label deleted",
        description: "The label and its memberships have been removed.",
      });

      navigate("/studio/label", { replace: true });
    } catch (err: any) {
      toast({
        title: "Failed to delete label",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!activeLabel) {
    return <div className="space-y-2"><h2 className="text-2xl font-semibold">Settings</h2><p className="text-muted-foreground">No active label.</p></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Label Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              <div className="mt-2">
                <Input placeholder="or paste image URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="cover">Cover</Label>
              <Input id="cover" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              <div className="mt-2">
                <Input placeholder="or paste image URL" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="pt-4">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Deleting a label removes all team access, invitations, and linked data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Label"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {activeLabel.name || "this label"}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately remove the label, its team members, invitations, and any managed profiles. Content you own remains in your personal workspace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={deleting} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

