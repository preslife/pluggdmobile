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
  ArrowRight,
  Edit,
  Upload,
  DollarSign,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Settings,
  PlusCircle,
  FileText,
  Camera,
  Mic,
  Image,
  BarChart,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';

interface CreatorDashboardProps {
  onNavigate: (view: string, course?: any) => void;
}

export function CreatorDashboard({ onNavigate }: CreatorDashboardProps) {
  // Clean state - all empty arrays and zero values for new creators
  const [createdCourses, setCreatedCourses] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [studentFeedback, setStudentFeedback] = useState<any[]>([]);
  const [creatorStats, setCreatorStats] = useState({
    totalRevenue: 0,
    totalStudents: 0,
    coursesPublished: 0,
    averageRating: 0,
    totalReviews: 0
  });

  // Quick actions for creators
  const quickActions = [
    {
      id: 'create-course',
      title: 'Create New Course',
      description: 'Start building your next course',
      icon: PlusCircle,
      color: 'from-purple-500 to-orange-500',
      onClick: () => onNavigate('content-creator')
    },
    {
      id: 'manage-courses',
      title: 'Manage Courses',
      description: 'Edit and update your existing courses',
      icon: Edit,
      color: 'from-blue-500 to-blue-600',
      onClick: () => onNavigate('courses')
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Track your course performance',
      icon: BarChart3,
      color: 'from-green-500 to-green-600',
      onClick: () => onNavigate('analytics')
    }
  ];

  // Empty state components for creators
  const EmptyCoursesCard = () => (
    <Card className="text-center py-12">
      <CardContent>
        <Edit className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Courses Created</h3>
        <p className="text-muted-foreground mb-6">
          Start creating and sharing your knowledge with the world
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => onNavigate('content-creator')}
            className="bg-gradient-to-r from-purple-500 to-orange-500"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Your First Course
          </Button>
          <p className="text-sm text-muted-foreground">
            Use our intuitive course creator to get started
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyActivityCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Creator Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Recent Activity</h4>
          <p className="text-sm text-muted-foreground">
            Your content creation activity will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyTasksCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Pending Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Pending Tasks</h4>
          <p className="text-sm text-muted-foreground">
            Course updates and reviews will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyEarningsCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Recent Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h4 className="font-medium mb-2">No Earnings Yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Start earning by creating and publishing courses
          </p>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('content-creator')}
            size="sm"
          >
            Create Course
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyStatsCards = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$0</div>
          <p className="text-xs text-muted-foreground">Publish courses to start earning</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Students enrolled in your courses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Courses Published</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Create your first course</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-</div>
          <p className="text-xs text-muted-foreground">Publish courses to get ratings</p>
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
              Welcome to Creator Studio
            </motion.h1>
            <motion.p 
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Create, manage, and grow your educational content
            </motion.p>
          </div>
          
          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              onClick={() => onNavigate('content-creator')}
              className="bg-gradient-to-r from-purple-500 to-orange-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Course
            </Button>
            <Button 
              variant="outline"
              onClick={() => onNavigate('analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Quick Actions */}
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
            {(creatorStats.totalRevenue > 0 || creatorStats.totalStudents > 0 || creatorStats.coursesPublished > 0) && (
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
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* First Time Creator Experience */}
                {createdCourses.length === 0 && (
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
                        <h2 className="text-2xl font-bold mb-4">Ready to Share Your Knowledge?</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Create engaging courses, reach thousands of students, and build a sustainable 
                          income from your expertise.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button 
                            onClick={() => onNavigate('content-creator')}
                            size="lg"
                            className="bg-gradient-to-r from-purple-500 to-orange-500"
                          >
                            <Edit className="h-5 w-5 mr-2" />
                            Create Your First Course
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => onNavigate('course-templates')}
                            size="lg"
                          >
                            <BookOpen className="h-5 w-5 mr-2" />
                            Browse Course Templates
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                  <div className="lg:col-span-2 space-y-6">
                    {createdCourses.length === 0 ? (
                      <EmptyCoursesCard />
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Your Courses
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
                    <EmptyTasksCard />
                    <EmptyEarningsCard />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="courses">
                {createdCourses.length === 0 ? (
                  <EmptyCoursesCard />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Created courses would be rendered here */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="text-center py-12">
                    <CardContent>
                      <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                      <p className="text-muted-foreground mb-6">
                        Publish courses to start tracking performance analytics
                      </p>
                      <Button 
                        onClick={() => onNavigate('analytics')}
                        variant="outline"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Full Analytics
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="earnings">
                <EmptyEarningsCard />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}