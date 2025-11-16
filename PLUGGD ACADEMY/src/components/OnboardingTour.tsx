import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Zap,
  BookOpen,
  Video,
  Users,
  MessageSquare,
  Target,
  Trophy,
  Brain,
  Search,
  Bell,
  HelpCircle,
  Calendar,
  BarChart3,
  Settings,
  Edit,
  Home,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ComponentType<any>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userRole: 'student' | 'admin';
}

// Hook for managing onboarding state
export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-completed') === 'true';
    }
    return false;
  });
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  const startOnboarding = useCallback(() => setShowOnboarding(true), []);
  const closeOnboarding = useCallback(() => setShowOnboarding(false), []);
  
  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-completed', 'true');
    }
  }, []);

  return useMemo(() => ({
    hasCompletedOnboarding,
    showOnboarding,
    startOnboarding,
    closeOnboarding,
    completeOnboarding
  }), [hasCompletedOnboarding, showOnboarding, startOnboarding, closeOnboarding, completeOnboarding]);
}

// Tour steps for students - moved outside component to prevent recreation
const studentSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '🎉 Welcome to EduPlatform!',
      description: 'Let\'s take a quick tour to help you get started with your learning journey.',
      target: '[data-tour="sidebar"]',
      position: 'center',
      icon: Sparkles
    },
    {
      id: 'sidebar',
      title: 'Navigation Sidebar',
      description: 'Your main navigation hub. Access all features from here including your dashboard, courses, and community.',
      target: '[data-tour="sidebar"]',
      position: 'right',
      icon: Home
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'See your learning progress, enrolled courses, and quick actions to continue your journey.',
      target: '[data-sidebar="dashboard"]',
      position: 'right',
      icon: BarChart3
    },
    {
      id: 'classroom',
      title: 'Course Marketplace',
      description: 'Browse and enroll in courses. Find content that matches your interests and career goals.',
      target: '[data-sidebar="classroom"]',
      position: 'right',
      icon: BookOpen
    },
    {
      id: 'virtual-classroom',
      title: 'Live Virtual Classes',
      description: 'Join live sessions with instructors and other students. Participate in real-time learning.',
      target: '[data-sidebar="virtual-classroom"]',
      position: 'right',
      icon: Video
    },
    {
      id: 'ai-assistant',
      title: 'AI Learning Assistant',
      description: 'Get personalized course recommendations based on your learning style and goals.',
      target: '[data-sidebar="recommendations"]',
      position: 'right',
      icon: Brain
    },
    {
      id: 'assessments',
      title: 'Assessments & Quizzes',
      description: 'Test your knowledge and track your progress with interactive assessments.',
      target: '[data-sidebar="assessments"]',
      position: 'right',
      icon: Target
    },
    {
      id: 'achievements',
      title: 'Achievements & Badges',
      description: 'Earn badges and certificates as you complete courses and reach milestones.',
      target: '[data-sidebar="achievements"]',
      position: 'right',
      icon: Trophy
    },
    {
      id: 'community',
      title: 'Learning Community',
      description: 'Connect with fellow learners, ask questions, and share knowledge in discussion forums.',
      target: '[data-sidebar="community"]',
      position: 'right',
      icon: MessageSquare
    },
    {
      id: 'search',
      title: 'Universal Search',
      description: 'Use ⌘K to quickly search for courses, content, or navigate anywhere in the platform.',
      target: '[data-tour="search-hint"]',
      position: 'bottom',
      icon: Search
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'Get notified about course updates, assignment deadlines, and community activities.',
      target: '[data-tour="notifications"]',
      position: 'bottom',
      icon: Bell
    },
    {
      id: 'help',
      title: 'Need Help?',
      description: 'Access this tour anytime by pressing F1 or clicking the help button. You\'re ready to start learning!',
      target: '[data-tour="help-button"]',
      position: 'bottom',
      icon: HelpCircle
    }
];

