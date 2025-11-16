import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { StudentDashboard } from './components/StudentDashboard';
import { CreatorDashboard } from './components/CreatorDashboard';
import { Classroom } from './components/Classroom';
import { AdminDashboard } from './components/AdminDashboard';
import { CourseManagement } from './components/CourseManagement';
import { CourseTemplates } from './components/CourseTemplates';
import { AssessmentSystem } from './components/AssessmentSystem';
import { GamificationSystem } from './components/GamificationSystem';
import { CommunityHub } from './components/CommunityHub';
import { RecommendationEngine } from './components/RecommendationEngine';
import { VirtualClassroom } from './components/VirtualClassroom';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { ContentCreator } from './components/ContentCreator';
import { StudentCalendar } from './components/StudentCalendar';
import { StudentManagement } from './components/StudentManagement';
import { Settings } from './components/Settings';
import { SystemStatus } from './components/SystemStatus';
import { CommandPalette } from './components/CommandPalette';
import { NotificationProvider, NotificationBell, NotificationPanel, useNotifications } from './components/NotificationSystem';
import { SmartNotifications } from './components/SmartNotifications';
import { OnboardingTour, useOnboarding } from './components/OnboardingTour';
import { PageTransition, FeatureLoading } from './components/LoadingStates';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { useIsMobile } from './components/ui/use-mobile';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Video, 
  BarChart3, 
  Edit,
  Users,
  Target,
  Trophy,
  MessageSquare,
  Brain,
  Zap,
  HelpCircle,
  Settings as SettingsIcon,
  Calendar,
  Shield,
  Key,
  Lock,
  Menu
} from 'lucide-react';

