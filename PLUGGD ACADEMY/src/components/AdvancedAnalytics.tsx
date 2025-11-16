import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Trophy, 
  BookOpen, 
  Eye,
  Download,
  Filter,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Star,
  Globe,
  PieChart,
  LineChart,
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  MoreVertical,
  Maximize2,
  RefreshCw,
  FileText,
  Mail,
  Share2,
  Lightbulb,
  Workflow,
  Gauge,
  Layers,
  Network,
  Sparkles,
  Route,
  Compass,
  Map,
  Radar,
  Telescope,
  Microscope,
  Cpu,
  Database,
  Search,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Info,
  HelpCircle,
  Settings,
  Plus,
  Minus,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Sliders,
  BarChart,
  GridIcon,
  BrainCircuit,
  Atom,
  Dna,
  FlaskConical,
  Beaker,
  TestTube,
  Code,
  Layers3,
  BoxSelect
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  RadialBarChart,
  RadialBar,
  Legend,
  ComposedChart,
  ScatterChart,
  Scatter,
  FunnelChart,
  Funnel,
  TreemapChart,
  Treemap
} from 'recharts';

interface LearningMetric {
  id: string;
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  prediction?: {
    nextWeek: number;
    confidence: number;
  };
}

interface PerformanceData {
  date: string;
  completionRate: number;
  timeSpent: number;
  quizScore: number;
  engagement: number;
  retention: number;
  predictedScore?: number;
}

interface CourseAnalytics {
  id: string;
  courseName: string;
  enrollments: number;
  completionRate: number;
  averageRating: number;
  dropoffRate: number;
  timeToComplete: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  aiRecommendations: string[];
  learningPath?: {
    prerequisite: string[];
    nextSuggested: string[];
  };
}

interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'success' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  category: 'engagement' | 'performance' | 'retention' | 'optimization';
  actionItems: string[];
  expectedOutcome: string;
}

interface LearningPath {
  studentId: string;
  studentName: string;
  currentLevel: string;
  targetSkills: string[];
  recommendedCourses: string[];
  estimatedCompletion: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferences: {
    difficulty: string;
    pace: 'slow' | 'medium' | 'fast';
    format: string[];
  };
}

interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestedCourses: string[];
  estimatedTime: string;
}

