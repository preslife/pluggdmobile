import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EnhancedCourseCard } from "@/components/EnhancedCourseCard";
import { EnhancedCourseViewer } from "@/components/EnhancedCourseViewer";
import { EnhancedAdminCourseManager } from "@/components/EnhancedAdminCourseManager";
import { CourseUpgradeModal } from "@/components/CourseUpgradeModal";

import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  Users, 
  Settings,
  Crown,
  Download,
  ChevronRight
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  content: any;
  thumbnail_url?: string;
  price: number;
  difficulty_level: string;
  duration_hours: number;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

interface CourseProgress {
  course_id: string;
  completion_percentage: number;
  last_accessed_at: string;
  completed_at?: string;
  progress_data: any;
}

interface UserStats {
  activeCourses: number;
  completedCourses: number;
  hoursLearned: number;
  currentStreak: number;
}

export default function Education() {
  const { user } = useAuth();
  const { subscription, usage, checkCourseLimit, getTierLimits } = useSubscription();
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProgress, setUserProgress] = useState<CourseProgress[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCourseViewerOpen, setIsCourseViewerOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalCourse, setUpgradeModalCourse] = useState<{id: string, title: string, oneTimePrice?: number} | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coursePricing, setCoursePricing] = useState<{[key: string]: {isProOnly: boolean, oneTimePrice?: number}}>({});
  const [userStats, setUserStats] = useState<UserStats>({
    activeCourses: 0,
    completedCourses: 0,
    hoursLearned: 0,
    currentStreak: 0
  });

  useEffect(() => {
    fetchCourses();
    fetchCoursePricing();
    if (user) {
      fetchUserProgress();
      calculateUserStats();
    }
  }, [user]);

  const fetchCoursePricing = async () => {
    try {
      const { data, error } = await supabase
        .from('course_pricing')
        .select('*');

      if (error) throw error;
      
      const pricingMap: {[key: string]: {isProOnly: boolean, oneTimePrice?: number}} = {};
      data?.forEach(item => {
        pricingMap[item.course_id] = {
          isProOnly: item.is_pro_only,
          oneTimePrice: item.one_time_price
        };
      });
      setCoursePricing(pricingMap);
    } catch (error) {
      console.error('Error fetching course pricing:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserProgress(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const calculateUserStats = async () => {
    if (!user) return;

    try {
      const { data: progressData } = await supabase
        .from('user_course_progress')
        .select('*, courses!inner(*)')
        .eq('user_id', user.id);

      if (progressData) {
        const activeCourses = progressData.filter(p => p.completion_percentage < 100).length;
        const completedCourses = progressData.filter(p => p.completion_percentage === 100).length;
        const hoursLearned = progressData.reduce((total, p) => {
          return total + (p.courses.duration_hours * (p.completion_percentage / 100));
        }, 0);

        setUserStats({
          activeCourses,
          completedCourses,
          hoursLearned: Math.round(hoursLearned),
          currentStreak: 14 // Calculate based on daily activity
        });
      }
    } catch (error) {
      console.error('Error calculating user stats:', error);
    }
  };

  const checkCourseAccess = async (courseId: string) => {
    if (!user) return false;
    
    // Check if course is Pro-only
    const courseSettings = coursePricing[courseId];
    if (!courseSettings?.isProOnly) return true;
    
    // Check if user has Pro subscription or purchased course individually
    const { data, error } = await supabase.rpc('has_course_access', {
      p_user_id: user.id,
      p_course_id: courseId
    });
    
    return !error && data;
  };

  const handleEnrollCourse = async (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to enroll in courses",
        variant: "destructive",
      });
      return;
    }

    // Check course access
    const hasAccess = await checkCourseAccess(courseId);
    if (!hasAccess) {
      const course = courses.find(c => c.id === courseId);
      const courseSettings = coursePricing[courseId];
      
      if (course && courseSettings?.isProOnly) {
        setUpgradeModalCourse({
          id: course.id,
          title: course.title,
          oneTimePrice: courseSettings.oneTimePrice
        });
        setIsUpgradeModalOpen(true);
        return;
      }
    }

    // Check course limit for current tier
    if (!checkCourseLimit()) {
      const limits = getTierLimits();
      toast({
        title: "Course Limit Reached",
        description: `You can only have ${limits.maxActiveCourses} active course${limits.maxActiveCourses === 1 ? '' : 's'} on your current plan.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          completion_percentage: 0,
          progress_data: { completed_lessons: [] }
        });

      if (error) throw error;

      // Track activation in usage stats
      await supabase.rpc('increment_user_usage', { p_user_id: user.id, p_usage_type: 'active_courses' });

      toast({
        title: "Enrolled Successfully",
        description: "You can now start learning!",
      });

      fetchUserProgress();
      calculateUserStats();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast({
        title: "Enrollment Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleContinueCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourse(course);
      setIsCourseViewerOpen(true);
    }
  };

  const getFilteredCourses = () => {
    return courses;
  };

  const getEnrolledCourses = () => {
    const enrolledCourseIds = userProgress.map(p => p.course_id);
    return courses.filter(course => enrolledCourseIds.includes(course.id));
  };

  const getProgressForCourse = (courseId: string) => {
    return userProgress.find(p => p.course_id === courseId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 pt-24">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (isAdminView) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-masthead">
          <EnhancedAdminCourseManager />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-secondary p-8 text-white pt-24">{/* Added pt-24 for navigation spacing */}
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Learning Dashboard</h1>
              <p className="text-white/80">Continue your journey to mastery</p>
            </div>
            <div className="flex gap-4">
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => setIsAdminView(true)}
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              <Button
                onClick={() => {
                  setUpgradeModalCourse({
                    id: 'general-upgrade',
                    title: 'Upgrade to Pro',
                    oneTimePrice: undefined
                  });
                  setIsUpgradeModalOpen(true);
                }}
                className="bg-white text-primary hover:bg-white/90"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Active Courses</p>
                    <p className="text-2xl font-bold">{userStats.activeCourses}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Completed</p>
                    <p className="text-2xl font-bold">{userStats.completedCourses}</p>
                  </div>
                  <Award className="w-8 h-8 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Hours Learned</p>
                    <p className="text-2xl font-bold">{userStats.hoursLearned}</p>
                  </div>
                  <Clock className="w-8 h-8 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Current Streak</p>
                    <p className="text-2xl font-bold">{userStats.currentStreak} days</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-white/60" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="progress">My Progress</TabsTrigger>
            <TabsTrigger value="browse">Browse Courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            {/* Continue Learning Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Continue Learning
                </CardTitle>
                <CardDescription>
                  Pick up where you left off
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getEnrolledCourses().length > 0 ? (
                  <div className="space-y-4">
                    {getEnrolledCourses().slice(0, 3).map((course) => {
                      const progress = getProgressForCourse(course.id);
                      return (
                        <div key={course.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{course.description}</p>
                            <div className="flex items-center gap-4">
                              <Progress value={progress?.completion_percentage || 0} className="flex-1" />
                              <span className="text-sm text-muted-foreground">
                                {progress?.completion_percentage || 0}%
                              </span>
                            </div>
                          </div>
                          <Button onClick={() => handleContinueCourse(course.id)}>
                            Continue
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No courses enrolled yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your learning journey by browsing our course catalog
                    </p>
                    <Button onClick={() => {
                      const browseTab = document.querySelector('[value="browse"]') as HTMLButtonElement;
                      browseTab?.click();
                    }}>
                      Browse Courses
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse" className="space-y-6">
            {/* Recommended Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended For You</CardTitle>
                <CardDescription>
                  Courses tailored to your learning path
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredCourses().map((course) => (
                    <EnhancedCourseCard
                      key={course.id}
                      course={course}
                      progress={getProgressForCourse(course.id)}
                      onEnroll={handleEnrollCourse}
                      onContinue={handleContinueCourse}
                      showProgress={!!getProgressForCourse(course.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Your Certificates
                </CardTitle>
                <CardDescription>
                  Download and share your achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete courses to earn certificates
                  </p>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    View Sample Certificate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Course Viewer Modal */}
      <EnhancedCourseViewer
        course={selectedCourse}
        isOpen={isCourseViewerOpen}
        onClose={() => setIsCourseViewerOpen(false)}
        progress={selectedCourse ? getProgressForCourse(selectedCourse.id) : undefined}
      />

      {/* Upgrade Modal */}
      {upgradeModalCourse && (
        <CourseUpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setUpgradeModalCourse(null);
          }}
          course={upgradeModalCourse}
          onPurchaseComplete={() => {
            setIsUpgradeModalOpen(false);
            setUpgradeModalCourse(null);
            fetchUserProgress();
          }}
        />
      )}
    </div>
  );
}