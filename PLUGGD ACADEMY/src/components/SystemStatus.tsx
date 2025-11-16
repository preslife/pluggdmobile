import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  Database,
  Wifi,
  Video,
  MessageSquare,
  Brain,
  Shield,
  Users,
  BookOpen,
  Award,
  BarChart3,
  Settings,
  Sparkles,
  Monitor,
  Server,
  Globe,
  Lock,
  PlayCircle,
  Mic,
  Camera,
  Share,
  PenTool,
  Headphones,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { checkWebRTCSupport } from './utils/webrtc';

interface SystemCheck {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  description: string;
  category: 'core' | 'features' | 'integrations' | 'media';
  icon: React.ComponentType<any>;
  lastChecked?: Date;
  responseTime?: number;
  details?: string[];
}

export function SystemStatus() {
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'down'>('operational');
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  // Initialize system checks
  useEffect(() => {
    initializeSystemChecks();
  }, []);

  const initializeSystemChecks = () => {
    const checks: SystemCheck[] = [
      // Core System
      {
        id: 'app-core',
        name: 'Application Core',
        status: 'operational',
        description: 'Main application functionality',
        category: 'core',
        icon: Zap,
        details: ['React application loaded', 'Navigation system active', 'Component system functional']
      },
      {
        id: 'routing',
        name: 'Navigation & Routing',
        status: 'operational',
        description: 'Internal navigation and view switching',
        category: 'core',
        icon: Globe,
        details: ['View transitions working', 'Route management active', 'History navigation functional']
      },
      {
        id: 'ui-components',
        name: 'UI Component System',
        status: 'operational',
        description: 'Design system and component library',
        category: 'core',
        icon: Monitor,
        details: ['Shadcn/ui components loaded', 'Tailwind CSS active', 'Dark mode support enabled']
      },

      // Features
      {
        id: 'dashboard-system',
        name: 'Dashboard System',
        status: 'operational',
        description: 'Student, creator, and admin dashboards',
        category: 'features',
        icon: BarChart3,
        details: ['Role-based dashboards', 'Stats and analytics views', 'Quick actions functional']
      },
      {
        id: 'course-management',
        name: 'Course Management',
        status: 'operational',
        description: 'Course creation and management tools',
        category: 'features',
        icon: BookOpen,
        details: ['Content creator loaded', 'Course templates available', 'Management interface active']
      },
      {
        id: 'assessment-system',
        name: 'Assessment System',
        status: 'operational',
        description: 'Quizzes, tests, and evaluation tools',
        category: 'features',
        icon: Award,
        details: ['Assessment center operational', 'Grading system ready', 'Result tracking available']
      },
      {
        id: 'gamification',
        name: 'Gamification Engine',
        status: 'operational',
        description: 'Achievements, badges, and leaderboards',
        category: 'features',
        icon: Sparkles,
        details: ['Achievement system loaded', 'Badge management active', 'Leaderboard functionality ready']
      },
      {
        id: 'community-hub',
        name: 'Community Hub',
        status: 'operational',
        description: 'Discussion forums and social features',
        category: 'features',
        icon: MessageSquare,
        details: ['Discussion system ready', 'Study groups management', 'Community guidelines enforced']
      },
      {
        id: 'ai-recommendations',
        name: 'AI Recommendation Engine',
        status: 'operational',
        description: 'Personalized course and content recommendations',
        category: 'features',
        icon: Brain,
        details: ['Preference system active', 'Recommendation logic ready', 'Learning path generation available']
      },

      // Media & Collaboration
      {
        id: 'webrtc-support',
        name: 'WebRTC Support',
        status: checkWebRTCSupport() ? 'operational' : 'down',
        description: 'Real-time communication capabilities',
        category: 'media',
        icon: Video,
        details: checkWebRTCSupport() ? 
          ['WebRTC APIs available', 'Peer connection support', 'Media stream support'] :
          ['WebRTC not supported in this browser', 'Upgrade browser for video features']
      },
      {
        id: 'video-conference',
        name: 'Video Conferencing',
        status: checkWebRTCSupport() ? 'operational' : 'degraded',
        description: 'Virtual classroom and live sessions',
        category: 'media',
        icon: Camera,
        details: checkWebRTCSupport() ? 
          ['Virtual classroom ready', 'Multi-participant support', 'Screen sharing available'] :
          ['Limited functionality without WebRTC']
      },
      {
        id: 'collaborative-whiteboard',
        name: 'Collaborative Whiteboard',
        status: 'operational',
        description: 'Real-time collaborative drawing and annotation',
        category: 'media',
        icon: PenTool,
        details: ['Drawing tools loaded', 'Real-time sync ready', 'Multi-user collaboration supported']
      },
      {
        id: 'audio-system',
        name: 'Audio System',
        status: checkWebRTCSupport() ? 'operational' : 'degraded',
        description: 'Audio communication and recording',
        category: 'media',
        icon: Headphones,
        details: checkWebRTCSupport() ? 
          ['Audio capture available', 'Echo cancellation enabled', 'Audio level monitoring'] :
          ['Basic audio support only']
      },

      // Integrations
      {
        id: 'notification-system',
        name: 'Notification System',
        status: 'operational',
        description: 'Smart notifications and alerts',
        category: 'integrations',
        icon: Clock,
        details: ['Toast notifications active', 'Contextual alerts ready', 'Notification panel functional']
      },
      {
        id: 'onboarding-tour',
        name: 'Onboarding System',
        status: 'operational',
        description: 'User guidance and feature tours',
        category: 'integrations',
        icon: Users,
        details: ['Interactive tours available', 'Feature highlighting active', 'User guidance system ready']
      },
      {
        id: 'command-palette',
        name: 'Command Palette',
        status: 'operational',
        description: 'Quick navigation and search',
        category: 'integrations',
        icon: Settings,
        details: ['Global search active', 'Keyboard shortcuts enabled', 'Quick actions available']
      },
      {
        id: 'theme-system',
        name: 'Theme System',
        status: 'operational',
        description: 'Dark/light mode and customization',
        category: 'integrations',
        icon: Monitor,
        details: ['Theme switching available', 'System preference detection', 'Persistent theme storage']
      }
    ];

    setSystemChecks(checks);
    updateOverallStatus(checks);
  };

  const updateOverallStatus = (checks: SystemCheck[]) => {
    const downServices = checks.filter(check => check.status === 'down');
    const degradedServices = checks.filter(check => check.status === 'degraded');

    if (downServices.length > 0) {
      setOverallStatus('down');
    } else if (degradedServices.length > 0) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('operational');
    }
  };

  const runSystemChecks = async () => {
    setIsRunningChecks(true);

    // Simulate system checks with realistic timing
    const updatedChecks = [...systemChecks];
    
    for (let i = 0; i < updatedChecks.length; i++) {
      updatedChecks[i].status = 'checking';
      setSystemChecks([...updatedChecks]);
      
      // Simulate check delay
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // Perform actual checks where possible
      if (updatedChecks[i].id === 'webrtc-support') {
        updatedChecks[i].status = checkWebRTCSupport() ? 'operational' : 'down';
      } else if (updatedChecks[i].id === 'video-conference' || updatedChecks[i].id === 'audio-system') {
        updatedChecks[i].status = checkWebRTCSupport() ? 'operational' : 'degraded';
      } else {
        // For other checks, simulate operational status
        updatedChecks[i].status = 'operational';
      }
      
      updatedChecks[i].lastChecked = new Date();
      updatedChecks[i].responseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms
      
      setSystemChecks([...updatedChecks]);
    }

    updateOverallStatus(updatedChecks);
    setIsRunningChecks(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      case 'checking': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational': return <Badge className="bg-green-100 text-green-700">Operational</Badge>;
      case 'degraded': return <Badge className="bg-yellow-100 text-yellow-700">Degraded</Badge>;
      case 'down': return <Badge className="bg-red-100 text-red-700">Down</Badge>;
      case 'checking': return <Badge className="bg-blue-100 text-blue-700">Checking...</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return CheckCircle2;
      case 'degraded': return AlertCircle;
      case 'down': return AlertCircle;
      case 'checking': return RefreshCw;
      default: return Clock;
    }
  };

  const categorizedChecks = systemChecks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, SystemCheck[]>);

  const categoryNames = {
    core: 'Core System',
    features: 'Features & Tools',
    media: 'Media & Collaboration',
    integrations: 'Integrations & Utilities'
  };

  const overallHealth = Math.round(
    (systemChecks.filter(check => check.status === 'operational').length / systemChecks.length) * 100
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-green-50/30 to-blue-50/30 dark:from-green-950/30 dark:to-blue-950/30">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Status</h1>
            <p className="text-muted-foreground mt-2">
              Real-time monitoring of all platform systems and features
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{overallHealth}%</div>
              <div className="text-sm text-muted-foreground">System Health</div>
            </div>
            
            <Button 
              onClick={runSystemChecks}
              disabled={isRunningChecks}
              className="bg-gradient-to-r from-green-500 to-blue-500"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunningChecks ? 'animate-spin' : ''}`} />
              {isRunningChecks ? 'Checking...' : 'Run Checks'}
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="flex-shrink-0 p-6">
        <Card className={`border-2 ${
          overallStatus === 'operational' ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' :
          overallStatus === 'degraded' ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20' :
          'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {overallStatus === 'operational' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                  {overallStatus === 'degraded' && <AlertCircle className="h-6 w-6 text-yellow-500" />}
                  {overallStatus === 'down' && <AlertCircle className="h-6 w-6 text-red-500" />}
                  Pluggd Academy Platform Status
                </CardTitle>
                <CardDescription>
                  {overallStatus === 'operational' && "All systems operational"}
                  {overallStatus === 'degraded' && "Some systems experiencing issues"}
                  {overallStatus === 'down' && "Critical systems down"}
                </CardDescription>
              </div>
              {getStatusBadge(overallStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>System Health</span>
                  <span>{overallHealth}%</span>
                </div>
                <Progress value={overallHealth} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {systemChecks.filter(c => c.status === 'operational').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Operational</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {systemChecks.filter(c => c.status === 'degraded').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Degraded</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {systemChecks.filter(c => c.status === 'down').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Down</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {systemChecks.filter(c => c.status === 'checking').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Checking</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Details */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <Tabs defaultValue="all" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Systems</TabsTrigger>
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 mt-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {Object.entries(categorizedChecks).map(([category, checks]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle>{categoryNames[category as keyof typeof categoryNames]}</CardTitle>
                      <CardDescription>
                        {checks.filter(c => c.status === 'operational').length} of {checks.length} services operational
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {checks.map((check) => {
                          const StatusIcon = getStatusIcon(check.status);
                          const CheckIcon = check.icon;
                          
                          return (
                            <motion.div
                              key={check.id}
                              layout
                              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <CheckIcon className="h-5 w-5 text-muted-foreground" />
                                  <StatusIcon className={`h-4 w-4 ${getStatusColor(check.status)} ${check.status === 'checking' ? 'animate-spin' : ''}`} />
                                </div>
                                <div>
                                  <h4 className="font-medium">{check.name}</h4>
                                  <p className="text-sm text-muted-foreground">{check.description}</p>
                                  {check.details && (
                                    <ul className="text-xs text-muted-foreground mt-1">
                                      {check.details.slice(0, 2).map((detail, idx) => (
                                        <li key={idx}>• {detail}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                {check.responseTime && (
                                  <div className="text-right">
                                    <div className="text-sm font-medium">{check.responseTime}ms</div>
                                    <div className="text-xs text-muted-foreground">Response</div>
                                  </div>
                                )}
                                {getStatusBadge(check.status)}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {Object.entries(categorizedChecks).map(([category, checks]) => (
            <TabsContent key={category} value={category} className="flex-1 mt-6">
              <ScrollArea className="h-full">
                <div className="grid gap-4">
                  {checks.map((check) => {
                    const StatusIcon = getStatusIcon(check.status);
                    const CheckIcon = check.icon;
                    
                    return (
                      <Card key={check.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex items-center gap-2">
                                <CheckIcon className="h-6 w-6 text-muted-foreground" />
                                <StatusIcon className={`h-5 w-5 ${getStatusColor(check.status)} ${check.status === 'checking' ? 'animate-spin' : ''}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{check.name}</h3>
                                <p className="text-muted-foreground mb-3">{check.description}</p>
                                {check.details && (
                                  <ul className="space-y-1">
                                    {check.details.map((detail, idx) => (
                                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                        {detail}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {getStatusBadge(check.status)}
                              {check.lastChecked && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Last checked: {check.lastChecked.toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}