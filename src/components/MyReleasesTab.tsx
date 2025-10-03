import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedBadge } from "@/components/ui/badge-enhanced";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { PressKitGenerator } from "@/components/PressKitGenerator";

interface ReleaseEntry {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  genre: string | null;
  release_type: string;
  moderation_notes?: string | null;
  approved?: boolean | null;
}

export const MyReleasesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReleaseEntry[]>([]);
  const [submitLoadingId, setSubmitLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchReleases();
  }, [user]);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("releases")
        .select("id, title, status, created_at, updated_at, genre, release_type, moderation_notes, approved")
        .eq('user_id', user?.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitRelease = async (id: string) => {
    setSubmitLoadingId(id);
    try {
      const { error } = await supabase
        .from("releases")
        .update({ status: "submitted", approved: false })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Submitted for review" });
      fetchReleases();
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitLoadingId(null);
    }
  };

  const deleteRelease = async (id: string) => {
    try {
      const { data: current } = await supabase.from('releases').select('status').eq('id', id).single();
      if (current && (current.status === 'live' || current.status === 'approved')) {
        toast({ title: "Cannot delete live release", description: "Unpublish or contact support.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("releases").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Release deleted" });
      setItems((d) => d.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Could not delete", description: e.message, variant: "destructive" });
    }
  };

  return (
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
        ) : items.length === 0 ? (
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.release_type}</TableCell>
                  <TableCell>{r.genre || "—"}</TableCell>
                  <TableCell>
                    <EnhancedBadge variant={r.status === "submitted" ? "default" : r.status === "rejected" ? "destructive" : r.status === 'live' ? 'default' : "secondary"}>
                      {r.status}
                    </EnhancedBadge>
                    {r.status === "rejected" && r.moderation_notes && (
                      <div className="mt-1 text-xs text-destructive">{r.moderation_notes}</div>
                    )}
                  </TableCell>
                  <TableCell>{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/release/new?edit=${r.id}`)}>
                      Edit
                    </Button>
                    {r.status === "draft" && (
                      <Button size="sm" onClick={() => submitRelease(r.id)} disabled={submitLoadingId === r.id}>
                        Submit
                      </Button>
                    )}
                    {r.status === "rejected" && (
                      <Button size="sm" variant="secondary" onClick={() => submitRelease(r.id)} disabled={submitLoadingId === r.id}>
                        Resubmit
                      </Button>
                    )}
                    {(r.status === "live" || r.status === "approved") && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/release/${r.id}`)}>
                        View Live
                      </Button>
                    )}
                    {(r.status === "draft" || r.status === "rejected") && (
                      <Button variant="destructive" size="sm" onClick={() => deleteRelease(r.id)}>
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
