import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Award, 
  Crown, 
  Shield, 
  Flame,
  Users,
  Calendar,
  TrendingUp,
  Gift,
  Medal,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  Brain,
  Heart,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt?: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  level: number;
  achievements: number;
  avatar?: string;
}

export function GamificationSystem() {
  // Clean state - no mock data
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    currentLevel: 1,
    currentXP: 0,
    xpToNextLevel: 100,
    streak: 0,
    totalAchievements: 0,
    unlockedBadges: 0
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Empty state components
  const EmptyAchievementsState = () => (
    <motion.div 
      className="text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Trophy className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
      <h2 className="text-2xl font-bold mb-4">No Achievements Yet</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Start learning and completing courses to unlock achievements and earn points. 
        Your accomplishments will be celebrated here!
      </p>
      <div className="space-y-3">
        <Button className="bg-gradient-to-r from-yellow-500 to-orange-500">
          <Sparkles className="h-4 w-4 mr-2" />
          Start Learning to Earn
        </Button>
        <p className="text-sm text-muted-foreground">
          Complete courses, maintain streaks, and participate to unlock rewards
        </p>
      </div>
    </motion.div>
  );

  const EmptyBadgesState = () => (
    <Card>
      <CardContent className="text-center py-12">
        <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Badges Earned</h3>
        <p className="text-muted-foreground mb-6">
          Complete activities and reach milestones to earn special badges
        </p>
        <Button variant="outline">
          <Target className="h-4 w-4 mr-2" />
          View Available Badges
        </Button>
      </CardContent>
    </Card>
  );

  const EmptyLeaderboardState = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Leaderboard
        </CardTitle>
        <CardDescription>Top performers in the community</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Rankings Yet</h3>
          <p className="text-muted-foreground">
            The leaderboard will populate as users earn points and achievements
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const UserStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Start earning points</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Level</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">1</div>
          <p className="text-xs text-muted-foreground">Beginner level</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">days consecutive</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          <Trophy className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">unlocked</p>
        </CardContent>
      </Card>
    </div>
  );

  const WelcomeGamification = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-8"
    >
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-dashed border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-3">Start Your Achievement Journey!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete courses, maintain learning streaks, and participate in the community 
            to unlock achievements, earn badges, and climb the leaderboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500">
              <Target className="h-4 w-4 mr-2" />
              View All Achievements
            </Button>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Start Learning
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-yellow-50/30 to-orange-50/30 dark:from-yellow-950/10 dark:to-orange-950/10 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Achievements & Rewards
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and celebrate your learning milestones
          </p>
        </div>

        <Button className="bg-gradient-to-r from-yellow-500 to-orange-500">
          <Gift className="h-4 w-4 mr-2" />
          Claim Rewards
        </Button>
      </div>

      {/* User Stats */}
      <UserStatsCards />

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Level Progress
          </CardTitle>
          <CardDescription>
            Level {userStats.currentLevel} • {userStats.currentXP}/{userStats.xpToNextLevel} XP to next level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={(userStats.currentXP / userStats.xpToNextLevel) * 100} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Current Level: {userStats.currentLevel}</span>
            <span>Next Level: {userStats.currentLevel + 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Show welcome for empty state */}
      {achievements.length === 0 && <WelcomeGamification />}

      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements">
          {achievements.length === 0 ? (
            <EmptyAchievementsState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Achievement cards would be rendered here when data exists */}
            </div>
          )}
        </TabsContent>

        <TabsContent value="badges">
          {badges.length === 0 ? (
            <EmptyBadgesState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Badge cards would be rendered here */}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          <EmptyLeaderboardState />
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardContent className="text-center py-12">
              <Gift className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Rewards Available</h3>
              <p className="text-muted-foreground mb-6">
                Earn points and achievements to unlock special rewards and bonuses
              </p>
              <Button variant="outline">
                <Star className="h-4 w-4 mr-2" />
                View Reward Catalog
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievement Categories */}
      {achievements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Achievement Categories
              </CardTitle>
              <CardDescription>
                Different ways to earn achievements and rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center p-6 border-2 border-dashed hover:shadow-md transition-shadow">
                  <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Learning Achievements</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete courses, lessons, and learning milestones
                  </p>
                </Card>

                <Card className="text-center p-6 border-2 border-dashed hover:shadow-md transition-shadow">
                  <Flame className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Streak Achievements</h4>
                  <p className="text-sm text-muted-foreground">
                    Maintain consistent daily learning habits
                  </p>
                </Card>

                <Card className="text-center p-6 border-2 border-dashed hover:shadow-md transition-shadow">
                  <Users className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Social Achievements</h4>
                  <p className="text-sm text-muted-foreground">
                    Participate in discussions and help others
                  </p>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}