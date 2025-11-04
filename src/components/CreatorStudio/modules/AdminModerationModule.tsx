import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentReport {
  id: string;
  target_type: string;
  target_id: string;
  target_owner_id: string | null;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: "pending" | "investigating" | "resolved" | "dismissed" | "appealed";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  appeal_notes: string | null;
  appealed_at: string | null;
  appealed_by: string | null;
}

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface TargetDetail {
  label: string;
  href?: string | null;
}

type ReviewAction = "investigate" | "resolve" | "dismiss" | "reopen";

const actionLabels: Record<ReviewAction, string> = {
  investigate: "Mark Investigating",
  resolve: "Resolve",
  dismiss: "Dismiss",
  reopen: "Reopen",
};

const statusOrder: Array<ContentReport["status"] | "all"> = [
  "all",
  "pending",
  "investigating",
  "appealed",
  "resolved",
  "dismissed",
];

function normalizeCommunityHref(href?: string | null) {
  if (!href) return null;
  try {
    if (href.startsWith("/forum")) {
      const url = new URL(href, "https://pluggd.community");
      const tag = url.searchParams.get("tag");
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[1];
      if (tag) return `/collaborate?tag=${encodeURIComponent(tag)}`;
      if (slug) return `/collaborate?thread=${encodeURIComponent(slug)}`;
      return "/collaborate";
    }
    if (href.startsWith("/campaigns")) {
      const url = new URL(href, "https://pluggd.community");
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[1];
      return `/studio/crowdfunding${slug ? `?campaign=${encodeURIComponent(slug)}` : ""}`;
    }
    if (href === "/contests") return "/challenges";
    if (href === "/campaigns/new") return "/studio/crowdfunding";
  } catch {
    return href;
  }
  return href;
}

const getProfileLabel = (profile: ProfileSummary | undefined, fallback: string) =>
  profile?.username ?? profile?.full_name ?? fallback;

