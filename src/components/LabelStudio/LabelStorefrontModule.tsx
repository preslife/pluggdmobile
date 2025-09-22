import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLabel } from "@/hooks/useActiveLabel";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function LabelStorefrontModule() {
  const { activeLabel, loading: labelLoading } = useActiveLabel();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [genre, setGenre] = useState("");
  const [country, setCountry] = useState("");
  const [previewReleases, setPreviewReleases] = useState<Array<{ id: string; title: string; status: string; created_at: string }>>([]);

  useEffect(() => {
    if (!labelLoading && activeLabel) {
      setLogoUrl(activeLabel.logo_url || "");
      setCoverUrl(activeLabel.cover_image_url || "");
      fetchLabelDetails(activeLabel.id);
    }
  }, [activeLabel?.id, labelLoading]);

  const fetchLabelDetails = async (labelId: string) => {
    try {
      const { data: labelRow, error: labelError } = await supabase
        .from("labels")
        .select("contact_email, genre, country")
        .eq("id", labelId)
        .maybeSingle();
      if (labelError) throw labelError;
      if (labelRow) {
        setContactEmail(labelRow.contact_email || "");
        setGenre(labelRow.genre || "");
        setCountry(labelRow.country || "");
      }

      const { data: releases, error: releasesError } = await supabase
        .from("releases")
        .select("id, title, status, created_at")
        .eq("owner_type", "label")
        .eq("owner_id", labelId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!releasesError) {
        setPreviewReleases(releases || []);
      }
    } catch (err: any) {
      toast({
        title: "Unable to load storefront settings",
        description: err.message || String(err),
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!activeLabel) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("labels")
        .update({
          logo_url: logoUrl || null,
          cover_image_url: coverUrl || null,
          contact_email: contactEmail || null,
          genre: genre || null,
          country: country || null,
        })
        .eq("id", activeLabel.id);

      if (error) throw error;
      toast({ title: "Storefront updated", description: "Changes saved successfully." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (labelLoading || !activeLabel) {
    return <div className="text-muted-foreground">Select a label to configure storefront details.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Storefront</h2>
        <p className="text-muted-foreground">
          Control the public-facing presentation for {activeLabel.name || activeLabel.slug}. These settings feed the label profile and storefront pages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Brand assets</CardTitle>
            <CardDescription>Update imagery used on the label profile and storefront hero.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input id="logo-url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
              </div>
              <div>
                <Label htmlFor="cover-url">Cover image URL</Label>
                <Input id="cover-url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://example.com/cover.jpg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border/60 bg-muted/30 aspect-square flex items-center justify-center overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Label logo" className="max-h-full" /> : <span className="text-muted-foreground text-sm">Logo preview</span>}
              </div>
              <div className="rounded-md border border-border/60 bg-muted/30 aspect-square flex items-center justify-center overflow-hidden">
                {coverUrl ? <img src={coverUrl} alt="Cover art" className="object-cover w-full h-full" /> : <span className="text-muted-foreground text-sm">Cover preview</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & discovery</CardTitle>
            <CardDescription>Refresh metadata shown to listeners and partners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="contact-email">Contact email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="hello@label.com"
                />
              </div>
              <div>
                <Label htmlFor="genre">Primary genre</Label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Hip-Hop, R&B"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save storefront"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent releases featured on storefront</CardTitle>
          <CardDescription>The most recent label-owned releases will appear by default on the storefront carousel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewReleases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No releases yet. Publish a release to populate storefront sections.</p>
          ) : (
            previewReleases.map((release) => (
              <div key={release.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{release.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Added {format(new Date(release.created_at), "MMM d, yyyy")}
                  </div>
                </div>
                <Badge variant={release.status === "live" ? "default" : "outline"}>{release.status || "draft"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}




