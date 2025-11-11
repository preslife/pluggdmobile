import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, Music } from "lucide-react";
import { useBattles } from "@/hooks/useBattles";
import type { Battle } from "@/hooks/useBattles";
import SEOHelmet from "@/components/SEOHelmet";
import { CreateBattleModal } from "@/components/live/CreateBattleModal";
import { useAuth } from "@/hooks/useAuth";
import useNow from "@/hooks/useNow";
import { formatDistanceToNow } from "date-fns";

const LiveBattles = () => {
  const { battles, loading, advanceBattleRounds } = useBattles();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const now = useNow(60_000);

  const upcomingBattles = useMemo(
    () => battles.filter(battle => battle.status === 'upcoming'),
    [battles]
  );
  const liveBattles = useMemo(
    () => battles.filter(battle => battle.status === 'live'),
    [battles]
  );
  const finishedBattles = useMemo(
    () => battles.filter(battle => battle.status === 'finished'),
    [battles]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'live': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'finished': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getBattleTiming = (battle: Battle) => {
    if (battle.status === 'live' && battle.ends_at) {
      const diff = new Date(battle.ends_at).getTime() - now.getTime();
      if (diff <= 0) return 'Ending soon';
      return `Ends ${formatDistanceToNow(new Date(battle.ends_at), { addSuffix: true })}`;
    }

    if (battle.status === 'upcoming' && battle.starts_at) {
      const start = new Date(battle.starts_at).getTime();
      if (start <= now.getTime()) return 'Starting soon';
      return `Starts ${formatDistanceToNow(new Date(battle.starts_at), { addSuffix: true })}`;
    }

    if (battle.status === 'finished') return 'Ended';
    return 'Schedule TBA';
  };

  const BattleCard = ({ battle, isOwner }: { battle: Battle; isOwner: boolean }) => {
    const timingLabel = getBattleTiming(battle);

    return (
      <Card className="group hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {battle.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(battle.status)} flex items-center gap-1 uppercase`}>
                  {battle.status === 'live' && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
                  )}
                  {battle.status}
                </Badge>
                {battle.is_featured && (
                  <Badge variant="secondary">
                    <Trophy className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
            <Music className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{timingLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>0 entries</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {battle.status === 'upcoming' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => window.location.href = `/live/battles/${battle.id}`}
              >
                Enter Battle
              </Button>
            )}
            {battle.status === 'live' && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => window.location.href = `/live/battles/${battle.id}`}
              >
                Watch & Vote
              </Button>
            )}
            {battle.status === 'finished' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `/live/battles/${battle.id}`}
              >
                View Results
              </Button>
            )}
            {isOwner && battle.status === 'live' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => advanceBattleRounds(battle.id)}
              >
                Advance Round
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <SEOHelmet
        config={{
          title: "Live Battles | Pluggd Live",
          description: "Discover upcoming beat battles, watch live rounds, and secure your slot in competitive producer showdowns.",
          canonical: "/live/battles",
        }}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Battles</h1>
          <p className="text-muted-foreground mt-1">
            Compete in real-time beat battles and prove your skills
          </p>
        </div>
        
        {user && (
          <Button onClick={() => setShowCreateModal(true)}>
            Create Battle
          </Button>
        )}
      </div>

      {/* Live Battles */}
      {liveBattles.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-semibold">Live Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveBattles.map(battle => (
              <BattleCard key={battle.id} battle={battle} isOwner={user?.id === battle.created_by} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Battles */}
      {upcomingBattles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBattles.map(battle => (
              <BattleCard key={battle.id} battle={battle} isOwner={user?.id === battle.created_by} />
            ))}
          </div>
        </section>
      )}

      {/* Finished Battles */}
      {finishedBattles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finishedBattles.slice(0, 6).map(battle => (
              <BattleCard key={battle.id} battle={battle} isOwner={user?.id === battle.created_by} />
            ))}
          </div>
        </section>
      )}

      {battles.length === 0 && !loading && (
        <div className="text-center py-12">
          <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No battles yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a beat battle and challenge the community!
          </p>
          {user && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create First Battle
            </Button>
          )}
        </div>
      )}

      <CreateBattleModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default LiveBattles;

