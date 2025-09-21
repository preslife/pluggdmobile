import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { setMeta } from "@/lib/seo";
import { Link, useNavigate } from "react-router-dom";
import { DistributionExporter } from "@/components/DistributionExporter";
import { EnhancedDistributionPanel } from "@/components/EnhancedDistributionPanel";

interface Draft {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  genre: string | null;
  release_type: string;
  moderation_notes?: string | null;
  download_url?: string | null;
  cover_art_url?: string | null;
}

const MyReleases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitLoadingId, setSubmitLoadingId] = useState<string | null>(null);
  const [selectedDistributionRelease, setSelectedDistributionRelease] = useState<Draft | null>(null);

  useEffect(() => {
    setMeta(
      "My Releases — Pluggd",
      "Manage your release drafts and submissions.",
      "/my-releases"
    );
  }, []);

  useEffect(() => {
    if (user) fetchDrafts();
  }, [user]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("release_drafts")
        .select("id, title, status, created_at, updated_at, genre, release_type, moderation_notes, download_url, cover_art_url")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitDraft = async (id: string) => {
    setSubmitLoadingId(id);
    try {
      const { error } = await supabase
        .from("release_drafts")
        .update({ status: "submitted" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Submitted for review" });
      fetchDrafts();
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitLoadingId(null);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      const { error } = await supabase.from("release_drafts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Draft deleted" });
      setDrafts((d) => d.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Could not delete", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>My Releases</CardTitle>
            <Link to="/release/new">
              <Button>New Release</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : drafts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4">You haven't created any drafts yet.</p>
                <Button onClick={() => navigate("/release/new")}>Start a Release</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>{d.release_type}</TableCell>
                      <TableCell>{d.genre || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "submitted" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                          {d.status}
                        </Badge>
                        {d.status === "rejected" && d.moderation_notes && (
                          <div className="mt-1 text-xs text-destructive">{d.moderation_notes}</div>
                        )}
                      </TableCell>
                      <TableCell>{new Date(d.updated_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {d.status === "approved" ? (
                          <div className="space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedDistributionRelease(d)}
                            >
                              Distribute
                            </Button>
                            {d.download_url && (
                              <DistributionExporter
                                releaseId={d.id}
                                releaseTitle={d.title}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {d.status === "submitted" ? "Under review" : "Needs approval"}
                          </span>
                        )}
                      </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/release/new?draftId=${d.id}`)}>
                            Edit
                          </Button>
                          {d.status === "draft" && (
                            <Button size="sm" onClick={() => submitDraft(d.id)} disabled={submitLoadingId === d.id}>
                              Submit
                            </Button>
                          )}
                          {d.status === "rejected" && (
                            <Button size="sm" variant="secondary" onClick={() => submitDraft(d.id)} disabled={submitLoadingId === d.id}>
                              Resubmit
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => deleteDraft(d.id)}>
                            Delete
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Distribution Panel Modal */}
        {selectedDistributionRelease && (
          <EnhancedDistributionPanel
            release={selectedDistributionRelease}
            onClose={() => setSelectedDistributionRelease(null)}
            onUpdate={() => {
              fetchDrafts();
              setSelectedDistributionRelease(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default MyReleases;
