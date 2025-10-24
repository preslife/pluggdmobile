import { setMeta } from "@/lib/seo";
import { useEffect } from "react";
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
import { useTranslation } from "@/hooks/useTranslation";

import type { LiveScheduleItem } from "@/hooks/useLiveSchedule";

const ScheduleItemCard = ({ item, now }: { item: LiveScheduleItem; now: Date }) => {
  const { t, formatDate: formatLocaleDate } = useTranslation();
  const nowTime = now.getTime();
  let statusLabel = "";
  if (item.status === "live") {
    statusLabel = item.endsAt
      ? t("pages.live.statusEndsIn", {
          time: formatDistanceToNow(new Date(item.endsAt), { addSuffix: true })
        })
      : t("pages.live.statusLiveNow");
  } else if (item.scheduledFor) {
    const startTime = new Date(item.scheduledFor).getTime();
    statusLabel = startTime <= nowTime
      ? t("pages.live.statusStartingSoon")
      : t("pages.live.statusStartsIn", {
          time: formatDistanceToNow(new Date(item.scheduledFor), { addSuffix: true })
        });
  } else {
    statusLabel = t("pages.live.statusScheduleTba");
  }

  const actionLabel = item.type === "session"
    ? item.status === "live"
      ? t("pages.live.actionJoinSession")
      : t("pages.live.actionViewSession")
    : item.status === "live"
      ? t("pages.live.actionWatchBattle")
      : t("pages.live.actionViewBattle");

  const formattedScheduleTime = item.scheduledFor
    ? formatLocaleDate(new Date(item.scheduledFor), {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : null;

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
                  {t("pages.live.statusLiveNow")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-3 w-3" aria-hidden />
                  {statusLabel}
                </span>
              )}
            </div>
          </div>
          {formattedScheduleTime && (
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-4 w-4" aria-hidden />
                {formattedScheduleTime}
              </div>
            </div>
          )}
        </div>
        {item.status === "live" && item.endsAt && (
          <p className="text-sm text-muted-foreground">
            {t("pages.live.statusEndsIn", {
              time: formatDistanceToNow(new Date(item.endsAt), { addSuffix: true })
            })}
          </p>
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
  const { rooms, loading } = useSessionRooms();
  const { schedule, loading: scheduleLoading } = useLiveSchedule();
  const now = useNow(60_000);
  const { t } = useTranslation();

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
              <span className="uppercase tracking-widest text-xs">{t('pages.live.heroTagline')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              {t('pages.live.heroTitle')}
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              {t('pages.live.heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/live/sessions"><Button>{t('pages.live.ctaJoinSession')}</Button></Link>
              <Link to="/live/battles"><Button variant="outline">{t('pages.live.ctaViewBattles')}</Button></Link>
              <Link to="/auth"><Button variant="hero">{t('pages.live.ctaJoinCommunity')}</Button></Link>
            </div>
          </div>
        </header>

        {/* Live Schedule Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{t('pages.live.scheduleHeading')}</h2>
              <Button variant="outline" size="sm" asChild>
                <Link to="/live/sessions">View Sessions</Link>
              </Button>
            </div>

            {scheduleLoading && schedule.length === 0 ? (
              <LoadingSkeleton />
            ) : schedule.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {schedule.map((item) => (
                  <ScheduleItemCard key={`${item.type}-${item.id}`} item={item} now={now} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <p>No live events scheduled yet. Check back soon!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Live Rooms Section */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Live Rooms</h2>
              <Button asChild>
                <Link to="/live/sessions">View All Sessions</Link>
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
                  <h3 className="text-lg font-semibold mb-2">No live rooms</h3>
                  <p className="text-muted-foreground mb-4">Be the first to start a live session!</p>
                  <Button asChild>
                    <Link to="/live/sessions">Create Session</Link>
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