// Tour steps for admins - moved outside component to prevent recreation
const adminSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '🚀 Welcome Admin!',
      description: 'Let\'s explore the powerful admin tools to manage your educational platform.',
      target: '[data-tour="sidebar"]',
      position: 'center',
      icon: Sparkles
    },
    {
      id: 'admin-dashboard',
      title: 'Admin Dashboard',
      description: 'Monitor platform analytics, user engagement, and overall system health.',
      target: '[data-sidebar="admin-dashboard"]',
      position: 'right',
      icon: BarChart3
    },
    {
      id: 'content-creator',
      title: 'Content Creation Studio',
      description: 'Create engaging courses with our advanced content creator. Add videos, quizzes, and interactive elements.',
      target: '[data-sidebar="content-creator"]',
      position: 'right',
      icon: Edit
    },
    {
      id: 'course-management',
      title: 'Course Management',
      description: 'Manage all courses, review submissions, and control course visibility and pricing.',
      target: '[data-sidebar="course-management"]',
      position: 'right',
      icon: BookOpen
    },
    {
      id: 'student-management',
      title: 'Student Management',
      description: 'View student progress, manage enrollments, and provide support.',
      target: '[data-sidebar="student-management"]',
      position: 'right',
      icon: Users
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Deep dive into learning analytics, engagement metrics, and platform performance.',
      target: '[data-sidebar="analytics"]',
      position: 'right',
      icon: BarChart3
    },
    {
      id: 'virtual-classroom-admin',
      title: 'Virtual Classroom Management',
      description: 'Schedule and manage live sessions, monitor attendance, and review recordings.',
      target: '[data-sidebar="virtual-classroom-admin"]',
      position: 'right',
      icon: Video
    },
    {
      id: 'community-hub',
      title: 'Community Management',
      description: 'Moderate discussions, manage user interactions, and foster a positive learning environment.',
      target: '[data-sidebar="community-hub"]',
      position: 'right',
      icon: MessageSquare
    }
];

export function OnboardingTour({ isOpen, onClose, onComplete, userRole }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tourPosition, setTourPosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = useMemo(() => userRole === 'admin' ? adminSteps : studentSteps, [userRole]);
  const currentStepData = steps[currentStep];

  // Define all handler functions first to avoid temporal dead zone issues
  const handleComplete = useCallback(() => {
    setCurrentStep(0);
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setCurrentStep(0);
    onClose();
  }, [onClose]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  // Find and highlight target element with better error handling
  useEffect(() => {
    if (!isOpen || !currentStepData) return;

    const findTarget = () => {
      const target = document.querySelector(currentStepData.target);
      
      if (target) {
        setHighlightedElement(target as HTMLElement);
        
        // Calculate position for tour card
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        let x = rect.left + scrollLeft;
        let y = rect.top + scrollTop;
        
        // Adjust position based on tour card placement
        switch (currentStepData.position) {
          case 'right':
            x = rect.right + scrollLeft + 20;
            y = rect.top + scrollTop;
            break;
          case 'left':
            x = rect.left + scrollLeft - 320;
            y = rect.top + scrollTop;
            break;
          case 'bottom':
            x = rect.left + scrollLeft;
            y = rect.bottom + scrollTop + 20;
            break;
          case 'top':
            x = rect.left + scrollLeft;
            y = rect.top + scrollTop - 200;
            break;
          case 'center':
            x = window.innerWidth / 2 - 160;
            y = window.innerHeight / 2 - 100;
            break;
        }
        
        // Keep tour card within viewport
        x = Math.max(20, Math.min(x, window.innerWidth - 340));
        y = Math.max(20, Math.min(y, window.innerHeight - 220));
        
        setTourPosition({ x, y });
      } else {
        console.warn(`Tour target not found: ${currentStepData.target} for step: ${currentStepData.id}`);
        
        // Fall back to center position if target not found
        setHighlightedElement(null);
        setTourPosition({
          x: window.innerWidth / 2 - 160,
          y: window.innerHeight / 2 - 100
        });
      }
    };

    // Try to find target immediately
    findTarget();
    
    // Also try after a short delay in case elements are still rendering
    const timeoutId = setTimeout(findTarget, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentStep, currentStepData, isOpen]);

  // Auto-advance tour if playing
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }, 5000); // 5 seconds per step

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, isOpen, steps.length, handleComplete]);

  if (!isOpen || !currentStepData) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={handleSkip}
      />

      {/* Highlight Element */}
      {highlightedElement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed pointer-events-none z-50"
          style={{
            left: highlightedElement.getBoundingClientRect().left - 4,
            top: highlightedElement.getBoundingClientRect().top - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 20px #3b82f6',
          }}
        />
      )}

      {/* Tour Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className="fixed z-50"
        style={{
          left: tourPosition.x,
          top: tourPosition.y,
        }}
      >
        <Card className="w-80 shadow-2xl border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentStepData.icon && (
                  <currentStepData.icon className="h-5 w-5 text-blue-500" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {currentStep + 1} of {steps.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-8 w-8 p-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Progress 
              value={(currentStep + 1) / steps.length * 100} 
              className="h-1.5"
            />
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <CardTitle className="text-lg mb-2">{currentStepData.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {currentStepData.description}
              </CardDescription>
            </div>

            {currentStepData.action && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={currentStepData.action.onClick}
                className="w-full"
              >
                {currentStepData.action.label}
              </Button>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Quick navigation dots */}
            <div className="flex justify-center gap-1 pt-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}