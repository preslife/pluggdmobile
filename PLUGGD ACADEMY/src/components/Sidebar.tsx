import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  BookOpen, 
  Video, 
  Users, 
  BarChart3, 
  Settings, 
  Target, 
  Trophy, 
  MessageSquare, 
  Brain, 
  Calendar,
  Edit,
  GraduationCap,
  Zap,
  HelpCircle,
  LogOut,
  User,
  Shield,
  Moon,
  Sun,
  Home,
  Search,
  Play,
  FileText,
  Globe,
  Bell,
  Heart,
  Star,
  Award,
  TrendingUp,
  Palette,
  DollarSign,
  Upload,
  Eye,
  ShoppingCart,
  FileText,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import pluggdLogo from 'figma:asset/d854fbdbbea8a738e92da63eac56f9bfeed879c4.png';


interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: 'student' | 'creator' | 'admin';
  onRoleChange: (role: 'student' | 'creator' | 'admin') => void;
}

export function Sidebar({ currentView, onNavigate, userRole, onRoleChange }: SidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Clean state - all counts start at zero, will be populated by real data
  const [userStats, setUserStats] = useState({
    activeCourses: 0,
    completedCourses: 0,
    pendingAssessments: 0,
    unreadDiscussions: 0,
    notifications: 0,
    achievements: 0,
    currentStreak: 0,
    // Creator-specific stats
    coursesCreated: 0,
    studentsEnrolled: 0,
    revenue: 0,
    pendingReviews: 0
  });

  // Admin stats - also start clean
  const [adminStats, setAdminStats] = useState({
    totalCourses: 0,
    totalUsers: 0,
    pendingReviews: 0,
    newEnrollments: 0,
    unreadMessages: 0,
    systemAlerts: 0
  });

  useEffect(() => {
    // Check if dark mode is already enabled
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  // Handle role toggle between student and creator
  const handleRoleToggle = (isCreator: boolean) => {
    const newRole = isCreator ? 'creator' : 'student';
    onRoleChange(newRole);
  };

  // Student navigation items
  const studentNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      badge: null,
      dataAttr: 'dashboard'
    },
    {
      id: 'classroom',
      label: 'Browse Courses',
      icon: BookOpen,
      badge: null,
      dataAttr: 'classroom'
    },
    {
      id: 'virtual-classroom',
      label: 'Live Classes',
      icon: Video,
      badge: null,
      dataAttr: 'virtual-classroom'
    },
    {
      id: 'recommendations',
      label: 'AI Assistant',
      icon: Brain,
      badge: null,
      dataAttr: 'recommendations'
    }
  ];

  // Creator navigation items
  const creatorNavItems = [
    {
      id: 'dashboard',
      label: 'Creator Studio',
      icon: Palette,
      badge: null,
      dataAttr: 'creator-dashboard'
    },
    {
      id: 'content-creator',
      label: 'Course Builder',
      icon: Edit,
      badge: null,
      dataAttr: 'content-creator'
    },
    {
      id: 'course-templates',
      label: 'Course Templates',
      icon: FileText,
      badge: null,
      dataAttr: 'course-templates'
    },
    {
      id: 'courses',
      label: 'My Courses',
      icon: BookOpen,
      badge: userStats.coursesCreated > 0 ? userStats.coursesCreated : null,
      dataAttr: 'my-courses'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      badge: null,
      dataAttr: 'creator-analytics'
    },
    {
      id: 'virtual-classroom',
      label: 'Host Live Classes',
      icon: Video,
      badge: null,
      dataAttr: 'virtual-classroom-host'
    }
  ];

  // Learning section items for students
  const learningItems = [
    {
      id: 'classroom',
      label: 'My Learning',
      icon: GraduationCap,
      badge: userStats.activeCourses > 0 ? `${userStats.activeCourses} active` : null,
      description: 'Your enrolled courses',
      dataAttr: 'my-learning'
    },
    {
      id: 'assessments',
      label: 'Assessments',
      icon: Target,
      badge: userStats.pendingAssessments > 0 ? userStats.pendingAssessments : null,
      description: 'Quizzes and exams',
      dataAttr: 'assessments'
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      badge: userStats.achievements > 0 ? userStats.achievements : null,
      description: 'Your progress and badges',
      dataAttr: 'achievements'
    },
    {
      id: 'calendar',
      label: 'Schedule',
      icon: Calendar,
      badge: null,
      description: 'Your learning schedule',
      dataAttr: 'schedule'
    }
  ];

  // Creator business section
  const creatorBusinessItems = [
    {
      id: 'students',
      label: 'My Students',
      icon: Users,
      badge: userStats.studentsEnrolled > 0 ? userStats.studentsEnrolled : null,
      description: 'Enrolled students',
      dataAttr: 'my-students'
    },
    {
      id: 'analytics',
      label: 'Revenue & Stats',
      icon: DollarSign,
      badge: userStats.revenue > 0 ? `$${userStats.revenue}` : null,
      description: 'Earnings and performance',
      dataAttr: 'creator-revenue'
    }
  ];

  // Community section
  const communityItems = [
    {
      id: 'discussions',
      label: 'Community',
      icon: MessageSquare,
      badge: userStats.unreadDiscussions > 0 ? userStats.unreadDiscussions : null,
      description: 'Connect with learners',
      dataAttr: 'discussions'
    }
  ];

  // Admin navigation items
  const adminNavItems = [
    {
      id: 'dashboard',
      label: 'System Overview',
      icon: BarChart3,
      badge: null,
      dataAttr: 'admin-dashboard'
    },
    {
      id: 'courses',
      label: 'Platform Courses',
      icon: BookOpen,
      badge: adminStats.pendingReviews > 0 ? adminStats.pendingReviews : null,
      dataAttr: 'platform-courses'
    },
    {
      id: 'students',
      label: 'User Management',
      icon: Users,
      badge: adminStats.newEnrollments > 0 ? adminStats.newEnrollments : null,
      dataAttr: 'user-management'
    },
    {
      id: 'analytics',
      label: 'Platform Analytics',
      icon: TrendingUp,
      badge: null,
      dataAttr: 'platform-analytics'
    },
    {
      id: 'virtual-classroom',
      label: 'System Monitoring',
      icon: Video,
      badge: adminStats.systemAlerts > 0 ? adminStats.systemAlerts : null,
      dataAttr: 'system-monitoring'
    },
    {
      id: 'discussions',
      label: 'Content Moderation',
      icon: MessageSquare,
      badge: adminStats.unreadMessages > 0 ? adminStats.unreadMessages : null,
      dataAttr: 'content-moderation'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      badge: null,
      dataAttr: 'system-settings'
    },
    {
      id: 'system-status',
      label: 'System Status',
      icon: Activity,
      badge: null,
      dataAttr: 'system-status'
    }
  ];

  const NavItem = ({ item, isActive }: { item: any; isActive: boolean }) => (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start h-10 px-3 ${
          isActive 
            ? 'bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900/20 dark:to-orange-900/20 text-purple-700 dark:text-purple-400 border-l-2 border-gradient-to-b from-purple-500 to-orange-500' 
            : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-purple-50 hover:to-orange-50 dark:hover:from-purple-900/10 dark:hover:to-orange-900/10'
        }`}
        onClick={() => onNavigate(item.id)}
        data-sidebar={item.dataAttr}
      >
        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge && (
          <Badge 
            variant={typeof item.badge === 'number' ? 'destructive' : 'secondary'} 
            className="ml-2 text-xs h-5 px-1.5 flex-shrink-0"
          >
            {item.badge}
          </Badge>
        )}
      </Button>
    </motion.div>
  );

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'System Admin';
      case 'creator':
        return 'Course Creator';
      default:
        return 'Student';
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin':
        return Shield;
      case 'creator':
        return Palette;
      default:
        return User;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-orange-200 dark:border-orange-800 flex flex-col">
      {/* Header */}
      <div className="h-20 border-b border-orange-200 dark:border-orange-800 flex items-center justify-center overflow-hidden px-4">
        <img 
          src={pluggdLogo} 
          alt="Pluggd Academy" 
          className="w-full h-auto max-h-16 object-contain"
        />
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-sm">Alex Johnson</h3>
            <div className="flex items-center gap-2">
              <Badge 
                variant={userRole === 'admin' ? 'destructive' : userRole === 'creator' ? 'default' : 'secondary'} 
                className="text-xs h-5"
              >
                <RoleIcon className="h-3 w-3 mr-1" />
                {getRoleLabel()}
              </Badge>
              {/* Only show streak for students */}
              {userRole === 'student' && userStats.currentStreak > 0 && (
                <Badge variant="outline" className="text-xs h-5">
                  <Zap className="h-3 w-3 mr-1" />
                  {userStats.currentStreak}d
                </Badge>
              )}
              {/* Show earnings for creators */}
              {userRole === 'creator' && userStats.revenue > 0 && (
                <Badge variant="outline" className="text-xs h-5">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${userStats.revenue}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Role Switch - Only show for non-admin users */}
        {userRole !== 'admin' && (
          <div className="flex items-center justify-between">
            <Label htmlFor="role-switch" className="text-xs">
              {userRole === 'creator' ? 'Creator Mode' : 'Student Mode'}
            </Label>
            <Switch
              id="role-switch"
              checked={userRole === 'creator'}
              onCheckedChange={handleRoleToggle}
            />
          </div>
        )}

        {/* Admin role indicator */}
        {userRole === 'admin' && (
          <div className="flex items-center justify-center mt-2 p-2 bg-gradient-to-r from-purple-100 to-orange-100 dark:from-purple-900/20 dark:to-orange-900/20 rounded-lg">
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-2" />
            <span className="text-xs text-purple-700 dark:text-purple-300">System Administration</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {userRole === 'admin' ? (
          /* Admin Navigation */
          <div className="px-3">
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={currentView === item.id} 
                />
              ))}
            </div>
          </div>
        ) : userRole === 'creator' ? (
          /* Creator Navigation */
          <>
            {/* Main Creator Tools */}
            <div className="px-3 mb-6">
              <div className="space-y-1">
                {creatorNavItems.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    isActive={currentView === item.id} 
                  />
                ))}
              </div>
            </div>

            {/* Business Section - Only show if creator has data */}
            {(userStats.studentsEnrolled > 0 || userStats.revenue > 0) && (
              <>
                <Separator className="mx-3 mb-3 bg-orange-200 dark:bg-orange-800" />
                <div className="px-3 mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                    BUSINESS
                  </h4>
                  <div className="space-y-1">
                    {creatorBusinessItems.map((item) => (
                      <NavItem 
                        key={item.id} 
                        item={item} 
                        isActive={currentView === item.id} 
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Learning as Creator (they can still take courses) */}
            <Separator className="mx-3 mb-3 bg-orange-200 dark:bg-orange-800" />
            <div className="px-3 mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                MY LEARNING
              </h4>
              <div className="space-y-1">
                <NavItem 
                  item={{
                    id: 'classroom',
                    label: 'Browse Courses',
                    icon: Eye,
                    badge: null,
                    dataAttr: 'browse-courses'
                  }}
                  isActive={currentView === 'classroom'} 
                />
                <NavItem 
                  item={{
                    id: 'achievements',
                    label: 'Achievements',
                    icon: Trophy,
                    badge: null,
                    dataAttr: 'achievements'
                  }}
                  isActive={currentView === 'achievements'} 
                />
                <NavItem 
                  item={{
                    id: 'discussions',
                    label: 'Community',
                    icon: MessageSquare,
                    badge: null,
                    dataAttr: 'community'
                  }}
                  isActive={currentView === 'discussions'} 
                />
              </div>
            </div>
          </>
        ) : (
          /* Student Navigation */
          <>
            {/* Main Navigation */}
            <div className="px-3 mb-6">
              <div className="space-y-1">
                {studentNavItems.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    isActive={currentView === item.id} 
                  />
                ))}
              </div>
            </div>

            {/* Learning Section - Only show if user has learning activity */}
            {(userStats.activeCourses > 0 || userStats.pendingAssessments > 0 || userStats.achievements > 0) && (
              <>
                <Separator className="mx-3 mb-3 bg-orange-200 dark:bg-orange-800" />
                <div className="px-3 mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                    MY LEARNING
                  </h4>
                  <div className="space-y-1">
                    {learningItems.map((item) => (
                      <NavItem 
                        key={item.id} 
                        item={item} 
                        isActive={currentView === item.id} 
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Community Section - Only show if there's community activity */}
            {userStats.unreadDiscussions > 0 && (
              <>
                <Separator className="mx-3 mb-3 bg-orange-200 dark:bg-orange-800" />
                <div className="px-3 mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                    COMMUNITY
                  </h4>
                  <div className="space-y-1">
                    {communityItems.map((item) => (
                      <NavItem 
                        key={item.id} 
                        item={item} 
                        isActive={currentView === item.id} 
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Always show basic learning items for easy access */}
            <Separator className="mx-3 mb-3 bg-orange-200 dark:bg-orange-800" />
            <div className="px-3 mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-3 px-3">
                EXPLORE
              </h4>
              <div className="space-y-1">
                <NavItem 
                  item={{
                    id: 'assessments',
                    label: 'Assessments',
                    icon: Target,
                    badge: null,
                    dataAttr: 'assessments'
                  }}
                  isActive={currentView === 'assessments'} 
                />
                <NavItem 
                  item={{
                    id: 'achievements',
                    label: 'Achievements',
                    icon: Trophy,
                    badge: null,
                    dataAttr: 'achievements'
                  }}
                  isActive={currentView === 'achievements'} 
                />
                <NavItem 
                  item={{
                    id: 'discussions',
                    label: 'Community',
                    icon: MessageSquare,
                    badge: null,
                    dataAttr: 'community'
                  }}
                  isActive={currentView === 'discussions'} 
                />
                <NavItem 
                  item={{
                    id: 'calendar',
                    label: 'Schedule',
                    icon: Calendar,
                    badge: null,
                    dataAttr: 'schedule'
                  }}
                  isActive={currentView === 'calendar'} 
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-orange-200 dark:border-orange-800 p-4 space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="theme-switch" className="text-xs flex items-center gap-2">
            {isDarkMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            {isDarkMode ? 'Dark Theme' : 'Light Theme'}
          </Label>
          <Switch
            id="theme-switch"
            checked={isDarkMode}
            onCheckedChange={toggleDarkMode}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('settings')}
            className="flex-1 h-8"
          >
            <Settings className="h-3 w-3 mr-2" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            title="Help & Support"
          >
            <HelpCircle className="h-3 w-3" />
          </Button>
        </div>

        {/* Version */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {userRole === 'admin' ? 'Pluggd Admin v3.0' : 'Pluggd Academy v3.0'}
          </p>
        </div>
      </div>
    </div>
  );
}