import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Radio,
  FileText,
  HeadphonesIcon,
  Plus,
  Calendar,
  Users,
  DollarSign,
  Play,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  RefreshCw,
  Share2,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

const SESSION_PAGE_SIZE = 6;
const TICKET_PAGE_SIZE = 8;
const RECORDING_PAGE_SIZE = 6;

type SessionStatus = "scheduled" | "live" | "ended" | "cancelled" | "draft";
type ReminderType = "24h" | "1h";

interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: SessionStatus;
  is_public: boolean;
  host_id: string;
  max_participants: number | null;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
  reminder_count?: number;
  ics_url?: string | null;
  ticketsSold: number;
  revenueCents: number;
  recordings: RecordingRow[];
}

interface LiveTicketRow {
  id: string;
  session_id: string;
  host_id: string;
  user_id: string | null;
  created_at: string;
  status: string | null;
  price_cents: number | null;
  currency?: string | null;
  buyer_email?: string | null;
  sessions?: {
    id: string;
    title: string;
    scheduled_at: string | null;
  } | null;
}

interface RecordingRow {
  id: string;
  session_id: string;
  title: string;
  playback_url: string | null;
  created_at: string;
  duration_seconds: number | null;
  published_at: string | null;
  storage_path?: string | null;
  sessions?: {
    id: string;
    title: string;
    scheduled_at: string | null;
  } | null;
}

interface SessionFormState {
  id?: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  maxParticipants: number | null;
  priceCents: number;
  isFree: boolean;
  isPublic: boolean;
}

const emptySessionForm: SessionFormState = {
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: 60,
  maxParticipants: null,
  priceCents: 0,
  isFree: true,
  isPublic: true,
};

const statusColors: Record<SessionStatus, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "outline",
  scheduled: "default",
  live: "default",
  ended: "secondary",
  cancelled: "destructive",
};

const reminderCopy: Record<ReminderType, string> = {
  "24h": "24 hour reminder",
  "1h": "1 hour reminder",
};

