import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Search, 
  ArrowRight, 
  Clock, 
  Star, 
  Zap,
  BookOpen,
  Users,
  Settings,
  Award,
  BarChart3,
  MessageSquare,
  Video,
  Brain,
  Target,
  Trophy,
  Edit,
  Monitor,
  Calendar,
  Home,
  Command,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Rocket,
  Globe,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'navigation' | 'actions' | 'search' | 'recent' | 'suggestions';
  icon: React.ComponentType<any>;
  shortcut?: string;
  action: () => void;
  keywords: string[];
  priority: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  userRole: 'student' | 'creator' | 'admin';
  currentView: string;
}

export function CommandPalette({ 
  isOpen, 
  onClose, 
  onNavigate, 
  userRole, 
  currentView 
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View your main dashboard',
      category: 'navigation',
      icon: Home,
      shortcut: '⌘+1',
      action: () => { safeNavigate('dashboard'); },
      keywords: ['dashboard', 'home', 'overview'],
      priority: 10
    },
    {
      id: 'nav-learning',
      title: 'My Learning',
      description: 'Access your courses and lessons',
      category: 'navigation',
      icon: BookOpen,
      shortcut: '⌘+2',
      action: () => { safeNavigate('classroom'); },
      keywords: ['learning', 'courses', 'lessons', 'study'],
      priority: 9
    },
    {
      id: 'nav-virtual',
      title: 'Virtual Classroom',
      description: 'Join live classes and meetings',
      category: 'navigation',
      icon: Video,
      shortcut: '⌘+3',
      action: () => { safeNavigate('virtual-classroom'); },
      keywords: ['virtual', 'live', 'classroom', 'video', 'meeting'],
      priority: 8
    },
    {
      id: 'nav-ai',
      title: 'AI Assistant',
      description: 'Get personalized recommendations',
      category: 'navigation',
      icon: Brain,
      shortcut: '⌘+4',
      action: () => { safeNavigate('recommendations'); },
      keywords: ['ai', 'assistant', 'recommendations', 'smart'],
      priority: 8
    },
    {
      id: 'nav-assessments',
      title: 'Assessments',
      description: 'Take quizzes and tests',
      category: 'navigation',
      icon: Target,
      shortcut: '⌘+5',
      action: () => { safeNavigate('assessments'); },
      keywords: ['assessments', 'quiz', 'test', 'exam'],
      priority: 7
    },
    {
      id: 'nav-achievements',
      title: 'Achievements',
      description: 'View badges and progress',
      category: 'navigation',
      icon: Trophy,
      shortcut: '⌘+6',
      action: () => { safeNavigate('achievements'); },
      keywords: ['achievements', 'badges', 'progress', 'gamification'],
      priority: 7
    },
    {
      id: 'nav-community',
      title: 'Community',
      description: 'Connect with other learners',
      category: 'navigation',
      icon: MessageSquare,
      shortcut: '⌘+7',
      action: () => { safeNavigate('discussions'); },
      keywords: ['community', 'discussions', 'chat', 'social'],
      priority: 6
    }
  ];

  const adminCommands: CommandItem[] = [
    {
      id: 'nav-content-creator',
      title: 'Content Creator',
      description: 'Create and edit lessons',
      category: 'navigation',
      icon: Edit,
      action: () => { safeNavigate('content-creator'); },
      keywords: ['content', 'creator', 'edit', 'lessons'],
      priority: 9
    },
    {
      id: 'nav-analytics',
      title: 'Advanced Analytics',
      description: 'View detailed insights',
      category: 'navigation',
      icon: BarChart3,
      action: () => { safeNavigate('analytics'); },
      keywords: ['analytics', 'insights', 'data', 'reports'],
      priority: 8
    },
    {
      id: 'nav-course-mgmt',
      title: 'Course Management',
      description: 'Manage courses and content',
      category: 'navigation',
      icon: Settings,
      action: () => { safeNavigate('courses'); },
      keywords: ['courses', 'management', 'admin'],
      priority: 8
    }
  ];

  const actionCommands: CommandItem[] = [
    {
      id: 'action-search',
      title: 'Search Everything',
      description: 'Find courses, lessons, and content',
      category: 'actions',
      icon: Search,
      shortcut: '⌘+K',
      action: () => { console.log('Global search'); },
      keywords: ['search', 'find', 'lookup'],
      priority: 10
    },
    {
      id: 'action-dark-mode',
      title: 'Toggle Dark Mode',
      description: 'Switch between light and dark themes',
      category: 'actions',
      icon: Monitor,
      shortcut: '⌘+D',
      action: () => { 
        document.documentElement.classList.toggle('dark'); 
        onClose(); 
      },
      keywords: ['dark', 'light', 'theme', 'mode'],
      priority: 5
    },
    {
      id: 'action-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all available shortcuts',
      category: 'actions',
      icon: Keyboard,
      shortcut: '⌘+/',
      action: () => { console.log('Show shortcuts'); onClose(); },
      keywords: ['shortcuts', 'keyboard', 'hotkeys'],
      priority: 3
    }
  ];

  const suggestionCommands: CommandItem[] = [
    {
      id: 'suggest-continue',
      title: 'Continue Learning',
      description: 'Pick up where you left off',
      category: 'suggestions',
      icon: Rocket,
      action: () => { safeNavigate('classroom'); },
      keywords: ['continue', 'resume', 'progress'],
      priority: 9
    },
    {
      id: 'suggest-trending',
      title: 'Trending Courses',
      description: 'Explore popular content',
      category: 'suggestions',
      icon: TrendingUp,
      action: () => { console.log('Show trending'); onClose(); },
      keywords: ['trending', 'popular', 'hot'],
      priority: 6
    },
    {
      id: 'suggest-ai-rec',
      title: 'AI Recommendations',
      description: 'Get personalized suggestions',
      category: 'suggestions',
      icon: Sparkles,
      action: () => { safeNavigate('recommendations'); },
      keywords: ['ai', 'recommendations', 'suggested'],
      priority: 7
    }
  ];

  const safeNavigate = useCallback((view: string) => {
    try {
      onNavigate(view);
      onClose();
    } catch (error) {
      console.error('Navigation error:', error);
      onClose();
    }
  }, [onNavigate, onClose]);

  const allCommands = [
    ...navigationCommands,
    ...(userRole === 'admin' || userRole === 'creator' ? adminCommands : []),
    ...actionCommands,
    ...suggestionCommands
  ];

  const filteredCommands = query.trim() === '' 
    ? allCommands.filter(cmd => 
        cmd.category === 'recent' || 
        cmd.category === 'suggestions' ||
        (cmd.category === 'navigation' && cmd.priority >= 7)
      ).slice(0, 8)
    : allCommands
        .filter(cmd => 
          cmd.title.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description.toLowerCase().includes(query.toLowerCase()) ||
          cmd.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
        )
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 8);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filteredCommands]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            try {
              filteredCommands[selectedIndex].action();
              addToRecent(filteredCommands[selectedIndex].id);
            } catch (error) {
              console.error('Command execution error:', error);
              onClose();
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const addToRecent = (commandId: string) => {
    setRecentCommands(prev => {
      const filtered = prev.filter(id => id !== commandId);
      return [commandId, ...filtered].slice(0, 5);
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation': return 'Navigate';
      case 'actions': return 'Actions';
      case 'search': return 'Search';
      case 'recent': return 'Recent';
      case 'suggestions': return 'Suggested';
      default: return '';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return ArrowRight;
      case 'actions': return Zap;
      case 'search': return Search;
      case 'recent': return Clock;
      case 'suggestions': return Lightbulb;
      default: return ArrowRight;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-4"
        >
          <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
            <CardContent className="p-0">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for anything... or try a command"
                  className="border-0 bg-transparent text-lg placeholder-gray-400 focus-visible:ring-0"
                />
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs font-mono bg-gray-100 dark:bg-gray-800">
                    ⌘K
                  </Badge>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-auto">
                {filteredCommands.length > 0 ? (
                  <div className="py-2">
                    {query.trim() === '' && (
                      <div className="px-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <Sparkles className="h-4 w-4" />
                          Quick Actions
                        </div>
                      </div>
                    )}
                    
                    {filteredCommands.map((command, index) => {
                      const CategoryIcon = getCategoryIcon(command.category);
                      return (
                        <motion.div
                          key={command.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 ${
                            index === selectedIndex 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => {
                            try {
                              command.action();
                              addToRecent(command.id);
                            } catch (error) {
                              console.error('Command execution error:', error);
                              onClose();
                            }
                          }}
                        >
                          <div className={`p-2 rounded-lg ${
                            index === selectedIndex 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}>
                            <command.icon className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">{command.title}</p>
                              <Badge 
                                variant="outline" 
                                className="text-xs px-1.5 py-0 bg-transparent"
                              >
                                <CategoryIcon className="h-3 w-3 mr-1" />
                                {getCategoryLabel(command.category)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {command.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {command.shortcut && (
                              <Badge variant="outline" className="text-xs font-mono bg-gray-50 dark:bg-gray-800">
                                {command.shortcut}
                              </Badge>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No results found</p>
                    <p className="text-sm text-gray-400">
                      Try searching for courses, lessons, or features
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="w-5 h-5 p-0 font-mono">↑</Badge>
                      <Badge variant="outline" className="w-5 h-5 p-0 font-mono">↓</Badge>
                      <span>navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="px-1.5 py-0 font-mono">⏎</Badge>
                      <span>select</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="px-1.5 py-0 font-mono">esc</Badge>
                      <span>close</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Command className="h-3 w-3" />
                    <span>Command Palette</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}