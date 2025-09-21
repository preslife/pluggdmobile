import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Crown,
  MessageCircle,
  CheckSquare,
  Check,
  Radio,
  Plus,
  Music,
  Upload,
  Users,
  BarChart3,
  Clock,
  Eye,
  PlayCircle,
  HeadphonesIcon,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EarningsSparkline } from "./widgets/EarningsSparkline";
import { TicketsSoldWidget } from "./widgets/TicketsSoldWidget";
import { InvitesWidget } from "./widgets/InvitesWidget";

interface DashboardStats {
  todayEarnings: number;
  todayEarningsChange: number;
  todaySales: number;
  todaySalesChange: number;
  totalProducts: number;
  activeTickets: number;
  memberships: number;
  messages: number;
  tasksCompleted: number;
  upcomingLive: number;
}

interface SalesBreakdown {
  category: string;
  sales: number;
  earnings: number;
  icon: React.ElementType;
  color: string;
}

interface TopProduct {
  id: string;
  title: string;
  type: 'beat' | 'pack' | 'release' | 'course';
  earnings: number;
  sales: number;
  cover?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  category: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  variant?: "default" | "secondary";
}

export const CreatorStudioDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayEarnings: 0,
    todayEarningsChange: 0,
    todaySales: 0,
    todaySalesChange: 0,
    totalProducts: 0,
    activeTickets: 0,
    memberships: 0,
    messages: 0,
    tasksCompleted: 0,
    upcomingLive: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [earningsData, setEarningsData] = useState<Array<{ day: string; earnings: number }>>([]);
  const [earningsPeriod, setEarningsPeriod] = useState<'7d' | '30d'>('30d');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdown[]>([]);

  // Sample sparkline data (in a real app, this would come from your analytics)
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      generateSampleEarningsData();
    }
  }, [user]);

  useEffect(() => {
    generateSampleEarningsData();
  }, [earningsPeriod]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch sample packs for stats
      const { data: packs, error: packsError } = await supabase
        .from('sample_packs')
        .select('*')
        .eq('user_id', user.id);

      if (packsError) throw packsError;

      // Calculate stats (mock data for demonstration)
      const mockStats: DashboardStats = {
        todayEarnings: 247.50,
        todayEarningsChange: 12.5,
        todaySales: 8,
        todaySalesChange: -2.1,
        totalProducts: packs?.length || 0,
        activeTickets: 3,
        memberships: 42,
        messages: 7,
        tasksCompleted: 85,
        upcomingLive: 2,
      };

      setStats(mockStats);

      // Mock top products with enhanced data
      const mockTopProducts: TopProduct[] = [
        {
          id: '1',
          title: 'Trap Essentials Vol. 3',
          type: 'pack',
          earnings: 389.50,
          sales: 42,
        },
        {
          id: '2',
          title: 'Dark Melody Beat',
          type: 'beat',
          earnings: 245.00,
          sales: 18,
        },
        {
          id: '3',
          title: 'Producer Masterclass',
          type: 'course',
          earnings: 599.00,
          sales: 3,
        },
        {
          id: '4',
          title: 'Lo-Fi Vibes Collection',
          type: 'pack',
          earnings: 156.75,
          sales: 12,
        },
        {
          id: '5',
          title: 'Hip-Hop Fundamentals',
          type: 'course',
          earnings: 299.99,
          sales: 1,
        },
      ];

      setTopProducts(mockTopProducts);

      // Mock tasks data
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Upload new track artwork',
          description: 'Create and upload artwork for "Dark Melody Beat"',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          category: 'Production'
        },
        {
          id: '2',
          title: 'Respond to customer inquiries',
          description: 'Reply to 3 pending messages about licensing',
          priority: 'medium',
          status: 'in_progress',
          category: 'Customer Service'
        },
        {
          id: '3',
          title: 'Finalize remix contest rules',
          description: 'Draft and publish contest guidelines',
          priority: 'low',
          status: 'pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          category: 'Marketing'
        },
        {
          id: '4',
          title: 'Update producer profile',
          description: 'Add new bio and update portfolio links',
          priority: 'medium',
          status: 'completed',
          category: 'Profile'
        }
      ];

      setTasks(mockTasks);

      // Mock sales breakdown data
      const mockSalesBreakdown: SalesBreakdown[] = [
        {
          category: 'Beats',
          sales: 3,
          earnings: 89.50,
          icon: HeadphonesIcon,
          color: 'bg-blue-500'
        },
        {
          category: 'Sample Packs',
          sales: 2,
          earnings: 78.00,
          icon: Package,
          color: 'bg-purple-500'
        },
        {
          category: 'Courses',
          sales: 1,
          earnings: 49.99,
          icon: CheckSquare,
          color: 'bg-green-500'
        },
        {
          category: 'Live Sessions',
          sales: 2,
          earnings: 30.01,
          icon: Radio,
          color: 'bg-orange-500'
        }
      ];

      setSalesBreakdown(mockSalesBreakdown);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSampleEarningsData = () => {
    const data = [];
    const baseEarnings = 150;
    const days = earningsPeriod === '7d' ? 7 : 30;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = Math.random() * 100 - 50; // Random variance
      const formatOptions = earningsPeriod === '7d' 
        ? { weekday: 'short' as const } 
        : { month: 'short' as const, day: 'numeric' as const };
      
      data.push({
        day: date.toLocaleDateString('en-US', formatOptions),
        earnings: Math.max(0, baseEarnings + variance),
      });
    }
    
    setEarningsData(data);
  };

  const quickActions: QuickAction[] = [
    {
      title: "Upload Beat",
      description: "Add a new beat to your catalog",
      icon: Music,
      action: () => navigate("/producer"),
    },
    {
      title: "Upload Sample Pack",
      description: "Create a new sample pack",
      icon: Package,
      action: () => navigate("/sample-pack/upload"),
    },
    {
      title: "Create Release",
      description: "Build and distribute a release",
      icon: Upload,
      action: () => navigate("/release/new"),
    },
    {
      title: "Schedule Live Session",
      description: "Plan your next live performance",
      icon: Radio,
      action: () => navigate("/studio/live/sessions"),
    },
    {
      title: "Create Course",
      description: "Build an educational course",
      icon: CheckSquare,
      action: () => navigate("/studio/courses/builder"),
    },
    {
      title: "New Campaign",
      description: "Start a crowdfunding campaign",
      icon: DollarSign,
      action: () => navigate("/studio/crowdfunding/campaigns"),
      variant: "secondary" as const,
    },
  ];

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'beat':
        return HeadphonesIcon;
      case 'pack':
        return Package;
      case 'release':
        return Music;
      case 'course':
        return CheckSquare;
      default:
        return Music;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'completed' ? 'pending' : 
                         task.status === 'pending' ? 'in_progress' : 'completed';
        return { ...task, status: newStatus };
      }
      return task;
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Studio Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your content.
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Quick Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {quickActions.slice(0, 3).map((action, index) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem key={index} onClick={action.action}>
                    <Icon className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              {quickActions.slice(3).map((action, index) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem key={index + 3} onClick={action.action}>
                    <Icon className="w-4 h-4 mr-2" />
                    <div>
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => navigate("/studio/analytics")}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todayEarnings.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.todayEarningsChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500 mr-1" />
              )}
              <span className={stats.todayEarningsChange >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(stats.todayEarningsChange)}%
              </span>
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySales}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.todaySalesChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500 mr-1" />
              )}
              <span className={stats.todaySalesChange >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(stats.todaySalesChange)}%
              </span>
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memberships}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-500">+6</span>
              <span className="ml-1">this week</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Growth target</span>
                <span>84%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Widgets Row - Per Spec Requirements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <EarningsSparkline />
        <TicketsSoldWidget />
        <InvitesWidget />
      </div>

      {/* Today's Sales Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Sales Breakdown</CardTitle>
          <CardDescription>Detailed view of today's performance by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {salesBreakdown.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg border">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}/10`}>
                    <Icon className={`h-5 w-5 ${item.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{item.category}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.sales} sales</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">${item.earnings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Today</span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {salesBreakdown.reduce((sum, item) => sum + item.sales, 0)} sales
                </span>
                <span className="text-lg font-bold">
                  ${salesBreakdown.reduce((sum, item) => sum + item.earnings, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Your earnings over the last {earningsPeriod === '7d' ? '7 days' : '30 days'}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={earningsPeriod === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEarningsPeriod('7d')}
                >
                  7D
                </Button>
                <Button
                  variant={earningsPeriod === '30d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEarningsPeriod('30d')}
                >
                  30D
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1 p-4">
              {earningsData.map((point, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center"
                  title={`${point.day}: $${point.earnings.toFixed(2)}`}
                >
                  <div
                    className="w-full bg-primary/20 rounded-t"
                    style={{
                      height: `${Math.max((point.earnings / 250) * 200, 4)}px`,
                      backgroundColor: index === earningsData.length - 1 ? 'hsl(var(--primary))' : undefined,
                    }}
                  />
                  {index % 5 === 0 && (
                    <span className="text-xs text-muted-foreground mt-2 rotate-45 origin-left">
                      {point.day}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Live Tickets</span>
              </div>
              <Badge variant="secondary">{stats.activeTickets}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  {stats.messages > 0 && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-sm">Unread Messages</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={stats.messages > 0 ? "destructive" : "secondary"}>
                  {stats.messages}
                </Badge>
                {stats.messages > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/studio/messages")}>
                    <Eye className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Tasks Complete</span>
              </div>
              <Badge variant="default">{stats.tasksCompleted}%</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Upcoming Live</span>
              </div>
              <Badge variant="secondary">{stats.upcomingLive}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Your best sellers this month</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((product, index) => {
                const Icon = getProductIcon(product.type);
                const avgPerSale = product.earnings / product.sales;
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{product.type}</span>
                          <span>•</span>
                          <span>{product.sales} sales</span>
                          <span>•</span>
                          <span>${avgPerSale.toFixed(2)} avg</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">${product.earnings.toFixed(2)}</div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {topProducts.length > 5 && (
              <div className="mt-4 pt-3 border-t">
                <Button variant="ghost" className="w-full text-sm">
                  View all {topProducts.length} products
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Management */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks & To-Do</CardTitle>
            <CardDescription>Manage your creator workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`mt-0.5 h-5 w-5 rounded-full p-0 ${
                      task.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : 'border-2'
                    }`}
                    onClick={() => toggleTaskStatus(task.id)}
                  >
                    {task.status === 'completed' && <Check className="h-3 w-3 text-white" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h4>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{task.category}</span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {task.dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length > 4 && (
                <Button variant="ghost" className="w-full text-sm">
                  View all tasks ({tasks.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};