// App component wrapped to have access to notifications
function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userRole, setUserRole] = useState<'student' | 'creator' | 'admin'>('student');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFeature, setLoadingFeature] = useState<{
    title: string;
    description: string;
    icon: React.ComponentType<any>;
  } | null>(null);
  const [showAdminAccess, setShowAdminAccess] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Track if welcome message has been shown to prevent loops
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Get mobile state
  const isMobile = useIsMobile();

  // User data state - starts empty, will be populated by components or Supabase
  const [userStats, setUserStats] = useState({
    streak: 0,
    badges: 0,
    completedCourses: 0,
    totalHours: 0
  });

  // User stats will be loaded from Supabase in production
  // For now, everything starts at zero until real data is available
  useEffect(() => {
    // Reset stats when user role changes
    setUserStats({
      streak: 0,
      badges: 0,
      completedCourses: 0,
      totalHours: 0
    });
  }, [userRole]);

  // Get notifications context
  const { showToast } = useNotifications();

  const {
    hasCompletedOnboarding,
    showOnboarding,
    startOnboarding,
    completeOnboarding,
    closeOnboarding
  } = useOnboarding();

  // Close mobile sidebar when screen size changes
  useEffect(() => {
    if (!isMobile) {
      setShowMobileSidebar(false);
    }
  }, [isMobile]);

  const getFeatureInfo = (view: string) => {
    const features: Record<string, { title: string; description: string; icon: React.ComponentType<any> }> = {
      'dashboard': {
        title: 'Loading Dashboard',
        description: 'Preparing your personalized overview',
        icon: BarChart3
      },
      'classroom': {
        title: 'Loading Classroom',
        description: 'Loading your courses and progress',
        icon: BookOpen
      },
      'virtual-classroom': {
        title: 'Loading Virtual Classroom',
        description: 'Setting up video and collaboration tools',
        icon: Video
      },
      'recommendations': {
        title: 'Loading AI Assistant',
        description: 'Preparing personalized recommendations',
        icon: Brain
      },
      'assessments': {
        title: 'Loading Assessments',
        description: 'Preparing your quizzes and progress tracking',
        icon: Target
      },
      'achievements': {
        title: 'Loading Achievements',
        description: 'Loading your progress and accomplishments',
        icon: Trophy
      },
      'discussions': {
        title: 'Loading Community',
        description: 'Loading discussions and social features',
        icon: MessageSquare
      },
      'analytics': {
        title: 'Loading Analytics',
        description: 'Processing learning data and generating insights',
        icon: BarChart3
      },
      'content-creator': {
        title: 'Loading Content Creator',
        description: 'Initializing the course creation studio',
        icon: Edit
      },
      'courses': {
        title: 'Loading Course Management',
        description: 'Loading course data and management tools',
        icon: BookOpen
      },
      'course-templates': {
        title: 'Loading Course Templates',
        description: 'Loading professional course templates',
        icon: BookOpen
      },
      'calendar': {
        title: 'Loading Calendar',
        description: 'Preparing your schedule and events',
        icon: Calendar
      },
      'students': {
        title: 'Loading Student Management',
        description: 'Loading student data and management tools',
        icon: Users
      },
      'settings': {
        title: 'Loading Settings',
        description: 'Preparing configuration options',
        icon: SettingsIcon
      }
    };

    return features[view] || {
      title: 'Loading',
      description: 'Preparing your content',
      icon: Sparkles
    };
  };

  const navigateWithLoading = useCallback((view: string, course?: any) => {
    if (view === currentView) return;

    // Set loading state with appropriate feature info
    const featureInfo = getFeatureInfo(view);
    setLoadingFeature(featureInfo);
    setIsLoading(true);

    // Show loading toast for complex features only
    if (['virtual-classroom', 'analytics'].includes(view)) {
      showToast({
        type: 'info',
        title: `Initializing ${featureInfo.title.replace('Loading ', '')}`,
        message: 'Connecting to services and loading data',
        category: 'system'
      });
    }

    // Simulate loading time (in real app, this would be actual data loading)
    const loadingTime = Math.random() * 1000 + 500; // 500-1500ms
    
    setTimeout(() => {
      setCurrentView(view);
      setIsLoading(false);
      setLoadingFeature(null);

      // Success message for certain views
      if (view === 'virtual-classroom') {
        showToast({
          type: 'success',
          title: 'Virtual Classroom Ready',
          message: 'Video conferencing and collaboration tools are active',
          category: 'system'
        });
      }
    }, loadingTime);
  }, [currentView, showToast]);

  // Close mobile sidebar when navigation occurs
  const handleNavigate = useCallback((view: string, data?: any) => {
    if (isMobile) {
      setShowMobileSidebar(false);
    }
    
    // Handle different types of navigation data
    if (data?.template) {
      setTemplateData(data);
    } else if (data && !data.template) {
      setSelectedCourse(data);
    }
    
    navigateWithLoading(view, data);
  }, [isMobile, navigateWithLoading]);

  // Enhanced toast function with contextual notifications
  const showWelcomeToast = useCallback((role: 'student' | 'creator' | 'admin') => {
    const roleMessages = {
      admin: {
        title: 'System Overview Ready',
        message: 'Platform analytics and user management tools are available.',
        category: 'system' as const,
        action: 'View Dashboard'
      },
      creator: {
        title: 'Creator Studio Active',
        message: 'Content creation tools and course analytics are ready.',
        category: 'course' as const,
        action: 'Start Creating'
      },
      student: {
        title: 'Learning Hub Ready',
        message: 'Your personalized learning dashboard is updated.',
        category: 'course' as const,
        action: 'Continue Learning'
      }
    };

    const roleConfig = roleMessages[role];
    showToast({
      type: 'info',
      title: roleConfig.title,
      message: roleConfig.message,
      category: roleConfig.category,
      action: {
        label: roleConfig.action,
        onClick: () => {
          setTemplateData(null);
          navigateWithLoading(
            role === 'admin' ? 'dashboard' : 
            role === 'creator' ? 'content-creator' : 'classroom'
          );
        }
      }
    });
  }, [showToast, navigateWithLoading]);

  // Admin access handler
  const handleAdminAccess = () => {
    // In a real app, this would verify admin credentials
    setUserRole('admin');
    setCurrentView('dashboard');
    setShowAdminAccess(false);
    showToast({
      type: 'success',
      title: 'Admin Access Granted',
      message: 'System administration features are now available',
      category: 'system'
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // Help
      if (e.key === 'F1' || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
        e.preventDefault();
        startOnboarding();
      }

      // Admin access (Ctrl/Cmd + Alt + A)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'a') {
        e.preventDefault();
        setShowAdminAccess(true);
      }

      // Quick navigation shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const shortcuts = [
          'dashboard', 'classroom', 'virtual-classroom', 'recommendations', 
          'assessments', 'achievements', 'discussions'
        ];
        const index = parseInt(e.key) - 1;
        if (shortcuts[index]) {
          handleNavigate(shortcuts[index]);
        }
      }

      // Close mobile sidebar with Escape
      if (e.key === 'Escape' && showMobileSidebar) {
        setShowMobileSidebar(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [startOnboarding, handleNavigate, showMobileSidebar]);

  // Show onboarding for new users - Fixed to prevent infinite loops
  useEffect(() => {
    if (!hasCompletedOnboarding && !showOnboarding) {
      const timer = setTimeout(() => {
        startOnboarding();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, showOnboarding, startOnboarding]);

  // Welcome message for returning users - Fixed to prevent loops
  useEffect(() => {
    if (hasCompletedOnboarding && currentView === 'dashboard' && !welcomeShown) {
      const timer = setTimeout(() => {
        setWelcomeShown(true);
        showWelcomeToast(userRole);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, currentView, userRole, welcomeShown, showWelcomeToast]);

  // Reset welcome message when user role changes
  useEffect(() => {
    setWelcomeShown(false);
  }, [userRole]);

  const renderContent = () => {  
    if (isLoading && loadingFeature) {
      return (
        <FeatureLoading
          icon={loadingFeature.icon}
          title={loadingFeature.title}
          description={loadingFeature.description}
          progress={Math.floor(Math.random() * 80) + 20} // 20-100%
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        if (userRole === 'admin') {
          return <AdminDashboard onNavigate={handleNavigate} />;
        } else if (userRole === 'creator') {
          return <CreatorDashboard onNavigate={handleNavigate} />;
        } else {
          return <StudentDashboard onNavigate={handleNavigate} onSelectCourse={setSelectedCourse} />;
        }
      case 'classroom':
        return <Classroom course={selectedCourse} onNavigate={handleNavigate} />;
      case 'virtual-classroom':
        return <VirtualClassroom 
          userRole={userRole} 
          roomId={`room-${Date.now()}`}
          courseName="Advanced React Patterns"
        />;
      case 'courses':
        return <CourseManagement onNavigate={handleNavigate} />;
      case 'course-templates':
        return <CourseTemplates onNavigate={handleNavigate} />;
      case 'content-creator':
        return <ContentCreator templateData={templateData} />;
      case 'assessments':
        return <AssessmentSystem courseId="current" />;
      case 'achievements':
        return <GamificationSystem />;
      case 'discussions':
        return <CommunityHub />;
      case 'recommendations':
        return <RecommendationEngine />;
      case 'analytics':
        return <AdvancedAnalytics />;
      case 'calendar':
        return <StudentCalendar />;
      case 'students':
        return <StudentManagement />;
      case 'settings':
        return <Settings />;
      case 'system-status':
        return <SystemStatus />;
      default:
        return <StudentDashboard onNavigate={handleNavigate} onSelectCourse={setSelectedCourse} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-background overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        {!isMobile && (
          <div data-tour="sidebar" className="flex-shrink-0">
            <Sidebar 
              currentView={currentView} 
              onNavigate={handleNavigate}
              userRole={userRole}
              onRoleChange={(role) => {
                setUserRole(role);
                setWelcomeShown(false); // Reset welcome message for new role
                // Removed role switching notification - users know they're switching
              }}
            />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobile && showMobileSidebar && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowMobileSidebar(false)}
              />
              
              {/* Mobile Sidebar */}
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="fixed left-0 top-0 bottom-0 w-80 z-50 md:hidden"
              >
                <Sidebar 
                  currentView={currentView} 
                  onNavigate={handleNavigate}
                  userRole={userRole}
                  onRoleChange={(role) => {
                    setUserRole(role);
                    setWelcomeShown(false);
                    setShowMobileSidebar(false); // Close mobile sidebar after role change
                    // Removed role switching notification - users know they're switching
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area - Full width on mobile */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar - Mobile optimized */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 z-10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                {/* Mobile Menu Button */}
                {isMobile && (
                  <motion.button
                    onClick={() => setShowMobileSidebar(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.button>
                )}

                <motion.div
                  className="flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium truncate text-sm md:text-base">
                    {userRole === 'admin' ? 'Admin Panel' : 
                     userRole === 'creator' ? 'Creator Studio' : 'Learning Hub'}
                  </span>
                </motion.div>
                
                {/* Search hint - Hidden on mobile */}
                {!isMobile && (
                  <motion.button
                    onClick={() => setShowCommandPalette(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-tour="search-hint"
                  >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:block">Search everything...</span>
                    <kbd className="ml-auto bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded text-xs">⌘K</kbd>
                  </motion.button>
                )}
              </div>

              <div className="flex items-center gap-1 md:gap-3">
                {/* Search button for mobile */}
                {isMobile && (
                  <motion.button
                    onClick={() => setShowCommandPalette(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </motion.button>
                )}

                {/* Admin Access Button - Only show for non-admin users */}
                {userRole !== 'admin' && !isMobile && (
                  <motion.button
                    onClick={() => setShowAdminAccess(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Admin Access (⌘⌥A)"
                    data-tour="admin-access"
                  >
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </motion.button>
                )}

                {/* Help button */}
                <motion.button
                  onClick={startOnboarding}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Help & Tour (F1)"
                  data-tour="help-button"
                >
                  <HelpCircle className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
                </motion.button>

                {/* Notifications */}
                <div data-tour="notifications">
                  <NotificationBell onOpenPanel={() => setShowNotificationPanel(true)} />
                </div>

                {/* Stats will appear here when user has actual learning data */}
              </div>
            </div>
          </motion.div>

          {/* Main content area - Properly sized with overflow handling */}
          <div className="flex-1 min-h-0 relative">
            <PageTransition isLoading={false}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full"
                  data-tour={currentView}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </PageTransition>
          </div>
        </main>

        {/* Admin Access Modal */}
        <AnimatePresence>
          {showAdminAccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAdminAccess(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">System Administration</h3>
                    <p className="text-sm text-muted-foreground">Restricted Access Required</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <p className="text-sm">
                    You are requesting access to system administration features. 
                    This includes user management, platform settings, and system monitoring.
                  </p>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <Lock className="h-4 w-4 inline mr-2" />
                      In production, this would require proper authentication and authorization.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleAdminAccess} className="flex-1">
                    <Key className="h-4 w-4 mr-2" />
                    Grant Access
                  </Button>
                  <Button variant="outline" onClick={() => setShowAdminAccess(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Components - Positioned outside main layout to avoid scroll conflicts */}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onNavigate={handleNavigate}
          userRole={userRole}
          currentView={currentView}
        />

        <NotificationPanel
          isOpen={showNotificationPanel}
          onClose={() => setShowNotificationPanel(false)}
        />

        <OnboardingTour
          isOpen={showOnboarding}
          onClose={closeOnboarding}
          onComplete={completeOnboarding}
          userRole={userRole}
        />

        {/* Toast notifications - Fixed positioning */}
        <Toaster
          position={isMobile ? "top-center" : "bottom-right"}
          expand={false}
          richColors
          closeButton
          visibleToasts={3}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
            className: 'dark:bg-gray-800 dark:text-white dark:border-gray-700',
          }}
        />

        {/* Smart Notifications Component */}
        <SmartNotifications 
          userRole={userRole}
          currentView={currentView}
          onNavigate={handleNavigate}
        />

        {/* Floating Help Button - Hidden on mobile when sidebar is open */}
        {!showCommandPalette && !showNotificationPanel && !showOnboarding && !showAdminAccess && !(isMobile && showMobileSidebar) && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 3 }}
            className={`fixed ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'} z-40`}
            data-tour="floating-help"
          >
            <motion.button
              className={`bg-gradient-to-r from-purple-500 to-orange-500 text-white ${isMobile ? 'p-2.5' : 'p-3'} rounded-full shadow-lg hover:shadow-xl transition-all duration-200`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startOnboarding}
              title="Help & Tour (F1)"
            >
              <HelpCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// Main App component with providers
export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}