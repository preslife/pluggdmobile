import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, Sparkles, PenTool, Radio, Users, Share2, Upload, Calendar, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PROMPT_STORAGE_KEY = 'pluggd-feature-prompts';
const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export type PromptType = 
  | 'barflow-after-beat-purchase'
  | 'live-after-follow'
  | 'community-after-upload'
  | 'upload-after-live'
  | 'share-after-release'
  | 'courses-after-membership';

interface PromptConfig {
  id: PromptType;
  title: string;
  description: string;
  actionText: string;
  actionPath: string;
  icon: React.ElementType;
  gradient: string;
}

const PROMPT_CONFIGS: Record<PromptType, PromptConfig> = {
  'barflow-after-beat-purchase': {
    id: 'barflow-after-beat-purchase',
    title: 'Write lyrics to your new beat?',
    description: 'Open BarFlow to start writing lyrics with the beat you just purchased.',
    actionText: 'Open BarFlow',
    actionPath: '/tools',
    icon: PenTool,
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  'live-after-follow': {
    id: 'live-after-follow',
    title: 'They might be live soon!',
    description: 'Check out upcoming live sessions from this creator.',
    actionText: 'View Live Sessions',
    actionPath: '/live',
    icon: Radio,
    gradient: 'from-red-500/20 to-orange-500/20',
  },
  'community-after-upload': {
    id: 'community-after-upload',
    title: 'Share with the community?',
    description: 'Post about your new release in the community to get more visibility.',
    actionText: 'Go to Community',
    actionPath: '/community',
    icon: Users,
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  'upload-after-live': {
    id: 'upload-after-live',
    title: 'Upload session as a release?',
    description: 'Turn your live session recording into a release for fans who missed it.',
    actionText: 'Upload Recording',
    actionPath: '/studio/catalog',
    icon: Upload,
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  'share-after-release': {
    id: 'share-after-release',
    title: 'Share your new release!',
    description: 'Get the word out - share your release on social media.',
    actionText: 'Share Now',
    actionPath: '',
    icon: Share2,
    gradient: 'from-indigo-500/20 to-purple-500/20',
  },
  'courses-after-membership': {
    id: 'courses-after-membership',
    title: 'Unlock exclusive courses?',
    description: 'As a member, you have access to exclusive courses. Start learning!',
    actionText: 'Browse Courses',
    actionPath: '/learn',
    icon: Headphones,
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
};

interface PromptState {
  dismissedPrompts: Record<string, number>; // promptId -> timestamp dismissed
  shownPrompts: Record<string, number>; // promptId -> timestamp last shown
}

const loadPromptState = (): PromptState => {
  if (typeof window === 'undefined') return { dismissedPrompts: {}, shownPrompts: {} };
  try {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!stored) return { dismissedPrompts: {}, shownPrompts: {} };
    return JSON.parse(stored);
  } catch {
    return { dismissedPrompts: {}, shownPrompts: {} };
  }
};

const savePromptState = (state: PromptState) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save prompt state:', error);
  }
};

const canShowPrompt = (promptId: string): boolean => {
  const state = loadPromptState();
  const now = Date.now();
  
  // Check if dismissed permanently
  const dismissedAt = state.dismissedPrompts[promptId];
  if (dismissedAt && now - dismissedAt < PROMPT_COOLDOWN_MS * 7) { // 7 days cooldown for dismissed
    return false;
  }
  
  // Check if shown recently
  const shownAt = state.shownPrompts[promptId];
  if (shownAt && now - shownAt < PROMPT_COOLDOWN_MS) {
    return false;
  }
  
  return true;
};

const markPromptShown = (promptId: string) => {
  const state = loadPromptState();
  state.shownPrompts[promptId] = Date.now();
  savePromptState(state);
};

const markPromptDismissed = (promptId: string) => {
  const state = loadPromptState();
  state.dismissedPrompts[promptId] = Date.now();
  savePromptState(state);
};

interface FeaturePromptProps {
  type: PromptType;
  show: boolean;
  onClose: () => void;
  className?: string;
  customActionPath?: string;
  customAction?: () => void;
}

export const FeaturePrompt = ({ 
  type, 
  show, 
  onClose, 
  className,
  customActionPath,
  customAction
}: FeaturePromptProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const config = PROMPT_CONFIGS[type];

  useEffect(() => {
    if (show && canShowPrompt(type)) {
      setVisible(true);
      markPromptShown(type);
    } else {
      setVisible(false);
    }
  }, [show, type]);

  const handleDismiss = () => {
    markPromptDismissed(type);
    setVisible(false);
    onClose();
  };

  const handleAction = () => {
    if (customAction) {
      customAction();
    } else {
      const path = customActionPath || config.actionPath;
      if (path) {
        navigate(path);
      }
    }
    setVisible(false);
    onClose();
  };

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn("fixed bottom-24 right-4 z-50 max-w-sm", className)}
        >
          <Card className={cn("border shadow-xl bg-gradient-to-br", config.gradient, "backdrop-blur-xl")}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <h4 className="font-semibold text-sm">{config.title}</h4>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    {config.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAction}
                      className="h-8 text-xs"
                    >
                      {config.actionText}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDismiss}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      Not now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage feature prompts (local state version)
export const useFeaturePrompt = () => {
  const [activePrompt, setActivePrompt] = useState<PromptType | null>(null);
  
  const triggerPrompt = useCallback((type: PromptType) => {
    if (canShowPrompt(type)) {
      setActivePrompt(type);
    }
  }, []);
  
  const closePrompt = useCallback(() => {
    setActivePrompt(null);
  }, []);
  
  return {
    activePrompt,
    triggerPrompt,
    closePrompt,
    canShowPrompt,
  };
};

// Global Context for Feature Prompts
interface FeaturePromptContextType {
  activePrompt: PromptType | null;
  triggerPrompt: (type: PromptType) => void;
  closePrompt: () => void;
}

const FeaturePromptContext = createContext<FeaturePromptContextType | null>(null);

export const useGlobalFeaturePrompt = () => {
  const context = useContext(FeaturePromptContext);
  if (!context) {
    // Return a no-op version if not in provider (graceful fallback)
    return {
      activePrompt: null,
      triggerPrompt: () => {},
      closePrompt: () => {},
    };
  }
  return context;
};

interface FeaturePromptProviderProps {
  children: ReactNode;
}

export const FeaturePromptProvider = ({ children }: FeaturePromptProviderProps) => {
  const [activePrompt, setActivePrompt] = useState<PromptType | null>(null);
  
  const triggerPrompt = useCallback((type: PromptType) => {
    if (canShowPrompt(type)) {
      setActivePrompt(type);
    }
  }, []);
  
  const closePrompt = useCallback(() => {
    setActivePrompt(null);
  }, []);

  return (
    <FeaturePromptContext.Provider value={{ activePrompt, triggerPrompt, closePrompt }}>
      {children}
      {activePrompt && (
        <FeaturePrompt
          type={activePrompt}
          show={true}
          onClose={closePrompt}
        />
      )}
    </FeaturePromptContext.Provider>
  );
};

export default FeaturePrompt;

