import { useState, useEffect, useMemo } from "react";
import { useIntl } from "react-intl";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EnhancedCourseCard } from "@/components/EnhancedCourseCard";
import { EnhancedCourseViewer } from "@/components/EnhancedCourseViewer";
import { EnhancedAdminCourseManager } from "@/components/EnhancedAdminCourseManager";
import { CourseUpgradeModal } from "@/components/CourseUpgradeModal";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { generateCourseCertificatePdf } from "@/utils/certificates";

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

interface CourseCertificate {
  id: string;
  course_id: string;
  certificate_data: {
    course_title?: string;
    user_name?: string;
    completion_date?: string;
    [key: string]: any;
  };
  certificate_url?: string | null;
  created_at: string;
  courses?: {
    title: string;
  } | null;
}

const DEFAULT_USER_STATS: UserStats = {
  activeCourses: 0,
  completedCourses: 0,
  hoursLearned: 0,
  currentStreak: 0
};

export default function Education() {
  const intl = useIntl();
  usePageMetadata({
    title: "Education — Pluggd",
    description: "Stream courses, track progress, and level up your music business and production skills with Pluggd education.",
    path: "/education",
  });

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showOnlyEnrolled, setShowOnlyEnrolled] = useState(false);
  const [courseCertificates, setCourseCertificates] = useState<CourseCertificate[]>([]);
  const [isFetchingCertificates, setIsFetchingCertificates] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_USER_STATS);
  const [activeTab, setActiveTab] = useState<string>('progress');

  useEffect(() => {
    fetchCourses();
    fetchCoursePricing();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['progress', 'browse', 'certificates'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProgress([]);
      setCourseCertificates([]);
      setUserStats(DEFAULT_USER_STATS);
      return;
    }

    refreshLearningState();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast({
        title: "Course unlocked",
        description: "Your purchase has been confirmed. You now have access to the course.",
      });

      refreshLearningState();

      params.delete('payment');
      params.delete('course');
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
      window.history.replaceState({}, '', newUrl);
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

  const fetchUserCertificates = async () => {
    if (!user) {
      setCourseCertificates([]);
      return;
    }

    try {
      setIsFetchingCertificates(true);
      const { data, error } = await supabase
        .from('course_certificates')
        .select('id, course_id, certificate_data, certificate_url, created_at, courses!inner(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourseCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setIsFetchingCertificates(false);
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
      await fetchUserCertificates();
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

  const enrolledCourseIds = useMemo(() => userProgress.map(p => p.course_id), [userProgress]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    courses.forEach(course => {
      (course.tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    if (showOnlyEnrolled) {
      filtered = filtered.filter(course => enrolledCourseIds.includes(course.id));
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(course => course.difficulty_level?.toLowerCase() === selectedDifficulty.toLowerCase());
    }

    if (selectedTag !== 'all') {
      filtered = filtered.filter(course => course.tags?.includes(selectedTag));
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [courses, enrolledCourseIds, selectedDifficulty, selectedTag, showOnlyEnrolled, searchTerm]);

  const enrolledCourses = useMemo(() => {
    return courses.filter(course => enrolledCourseIds.includes(course.id));
  }, [courses, enrolledCourseIds]);

  const handleDownloadCertificate = (certificate: CourseCertificate) => {
    const certificateData = certificate.certificate_data || {};

    generateCourseCertificatePdf({
      courseTitle: certificateData.course_title || certificate.courses?.title || 'Course',
      userName: certificateData.user_name || user?.user_metadata?.full_name || 'Student',
      completionDate: certificateData.completion_date || certificate.created_at,
      certificateId: certificate.id
    });
  };

  const refreshLearningState = () => {
    if (!user) return;
    fetchUserProgress();
    calculateUserStats();
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

      refreshLearningState();
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
              <h1 className="text-4xl font-bold mb-2">
                {intl.formatMessage({ id: "pages.education.heading", defaultMessage: "My Learning Dashboard" })}
              </h1>
              <p className="text-white/80">
                {intl.formatMessage({ id: "pages.education.subheading", defaultMessage: "Continue your journey to mastery" })}
              </p>
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
                    <p className="text-white/80 text-sm">
                      {intl.formatMessage({ id: "pages.education.statsActive", defaultMessage: "Active Courses" })}
                    </p>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                {enrolledCourses.length > 0 ? (
                  <div className="space-y-4">
                    {enrolledCourses.slice(0, 3).map((course) => {
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
                      setActiveTab('browse');
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
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div className="flex flex-1 flex-col sm:flex-row gap-4">
                  <Input
                    placeholder="Search courses"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="sm:max-w-sm"
                  />
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="sm:w-40">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {availableTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-enrolled"
                    checked={showOnlyEnrolled}
                    onCheckedChange={(checked) => setShowOnlyEnrolled(!!checked)}
                  />
                  <label htmlFor="show-enrolled" className="text-sm text-muted-foreground">
                    Only show my courses
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDifficulty("all");
                      setSelectedTag("all");
                      setShowOnlyEnrolled(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <EnhancedCourseCard
                    key={course.id}
                    course={course}
                      progress={getProgressForCourse(course.id)}
                      onEnroll={handleEnrollCourse}
                      onContinue={handleContinueCourse}
                      showProgress={!!getProgressForCourse(course.id)}
                      isProOnly={coursePricing[course.id]?.isProOnly}
                      oneTimePrice={coursePricing[course.id]?.oneTimePrice}
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
                {isFetchingCertificates ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading certificates...
                  </div>
                ) : courseCertificates.length > 0 ? (
                  <div className="space-y-4">
                    {courseCertificates.map((certificate) => {
                      const certificateData = certificate.certificate_data || {};
                      return (
                        <Card key={certificate.id} className="border shadow-sm">
                          <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">
                                {certificateData.course_title || certificate.courses?.title || 'Course Certificate'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Awarded to {certificateData.user_name || user?.user_metadata?.full_name || 'you'} on{' '}
                                {new Date(certificateData.completion_date || certificate.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                ID: {certificate.id.slice(0, 8)}
                              </Badge>
                              <Button variant="outline" onClick={() => handleDownloadCertificate(certificate)}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Complete courses to earn certificates
                    </p>
                  </div>
                )}
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
        onProgressUpdated={refreshLearningState}
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
            refreshLearningState();
          }}
        />
      )}
    </div>
  );
}