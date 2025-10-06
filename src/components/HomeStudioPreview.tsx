import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Mail, UserPlus, ListChecks, CalendarDays, RefreshCw, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorCheck } from "@/hooks/useCreatorCheck";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface HomeStudioPreviewProps {
  role: "fans" | "creators";
}

type MetricState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type EarningsMetric = {
  total: number;
  orders: number;
};

type MessageMetric = {
  unread: number;
};

type InvitesMetric = {
  pending: number;
};

type TasksMetric = {
  completed: number;
  total: number;
};

type SessionsMetric = {
  title: string;
  scheduledAt: string | null;
  status: string;
} | null;

function useMetric<T>(fetcher: () => Promise<T | null>, enabled: boolean) {
  const [state, setState] = useState<MetricState<T>>({ data: null, loading: enabled, error: null });

  const load = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcher();
      setState({ data: result ?? null, loading: false, error: null });
    } catch (error: any) {
      setState({ data: null, loading: false, error: error?.message ?? "Something went wrong" });
    }
  }, [enabled, fetcher]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    load();
  }, [enabled, load]);

  return { ...state, reload: load } as const;
}

const TOTAL_ONBOARDING_TASKS = 6;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "TBD";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

interface MetricCardProps {
  title: string;
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  state: MetricState<any> & { reload: () => void };
  children: ReactNode;
  action?: { label: string; href: string };
  badge?: string;
  testId?: string;
}

