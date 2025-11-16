import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Plus,
  Edit,
  Eye,
  Settings,
  Target,
  Clock,
  Award,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Download,
  Share,
  Filter,
  Calendar,
  Zap,
  Brain,
  Sparkles,
  Rocket,
  GraduationCap,
  Globe,
  Video,
  FileText,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  // Clean admin state - everything starts at zero/empty
  const [adminStats, setAdminStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalRevenue: 0,
    activeEnrollments: 0
  });

  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  // Admin Quick Actions for proper inline positioning
  const adminQuickActions = [
    {
      id: 'new-course',
      title: 'New Course',
      description: 'Create and publish new educational content',
      icon: Plus,
      color: 'from-purple-500 to-orange-500',
      onClick: () => onNavigate('content-creator')
    },
    {
      id: 'manage-students',
      title: 'Manage Students',
      description: 'Monitor student progress and engagement',
      icon: Users,
      color: 'from-green-500 to-green-600',
      onClick: () => onNavigate('students')
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Access detailed analytics and insights',
      icon: BarChart3,
      color: 'from-purple-500 to-orange-500',
      onClick: () => onNavigate('analytics')
    }
  ];

  // Empty state components
  const EmptyStatsCards = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">No students registered yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Create your first course</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$0</div>
          <p className="text-xs text-muted-foreground">Revenue will appear here</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">No enrollments yet</p>
        </CardContent>
      </Card>
    </>
  );

  const EmptyCoursesCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Course Management
        </CardTitle>
        <CardDescription>Create and manage your courses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Edit className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Courses Created</h3>
          <p className="text-muted-foreground mb-6">
            Start building your educational content by creating your first course
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => onNavigate('content-creator')}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Course
            </Button>
            <Button 
              variant="outline"
              onClick={() => onNavigate('courses')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Course Management
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyStudentsCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Management
        </CardTitle>
        <CardDescription>Monitor student progress and engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Students Enrolled</h3>
          <p className="text-muted-foreground mb-6">
            Students will appear here once they enroll in your courses
          </p>
          <Button 
            variant="outline"
            onClick={() => onNavigate('students')}
          >
            <Users className="h-4 w-4 mr-2" />
            Student Management
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyAnalyticsCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Overview
        </CardTitle>
        <CardDescription>Track performance and engagement metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground mb-6">
            Analytics will appear once you have courses and students
          </p>
          <Button 
            variant="outline"
            onClick={() => onNavigate('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyAlertsCard = () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h4 className="font-medium mb-2">All Systems Operational</h4>
          <p className="text-sm text-muted-foreground">
            No alerts or issues to report
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50/30 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Admin Header - Fixed at top */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Admin Dashboard
            </motion.h1>
            <motion.p 
              className="text-muted-foreground mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Manage your educational platform and create amazing courses
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
              className="bg-gradient-to-r from-blue-500 to-purple-500"
            >
              <Plus className="h-4 w-4 mr-2" />
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
            {/* Admin Quick Actions - NOW PROPERLY POSITIONED IN CONTENT FLOW */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {adminQuickActions.map((action) => (
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

            {/* Quick Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <EmptyStatsCards />
            </motion.div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="courses">Courses</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Getting Started for New Admins */}
                {recentCourses.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-2 border-dashed border-blue-200 dark:border-blue-800">
                      <CardContent className="text-center py-12">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.7, type: "spring" }}
                        >
                          <Rocket className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-4">Welcome to Your Admin Dashboard!</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Start building your educational platform. Create courses, manage students, 
                          and track your success with powerful analytics.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button 
                            onClick={() => onNavigate('content-creator')}
                            size="lg"
                            className="bg-gradient-to-r from-purple-500 to-orange-500"
                          >
                            <Edit className="h-5 w-5 mr-2" />
                            Create First Course
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => onNavigate('courses')}
                            size="lg"
                          >
                            <Settings className="h-5 w-5 mr-2" />
                            Course Management
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Overview Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                  <EmptyCoursesCard />
                  <EmptyStudentsCard />
                  <EmptyAnalyticsCard />
                  <EmptyAlertsCard />
                </div>
              </TabsContent>

              <TabsContent value="courses">
                {recentCourses.length === 0 ? (
                  <EmptyCoursesCard />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Course cards would be rendered here */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="students">
                <EmptyStudentsCard />
              </TabsContent>

              <TabsContent value="analytics">
                <EmptyAnalyticsCard />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Platform Settings
                      </CardTitle>
                      <CardDescription>Configure your platform preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('settings')}
                          className="w-full justify-start"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          General Settings
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('students')}
                          className="w-full justify-start"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          User Management
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('virtual-classroom')}
                          className="w-full justify-start"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Virtual Classroom
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Advanced Features
                      </CardTitle>
                      <CardDescription>Powerful tools for course creation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('content-creator')}
                          className="w-full justify-start"
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          AI Content Creator
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('analytics')}
                          className="w-full justify-start"
                        >
                          <PieChart className="h-4 w-4 mr-2" />
                          Advanced Analytics
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => onNavigate('discussions')}
                          className="w-full justify-start"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Community Hub
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* NO MORE FLOATING PANEL - COMPLETELY REMOVED */}
    </div>
  );
}