const formatCurrency = (value: number | null | undefined, currency = "USD") => {
  const amount = Number(value ?? 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatScheduledFor = (value: string | null) => {
  if (!value) return "Not scheduled";
  try {
    return `${format(new Date(value), "PPpp")} (${formatDistanceToNow(new Date(value), {
      addSuffix: true,
    })})`;
  } catch (error) {
    return value;
  }
};

const PaginationControls = ({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * pageSize + 1, total)}-
        {Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export const LiveModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("sessions");

  const [sessionForm, setSessionForm] = useState<SessionFormState>(emptySessionForm);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionStatusFilter, setSessionStatusFilter] = useState<"all" | SessionStatus>("all");
  const [sessionVisibilityFilter, setSessionVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sessionDateFilter, setSessionDateFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [sessionSearch, setSessionSearch] = useState("");

  const [ticketLoading, setTicketLoading] = useState(false);
  const [tickets, setTickets] = useState<LiveTicketRow[]>([]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "paid" | "refunded" | "pending">("all");
  const [ticketPriceFilter, setTicketPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [ticketSearch, setTicketSearch] = useState("");

  const [recordingLoading, setRecordingLoading] = useState(false);
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [recordingTotal, setRecordingTotal] = useState(0);
  const [recordingPage, setRecordingPage] = useState(1);
  const [recordingStatusFilter, setRecordingStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [recordingSearch, setRecordingSearch] = useState("");

  const [refreshFlag, setRefreshFlag] = useState(0);

  const resetForm = () => {
    setSessionForm(emptySessionForm);
  };

  const refreshAll = () => {
    setRefreshFlag((flag) => flag + 1);
  };

  useEffect(() => {
    if (!user?.id) return;
    const fetchSessions = async () => {
      setSessionLoading(true);
      try {
        let query = supabase
          .from("sessions")
          .select("*", { count: "exact" })
          .eq("host_id", user.id)
          .order("scheduled_at", { ascending: true });

        if (sessionStatusFilter !== "all") {
          query = query.eq("status", sessionStatusFilter);
        }

        if (sessionVisibilityFilter !== "all") {
          query = query.eq("is_public", sessionVisibilityFilter === "public");
        }

        const nowIso = new Date().toISOString();
        if (sessionDateFilter === "upcoming") {
          query = query.gte("scheduled_at", nowIso);
        } else if (sessionDateFilter === "past") {
          query = query.lt("scheduled_at", nowIso);
        }

        if (sessionSearch.trim()) {
          query = query.ilike("title", `%${sessionSearch.trim()}%`);
        }

        const from = (sessionPage - 1) * SESSION_PAGE_SIZE;
        const to = from + SESSION_PAGE_SIZE - 1;

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        const sessionIds = (data ?? []).map((session) => session.id);
        let ticketsBySession: Record<string, { count: number; revenue: number }> = {};
        if (sessionIds.length) {
          const { data: ticketRows, error: ticketError } = await supabase
            .from("live_tickets")
            .select("session_id, price_cents, status")
            .in("session_id", sessionIds);

          if (ticketError) throw ticketError;

          ticketsBySession = (ticketRows ?? []).reduce<Record<string, { count: number; revenue: number }>>(
            (acc, ticket) => {
              const key = ticket.session_id;
              const existing = acc[key] ?? { count: 0, revenue: 0 };
              const price = Number(ticket.price_cents ?? 0);
              const isPaid = price > 0 && ticket.status !== "refunded";
              acc[key] = {
                count: existing.count + 1,
                revenue: existing.revenue + (isPaid ? price : 0),
              };
              return acc;
            },
            {},
          );
        }

        let recordingsBySession: Record<string, RecordingRow[]> = {};
        if (sessionIds.length) {
          const { data: recordingRows, error: recordingError } = await supabase
            .from("recordings")
            .select("id, session_id, title, playback_url, created_at, duration_seconds, published_at, storage_path")
            .in("session_id", sessionIds);

          if (!recordingError) {
            recordingsBySession = (recordingRows ?? []).reduce<Record<string, RecordingRow[]>>((acc, recording) => {
              if (!acc[recording.session_id]) {
                acc[recording.session_id] = [];
              }
              acc[recording.session_id].push(recording);
              return acc;
            }, {});
          }
        }

        const augmented = (data ?? []).map<SessionRow>((session) => ({
          ...session,
          ticketsSold: ticketsBySession[session.id]?.count ?? 0,
          revenueCents: ticketsBySession[session.id]?.revenue ?? 0,
          recordings: recordingsBySession[session.id] ?? [],
        }));

        setSessions(augmented);
        setSessionTotal(count ?? augmented.length);
      } catch (error) {
        console.error("Error loading sessions", error);
        toast({
          title: "Unable to load sessions",
          description: "There was a problem fetching your scheduled sessions.",
          variant: "destructive",
        });
      } finally {
        setSessionLoading(false);
      }
    };

    void fetchSessions();
  }, [
    user?.id,
    sessionStatusFilter,
    sessionVisibilityFilter,
    sessionDateFilter,
    sessionSearch,
    sessionPage,
    toast,
    refreshFlag,
  ]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchTickets = async () => {
      setTicketLoading(true);
      try {
        let query = supabase
          .from("live_tickets")
          .select("id, session_id, host_id, user_id, created_at, status, price_cents, buyer_email, sessions:sessions!inner(id,title,scheduled_at)", {
            count: "exact",
          })
          .eq("host_id", user.id)
          .order("created_at", { ascending: false });

        if (ticketStatusFilter !== "all") {
          if (ticketStatusFilter === "paid") {
            query = query.eq("status", "paid");
          } else if (ticketStatusFilter === "refunded") {
            query = query.eq("status", "refunded");
          } else {
            query = query.eq("status", "pending");
          }
        }

        if (ticketPriceFilter === "free") {
          query = query.eq("price_cents", 0);
        } else if (ticketPriceFilter === "paid") {
          query = query.gt("price_cents", 0);
        }

        if (ticketSearch.trim()) {
          query = query.ilike("buyer_email", `%${ticketSearch.trim()}%`);
        }

        const from = (ticketPage - 1) * TICKET_PAGE_SIZE;
        const to = from + TICKET_PAGE_SIZE - 1;

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        setTickets(data ?? []);
        setTicketTotal(count ?? (data?.length ?? 0));
      } catch (error) {
        console.error("Error loading tickets", error);
        toast({
          title: "Unable to load tickets",
          description: "Ticket sales could not be fetched right now.",
          variant: "destructive",
        });
      } finally {
        setTicketLoading(false);
      }
    };

    void fetchTickets();
  }, [user?.id, ticketStatusFilter, ticketPriceFilter, ticketSearch, ticketPage, toast, refreshFlag]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchRecordings = async () => {
      setRecordingLoading(true);
      try {
        let query = supabase
          .from("recordings")
          .select("id, session_id, title, playback_url, created_at, duration_seconds, published_at, storage_path, sessions:sessions!inner(id,title,scheduled_at)", {
            count: "exact",
          })
          .eq("host_id", user.id)
          .order("created_at", { ascending: false });

        if (recordingStatusFilter !== "all") {
          if (recordingStatusFilter === "published") {
            query = query.not("published_at", "is", null);
          } else {
            query = query.is("published_at", null);
          }
        }

        if (recordingSearch.trim()) {
          query = query.ilike("title", `%${recordingSearch.trim()}%`);
        }

        const from = (recordingPage - 1) * RECORDING_PAGE_SIZE;
        const to = from + RECORDING_PAGE_SIZE - 1;

        const { data, error, count } = await query.range(from, to);
        if (error) throw error;

        setRecordings(data ?? []);
        setRecordingTotal(count ?? (data?.length ?? 0));
      } catch (error) {
        console.error("Error loading recordings", error);
        toast({
          title: "Unable to load recordings",
          description: "We couldn't load your recorded sessions.",
          variant: "destructive",
        });
      } finally {
        setRecordingLoading(false);
      }
    };

    void fetchRecordings();
  }, [user?.id, recordingStatusFilter, recordingSearch, recordingPage, toast, refreshFlag]);

  const openCreateDialog = () => {
    resetForm();
    setSessionDialogOpen(true);
  };

  const openEditDialog = (session: SessionRow) => {
    setSessionForm({
      id: session.id,
      title: session.title,
      description: session.description ?? "",
      scheduledAt: session.scheduled_at ? session.scheduled_at.slice(0, 16) : "",
      durationMinutes: 60,
      maxParticipants: session.max_participants,
      priceCents: Number(session.price_cents ?? 0),
      isFree: !session.price_cents || session.price_cents === 0,
      isPublic: Boolean(session.is_public),
    });
    setSessionDialogOpen(true);
  };

  const handleSessionSubmit = async () => {
    if (!user?.id) return;
    if (!sessionForm.title.trim() || !sessionForm.scheduledAt) {
      toast({
        title: "Missing required fields",
        description: "Title and schedule are required to save a session.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      id: sessionForm.id,
      title: sessionForm.title.trim(),
      description: sessionForm.description.trim() || null,
      scheduled_at: new Date(sessionForm.scheduledAt).toISOString(),
      duration_minutes: sessionForm.durationMinutes,
      max_participants: sessionForm.maxParticipants,
      price_cents: sessionForm.isFree ? 0 : sessionForm.priceCents,
      is_public: sessionForm.isPublic,
      host_id: user.id,
    };

    try {
      const action = sessionForm.id ? "update" : "create";
      const { error } = await supabase.functions.invoke("manage-live-session", {
        body: {
          action,
          userId: user.id,
          session: payload,
        },
      });

      if (error) throw error;

      toast({
        title: `Session ${sessionForm.id ? "updated" : "scheduled"}`,
        description: "Seat caps, pricing, and reminders were refreshed.",
      });

      setSessionDialogOpen(false);
      resetForm();
      refreshAll();
    } catch (error) {
      console.error("Error saving session", error);
      toast({
        title: "Unable to save session",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSession = async (session: SessionRow) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.functions.invoke("manage-live-session", {
        body: {
          action: "delete",
          userId: user.id,
          session: { id: session.id },
        },
      });

      if (error) throw error;

      toast({
        title: "Session removed",
        description: `${session.title} has been cancelled and reminders were withdrawn.`,
      });

      refreshAll();
    } catch (error) {
      console.error("Error deleting session", error);
      toast({
        title: "Unable to delete session",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const sessionsEmpty = !sessionLoading && sessions.length === 0;
  const ticketsEmpty = !ticketLoading && tickets.length === 0;
  const recordingsEmpty = !recordingLoading && recordings.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Streaming</h1>
          <p className="text-muted-foreground">
            Manage live sessions, enforce ticketing limits, and surface recordings automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{sessionForm.id ? "Update session" : "Schedule new session"}</DialogTitle>
                <DialogDescription>
                  Seat caps, pricing validation, and reminder scheduling are enforced by the edge function.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={sessionForm.title}
                      onChange={(event) => setSessionForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Beat breakdown livestream"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Scheduled for</label>
                    <Input
                      type="datetime-local"
                      value={sessionForm.scheduledAt}
                      onChange={(event) => setSessionForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={sessionForm.description}
                    onChange={(event) => setSessionForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    placeholder="What should fans expect?"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    <Input
                      type="number"
                      min={15}
                      value={sessionForm.durationMinutes}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Seat cap</label>
                    <Input
                      type="number"
                      min={0}
                      value={sessionForm.maxParticipants ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSessionForm((prev) => ({
                          ...prev,
                          maxParticipants: value === "" ? null : Number(value),
                        }));
                      }}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Free session</p>
                      <p className="text-xs text-muted-foreground">
                        Disable to require paid tickets; pricing enforced via edge function.
                      </p>
                    </div>
                    <Switch
                      checked={sessionForm.isFree}
                      onCheckedChange={(checked) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          isFree: checked,
                          priceCents: checked ? 0 : prev.priceCents,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price (in cents)</label>
                    <Input
                      type="number"
                      disabled={sessionForm.isFree}
                      value={sessionForm.priceCents}
                      onChange={(event) =>
                        setSessionForm((prev) => ({ ...prev, priceCents: Number(event.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Public listing</p>
                    <p className="text-xs text-muted-foreground">
                      Public sessions surface on your profile and library widgets.
                    </p>
                  </div>
                  <Switch
                    checked={sessionForm.isPublic}
                    onCheckedChange={(checked) => setSessionForm((prev) => ({ ...prev, isPublic: checked }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSessionSubmit}>
                  {sessionForm.id ? "Update session" : "Schedule session"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <HeadphonesIcon className="h-4 w-4" />
            Recordings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Scheduled sessions</CardTitle>
                  <CardDescription>
                    Real-time counts sync with ticketing and reminder scheduling edge functions.
                  </CardDescription>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <Input
                    placeholder="Search sessions"
                    value={sessionSearch}
                    onChange={(event) => {
                      setSessionPage(1);
                      setSessionSearch(event.target.value);
                    }}
                    className="md:w-56"
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={sessionStatusFilter}
                      onValueChange={(value: SessionStatus | "all") => {
                        setSessionPage(1);
                        setSessionStatusFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sessionDateFilter}
                      onValueChange={(value: "upcoming" | "past" | "all") => {
                        setSessionPage(1);
                        setSessionDateFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="When" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sessionVisibilityFilter}
                      onValueChange={(value: "all" | "public" | "private") => {
                        setSessionPage(1);
                        setSessionVisibilityFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionLoading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching sessions...
                </div>
              )}

              {sessionsEmpty && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Radio className="mb-4 h-10 w-10" />
                  <p className="text-sm">No sessions found. Schedule your first livestream to get started.</p>
                </div>
              )}

              {!sessionLoading && sessions.length > 0 && (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{session.title}</h3>
                            <Badge variant={statusColors[session.status] ?? "secondary"}>{session.status}</Badge>
                            <Badge variant="outline">{session.is_public ? "Public" : "Private"}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground max-w-2xl">{session.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" /> {formatScheduledFor(session.scheduled_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {session.max_participants ? `${session.ticketsSold}/${session.max_participants} seats` : `${session.ticketsSold} attendees`}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {session.price_cents && session.price_cents > 0
                                ? formatCurrency(session.price_cents)
                                : "Free"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.recordings.length > 0
                                ? `${session.recordings.length} recording${session.recordings.length === 1 ? "" : "s"}`
                                : "No recording yet"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(session)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSession(session)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Tickets sold</p>
                          <p className="text-lg font-semibold">{session.ticketsSold}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Live revenue</p>
                          <p className="text-lg font-semibold">{formatCurrency(session.revenueCents)}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Reminder status</p>
                          <p className="text-sm text-muted-foreground">
                            Reminders auto-manage via edge function once tickets are sold.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <PaginationControls
                page={sessionPage}
                pageSize={SESSION_PAGE_SIZE}
                total={sessionTotal}
                onChange={setSessionPage}
              />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Ticket sales</CardTitle>
                  <CardDescription>
                    Seat caps and refunds are enforced via the manage-live-session RPC.
                  </CardDescription>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <Input
                    placeholder="Search buyer email"
                    value={ticketSearch}
                    onChange={(event) => {
                      setTicketPage(1);
                      setTicketSearch(event.target.value);
                    }}
                    className="md:w-64"
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      value={ticketStatusFilter}
                      onValueChange={(value: "all" | "paid" | "refunded" | "pending") => {
                        setTicketPage(1);
                        setTicketStatusFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={ticketPriceFilter}
                      onValueChange={(value: "all" | "free" | "paid") => {
                        setTicketPage(1);
                        setTicketPriceFilter(value);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Price" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketLoading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching tickets...
                </div>
              )}

              {ticketsEmpty && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <FileText className="mb-4 h-10 w-10" />
                  <p className="text-sm">No ticket sales yet. Sell access by scheduling a session above.</p>
                </div>
              )}

              {!ticketLoading && tickets.length > 0 && (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{ticket.sessions?.title ?? "Untitled session"}</p>
                        <p className="text-xs text-muted-foreground">
                          Purchased {ticket.created_at ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true }) : "unknown"}
                          {ticket.sessions?.scheduled_at && ` • Starts ${format(new Date(ticket.sessions.scheduled_at), "PPpp")}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Buyer: {ticket.buyer_email ?? ticket.user_id ?? "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{ticket.status ?? "pending"}</Badge>
                        <span className="text-sm font-medium">
                          {ticket.price_cents && ticket.price_cents > 0
                            ? formatCurrency(ticket.price_cents, ticket.currency ?? "USD")
                            : "Free"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <PaginationControls
                page={ticketPage}
                pageSize={TICKET_PAGE_SIZE}
                total={ticketTotal}
                onChange={setTicketPage}
              />
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Recorded sessions</CardTitle>
                  <CardDescription>
                    Published recordings surface in the fan library and analytics once available.
                  </CardDescription>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <Input
                    placeholder="Search recordings"
                    value={recordingSearch}
                    onChange={(event) => {
                      setRecordingPage(1);
                      setRecordingSearch(event.target.value);
                    }}
                    className="md:w-64"
                  />
                  <Select
                    value={recordingStatusFilter}
                    onValueChange={(value: "all" | "published" | "draft") => {
                      setRecordingPage(1);
                      setRecordingStatusFilter(value);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recordingLoading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fetching recordings...
                </div>
              )}

              {recordingsEmpty && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <HeadphonesIcon className="mb-4 h-10 w-10" />
                  <p className="text-sm">No recordings yet. Record live sessions to surface VOD here.</p>
                </div>
              )}

              {!recordingLoading && recordings.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {recordings.map((recording) => (
                    <div key={recording.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-base font-semibold">{recording.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Recorded {recording.created_at ? format(new Date(recording.created_at), "PPpp") : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {recording.sessions?.title ? `Session: ${recording.sessions.title}` : "Linked session removed"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duration: {recording.duration_seconds ? `${Math.round(recording.duration_seconds / 60)} min` : "N/A"}
                          </p>
                        </div>
                        <Badge variant={recording.published_at ? "default" : "outline"}>
                          {recording.published_at ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button asChild size="sm">
                          <a href={recording.playback_url ?? recording.storage_path ?? "#"} target="_blank" rel="noreferrer">
                            <Play className="mr-2 h-4 w-4" /> Play
                          </a>
                        </Button>
                        {recording.storage_path && (
                          <Button asChild size="sm" variant="outline">
                            <a href={recording.storage_path} target="_blank" rel="noreferrer">
                              <Download className="mr-2 h-4 w-4" /> Download
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <PaginationControls
                page={recordingPage}
                pageSize={RECORDING_PAGE_SIZE}
                total={recordingTotal}
                onChange={setRecordingPage}
              />
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? "Edit session" : "Schedule new session"}
            </DialogTitle>
            <DialogDescription>
              Configure your session details and notify your followers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-title">Title</Label>
              <Input
                id="session-title"
                placeholder="Live session title"
                value={sessionForm.title}
                onChange={(event) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-description">Description</Label>
              <Textarea
                id="session-description"
                placeholder="Let fans know what to expect"
                value={sessionForm.description}
                onChange={(event) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-time">Scheduled for</Label>
                <Input
                  id="session-time"
                  type="datetime-local"
                  value={sessionForm.scheduledFor}
                  onChange={(event) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      scheduledFor: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-status">Status</Label>
                <Select
                  value={sessionForm.status}
                  onValueChange={(value: SessionFormState["status"]) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger id="session-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idle">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Public session</p>
                <p className="text-xs text-muted-foreground">
                  Toggle visibility so anyone with the link can join.
                </p>
              </div>
              <Switch
                checked={sessionForm.isPublic}
                onCheckedChange={(checked) =>
                  setSessionForm((prev) => ({
                    ...prev,
                    isPublic: checked,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionDialogOpen(false)}
              disabled={sessionActionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSessionSubmit} disabled={sessionActionLoading}>
              {editingSession ? "Save changes" : "Schedule session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTicket ? "Edit ticket" : "Create ticket"}
            </DialogTitle>
            <DialogDescription>
              Configure pricing and inventory for this live event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-session">Session</Label>
              <Select
                value={ticketForm.sessionId}
                onValueChange={(value) =>
                  setTicketForm((prev) => ({
                    ...prev,
                    sessionId: value,
                  }))
                }
              >
                <SelectTrigger id="ticket-session">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex flex-col gap-0.5">
                        <span>{option.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateDisplay(option.scheduled, "Date TBA")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-price">Price (USD)</Label>
                <Input
                  id="ticket-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={ticketForm.price}
                  onChange={(event) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      price: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-inventory">Inventory</Label>
                <Input
                  id="ticket-inventory"
                  type="number"
                  min={0}
                  value={ticketForm.inventory}
                  onChange={(event) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      inventory: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-max">Max per fan</Label>
                <Input
                  id="ticket-max"
                  type="number"
                  min={1}
                  value={ticketForm.maxPerUser}
                  onChange={(event) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      maxPerUser: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-status">Status</Label>
                <Select
                  value={ticketForm.status}
                  onValueChange={(value) =>
                    setTicketForm((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger id="ticket-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="on_sale">On sale</SelectItem>
                    <SelectItem value="sold_out">Sold out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTicketDialogOpen(false)}
              disabled={ticketActionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleTicketSubmit} disabled={ticketActionLoading}>
              {editingTicket ? "Save changes" : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recordingDialogOpen} onOpenChange={setRecordingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecording ? "Edit recording" : "Attach recording"}
            </DialogTitle>
            <DialogDescription>
              Link recordings to your sessions for on-demand access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recording-session">Session</Label>
              <Select
                value={recordingForm.sessionId}
                onValueChange={(value) =>
                  setRecordingForm((prev) => ({
                    ...prev,
                    sessionId: value,
                  }))
                }
              >
                <SelectTrigger id="recording-session">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex flex-col gap-0.5">
                        <span>{option.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateDisplay(option.scheduled, "Date TBA")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recording-title">Recording title</Label>
              <Input
                id="recording-title"
                placeholder="Session replay title"
                value={recordingForm.title}
                onChange={(event) =>
                  setRecordingForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recording-url">Playback URL</Label>
              <Input
                id="recording-url"
                placeholder="https://..."
                value={recordingForm.playbackUrl}
                onChange={(event) =>
                  setRecordingForm((prev) => ({
                    ...prev,
                    playbackUrl: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recording-duration">Duration (seconds)</Label>
                <Input
                  id="recording-duration"
                  type="number"
                  min={0}
                  value={recordingForm.durationSeconds}
                  onChange={(event) =>
                    setRecordingForm((prev) => ({
                      ...prev,
                      durationSeconds: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recording-published">Published at</Label>
                <Input
                  id="recording-published"
                  type="datetime-local"
                  value={recordingForm.publishedAt}
                  onChange={(event) =>
                    setRecordingForm((prev) => ({
                      ...prev,
                      publishedAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecordingDialogOpen(false)}
              disabled={recordingActionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordingSubmit} disabled={recordingActionLoading}>
              {editingRecording ? "Save changes" : "Attach recording"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