function MetricCard({ title, description, icon: Icon, state, children, action, badge, testId }: MetricCardProps) {
  return (
    <Card
      tabIndex={0}
      role="group"
      aria-label={title}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <CardHeader className="flex items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Badge variant="secondary" className="flex items-center gap-1" aria-hidden="true">
          <Icon className="h-4 w-4" />
          {badge && <span>{badge}</span>}
        </Badge>
      </CardHeader>
      <CardContent data-testid={testId} className="space-y-3 text-sm">
        {state.loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : state.error ? (
          <div className="space-y-3 text-sm">
            <p className="text-destructive">{state.error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={state.reload}
              className="flex items-center gap-2"
              aria-label={`Retry loading ${title}`}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        ) : (
          children
        )}
      </CardContent>
      {action && (
        <CardFooter>
          <Button variant="ghost" size="sm" asChild>
            <Link to={action.href} className="inline-flex items-center gap-2" aria-label={`${title} – ${action.label}`}>
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function HomeStudioPreview({ role }: HomeStudioPreviewProps) {
  const { user, loading: authLoading } = useAuth();
  const { isCreator, loading: creatorLoading } = useCreatorCheck();

  const enabled = useMemo(() => role === "creators" && !!user && isCreator && !authLoading && !creatorLoading, [
    role,
    user,
    isCreator,
    authLoading,
    creatorLoading,
  ]);

  const earnings = useMetric<EarningsMetric>(
    useCallback(async () => {
      if (!user) return null;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("order_items")
        .select("price, quantity, created_at")
        .eq("creator_id", user.id)
        .gte("created_at", since.toISOString());

      if (error) throw error;
      const items = data ?? [];
      if (!items.length) {
        return { total: 0, orders: 0 };
      }
      const total = items.reduce((acc, item) => acc + (item.price ?? 0) * (item.quantity ?? 1), 0);
      return {
        total,
        orders: items.length,
      };
    }, [user]),
    enabled,
  );

  const messages = useMetric<MessageMetric>(
    useCallback(async () => {
      if (!user) return null;
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      if (convError) throw convError;
      const conversationIds = (conversations ?? []).map((c) => c.id);
      if (!conversationIds.length) {
        return { unread: 0 };
      }
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      if (error) throw error;
      return { unread: count ?? 0 };
    }, [user]),
    enabled,
  );

  const invites = useMetric<InvitesMetric>(
    useCallback(async () => {
      if (!user) return null;
      const { count, error } = await supabase
        .from("collab_applicants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      return { pending: count ?? 0 };
    }, [user]),
    enabled,
  );

  const tasks = useMetric<TasksMetric>(
    useCallback(async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_progress")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const completed = Array.isArray(data?.onboarding_progress?.completed_tasks)
        ? data?.onboarding_progress?.completed_tasks.length
        : 0;
      return {
        completed,
        total: TOTAL_ONBOARDING_TASKS,
      };
    }, [user]),
    enabled,
  );

  const sessions = useMetric<SessionsMetric>(
    useCallback(async () => {
      if (!user) return null;
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("sessions")
        .select("id,title,scheduled_at,status")
        .eq("host_id", user.id)
        .in("status", ["scheduled", "live"])
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(1);

      if (error) throw error;
      const [next] = data ?? [];
      if (!next) return null;
      return {
        title: next.title,
        scheduledAt: next.scheduled_at,
        status: next.status,
      };
    }, [user]),
    enabled,
  );

  if (role !== "creators" || authLoading || creatorLoading || !user || !isCreator) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Studio preview</h2>
            <p className="text-sm text-muted-foreground">
              A quick snapshot of your business health pulled from your studio.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">Creator tools</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Latest earnings"
            description="Last 30 days"
            icon={DollarSign}
            badge="Revenue"
            state={earnings}
            action={{ label: "Open analytics", href: "/studio/financials" }}
            testId="studio-preview-earnings"
          >
            {earnings.data && earnings.data.total > 0 ? (
              <div className="space-y-2">
                <p className="text-3xl font-semibold">{formatCurrency(earnings.data.total)}</p>
                <p className="text-muted-foreground">
                  Across {earnings.data.orders} {earnings.data.orders === 1 ? "order" : "orders"} this month.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No earnings recorded in the last 30 days.</p>
            )}
          </MetricCard>

          <MetricCard
            title="Unread messages"
            description="Across your conversations"
            icon={Mail}
            badge="Inbox"
            state={messages}
            action={{ label: "Go to inbox", href: "/studio/inbox" }}
            testId="studio-preview-messages"
          >
            <div className="space-y-2">
              <p className="text-3xl font-semibold">{messages.data?.unread ?? 0}</p>
              <p className="text-muted-foreground">
                {messages.data?.unread ? "Waiting for your reply." : "You’re all caught up."}
              </p>
            </div>
          </MetricCard>

          <MetricCard
            title="Pending invites"
            description="Collaboration requests"
            icon={UserPlus}
            badge="Collabs"
            state={invites}
            action={{ label: "Review invites", href: "/studio/collaborations" }}
            testId="studio-preview-invites"
          >
            <div className="space-y-2">
              <p className="text-3xl font-semibold">{invites.data?.pending ?? 0}</p>
              <p className="text-muted-foreground">
                {invites.data?.pending ? "Creators are waiting on you." : "No pending invites right now."}
              </p>
            </div>
          </MetricCard>

          <MetricCard
            title="Setup tasks"
            description="Finish onboarding"
            icon={ListChecks}
            badge="Tasks"
            state={tasks}
            action={{ label: "View checklist", href: "/studio/start" }}
            testId="studio-preview-tasks"
          >
            {tasks.data ? (
              <div className="space-y-2">
                <p className="text-3xl font-semibold">
                  {tasks.data.total - tasks.data.completed}
                </p>
                <p className="text-muted-foreground">
                  {tasks.data.completed === tasks.data.total
                    ? "All onboarding tasks completed."
                    : `${tasks.data.completed} of ${tasks.data.total} tasks complete.`}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No onboarding data available.</p>
            )}
          </MetricCard>

          <MetricCard
            title="Next live session"
            description="Keep fans engaged"
            icon={CalendarDays}
            badge="Live"
            state={sessions}
            action={{ label: "Manage schedule", href: "/studio/live" }}
            testId="studio-preview-sessions"
          >
            {sessions.data ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">{sessions.data.title}</p>
                <p className="text-muted-foreground">{formatDateTime(sessions.data.scheduledAt)}</p>
                <Badge variant="outline" className="w-fit uppercase">
                  {sessions.data.status}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming live events scheduled.</p>
            )}
          </MetricCard>
        </div>
      </div>
    </section>
  );
}
