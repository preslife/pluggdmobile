import { setMeta } from "@/lib/seo";
import { useEffect, useMemo } from "react";
import LiveCTA from "@/components/LiveCTA";
import { useSessionRooms } from "@/hooks/useSessionRooms";
import { useLiveSchedule } from "@/hooks/useLiveSchedule";
import useNow from "@/hooks/useNow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, Plug, Clock } from "lucide-react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useIntl } from "react-intl";
import { useLocalization } from "@/contexts/LocalizationContext";

import type { LiveScheduleItem } from "@/hooks/useLiveSchedule";

const ScheduleItemCard = ({ item, now, locale }: { item: LiveScheduleItem; now: Date; locale: string }) => {
  const nowTime = now.getTime();
  let statusLabel = "";
  if (item.status === "live") {
    statusLabel = item.endsAt
      ? `Ends ${formatDistanceToNow(new Date(item.endsAt), { addSuffix: true })}`
      : "Live now";
  } else if (item.scheduledFor) {
    const startTime = new Date(item.scheduledFor).getTime();
    statusLabel = startTime <= nowTime
      ? "Starting soon"
      : `Starts ${formatDistanceToNow(new Date(item.scheduledFor), { addSuffix: true })}`;
  } else {
    statusLabel = "Schedule TBA";
  }

  const actionLabel = item.type === "session"
    ? item.status === "live" ? "Join Session" : "View Session"
    : item.status === "live" ? "Watch Battle" : "View Battle";

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale]
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="uppercase tracking-wide">{item.type}</Badge>
              {item.status === "live" ? (
                <span className="inline-flex items-center gap-2 font-semibold text-red-500">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
                  Live now
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-3 w-3" aria-hidden />
                  {statusLabel}
                </span>
              )}
            </div>
          </div>
                {item.scheduledFor && (
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <Calendar className="h-4 w-4" aria-hidden />
                {timeFormatter.format(new Date(item.scheduledFor))}
                    </div>
                  </div>
                )}
        </div>
        {item.status === "live" && item.endsAt && (
          <p className="text-sm text-muted-foreground">Ends {formatDistanceToNow(new Date(item.endsAt), { addSuffix: true })}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{statusLabel}</div>
          <Button size="sm" asChild>
            <Link to={item.actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function LiveIndex() {
  const intl = useIntl();
  const { settings } = useLocalization();
  const { rooms, loading } = useSessionRooms();
  const { schedule, loading: scheduleLoading } = useLiveSchedule();
  const now = useNow(60_000);

  useEffect(() => {
    setMeta("Live Sessions & Events", "Join live music sessions, battles, and events with fellow creators");
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main>
        <header className="relative pt-24 pb-12 md:pb-20 bg-gradient-hero">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-primary mb-4">
              <Plug className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs">
                {intl.formatMessage({ id: "pages.live.strapline", defaultMessage: "Get Plugged In" })}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              {intl.formatMessage({
                id: "pages.live.title",
                defaultMessage: "Live Battles, Showcases, and Creator Streams",
              })}
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              {intl.formatMessage({
                id: "pages.live.description",
                defaultMessage: "The energy of the culture in real-time. Submit, perform, and get feedback from the community.",
              })}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/live/sessions">
                <Button>{intl.formatMessage({ id: "pages.live.ctaJoin", defaultMessage: "Join a Session" })}</Button>
              </Link>
              <Link to="/live/battles">
                <Button variant="outline">
                  {intl.formatMessage({ id: "pages.live.ctaBattles", defaultMessage: "View Battles" })}
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero">
                  {intl.formatMessage({ id: "pages.live.ctaCommunity", defaultMessage: "Join the Community" })}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Live Schedule Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {intl.formatMessage({ id: "pages.live.scheduleHeading", defaultMessage: "Live Schedule" })}
              </h2>
              <Button variant="outline" size="sm" asChild>
                <Link to="/live/sessions">
                  {intl.formatMessage({ id: "pages.live.viewSessions", defaultMessage: "View Sessions" })}
                </Link>
              </Button>
            </div>

            {scheduleLoading && schedule.length === 0 ? (
              <LoadingSkeleton />
            ) : schedule.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {schedule.map((item) => (
                  <ScheduleItemCard key={`${item.type}-${item.id}`} item={item} now={now} locale={settings.locale} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <p>
                    {intl.formatMessage({
                      id: "pages.live.noSchedule",
                      defaultMessage: "No live events scheduled yet. Check back soon!",
                    })}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Live Rooms Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {intl.formatMessage({ id: "pages.live.roomsHeading", defaultMessage: "Live Rooms" })}
              </h2>
              <Button asChild>
                <Link to="/live/sessions">
                  {intl.formatMessage({ id: "pages.live.viewAllSessions", defaultMessage: "View All Sessions" })}
                </Link>
              </Button>
            </div>
            
            {rooms.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.slice(0, 6).map((room) => (
                  <Card key={room.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg truncate">{room.title}</CardTitle>
                        <Badge variant={room.status === 'live' ? 'default' : 'secondary'}>
                          {room.status === 'live' ? 'Live' : 'Idle'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">by {room.host_name}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-1" />
                          {room.participant_count} participants
                        </div>
                        <Button size="sm" asChild>
                          <Link to={`/live/sessions/${room.id}`}>Join</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {intl.formatMessage({ id: "pages.live.noRoomsTitle", defaultMessage: "No live rooms" })}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {intl.formatMessage({
                      id: "pages.live.noRoomsDescription",
                      defaultMessage: "Be the first to start a live session!",
                    })}
                  </p>
                  <Button asChild>
                    <Link to="/live/sessions">
                      {intl.formatMessage({ id: "pages.live.createSession", defaultMessage: "Create Session" })}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
            <article className="p-6 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-bold">Upcoming Battles</h2>
              <p className="mt-2 text-muted-foreground">Monthly showdowns with community voting and prizes.</p>
              <Link to="/live/battles" className="mt-4 inline-block"><Button variant="secondary">Explore Battles</Button></Link>
            </article>
            <article className="p-6 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-bold">Open Sessions</h2>
              <p className="mt-2 text-muted-foreground">Drop your track, get timestamped feedback, and collab.</p>
              <Link to="/live/sessions" className="mt-4 inline-block"><Button variant="secondary">Find a Session</Button></Link>
            </article>
          </div>
        </section>

        <LiveCTA />
      </main>
    </div>
  );
}