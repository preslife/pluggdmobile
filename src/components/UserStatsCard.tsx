import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, Zap, Star, Award } from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';

export const UserStatsCard = () => {
  const { userStats, achievements, getLevelProgress } = useGamification();

  if (!userStats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Loading stats...</p>
        </CardContent>
      </Card>
    );
  }

  const levelProgress = getLevelProgress(userStats.total_points);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level and Points */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Level {userStats.level}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {userStats.total_points} XP
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Level {levelProgress.current}</span>
              <span>Level {levelProgress.next}</span>
            </div>
            <Progress value={levelProgress.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {100 - levelProgress.progress}% to next level
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-lg font-bold">{userStats.beats_uploaded}</span>
            </div>
            <p className="text-xs text-muted-foreground">Beats Uploaded</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-lg font-bold">{userStats.beats_sold}</span>
            </div>
            <p className="text-xs text-muted-foreground">Beats Sold</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-lg font-bold">{userStats.current_streak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-purple-500" />
              <span className="text-lg font-bold">{achievements.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
        </div>

        {/* Recent Achievement */}
        {achievements.length > 0 && (
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Latest Achievement</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {achievements[0].achievement_name}
            </p>
            <p className="text-xs text-muted-foreground">
              +{achievements[0].points_awarded} XP
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserStatsCard;