import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
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
  Bell,
  BarChart,
  Trash2,
  Edit,
  Upload,
} from "lucide-react";
import { useSessionRooms, SessionRoom } from "@/hooks/useSessionRooms";
import { useLiveTickets, LiveTicket } from "@/hooks/useLiveTickets";
import {
  useSessionRecordings,
  SessionRecording,
} from "@/hooks/useSessionRecordings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import useAnalytics, { UserEngagementMetrics } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return "";
  try {
    return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error("Invalid date value", error);
    return "";
  }
};

const formatDateDisplay = (value?: string | null, fallback = "Not scheduled") => {
  if (!value) return fallback;
  try {
    return format(new Date(value), "PPpp");
  } catch (error) {
    return fallback;
  }
};

type SessionFormState = {
  title: string;
  description: string;
  scheduledFor: string;
  status: "idle" | "live" | "ended";
  isPublic: boolean;
};

type TicketFormState = {
  sessionId: string;
  price: number;
  inventory: number;
  maxPerUser: number;
  status: string;
};

type RecordingFormState = {
  sessionId: string;
  title: string;
  playbackUrl: string;
  durationSeconds: number;
  publishedAt: string;
};

type ReminderConfig = {
  leadMinutes: number;
  autoNotify: boolean;
};

const defaultSessionForm: SessionFormState = {
  title: "",
  description: "",
  scheduledFor: "",
  status: "idle",
  isPublic: true,
};

const defaultTicketForm: TicketFormState = {
  sessionId: "",
  price: 0,
  inventory: 50,
  maxPerUser: 1,
  status: "draft",
};

const defaultRecordingForm: RecordingFormState = {
  sessionId: "",
  title: "",
  playbackUrl: "",
  durationSeconds: 0,
  publishedAt: "",
};

const reminderOptions = [
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "6 hours before", value: 360 },
  { label: "1 day before", value: 1440 },
];

