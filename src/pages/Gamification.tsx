import { useAuth } from '@/hooks/useAuth';

import UserStatsCard from '@/components/UserStatsCard';
import ContestsWidget from '@/components/ContestsWidget';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { BadgeDebug } from '@/components/BadgeDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';
import { useBadges } from '@/hooks/useBadges';
import { Trophy, Star, Target, Zap, Award, Medal } from 'lucide-react';
import LeaderboardWidget from '@/components/LeaderboardWidget';

const Gamification = () => {
  const { user } = useAuth();
  const { achievements, userStats, getLevelProgress } = useGamification();
  const { allBadges } = useBadges();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-8">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Sign in to view your progress</h1>
            <p className="text-muted-foreground">
              Track your achievements, participate in contests, and level up your music skills.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get achievement types from database badge definitions
  const achievementTypes = allBadges.map(badge => ({
    type: badge.badge_type,
    name: badge.name,
    icon: badge.tier === 'platinum' ? Medal : badge.tier === 'gold' ? Trophy : badge.tier === 'silver' ? Star : Award,
    description: badge.description
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-8 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Music Journey</h1>
          <p className="text-muted-foreground">
            Track your progress, unlock achievements, and compete with other producers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Stats */}
          <div className="lg:col-span-1">
            <UserStatsCard />
          </div>

          {/* Contests */}
          <div className="lg:col-span-2">
            <ContestsWidget />
          </div>
        </div>

        {/* Badges & Achievements Section */}
        <div className="mt-8">
          <BadgeShowcase />
        </div>

        {/* Achievement Categories */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievementTypes.map((type) => {
                  const userAchievements = achievements.filter(a => a.achievement_type === type.type);
                  const IconComponent = type.icon;
                  
                  return (
                    <div key={type.type} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-muted p-2 rounded-lg">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{type.name}</h3>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {userAchievements.length} unlocked
                        </span>
                        <Badge variant="outline">
                          {userAchievements.reduce((total, a) => total + a.points_awarded, 0)} XP
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        {userStats && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Level Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Level</span>
                    <Badge variant="outline" className="text-lg px-4 py-1">
                      Level {userStats.level}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Level {userStats.level + 1}</span>
                      <span>{getLevelProgress(userStats.total_points).progress}%</span>
                    </div>
                    <Progress value={getLevelProgress(userStats.total_points).progress} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{userStats.beats_uploaded}</div>
                      <div className="text-sm text-muted-foreground">Beats Uploaded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{userStats.beats_sold}</div>
                      <div className="text-sm text-muted-foreground">Beats Sold</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">{userStats.current_streak}</div>
                      <div className="text-sm text-muted-foreground">Current Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">{achievements.length}</div>
                      <div className="text-sm text-muted-foreground">Achievements</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboards */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboards</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardWidget />
            </CardContent>
          </Card>
        </div>

        {/* Debug Panel - Remove in production */}
        <div className="mt-8">
          <BadgeDebug />
        </div>
      </div>
    </div>
  );
};

export default Gamification;