const getProfileInitials = (profile: ProfileSummary | undefined, fallback: string) => {
  const source = profile?.full_name ?? profile?.username ?? fallback;
  const cleaned = source.replace(/^@/, "");
  const segments = cleaned.split(" ").filter(Boolean);
  if (segments.length === 0) {
    return cleaned.slice(0, 2).toUpperCase() || fallback.slice(0, 2).toUpperCase();
  }
  if (segments.length === 1) {
    return segments[0]!.slice(0, 2).toUpperCase();
  }
  const first = segments[0]?.[0];
  const last = segments[segments.length - 1]?.[0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase() || fallback.slice(0, 2).toUpperCase();
};

export const AdminModerationModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContentReport["status"] | "all">("pending");
  const [pendingAction, setPendingAction] = useState<{ report: ContentReport; action: ReviewAction } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileSummary>>({});
  const [targetDetails, setTargetDetails] = useState<Record<string, TargetDetail>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setReports([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: role, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError) {
          console.error("Failed to verify admin role", roleError);
          toast({
            title: "Unable to verify permissions",
            description: roleError.message,
            variant: "destructive",
          });
          setIsAdmin(false);
          setReports([]);
          return;
        }

        setIsAdmin(Boolean(role));

        if (!role) {
          setReports([]);
          return;
        }

        await fetchReports();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const hydrateReportContext = useCallback(async (reportList: ContentReport[]) => {
    if (reportList.length === 0) {
      setProfileMap({});
      setTargetDetails({});
      return;
    }

    try {
      const userIds = new Set<string>();
      const releaseIds = new Set<string>();
      const beatIds = new Set<string>();
      const postIds = new Set<string>();
      const profileTargetIds = new Set<string>();

      reportList.forEach((report) => {
        if (report.reporter_id) userIds.add(report.reporter_id);
        if (report.target_owner_id) userIds.add(report.target_owner_id);
        if (report.resolved_by) userIds.add(report.resolved_by);
        if (report.appealed_by) userIds.add(report.appealed_by);

        switch (report.target_type) {
          case "release":
            releaseIds.add(report.target_id);
            break;
          case "beat":
            beatIds.add(report.target_id);
            break;
          case "post":
            postIds.add(report.target_id);
            break;
          case "profile":
            profileTargetIds.add(report.target_id);
            break;
          default:
            break;
        }
      });

      const [profilesResponse, releaseResponse, beatResponse, postResponse, profileTargetsResponse] = await Promise.all([
        userIds.size
          ? supabase
              .from("profiles")
              .select("user_id, full_name, username, avatar_url")
              .in("user_id", Array.from(userIds))
          : Promise.resolve({ data: [], error: null }),
        releaseIds.size
          ? supabase
              .from("releases")
              .select("id, title")
              .in("id", Array.from(releaseIds))
          : Promise.resolve({ data: [], error: null }),
        beatIds.size
          ? supabase
              .from("beats")
              .select("id, title")
              .in("id", Array.from(beatIds))
          : Promise.resolve({ data: [], error: null }),
        postIds.size
          ? supabase
              .from("posts")
              .select("id, title, slug")
              .in("id", Array.from(postIds))
          : Promise.resolve({ data: [], error: null }),
        profileTargetIds.size
          ? supabase
              .from("profiles")
              .select("id, username, full_name")
              .in("id", Array.from(profileTargetIds))
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesResponse.error || releaseResponse.error || beatResponse.error || postResponse.error || profileTargetsResponse.error) {
        const errMessage =
          profilesResponse.error?.message ||
          releaseResponse.error?.message ||
          beatResponse.error?.message ||
          postResponse.error?.message ||
          profileTargetsResponse.error?.message;
        throw new Error(errMessage ?? "Failed to load context");
      }

      const nextProfileMap: Record<string, ProfileSummary> = {};
      (profilesResponse.data as ProfileSummary[]).forEach((profile) => {
        nextProfileMap[profile.user_id] = profile;
      });
      setProfileMap(nextProfileMap);

      const nextTargetDetails: Record<string, TargetDetail> = {};
      (releaseResponse.data as Array<{ id: string; title?: string | null }>).forEach((release) => {
        nextTargetDetails[`release:${release.id}`] = {
          label: `Release • ${release.title ?? "Untitled"}`,
          href: `/releases/${release.id}`,
        };
      });
      (beatResponse.data as Array<{ id: string; title?: string | null }>).forEach((beat) => {
        nextTargetDetails[`beat:${beat.id}`] = {
          label: `Beat • ${beat.title ?? "Untitled"}`,
          href: `/beats/${beat.id}`,
        };
      });
      (postResponse.data as Array<{ id: string; title?: string | null; slug?: string | null }>).forEach((post) => {
        nextTargetDetails[`post:${post.id}`] = {
          label: `Post • ${post.title ?? "Community thread"}`,
          href: normalizeCommunityHref(`/forum/${post.slug ?? post.id}`),
        };
      });
      (profileTargetsResponse.data as Array<{ id: string; username?: string | null; full_name?: string | null }>).forEach((profile) => {
        nextTargetDetails[`profile:${profile.id}`] = {
          label: `Profile • ${profile.username ?? profile.full_name ?? profile.id.slice(0, 8)}`,
          href: `/u/${profile.username ?? profile.id}`,
        };
      });

      setTargetDetails(nextTargetDetails);
    } catch (err) {
      console.error("Failed to load moderation context", err);
      toast({
        title: "Unable to load report context",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("content_reports")
        .select(
          "id, target_type, target_id, target_owner_id, reporter_id, reason, description, status, created_at, updated_at, resolved_at, resolved_by, resolution_notes, appeal_notes, appealed_at, appealed_by",
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const reportRows = (data as ContentReport[]) ?? [];
      setReports(reportRows);
      setPage(1);
      void hydrateReportContext(reportRows);
    } catch (err) {
      console.error("Failed to load moderation queue", err);
      toast({
        title: "Unable to load reports",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  const openActionDialog = (report: ContentReport, action: ReviewAction) => {
    setPendingAction({ report, action });
    setNotes(report.resolution_notes ?? report.appeal_notes ?? "");
  };

  const closeDialog = () => {
    setPendingAction(null);
    setNotes("");
  };

  const performAction = async () => {
    if (!pendingAction) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("review-report", {
        body: {
          reportId: pendingAction.report.id,
          action: pendingAction.action,
          notes: notes.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to update report");
      }

      toast({
        title: "Report updated",
        description: `Report ${pendingAction.report.id.slice(0, 8)} marked as ${pendingAction.action}.`,
      });

      closeDialog();
      await fetchReports();
    } catch (err) {
      console.error("Failed to update report", err);
      toast({
        title: "Unable to update report",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = useMemo(() => {
    const unique = new Set<string>();
    reports.forEach((report) => {
      if (report.reason) {
        unique.add(report.reason);
      }
    });
    return Array.from(unique).sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    const byStatus = statusFilter === "all" ? reports : reports.filter((report) => report.status === statusFilter);
    const byReason = reasonFilter === "all" ? byStatus : byStatus.filter((report) => report.reason === reasonFilter);
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return byReason;
    }

    return byReason.filter((report) => {
      const reporterProfile = profileMap[report.reporter_id];
      const targetDetail = targetDetails[`${report.target_type}:${report.target_id}`];
      return (
        report.reason.toLowerCase().includes(search) ||
        (report.description?.toLowerCase().includes(search) ?? false) ||
        report.id.toLowerCase().includes(search) ||
        (reporterProfile?.username?.toLowerCase().includes(search) ?? false) ||
        (reporterProfile?.full_name?.toLowerCase().includes(search) ?? false) ||
        (targetDetail?.label?.toLowerCase().includes(search) ?? false)
      );
    });
  }, [reports, statusFilter, reasonFilter, searchTerm, profileMap, targetDetails]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(
    () => filteredReports.slice((page - 1) * pageSize, page * pageSize),
    [filteredReports, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, reasonFilter, searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const showingFrom = filteredReports.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = filteredReports.length === 0 ? 0 : Math.min(page * pageSize, filteredReports.length);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Moderation queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign in to access moderation tools.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <ShieldAlert className="h-5 w-5" />
            Admin access required
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => fetchReports()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-100">
            Moderation tools are limited to admin accounts. Reach out to the Pluggd team if you believe this is an error.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moderation queue</h1>
          <p className="text-muted-foreground">
            Review incoming content reports, track appeals, and resolve safety issues.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchReports()} className="gap-2 self-start md:self-auto">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <span className="text-xs font-semibold uppercase text-muted-foreground/70">Search</span>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by reporter, target, or reason"
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:max-w-xs">
            <span className="text-xs font-semibold uppercase text-muted-foreground/70">Reason</span>
            <Select value={reasonFilter} onValueChange={(value) => setReasonFilter(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end justify-end text-sm text-muted-foreground">
          {filteredReports.length === 0 ? "No reports to display" : `Showing ${showingFrom}–${showingTo} of ${filteredReports.length}`}
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as ContentReport["status"] | "all")} className="space-y-4">
        <TabsList>
          {statusOrder.map((status) => (
            <TabsTrigger key={status} value={status} className="capitalize">
              {status === "all" ? "All" : status}
              {status === "all" ? null : (
                <Badge variant="outline" className="ml-2">
                  {reports.filter((report) => (status === "all" ? true : report.status === status)).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-3">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reports match the current filters. Try adjusting the search or reason filter to continue triaging.
              </CardContent>
            </Card>
          ) : (
            paginatedReports.map((report) => {
              const reporterProfile = profileMap[report.reporter_id];
              const ownerProfile = report.target_owner_id ? profileMap[report.target_owner_id] : undefined;
              const targetDetail = targetDetails[`${report.target_type}:${report.target_id}`];
              const reporterFallback = `User ${report.reporter_id.slice(0, 8)}`;
              const ownerFallback = report.target_owner_id ? `User ${report.target_owner_id.slice(0, 8)}` : "Owner";
              const createdLabel = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });

              return (
                <Card key={report.id} className="border-border/60">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {report.target_type.toUpperCase()} · {report.reason.replace(/_/g, " ")}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Report #{report.id.slice(0, 8)}</span>
                        <span>{createdLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={report.status === "resolved" ? "default" : report.status === "dismissed" ? "outline" : "secondary"} className="capitalize">
                        {report.status}
                      </Badge>
                      {report.appealed_at && <Badge variant="destructive">Appealed</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {reporterProfile?.avatar_url ? (
                            <AvatarImage src={reporterProfile.avatar_url} alt={reporterProfile.username ?? reporterProfile.full_name ?? reporterFallback} />
                          ) : null}
                          <AvatarFallback>{getProfileInitials(reporterProfile, "RP")}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground/70">Reporter</p>
                          <p className="text-sm font-medium">
                            {reporterProfile ? (
                              <a href={`/u/${reporterProfile.username ?? reporterProfile.user_id}`} className="hover:underline">
                                {getProfileLabel(reporterProfile, reporterFallback)}
                              </a>
                            ) : (
                              reporterFallback
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground break-all">ID: {report.reporter_id}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground/70">Target</p>
                        <p className="text-sm font-medium">
                          {targetDetail ? (
                            targetDetail.href ? (
                              <a href={targetDetail.href} className="hover:underline">
                                {targetDetail.label}
                              </a>
                            ) : (
                              targetDetail.label
                            )
                          ) : (
                            `${report.target_type} • ${report.target_id.slice(0, 8)}`
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">ID: {report.target_id}</p>
                        {ownerProfile && (
                          <p className="text-xs text-muted-foreground">
                            Owner:{" "}
                            <a href={`/u/${ownerProfile.username ?? ownerProfile.user_id}`} className="hover:underline">
                              {getProfileLabel(ownerProfile, ownerFallback)}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    {report.description && (
                      <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openActionDialog(report, "investigate")}
                        disabled={report.status === "resolved" || report.status === "dismissed"}
                      >
                        {actionLabels.investigate}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openActionDialog(report, "resolve")}
                        disabled={report.status === "resolved"}
                      >
                        {actionLabels.resolve}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openActionDialog(report, "dismiss")}
                        disabled={report.status === "dismissed"}
                      >
                        {actionLabels.dismiss}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openActionDialog(report, "reopen")}
                        disabled={report.status === "appealed"}
                      >
                        {actionLabels.reopen}
                      </Button>
                    </div>
                    {(report.resolution_notes || report.appeal_notes) && (
                      <div className="rounded-md border border-dashed border-muted p-3 text-xs text-muted-foreground">
                        {report.resolution_notes && (
                          <p>
                            <span className="font-medium">Resolution notes:</span> {report.resolution_notes}
                          </p>
                        )}
                        {report.appeal_notes && (
                          <p>
                            <span className="font-medium">Appeal notes:</span> {report.appeal_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {filteredReports.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row">
          <div>Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && !submitting && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingAction ? actionLabels[pendingAction.action] : ""}</DialogTitle>
            <DialogDescription>
              {pendingAction
                ? `Update report ${pendingAction.report.id.slice(0, 8)} targeting ${pendingAction.report.target_type}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add moderation notes (optional)"
            rows={4}
          />
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={performAction} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModerationModule;