export function AdvancedAnalytics() {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [analysisDepth, setAnalysisDepth] = useState([2]); // 0=basic, 1=detailed, 2=advanced
  const [selectedStudentCohort, setSelectedStudentCohort] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Enhanced demo data with AI predictions and insights
  const [learningMetrics] = useState<LearningMetric[]>([
    {
      id: 'engagement',
      title: 'AI Engagement Score',
      value: '87.3%',
      change: 12.5,
      trend: 'up',
      description: 'Multi-factor engagement analysis',
      icon: BrainCircuit,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      prediction: { nextWeek: 89.1, confidence: 92 }
    },
    {
      id: 'completion',
      title: 'Completion Velocity',
      value: '94.2%',
      change: 8.3,
      trend: 'up',
      description: 'AI-optimized completion rates',
      icon: Target,
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      prediction: { nextWeek: 95.8, confidence: 88 }
    },
    {
      id: 'retention',
      title: 'Knowledge Retention',
      value: '76.8%',
      change: -2.1,
      trend: 'down',
      description: 'Long-term memory analysis',
      icon: Brain,
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
      prediction: { nextWeek: 78.2, confidence: 85 }
    },
    {
      id: 'satisfaction',
      title: 'Learning Satisfaction',
      value: '4.7/5',
      change: 15.2,
      trend: 'up',
      description: 'AI sentiment analysis',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
      prediction: { nextWeek: 4.8, confidence: 91 }
    }
  ]);

  const [performanceData] = useState<PerformanceData[]>([
    { date: '2024-01-01', completionRate: 82, timeSpent: 45, quizScore: 78, engagement: 85, retention: 72, predictedScore: 80 },
    { date: '2024-01-02', completionRate: 85, timeSpent: 52, quizScore: 82, engagement: 88, retention: 75, predictedScore: 84 },
    { date: '2024-01-03', completionRate: 88, timeSpent: 48, quizScore: 85, engagement: 90, retention: 78, predictedScore: 87 },
    { date: '2024-01-04', completionRate: 91, timeSpent: 55, quizScore: 88, engagement: 92, retention: 80, predictedScore: 90 },
    { date: '2024-01-05', completionRate: 89, timeSpent: 50, quizScore: 86, engagement: 89, retention: 77, predictedScore: 88 },
    { date: '2024-01-06', completionRate: 93, timeSpent: 58, quizScore: 91, engagement: 94, retention: 82, predictedScore: 92 },
    { date: '2024-01-07', completionRate: 95, timeSpent: 62, quizScore: 94, engagement: 96, retention: 85, predictedScore: 95 }
  ]);

  const [courseAnalytics] = useState<CourseAnalytics[]>([
    {
      id: 'react-advanced',
      courseName: 'Advanced React Development',
      enrollments: 1247,
      completionRate: 87,
      averageRating: 4.8,
      dropoffRate: 13,
      timeToComplete: 8,
      difficulty: 'advanced',
      category: 'Frontend Development',
      aiRecommendations: [
        'Add more interactive coding exercises',
        'Include real-world project examples',
        'Improve performance optimization section'
      ],
      learningPath: {
        prerequisite: ['JavaScript Fundamentals', 'React Basics'],
        nextSuggested: ['React Native', 'Full-Stack Development', 'TypeScript Advanced']
      }
    },
    {
      id: 'python-ml',
      courseName: 'Machine Learning with Python',
      enrollments: 892,
      completionRate: 72,
      averageRating: 4.5,
      dropoffRate: 28,
      timeToComplete: 12,
      difficulty: 'intermediate',
      category: 'Data Science',
      aiRecommendations: [
        'Break down complex concepts into smaller modules',
        'Add visual explanations for algorithms',
        'Include more hands-on practice datasets'
      ],
      learningPath: {
        prerequisite: ['Python Basics', 'Statistics Fundamentals'],
        nextSuggested: ['Deep Learning', 'Computer Vision', 'NLP Fundamentals']
      }
    },
    {
      id: 'ux-design',
      courseName: 'UX Design Principles',
      enrollments: 634,
      completionRate: 91,
      averageRating: 4.9,
      dropoffRate: 9,
      timeToComplete: 6,
      difficulty: 'beginner',
      category: 'Design',
      aiRecommendations: [
        'Excellent course structure - maintain current format',
        'Consider adding advanced prototyping tools',
        'Add industry case studies'
      ],
      learningPath: {
        prerequisite: ['Design Thinking Basics'],
        nextSuggested: ['UI Design', 'User Research', 'Product Design']
      }
    }
  ]);

  const [aiInsights] = useState<AIInsight[]>([
    {
      id: 'insight-1',
      type: 'opportunity',
      title: 'Personalized Learning Path Optimization',
      description: 'AI analysis indicates 34% improvement potential in course sequencing based on individual learning patterns',
      confidence: 94,
      recommendation: 'Implement adaptive learning paths that adjust based on student performance and preferences',
      impact: 'high',
      category: 'optimization',
      actionItems: [
        'Deploy machine learning algorithm for course recommendation',
        'Create personalized difficulty progression',
        'Implement spaced repetition system'
      ],
      expectedOutcome: '25-40% improvement in completion rates and 30% better knowledge retention'
    },
    {
      id: 'insight-2',
      type: 'warning',
      title: 'Student Engagement Drop Detected',
      description: 'Machine learning model predicts 18% of current students are at risk of dropping out within 2 weeks',
      confidence: 87,
      recommendation: 'Trigger proactive intervention campaigns for at-risk students',
      impact: 'high',
      category: 'retention',
      actionItems: [
        'Send personalized encouragement messages',
        'Offer 1-on-1 mentoring sessions',
        'Adjust course difficulty for struggling students'
      ],
      expectedOutcome: 'Potential to retain 70% of at-risk students and improve overall satisfaction'
    },
    {
      id: 'insight-3',
      type: 'success',
      title: 'Optimal Learning Schedule Discovered',
      description: 'AI has identified peak learning hours for your student base: 10-11 AM and 2-4 PM show 40% better performance',
      confidence: 96,
      recommendation: 'Schedule live sessions and release new content during these optimal windows',
      impact: 'medium',
      category: 'engagement',
      actionItems: [
        'Reschedule live virtual classrooms to peak hours',
        'Send learning reminders during optimal times',
        'Prioritize content releases during high-engagement periods'
      ],
      expectedOutcome: '15-25% increase in live session attendance and engagement scores'
    },
    {
      id: 'insight-4',
      type: 'prediction',
      title: 'Skills Gap Analysis Forecast',
      description: 'Predictive modeling shows emerging skill demands in your course categories for the next 6 months',
      confidence: 82,
      recommendation: 'Develop courses in AI/ML integration, sustainability tech, and web3 development',
      impact: 'high',
      category: 'optimization',
      actionItems: [
        'Survey industry trends and job market data',
        'Partner with industry experts for content creation',
        'Pilot micro-learning modules in trending topics'
      ],
      expectedOutcome: 'Capture 50% more enrollment in high-demand skill areas'
    }
  ]);

  const [learningPaths] = useState<LearningPath[]>([
    {
      studentId: '1',
      studentName: 'Alex Johnson',
      currentLevel: 'Intermediate Frontend',
      targetSkills: ['Advanced React', 'TypeScript', 'Performance Optimization'],
      recommendedCourses: ['Advanced React Patterns', 'TypeScript Mastery', 'Web Performance'],
      estimatedCompletion: '3 months',
      learningStyle: 'visual',
      preferences: {
        difficulty: 'challenging',
        pace: 'fast',
        format: ['video', 'interactive-coding', 'projects']
      }
    },
    {
      studentId: '2',
      studentName: 'Maria Garcia',
      currentLevel: 'Beginner Data Science',
      targetSkills: ['Python', 'Machine Learning', 'Data Visualization'],
      recommendedCourses: ['Python for Data Science', 'ML Fundamentals', 'Tableau Mastery'],
      estimatedCompletion: '6 months',
      learningStyle: 'kinesthetic',
      preferences: {
        difficulty: 'gradual',
        pace: 'medium',
        format: ['hands-on', 'projects', 'peer-collaboration']
      }
    }
  ]);

  const [skillGaps] = useState<SkillGap[]>([
    {
      skill: 'Machine Learning',
      currentLevel: 35,
      targetLevel: 80,
      gap: 45,
      priority: 'high',
      suggestedCourses: ['ML Fundamentals', 'Advanced Algorithms', 'Python for ML'],
      estimatedTime: '4-6 months'
    },
    {
      skill: 'Cloud Computing',
      currentLevel: 60,
      targetLevel: 85,
      gap: 25,
      priority: 'medium',
      suggestedCourses: ['AWS Essentials', 'Cloud Architecture', 'DevOps Integration'],
      estimatedTime: '2-3 months'
    },
    {
      skill: 'Data Visualization',
      currentLevel: 40,
      targetLevel: 75,
      gap: 35,
      priority: 'medium',
      suggestedCourses: ['D3.js Mastery', 'Tableau Advanced', 'Python Visualization'],
      estimatedTime: '3-4 months'
    }
  ]);

  const timeFrames = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' }
  ];

  const cohorts = [
    { value: 'all', label: 'All Students' },
    { value: 'new', label: 'New Students (< 30 days)' },
    { value: 'active', label: 'Active Students' },
    { value: 'at-risk', label: 'At-Risk Students' },
    { value: 'high-performers', label: 'High Performers' }
  ];

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') return <ArrowUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <ArrowDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-500" />;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'prediction': return <Telescope className="h-5 w-5 text-purple-500" />;
      default: return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'opportunity': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'prediction': return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
      default: return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // In a real app, this would fetch new data
        console.log('Refreshing analytics data...');
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:to-gray-800">
      <div className="p-8 space-y-8">
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              AI-Powered Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Advanced learning insights with machine learning predictions and personalized recommendations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
            <Select value={selectedStudentCohort} onValueChange={setSelectedStudentCohort}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map(cohort => (
                  <SelectItem key={cohort.value} value={cohort.value}>
                    {cohort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTimeFrame} onValueChange={setSelectedTimeFrame}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeFrames.map(frame => (
                  <SelectItem key={frame.value} value={frame.value}>
                    {frame.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* AI Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-purple-500" />
                    <Label htmlFor="ai-insights" className="font-medium">AI Insights</Label>
                    <Switch
                      id="ai-insights"
                      checked={aiInsightsEnabled}
                      onCheckedChange={setAiInsightsEnabled}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Telescope className="h-5 w-5 text-blue-500" />
                    <Label htmlFor="predictions" className="font-medium">Predictions</Label>
                    <Switch
                      id="predictions"
                      checked={showPredictions}
                      onCheckedChange={setShowPredictions}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Analysis Depth:</Label>
                    <div className="w-32">
                      <Slider
                        value={analysisDepth}
                        onValueChange={setAnalysisDepth}
                        max={2}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {analysisDepth[0] === 0 ? 'Basic' : analysisDepth[0] === 1 ? 'Detailed' : 'Advanced'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Key Metrics with AI Predictions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {learningMetrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${metric.color} text-white group-hover:scale-110 transition-transform duration-200`}>
                      <metric.icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend, metric.change)}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                        metric.trend === 'down' ? 'text-red-600 dark:text-red-400' : 
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {Math.abs(metric.change)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold">{metric.value}</h3>
                    <p className="text-sm font-medium">{metric.title}</p>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                    
                    {showPredictions && metric.prediction && (
                      <div className="mt-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium">AI Prediction:</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Next week: {metric.prediction.nextWeek}% ({metric.prediction.confidence}% confidence)
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course Analytics
            </TabsTrigger>
            <TabsTrigger value="learning-paths" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Learning Paths
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Skill Gaps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {aiInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <Card className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${getInsightColor(insight.type)}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {getInsightIcon(insight.type)}
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{insight.title}</h3>
                              <p className="text-muted-foreground mt-1">{insight.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getImpactColor(insight.impact)}>
                                {insight.impact} impact
                              </Badge>
                              <Badge variant="outline">
                                {insight.confidence}% confidence
                              </Badge>
                              <Badge className="bg-purple-100 text-purple-700">
                                {insight.category}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="h-4 w-4 text-blue-500" />
                              <span className="font-medium text-sm">AI Recommendation</span>
                            </div>
                            <p className="text-sm mb-3">{insight.recommendation}</p>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Action Items:</h4>
                              <ul className="space-y-1">
                                {insight.actionItems.map((item, idx) => (
                                  <li key={idx} className="text-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Target className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-xs text-green-700 dark:text-green-300">Expected Outcome</span>
                              </div>
                              <p className="text-xs text-green-600 dark:text-green-400">{insight.expectedOutcome}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Confidence Level:</span>
                            <Progress value={insight.confidence} className="flex-1 h-2" />
                            <span className="text-sm font-medium">{insight.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Enhanced Performance Charts with AI Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Learning Progress with AI Predictions
                    </CardTitle>
                    <CardDescription>Real-time performance with ML forecasting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="completionRate" 
                          fill="url(#colorCompletion)" 
                          stroke="#3B82F6"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="predictedScore" 
                          stroke="#8B5CF6" 
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        <defs>
                          <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      Multi-Dimensional Analysis
                    </CardTitle>
                    <CardDescription>Engagement, retention, and performance correlation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="engagement" stroke="#6b7280" />
                        <YAxis dataKey="retention" stroke="#6b7280" />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value, name) => [value, name]}
                        />
                        <Scatter 
                          dataKey="quizScore" 
                          fill="url(#scatterGradient)"
                        />
                        <defs>
                          <linearGradient id="scatterGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                          </linearGradient>
                        </defs>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* AI-Powered Engagement Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    AI-Enhanced Engagement Heatmap
                  </CardTitle>
                  <CardDescription>Machine learning analysis of learning patterns and optimal engagement windows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-24 gap-1">
                      {Array.from({ length: 7 }, (_, day) => (
                        Array.from({ length: 24 }, (_, hour) => {
                          const intensity = Math.sin((day * 24 + hour) / 10) * 0.5 + 0.5;
                          const isOptimal = (hour >= 10 && hour <= 11) || (hour >= 14 && hour <= 16);
                          return (
                            <motion.div
                              key={`${day}-${hour}`}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 + (day * 24 + hour) * 0.003 }}
                              className={`aspect-square rounded-sm transition-all duration-200 hover:scale-125 cursor-pointer ${
                                isOptimal 
                                  ? 'bg-gradient-to-br from-green-400 to-green-600 ring-2 ring-green-300'
                                  : intensity > 0.7 ? 'bg-blue-500' :
                                    intensity > 0.4 ? 'bg-blue-300' :
                                    intensity > 0.2 ? 'bg-blue-100' :
                                    'bg-gray-100 dark:bg-gray-700'
                              }`}
                              title={`${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day]} ${hour}:00 - Engagement: ${Math.round(intensity * 100)}%${isOptimal ? ' (Optimal)' : ''}`}
                            />
                          );
                        })
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>00:00</span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded" />
                          <span>Low activity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-300 rounded" />
                          <span>Medium activity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded" />
                          <span>High activity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 rounded" />
                          <span>AI Optimal</span>
                        </div>
                      </div>
                      <span>23:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="learning-paths" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {learningPaths.map((path, index) => (
                <motion.div
                  key={path.studentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            {path.studentName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{path.studentName}</h3>
                          <p className="text-sm text-muted-foreground">{path.currentLevel}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-700">
                            {path.learningStyle} learner
                          </Badge>
                          <Badge variant="outline">
                            {path.estimatedCompletion}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            Target Skills
                          </h4>
                          <div className="space-y-1">
                            {path.targetSkills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="mr-1">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Route className="h-4 w-4 text-blue-500" />
                            Recommended Path
                          </h4>
                          <div className="space-y-1">
                            {path.recommendedCourses.map((course, idx) => (
                              <div key={idx} className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-2">
                                <span className="w-4 h-4 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                {course}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            AI Preferences
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Difficulty:</span>
                              <span className="font-medium">{path.preferences.difficulty}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pace:</span>
                              <span className="font-medium">{path.preferences.pace}</span>
                            </div>
                            <div className="text-sm">
                              <span>Preferred formats:</span>
                              <div className="mt-1">
                                {path.preferences.format.map((format, idx) => (
                                  <Badge key={idx} variant="secondary" className="mr-1 text-xs">
                                    {format}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {skillGaps.map((gap, index) => (
                <motion.div
                  key={gap.skill}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(gap.priority)}`} />
                          <h3 className="font-semibold text-lg">{gap.skill}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getImpactColor(gap.priority)}>
                            {gap.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {gap.estimatedTime}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current Level</span>
                            <span className="font-medium">{gap.currentLevel}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Target Level</span>
                            <span className="font-medium">{gap.targetLevel}%</span>
                          </div>
                          <div className="space-y-1">
                            <Progress value={gap.currentLevel} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Current</span>
                              <span className="font-medium text-red-600">Gap: {gap.gap}%</span>
                              <span>Target</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            Suggested Learning Path
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {gap.suggestedCourses.map((course, idx) => (
                              <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                {course}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {courseAnalytics.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{course.courseName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {course.enrollments.toLocaleString()} students enrolled • {course.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            course.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                            course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {course.difficulty}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700">
                            ⭐ {course.averageRating}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">{course.completionRate}%</span>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                            <Progress value={course.completionRate} className="h-2" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Dropout Rate</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">{course.dropoffRate}%</span>
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            </div>
                            <Progress value={course.dropoffRate} className="h-2" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-lg font-semibold">{course.timeToComplete}w</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Performance</p>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              course.completionRate >= 80 ? 'bg-green-500' :
                              course.completionRate >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <span className="text-sm font-medium">
                              {course.completionRate >= 80 ? 'Excellent' :
                               course.completionRate >= 60 ? 'Good' : 'Needs Attention'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-500" />
                          AI Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {course.aiRecommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                              {rec}
                            </li>
                          ))}
                        </ul>

                        {course.learningPath && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <h5 className="font-medium text-sm mb-2">Prerequisites</h5>
                              <div className="space-y-1">
                                {course.learningPath.prerequisite.map((prereq, idx) => (
                                  <Badge key={idx} variant="outline" className="mr-1 text-xs">
                                    {prereq}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium text-sm mb-2">Next Suggested</h5>
                              <div className="space-y-1">
                                {course.learningPath.nextSuggested.map((next, idx) => (
                                  <Badge key={idx} variant="secondary" className="mr-1 text-xs">
                                    {next}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}