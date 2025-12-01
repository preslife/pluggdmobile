import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Sparkles,
  X,
  User,
  CreditCard,
  Music,
  Heart,
  Share2,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface OnboardingTask {
  id: string;
  title: string;
  icon: any;
  completed: boolean;
}

interface OnboardingProgressWidgetProps {
  className?: string;
  variant?: 'floating' | 'sidebar' | 'inline';
  onDismiss?: () => void;
}

const WIDGET_STORAGE_KEY = 'pluggd-onboarding-widget-dismissed';

export const OnboardingProgressWidget = ({ 
  className,
  variant = 'floating',
  onDismiss 
}: OnboardingProgressWidgetProps) => {
  const { user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const tasks: OnboardingTask[] = [
    { id: 'complete_profile', title: 'Complete Profile', icon: User, completed: false },
    { id: 'connect_stripe', title: 'Connect Stripe', icon: CreditCard, completed: false },
    { id: 'publish_content', title: 'First Upload', icon: Music, completed: false },
    { id: 'enable_tips', title: 'Enable Tips', icon: Heart, completed: false },
    { id: 'connect_social', title: 'Connect Socials', icon: Share2, completed: false },
    { id: 'install_pwa', title: 'Install App', icon: Smartphone, completed: false },
  ];

  useEffect(() => {
    // Check if widget was dismissed
    const dismissedUntil = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil);
      if (Date.now() < dismissedTime) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    if (user) {
      fetchProgress();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_progress) {
        const progress = profile.onboarding_progress as { completed_tasks?: string[] };
        setCompletedTasks(progress.completed_tasks || []);
      }
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Dismiss for 7 days
    localStorage.setItem(WIDGET_STORAGE_KEY, (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    setDismissed(true);
    onDismiss?.();
  };

  const tasksWithStatus = tasks.map(task => ({
    ...task,
    completed: completedTasks.includes(task.id)
  }));

  const completedCount = tasksWithStatus.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  // Don't show if loading, dismissed, no user, or all tasks complete
  if (loading || dismissed || !user || completedCount === tasks.length) {
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn("p-4 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Setup Progress</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{tasks.length}
          </Badge>
        </div>
        
        <Progress value={progressPercent} className="h-2 mb-3" />
        
        <div className="space-y-2">
          {tasksWithStatus.slice(0, 3).filter(t => !t.completed).map(task => (
            <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-3 w-3" />
              <span>{task.title}</span>
            </div>
          ))}
        </div>
        
        <Link to="/studio/settings">
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
            Complete Setup
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10", className)}>
        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Complete your setup</span>
            <Badge variant="secondary" className="text-xs">
              {progressPercent}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-1 mt-1" />
        </div>
        <Link to="/studio/settings">
          <Button size="sm" variant="ghost" className="text-xs">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // Floating variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "fixed bottom-24 left-4 z-40 w-72",
          className
        )}
      >
        <div className="bg-background/95 backdrop-blur-xl border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-purple-500/10 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Setup Progress</p>
                <p className="text-xs text-muted-foreground">{completedCount} of {tasks.length} complete</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                {progressPercent}%
              </Badge>
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-2">
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Expanded Tasks */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2">
                  {tasksWithStatus.map(task => {
                    const Icon = task.icon;
                    return (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center gap-2 py-1.5 text-sm",
                          task.completed ? "text-muted-foreground line-through" : ""
                        )}
                      >
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{task.title}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="px-4 pb-4 flex gap-2">
                  <Link to="/studio/settings" className="flex-1">
                    <Button size="sm" className="w-full text-xs">
                      Complete Setup
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingProgressWidget;