export const LiveModule: React.FC = () => {
  const { toast } = useToast();
  const {
    rooms,
    loading: roomsLoading,
    refetch: refetchRooms,
  } = useSessionRooms();
  const {
    tickets,
    loading: ticketsLoading,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: refetchTickets,
  } = useLiveTickets();
  const {
    recordings,
    loading: recordingsLoading,
    attachRecording,
    updateRecording,
    deleteRecording,
    refetch: refetchRecordings,
  } = useSessionRecordings();
  const {
    isSupported: notificationsSupported,
    isSubscribed,
    isLoading: notificationsLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const { track, getUserEngagementMetrics } = useAnalytics({
    enableAutoTracking: false,
  });

  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(
    defaultSessionForm
  );
  const [editingSession, setEditingSession] = useState<SessionRoom | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);

  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState<TicketFormState>(
    defaultTicketForm
  );
  const [editingTicket, setEditingTicket] = useState<LiveTicket | null>(null);
  const [ticketActionLoading, setTicketActionLoading] = useState(false);

  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [recordingForm, setRecordingForm] = useState<RecordingFormState>(
    defaultRecordingForm
  );
  const [editingRecording, setEditingRecording] =
    useState<SessionRecording | null>(null);
  const [recordingActionLoading, setRecordingActionLoading] = useState(false);

  const [engagementMetrics, setEngagementMetrics] =
    useState<UserEngagementMetrics | null>(null);

  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>({
    leadMinutes: 30,
    autoNotify: true,
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderUpdating, setReminderUpdating] = useState(false);

  const sessionOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        title: string;
        scheduled?: string | null;
      }
    >();

    rooms.forEach((room) => {
      map.set(room.id, {
        id: room.id,
        title: room.title,
        scheduled: room.scheduled_for,
      });
    });

    tickets.forEach((ticket) => {
      if (!map.has(ticket.sessionId)) {
        map.set(ticket.sessionId, {
          id: ticket.sessionId,
          title: ticket.sessionTitle || "Archived Session",
          scheduled: ticket.scheduledFor,
        });
      }
    });

    recordings.forEach((recording) => {
      if (!map.has(recording.sessionId)) {
        map.set(recording.sessionId, {
          id: recording.sessionId,
          title: recording.sessionTitle || "Recorded Session",
          scheduled: recording.sessionDate,
        });
      }
    });

    return Array.from(map.values());
  }, [rooms, tickets, recordings]);

  const totalUpcomingSessions = useMemo(
    () => rooms.filter((room) => room.status !== "ended").length,
    [rooms]
  );
  const totalTicketsSold = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (ticket.sold || 0), 0),
    [tickets]
  );
  const totalTicketRevenue = useMemo(
    () =>
      tickets.reduce(
        (sum, ticket) => sum + ((ticket.priceCents || 0) * (ticket.sold || 0)) / 100,
        0
      ),
    [tickets]
  );
  const averageAttendance = useMemo(() => {
    if (rooms.length === 0) return 0;
    const totalParticipants = rooms.reduce(
      (sum, room) => sum + (room.participant_count || 0),
      0
    );
    return Math.round(totalParticipants / rooms.length);
  }, [rooms]);

  const ticketSellThrough = useMemo(() => {
    const totalInventory = tickets.reduce(
      (sum, ticket) => sum + (ticket.inventory || 0),
      0
    );
    if (!totalInventory) return 0;
    return Math.min(
      100,
      Math.round((totalTicketsSold / totalInventory) * 100)
    );
  }, [tickets, totalTicketsSold]);

  const fetchReminderSettings = useCallback(async () => {
    setReminderLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "live-session-reminders",
        {
          body: { action: "get" },
        }
      );

      if (error) throw error;

      const settings = data?.settings ?? data;
      if (settings) {
        setReminderConfig({
          leadMinutes: settings.lead_minutes ?? 30,
          autoNotify: settings.auto_notify ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading reminder settings", error);
    } finally {
      setReminderLoading(false);
    }
  }, []);

  const loadEngagementMetrics = useCallback(async () => {
    try {
      const metrics = await getUserEngagementMetrics();
      if (metrics) {
        setEngagementMetrics(metrics);
      }
    } catch (error) {
      console.error("Error fetching engagement metrics", error);
    }
  }, [getUserEngagementMetrics]);

  useEffect(() => {
    loadEngagementMetrics();
  }, [loadEngagementMetrics]);

  useEffect(() => {
    fetchReminderSettings();
  }, [fetchReminderSettings]);
  const handleOpenCreateSession = () => {
    setEditingSession(null);
    setSessionForm(defaultSessionForm);
    setSessionDialogOpen(true);
  };

  const handleEditSession = (room: SessionRoom) => {
    setEditingSession(room);
    setSessionForm({
      title: room.title,
      description: room.description || "",
      scheduledFor: toDateTimeInputValue(room.scheduled_for),
      status: room.status,
      isPublic: room.is_public ?? true,
    });
    setSessionDialogOpen(true);
  };

  const handleSessionSubmit = async () => {
    if (!sessionForm.title.trim()) {
      toast({
        title: "Title is required",
        description: "Please add a session title before saving.",
        variant: "destructive",
      });
      return;
    }

    setSessionActionLoading(true);
    try {
      let scheduledISO: string | null = null;
      if (sessionForm.scheduledFor) {
        const scheduledDate = new Date(sessionForm.scheduledFor);
        if (!Number.isNaN(scheduledDate.getTime())) {
          scheduledISO = scheduledDate.toISOString();
        }
      }

      const payload = {
        room_id: editingSession?.id,
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim() || null,
        scheduled_for: scheduledISO,
        status: sessionForm.status,
        is_public: sessionForm.isPublic,
      };

      const action = editingSession ? "update" : "create";

      const { data, error } = await supabase.functions.invoke(
        "manage-live-sessions",
        {
          body: { action, payload },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: editingSession ? "Session updated" : "Session scheduled",
        description: editingSession
          ? "Your live session details were updated."
          : "Your live session has been scheduled.",
      });

      await track(editingSession ? "live_session_updated" : "live_session_scheduled", {
        room_id: editingSession?.id,
        scheduled_for: scheduledISO,
        status: sessionForm.status,
      });

      setSessionDialogOpen(false);
      setEditingSession(null);
      setSessionForm(defaultSessionForm);
      await refetchRooms();
    } catch (error) {
      console.error("Error saving session", error);
      toast({
        title: "Unable to save session",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleDeleteSession = async (room: SessionRoom) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this session?"
    );
    if (!confirmed) return;

    setSessionActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-live-sessions",
        {
          body: { action: "delete", payload: { room_id: room.id } },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Session removed",
        description: "The live session has been deleted.",
      });
      await track("live_session_deleted", { room_id: room.id });
      await refetchRooms();
    } catch (error) {
      console.error("Error deleting session", error);
      toast({
        title: "Unable to delete session",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleOpenCreateTicket = () => {
    setEditingTicket(null);
    setTicketForm(defaultTicketForm);
    setTicketDialogOpen(true);
  };

  const handleEditTicket = (ticket: LiveTicket) => {
    setEditingTicket(ticket);
    setTicketForm({
      sessionId: ticket.sessionId,
      price: (ticket.priceCents || 0) / 100,
      inventory: ticket.inventory || 0,
      maxPerUser: ticketForm.maxPerUser || 1,
      status: ticket.status || "draft",
    });
    setTicketDialogOpen(true);
  };

  const handleTicketSubmit = async () => {
    if (!ticketForm.sessionId) {
      toast({
        title: "Session required",
        description: "Select a session to attach the ticket to.",
        variant: "destructive",
      });
      return;
    }

    setTicketActionLoading(true);
    try {
      const payload = {
        ticket_id: editingTicket?.id,
        session_id: ticketForm.sessionId,
        price_cents: Math.round((ticketForm.price || 0) * 100),
        inventory: ticketForm.inventory,
        max_per_user: ticketForm.maxPerUser || null,
        status: ticketForm.status,
      };

      const success = editingTicket
        ? await updateTicket(payload)
        : await createTicket(payload);

      if (success) {
        await track(
          editingTicket ? "live_ticket_updated" : "live_ticket_created",
          {
            session_id: ticketForm.sessionId,
            ticket_id: editingTicket?.id,
            price_cents: payload.price_cents,
          }
        );
        setTicketDialogOpen(false);
        setEditingTicket(null);
        setTicketForm(defaultTicketForm);
        await refetchTickets();
      }
    } finally {
      setTicketActionLoading(false);
    }
  };

  const handleDeleteTicket = async (ticket: LiveTicket) => {
    const confirmed = window.confirm(
      "Delete this ticket and remove it from sale?"
    );
    if (!confirmed) return;

    setTicketActionLoading(true);
    try {
      const success = await deleteTicket(ticket.id);
      if (success) {
        await track("live_ticket_deleted", {
          session_id: ticket.sessionId,
          ticket_id: ticket.id,
        });
        await refetchTickets();
      }
    } finally {
      setTicketActionLoading(false);
    }
  };

  const handleOpenCreateRecording = () => {
    setEditingRecording(null);
    setRecordingForm(defaultRecordingForm);
    setRecordingDialogOpen(true);
  };

  const handleEditRecording = (recording: SessionRecording) => {
    setEditingRecording(recording);
    setRecordingForm({
      sessionId: recording.sessionId,
      title: recording.title,
      playbackUrl: recording.playbackUrl || "",
      durationSeconds: recording.durationSeconds || 0,
      publishedAt: toDateTimeInputValue(recording.publishedAt),
    });
    setRecordingDialogOpen(true);
  };

  const handleRecordingSubmit = async () => {
    if (!recordingForm.sessionId || !recordingForm.title.trim()) {
      toast({
        title: "Recording details incomplete",
        description: "Select a session and give the recording a title.",
        variant: "destructive",
      });
      return;
    }

    setRecordingActionLoading(true);
    try {
      let publishedISO: string | null = null;
      if (recordingForm.publishedAt) {
        const publishedDate = new Date(recordingForm.publishedAt);
        if (!Number.isNaN(publishedDate.getTime())) {
          publishedISO = publishedDate.toISOString();
        }
      }

      const payload = {
        recording_id: editingRecording?.id,
        session_id: recordingForm.sessionId,
        title: recordingForm.title.trim(),
        playback_url: recordingForm.playbackUrl || null,
        duration_seconds: recordingForm.durationSeconds || null,
        published_at: publishedISO,
      };

      const success = editingRecording
        ? await updateRecording(payload)
        : await attachRecording(payload);

      if (success) {
        await track(
          editingRecording
            ? "session_recording_updated"
            : "session_recording_attached",
          {
            session_id: recordingForm.sessionId,
            recording_id: editingRecording?.id,
          }
        );
        setRecordingDialogOpen(false);
        setEditingRecording(null);
        setRecordingForm(defaultRecordingForm);
        await refetchRecordings();
      }
    } finally {
      setRecordingActionLoading(false);
    }
  };

  const handleDeleteRecording = async (recording: SessionRecording) => {
    const confirmed = window.confirm(
      "Remove this recording from the session?"
    );
    if (!confirmed) return;

    setRecordingActionLoading(true);
    try {
      const success = await deleteRecording(recording.id);
      if (success) {
        await track("session_recording_deleted", {
          session_id: recording.sessionId,
          recording_id: recording.id,
        });
        await refetchRecordings();
      }
    } finally {
      setRecordingActionLoading(false);
    }
  };

  const updateReminderSettings = useCallback(
    async (updates: Partial<ReminderConfig>) => {
      const previous = reminderConfig;
      const next = { ...previous, ...updates };
      setReminderConfig(next);
      setReminderUpdating(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "live-session-reminders",
          {
            body: {
              action: "upsert",
              payload: {
                lead_minutes: next.leadMinutes,
                auto_notify: next.autoNotify,
              },
            },
          }
        );

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: "Reminder preferences updated",
          description: "We'll remind your fans before you go live.",
        });
        await track("live_session_reminder_updated", {
          lead_minutes: next.leadMinutes,
          auto_notify: next.autoNotify,
        });
      } catch (error) {
        console.error("Error updating reminder settings", error);
        toast({
          title: "Could not update reminders",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        setReminderConfig(previous);
      } finally {
        setReminderUpdating(false);
      }
    },
    [reminderConfig, toast, track]
  );

  const handleToggleNotifications = async () => {
    if (!notificationsSupported) {
      toast({
        title: "Browser not supported",
        description: "Push notifications are not available on this device.",
        variant: "destructive",
      });
      return;
    }

    if (notificationsLoading) return;

    const enabled = isSubscribed;
    if (enabled) {
      await unsubscribe();
      await track("live_session_notifications_toggled", { enabled: false });
    } else {
      const success = await subscribe();
      if (success) {
        await track("live_session_notifications_toggled", { enabled: true });
      }
    }
  };

  const averageWatchMinutes = useMemo(() => {
    if (!engagementMetrics) return 0;
    const minutes = engagementMetrics.timeSpent / 60;
    return Math.round(minutes || 0);
  }, [engagementMetrics]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Streaming</h1>
          <p className="text-muted-foreground">
            Manage your live sessions, ticket sales, recordings, and reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreateSession} disabled={sessionActionLoading}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenCreateTicket}
            disabled={ticketActionLoading}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenCreateRecording}
            disabled={recordingActionLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Attach Recording
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUpcomingSessions}</div>
            <p className="text-xs text-muted-foreground">
              {averageAttendance} average live attendees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tickets sold</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTicketsSold}</div>
            <p className="text-xs text-muted-foreground">
              {ticketSellThrough}% sell-through rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Live revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalTicketRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on paid ticket sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recordings</CardTitle>
            <HeadphonesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordings.length}</div>
            <p className="text-xs text-muted-foreground">
              {averageWatchMinutes} minutes avg watch time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reminder automation</CardTitle>
                <CardDescription>
                  Configure push reminders and notification lead times.
                </CardDescription>
              </div>
              <Badge variant={isSubscribed ? "default" : "secondary"}>
                {isSubscribed ? "Push enabled" : "Push disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Audience reminders</p>
                  <p className="text-xs text-muted-foreground">
                    We'll notify followers before each session goes live.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={reminderConfig.autoNotify}
                  disabled={reminderLoading || reminderUpdating}
                  onCheckedChange={(checked) =>
                    updateReminderSettings({ autoNotify: checked })
                  }
                />
                <span className="text-sm">
                  {reminderConfig.autoNotify ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-lead">Reminder lead time</Label>
              <Select
                value={String(reminderConfig.leadMinutes)}
                onValueChange={(value) =>
                  updateReminderSettings({ leadMinutes: Number(value) })
                }
                disabled={reminderLoading || reminderUpdating}
              >
                <SelectTrigger id="reminder-lead" className="w-full md:w-72">
                  <SelectValue placeholder="Select reminder timing" />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fans receive reminders via push notifications and email.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  Enable browser notifications for real-time session alerts.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleToggleNotifications}
                disabled={notificationsLoading || !notificationsSupported}
              >
                {isSubscribed ? "Disable" : "Enable"} notifications
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Performance snapshot
            </CardTitle>
            <CardDescription>
              Review engagement trends for your recent sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total interactions</p>
                <p className="text-xs text-muted-foreground">
                  Audience engagements across live content
                </p>
              </div>
              <span className="text-lg font-semibold">
                {engagementMetrics?.interactions ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Average session time</p>
                <p className="text-xs text-muted-foreground">
                  Calculated from your tracked sessions
                </p>
              </div>
              <span className="text-lg font-semibold">
                {averageWatchMinutes} min
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active features</p>
                <p className="text-xs text-muted-foreground">
                  Top features used by your fans
                </p>
              </div>
              <span className="text-right text-sm text-muted-foreground max-w-[140px]">
                {engagementMetrics?.features?.length
                  ? engagementMetrics.features.join(", ")
                  : "No data yet"}
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={loadEngagementMetrics}
            >
              Refresh analytics
            </Button>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="sessions" className="space-y-6">
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

        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Session schedule</CardTitle>
                <CardDescription>
                  Manage your upcoming and live sessions.
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateSession} disabled={sessionActionLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule new session
              </Button>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading sessions...
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-12">
                  <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No sessions scheduled
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule your first live session to connect with your audience.
                  </p>
                  <Button onClick={handleOpenCreateSession} disabled={sessionActionLoading}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule session
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{room.title}</span>
                            {room.description && (
                              <span className="text-xs text-muted-foreground truncate">
                                {room.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDateDisplay(room.scheduled_for)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              room.status === "live"
                                ? "default"
                                : room.status === "ended"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {room.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{room.participant_count || 0}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSession(room)}
                            disabled={sessionActionLoading}
                            aria-label="Edit session"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSession(room)}
                            disabled={sessionActionLoading}
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Ticket inventory</CardTitle>
                <CardDescription>
                  Control availability, pricing, and allocations for each session.
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateTicket} disabled={ticketActionLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Create ticket
              </Button>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tickets created</h3>
                  <p className="text-muted-foreground mb-4">
                    Create tickets to start selling access to your live events.
                  </p>
                  <Button onClick={handleOpenCreateTicket} disabled={ticketActionLoading}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Create ticket
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Inventory</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {ticket.sessionTitle || "Session"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateDisplay(ticket.scheduledFor, "Date TBA")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.priceCents
                            ? formatCurrency(ticket.priceCents / 100)
                            : "Free"}
                        </TableCell>
                        <TableCell>{ticket.inventory || 0}</TableCell>
                        <TableCell>{ticket.sold || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTicket(ticket)}
                            disabled={ticketActionLoading}
                            aria-label="Edit ticket"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTicket(ticket)}
                            disabled={ticketActionLoading}
                            aria-label="Delete ticket"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Session recordings</CardTitle>
                <CardDescription>
                  Publish recordings so fans can replay your live content.
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenCreateRecording}
                disabled={recordingActionLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Attach recording
              </Button>
            </CardHeader>
            <CardContent>
              {recordingsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading recordings...
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-12">
                  <HeadphonesIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recordings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload recordings from your live sessions to monetize replays.
                  </p>
                  <Button
                    onClick={handleOpenCreateRecording}
                    disabled={recordingActionLoading}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Attach recording
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordings.map((recording) => (
                      <TableRow key={recording.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {recording.sessionTitle || "Session"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateDisplay(recording.sessionDate, "Date TBA")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{recording.title}</TableCell>
                        <TableCell>
                          {recording.durationSeconds
                            ? `${Math.round(recording.durationSeconds / 60)} min`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {recording.publishedAt
                            ? formatDateDisplay(recording.publishedAt)
                            : "Draft"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRecording(recording)}
                            disabled={recordingActionLoading}
                            aria-label="Edit recording"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecording(recording)}
                            disabled={recordingActionLoading}
                            aria-label="Delete recording"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
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
