import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  BookOpen, 
  Play, 
  Clock, 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  Star,
  ChevronRight,
  Plus,
  Search,
  Filter,
  BarChart3,
  Users,
  Zap,
  Award,
  BookmarkPlus,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Brain,
  Sparkles,
  GraduationCap,
  Video,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface StudentDashboardProps {
  onNavigate: (view: string, course?: any) => void;
  onSelectCourse: (course: any) => void;
}

export function StudentDashboard({ onNavigate, onSelectCourse }: StudentDashboardProps) {
  // Clean state - all empty arrays and zero values
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [learningStats, setLearningStats] = useState({
    totalHours: 0,
    coursesCompleted: 0,
    currentStreak: 0,
    averageScore: 0
  });

  // Quick actions for proper inline positioning
  const quickActions = [
    {
      id: 'find-courses',
      title: 'Find Courses',
      description: 'Discover new learning opportunities',
      icon: Search,
      color: 'from-purple-500 to-orange-500',
      onClick: () => onNavigate('classroom')
    },
    {
      id: 'join-live-class',
      title: 'Join Live Class',
      description: 'Connect with instructors and peers',
      icon: Video,
      color: 'from-green-500 to-green-600',
      onClick: () => onNavigate('virtual-classroom')
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Connect with fellow learners',
      icon: MessageSquare,
      color: 'from-purple-500 to-orange-500',
      onClick: () => onNavigate('discussions')
    }
  ];

  // Empty state components
  const EmptyCoursesCard = () => (
    <Card className="text-center py-12">
      <CardContent>
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Courses Enrolled</h3>
        <p className="text-muted-foreground mb-6">
          Start your learning journey by exploring and enrolling in courses
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => onNavigate('classroom')}
            className="bg-gradient-to-r from-purple-500 to-orange-500"
          >
            <Search className="h-4 w-4 mr-2" />
            Explore Courses
          </Button>
          <p className="text-sm text-muted-foreground">
            or browse our course catalog to get started
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyActivityCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Recent Activity</h4>
          <p className="text-sm text-muted-foreground">
            Your learning activity will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyDeadlinesCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Upcoming Deadlines</h4>
          <p className="text-sm text-muted-foreground">
            Assignment deadlines will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyAchievementsCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Achievements Yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Complete courses and activities to earn achievements
          </p>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('achievements')}
            size="sm"
          >
            View All Achievements
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyStatsCards = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Learning Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Start learning to track your progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Complete your first course</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">days consecutive learning</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">Complete assessments to see scores</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50/30 to-orange-50/30 dark:from-purple-950/30 dark:to-orange-950/30">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Welcome to Your Learning Hub
            </motion.h1>
            <motion.p 
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Start your educational journey and track your progress
            </motion.p>
          </div>
          
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              onClick={() => onNavigate('classroom')}
              className="bg-gradient-to-r from-purple-500 to-orange-500"
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
            <Button 
              variant="outline"
              onClick={() => onNavigate('recommendations')}
            >
              <Brain className="h-4 w-4 mr-2" />
              Get Recommendations
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Quick Actions - NOW PROPERLY POSITIONED IN CONTENT FLOW */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <motion.div
                    key={action.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 relative overflow-hidden"
                      onClick={action.onClick}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5`} />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full bg-gradient-to-br ${action.color} text-white`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{action.title}</h3>
                            <p className="text-muted-foreground text-sm">{action.description}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Stats - Only show if there's data */}
            {(learningStats.totalHours > 0 || learningStats.coursesCompleted > 0 || learningStats.currentStreak > 0) && (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <EmptyStatsCards />
              </motion.div>
            )}

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="courses">My Courses</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* First Time User Experience */}
                {enrolledCourses.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-purple-50 to-orange-50 dark:from-purple-950/50 dark:to-orange-950/50 border-2 border-dashed border-purple-200 dark:border-purple-800">
                      <CardContent className="text-center py-12">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.7, type: "spring" }}
                        >
                          <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4">Ready to Start Learning?</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Discover courses tailored to your interests and career goals. 
                          Join thousands of learners advancing their skills.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button 
                            onClick={() => onNavigate('classroom')}
                            size="lg"
                            className="bg-gradient-to-r from-purple-500 to-orange-500"
                          >
                            <BookOpen className="h-5 w-5 mr-2" />
                            Explore Courses
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => onNavigate('recommendations')}
                            size="lg"
                          >
                            <Brain className="h-5 w-5 mr-2" />
                            Get AI Recommendations
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                  <div className="lg:col-span-2 space-y-6">
                    {enrolledCourses.length === 0 ? (
                      <EmptyCoursesCard />
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Continue Learning
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Course content would go here */}
                        </CardContent>
                      </Card>
                    )}
                    
                    <EmptyActivityCard />
                  </div>

                  <div className="space-y-6">
                    <EmptyDeadlinesCard />
                    <EmptyAchievementsCard />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="courses">
                {enrolledCourses.length === 0 ? (
                  <EmptyCoursesCard />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Enrolled courses would be rendered here */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity">
                <EmptyActivityCard />
              </TabsContent>

              <TabsContent value="achievements">
                <EmptyAchievementsCard />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* NO MORE FLOATING PANEL - COMPLETELY REMOVED */}
    </div>
  );
}