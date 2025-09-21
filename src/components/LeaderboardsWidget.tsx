import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Users, TrendingUp, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  beats_uploaded: number;
  beats_sold: number;
  collaborations_completed: number;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export const LeaderboardsWidget = () => {
  const [topProducers, setTopProducers] = useState<LeaderboardUser[]>([]);
  const [topSellers, setTopSellers] = useState<LeaderboardUser[]>([]);
  const [topCollaborators, setTopCollaborators] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      // Top producers by uploads
      const { data: producers } = await supabase
        .from('user_stats')
        .select('*')
        .order('beats_uploaded', { ascending: false })
        .limit(10);

      // Top sellers by sales
      const { data: sellers } = await supabase
        .from('user_stats')
        .select('*')
        .order('beats_sold', { ascending: false })
        .limit(10);

      // Top collaborators
      const { data: collaborators } = await supabase
        .from('user_stats')
        .select('*')
        .order('collaborations_completed', { ascending: false })
        .limit(10);

      setTopProducers(producers || []);
      setTopSellers(sellers || []);
      setTopCollaborators(collaborators || []);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">{index + 1}</span>;
    }
  };

  const renderLeaderboard = (users: LeaderboardUser[], metric: keyof LeaderboardUser, label: string) => (
    <div className="space-y-3">
      {users.slice(0, 5).map((user, index) => (
        <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
          <div className="flex items-center justify-center w-8 h-8">
            {getRankIcon(index)}
          </div>
          
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.profiles?.avatar_url} />
            <AvatarFallback>
              {user.profiles?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {user.profiles?.username || user.profiles?.full_name || 'Anonymous'}
            </p>
            <p className="text-sm text-muted-foreground">
              Level {user.level}
            </p>
          </div>
          
          <div className="text-right">
            <div className="font-bold">
              {user[metric as keyof LeaderboardUser] as React.ReactNode}
            </div>
            <div className="text-xs text-muted-foreground">
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Leaderboards
        </CardTitle>
        <CardDescription>
          Top performers in the Pluggd community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="producers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="producers" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Producers
            </TabsTrigger>
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Sellers
            </TabsTrigger>
            <TabsTrigger value="collaborators" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Collaborators
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="producers" className="mt-4">
            {renderLeaderboard(topProducers, 'beats_uploaded', 'beats')}
          </TabsContent>
          
          <TabsContent value="sellers" className="mt-4">
            {renderLeaderboard(topSellers, 'beats_sold', 'sales')}
          </TabsContent>
          
          <TabsContent value="collaborators" className="mt-4">
            {renderLeaderboard(topCollaborators, 'collaborations_completed', 'collabs')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};