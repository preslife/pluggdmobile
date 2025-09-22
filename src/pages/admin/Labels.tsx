import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Building, Trash2, ExternalLink, Users, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LabelRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  owners: string[];
  member_count: number;
  invite_count: number;
  created_at: string | null;
};

export default function AdminLabelsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, slug, logo_url, cover_image_url, created_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load labels", description: error.message, variant: "destructive" });
    } else {
      const rows = data || [];
      const enriched = await Promise.all(
        rows.map(async (label) => {
          const memberRes = await supabase
            .from("label_members")
            .select("id", { head: true, count: "exact" })
            .eq("label_id", label.id);
          if (memberRes.error) throw memberRes.error;

          const inviteRes = await supabase
            .from("label_invitations")
            .select("id", { head: true, count: "exact" })
            .eq("label_id", label.id)
            .is("accepted_at", null);
          if (inviteRes.error) throw inviteRes.error;

          const ownersRes = await supabase
            .from("label_members")
            .select("profiles!inner(full_name, username)")
            .eq("label_id", label.id)
            .eq("role", "owner");
          if (ownersRes.error) throw ownersRes.error;

          const owners = (ownersRes.data || []).map((row: any) => {
            const profile = row.profiles || {};
            return profile.full_name || profile.username || "Owner";
          });

          return {
            id: label.id,
            name: label.name,
            slug: label.slug,
            logo_url: label.logo_url,
            cover_image_url: label.cover_image_url,
            created_at: label.created_at ?? null,
            owners,
            member_count: memberRes.count ?? 0,
            invite_count: inviteRes.count ?? 0,
          } as LabelRow;
        })
      );
      setLabels(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const createLabel = async () => {
    if (!createName || !createSlug) {
      toast({ title: "Missing fields", description: "Name and slug are required.", variant: "destructive" });
      return;
    }
    try {
      setCreating(true);
      const { error } = await supabase.rpc("admin_create_managed_label", {
        p_owner_email: ownerEmail || null,
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
      setOwnerEmail("");
      setLogoUrl("");
      setCoverUrl("");
      load();
    } catch (err: any) {
      const message = err?.message || String(err);
      toast({
        title: "Create failed",
        description:
          message.includes("forbidden_service_role_required")
            ? "admin_create_managed_label currently requires a service-role context. Run this operation via the admin CLI or edge function."
            : message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (labelId: string) => {
    try {
      setDeletingId(labelId);
      const { error } = await supabase.rpc("admin_delete_label", { p_label_id: labelId });
      if (error) throw error;
      toast({ title: "Label deleted", description: "Label and associated rows removed." });
      await load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        <section className="space-y-4 pt-6">
          <div>
            <h1 className="text-2xl font-semibold">Label management</h1>
            <p className="text-muted-foreground">
              Create managed labels, review owners, and clean up test data. Creating a label without an owner email keeps it in the admin pool until claimed.
            </p>
          </div>
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
              <UILabel htmlFor="oemail">Owner email (optional)</UILabel>
              <Input
                id="oemail"
                type="email"
                placeholder="owner@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
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
        </section>

        <section className="space-y-4 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Existing labels</h2>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : labels.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No labels found. Create one above or wait for creators to submit requests.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {labels.map((label) => (
                <Card key={label.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary" />
                        {label.name || "(unnamed label)"}
                      </span>
                      <Badge variant="outline">{label.slug || "no-slug"}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {label.created_at ? new Date(label.created_at).toLocaleDateString() : "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" /> {label.member_count} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" /> {label.invite_count} pending invites
                      </span>
                    </div>
                    {label.owners.length > 0 && (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Owners</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {label.owners.map((owner) => (
                            <Badge key={owner} variant="secondary">{owner}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/studio/label/${label.slug}/roster`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Label Studio
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deletingId === label.id}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deletingId === label.id ? "Deleting..." : "Delete"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {label.name || label.slug}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the label, team memberships, invitations, and Stripe state immediately. Content assigned to the label remains but will reference the former owner.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === label.id}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(label.id)}
                              disabled={deletingId === label.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Confirm Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
