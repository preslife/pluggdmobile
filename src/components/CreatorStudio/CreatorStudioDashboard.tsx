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
  CheckSquare,
  Check,
  Radio,
  Plus,
  Music,
  Upload,
  Users,
  BarChart3,
  Clock,
  PlayCircle,
  HeadphonesIcon,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Store,
  CreditCard,
  UserPlus,
  Gift,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EarningsSparkline } from "./widgets/EarningsSparkline";
import { TicketsSoldWidget } from "./widgets/TicketsSoldWidget";
import { InvitesWidget } from "./widgets/InvitesWidget";
import { useStudioContext } from "@/contexts/StudioContext";
import type { LabelMembership } from "@/hooks/useLabelMemberships";

interface DashboardStats {
  todayEarnings: number;
  todayEarningsChange: number;
  todaySales: number;
  todaySalesChange: number;
  totalProducts: number;
  liveSessions: number;
  uniqueCustomers: number;
}

interface SalesBreakdown {
  category: string;
  sales: number;
  earnings: number;
  icon: React.ElementType;
  bgClass: string;
  textClass: string;
}

interface TopProduct {
  id: string;
  title: string;
  type: 'beat' | 'pack' | 'release' | 'course' | 'store';
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
  const { mode, activeLabel } = useStudioContext();
  const isLabelWorkspace = mode === "label" && !!activeLabel;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayEarnings: 0,
    todayEarningsChange: 0,
    todaySales: 0,
    todaySalesChange: 0,
    totalProducts: 0,
    liveSessions: 0,
    uniqueCustomers: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [earningsData, setEarningsData] = useState<Array<{ day: string; earnings: number }>>([]);
  const [earningsHistory, setEarningsHistory] = useState<Record<string, number>>({});
  const [earningsPeriod, setEarningsPeriod] = useState<'7d' | '30d'>('30d');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdown[]>([]);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (isLabelWorkspace && activeLabel) {
      setLoading(false);
    }
  }, [isLabelWorkspace, activeLabel]);

  useEffect(() => {
    if (user && !isLabelWorkspace) {
      fetchDashboardData();
    }
  }, [user, isLabelWorkspace]);

  useEffect(() => {
    const days = earningsPeriod === '7d' ? 7 : 30;
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));

    const points: Array<{ day: string; earnings: number }> = [];

    for (let i = 0; i < days; i++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + i);
      const key = current.toISOString().split('T')[0];
      const value = parseFloat((earningsHistory[key] ?? 0).toFixed(2));
      points.push({ day: key, earnings: value });
    }

    setEarningsData(points);
  }, [earningsPeriod, earningsHistory]);

  // Early return for label workspace - AFTER all hooks
  if (isLabelWorkspace && activeLabel) {
    return <LabelWorkspaceDashboard label={activeLabel} navigate={navigate} />;
  }

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch sample packs for stats
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const startOf30Days = new Date(startOfToday);
      startOf30Days.setDate(startOf30Days.getDate() - 29);

      const [{ count: beatsCount, error: beatsError },
        { count: packsCount, error: packsError },
        { count: releasesCount, error: releasesError },
        { count: sessionsCount, error: sessionsError },
        { data: orderItems, error: orderItemsError }] = await Promise.all([
        supabase.from('beats').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('sample_packs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('releases').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('session_rooms')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', user.id)
          .not('status', 'eq', 'ended'),
        supabase
          .from('order_items')
          .select('price, quantity, created_at, kind, product_id, order_id')
          .eq('creator_id', user.id)
          .gte('created_at', startOf30Days.toISOString()),
      ]);

      if (beatsError) throw beatsError;
      if (packsError) throw packsError;
      if (releasesError) throw releasesError;
      if (sessionsError) throw sessionsError;
      if (orderItemsError) throw orderItemsError;

      const earningsByDay: Record<string, number> = {};
      const salesByDay: Record<string, number> = {};
      const salesBreakdownMap = new Map<string, { sales: number; earnings: number }>();
      const productAggregates = new Map<string, { kind: string; productId: string; sales: number; earnings: number }>();
      const orderIds = new Set<string>();

      orderItems?.forEach((item) => {
        const createdAt = item.created_at ? new Date(item.created_at) : null;
        if (!createdAt) return;

        const dayKey = createdAt.toISOString().split('T')[0];
        const amount = (item.price ?? 0) * (item.quantity ?? 1);
        const salesCount = item.quantity ?? 1;

        earningsByDay[dayKey] = (earningsByDay[dayKey] ?? 0) + amount;
        salesByDay[dayKey] = (salesByDay[dayKey] ?? 0) + salesCount;

        if (dayKey === startOfToday.toISOString().split('T')[0]) {
          const kindKey = item.kind ?? 'other';
          const entry = salesBreakdownMap.get(kindKey) ?? { sales: 0, earnings: 0 };
          entry.sales += salesCount;
          entry.earnings += amount;
          salesBreakdownMap.set(kindKey, entry);
        }

        if (item.product_id) {
          const aggregateKey = `${item.kind ?? 'other'}::${item.product_id}`;
          const aggregate = productAggregates.get(aggregateKey) ?? {
            kind: item.kind ?? 'other',
            productId: item.product_id,
            sales: 0,
            earnings: 0,
          };
          aggregate.sales += salesCount;
          aggregate.earnings += amount;
          productAggregates.set(aggregateKey, aggregate);
        }

        if (item.order_id) {
          orderIds.add(item.order_id);
        }
      });

      const todayKey = startOfToday.toISOString().split('T')[0];
      const yesterdayKey = startOfYesterday.toISOString().split('T')[0];

      const todayEarnings = earningsByDay[todayKey] ?? 0;
      const yesterdayEarnings = earningsByDay[yesterdayKey] ?? 0;
      const todaySales = salesByDay[todayKey] ?? 0;
      const yesterdaySales = salesByDay[yesterdayKey] ?? 0;

      const todayEarningsChange = yesterdayEarnings > 0
        ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 100
        : 0;

      const todaySalesChange = yesterdaySales > 0
        ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
        : 0;

      let uniqueCustomers = 0;
      if (orderIds.size > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, user_id')
          .in('id', Array.from(orderIds));

        if (ordersError) throw ordersError;
        const customers = new Set<string>();
        ordersData?.forEach((order) => {
          if (order.user_id) {
            customers.add(order.user_id);
          }
        });
        uniqueCustomers = customers.size;
      }

      const totalProducts = (beatsCount ?? 0) + (packsCount ?? 0) + (releasesCount ?? 0);

      setStats({
        todayEarnings,
        todayEarningsChange,
        todaySales,
        todaySalesChange,
        totalProducts,
        liveSessions: sessionsCount ?? 0,
        uniqueCustomers,
      });

      setEarningsHistory(earningsByDay);

      const breakdownMeta: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
        beat: { label: 'Beats', icon: HeadphonesIcon, bg: 'bg-blue-500/10', text: 'text-blue-600' },
        sample_pack: { label: 'Sample Packs', icon: Package, bg: 'bg-purple-500/10', text: 'text-purple-600' },
        release: { label: 'Releases', icon: Music, bg: 'bg-amber-500/10', text: 'text-amber-600' },
        physical: { label: 'Merchandise', icon: ShoppingBag, bg: 'bg-green-500/10', text: 'text-green-600' },
        store: { label: 'Store Products', icon: ShoppingBag, bg: 'bg-green-500/10', text: 'text-green-600' },
        other: { label: 'Other', icon: Zap, bg: 'bg-gray-500/10', text: 'text-gray-600' },
      };

      const salesBreakdownData: SalesBreakdown[] = Array.from(salesBreakdownMap.entries()).map(([kind, value]) => {
        const meta = breakdownMeta[kind] ?? breakdownMeta.other;
        return {
          category: meta.label,
          sales: value.sales,
          earnings: value.earnings,
          icon: meta.icon,
          bgClass: meta.bg,
          textClass: meta.text,
        };
      }).sort((a, b) => b.earnings - a.earnings);

      setSalesBreakdown(salesBreakdownData);

      const beatIds: string[] = [];
      const samplePackIds: string[] = [];
      const releaseIds: string[] = [];
      const storeProductIds: string[] = [];

      productAggregates.forEach((aggregate) => {
        switch (aggregate.kind) {
          case 'beat':
            beatIds.push(aggregate.productId);
            break;
          case 'sample_pack':
            samplePackIds.push(aggregate.productId);
            break;
          case 'release':
            releaseIds.push(aggregate.productId);
            break;
          default:
            storeProductIds.push(aggregate.productId);
            break;
        }
      });

      const uniqueBeatIds = Array.from(new Set(beatIds));
      const uniqueSamplePackIds = Array.from(new Set(samplePackIds));
      const uniqueReleaseIds = Array.from(new Set(releaseIds));
      const uniqueStoreProductIds = Array.from(new Set(storeProductIds));

      const [beatDetails, samplePackDetails, releaseDetails, storeDetails] = await Promise.all([
        uniqueBeatIds.length
          ? supabase.from('beats').select('id, title, image_url').in('id', uniqueBeatIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        uniqueSamplePackIds.length
          ? supabase.from('sample_packs').select('id, title, cover_art_url').in('id', uniqueSamplePackIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        uniqueReleaseIds.length
          ? supabase.from('releases').select('id, title, cover_art_url').in('id', uniqueReleaseIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        uniqueStoreProductIds.length
          ? supabase.from('store_products').select('id, title, image_url').in('id', uniqueStoreProductIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      if (beatDetails.error) throw beatDetails.error;
      if (samplePackDetails.error) throw samplePackDetails.error;
      if (releaseDetails.error) throw releaseDetails.error;
      if (storeDetails.error) throw storeDetails.error;

      const beatMap = new Map<string, { title: string; cover?: string }>();
      beatDetails.data?.forEach((item: any) => beatMap.set(item.id, { title: item.title, cover: item.image_url }));

      const packMap = new Map<string, { title: string; cover?: string }>();
      samplePackDetails.data?.forEach((item: any) => packMap.set(item.id, { title: item.title, cover: item.cover_art_url }));

      const releaseMap = new Map<string, { title: string; cover?: string }>();
      releaseDetails.data?.forEach((item: any) => releaseMap.set(item.id, { title: item.title, cover: item.cover_art_url }));

      const storeMap = new Map<string, { title: string; cover?: string }>();
      storeDetails.data?.forEach((item: any) => storeMap.set(item.id, { title: item.title, cover: item.image_url }));

      const resolvedTopProducts: TopProduct[] = Array.from(productAggregates.values())
        .map((aggregate) => {
          let details: { title: string; cover?: string } | undefined;
          let type: TopProduct['type'] = 'beat';

          switch (aggregate.kind) {
            case 'beat':
              details = beatMap.get(aggregate.productId);
              type = 'beat';
              break;
            case 'sample_pack':
              details = packMap.get(aggregate.productId);
              type = 'pack';
              break;
          case 'release':
            details = releaseMap.get(aggregate.productId);
            type = 'release';
            break;
          default:
            details = storeMap.get(aggregate.productId);
            type = 'store';
            break;
        }

          return {
            id: aggregate.productId,
            title: details?.title ?? 'Untitled',
            type,
            earnings: aggregate.earnings,
            sales: aggregate.sales,
            cover: details?.cover,
          };
        })
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      setTopProducts(resolvedTopProducts);

      const derivedTasks: Task[] = [];

      if ((beatsCount ?? 0) === 0) {
        derivedTasks.push({
          id: 'task-upload-beat',
          title: 'Upload your first beat',
          description: 'Add a beat to start selling instantly.',
          priority: 'high',
          status: 'pending',
          category: 'Catalog',
        });
      }

      if ((packsCount ?? 0) === 0) {
        derivedTasks.push({
          id: 'task-upload-pack',
          title: 'Create a sample pack',
          description: 'Bundle your sounds into a sellable pack.',
          priority: 'medium',
          status: 'pending',
          category: 'Catalog',
        });
      }

      if (todaySales > 0) {
        derivedTasks.push({
          id: 'task-follow-up',
          title: 'Thank new customers',
          description: 'Send download links or thank-you messages to today’s buyers.',
          priority: 'medium',
          status: 'pending',
          category: 'Customer Success',
        });
      }

      if ((sessionsCount ?? 0) === 0) {
        derivedTasks.push({
          id: 'task-live-session',
          title: 'Schedule a live session',
          description: 'Plan a stream to promote new products.',
          priority: 'low',
          status: 'pending',
          category: 'Engagement',
        });
      }

      setTasks(derivedTasks);
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
      title: "Create Merchandise",
      description: "Add physical merchandise to your store",
      icon: Gift,
      action: () => navigate("/studio/catalog/merchandise/new"),
    },
    {
      title: "Create Bundle",
      description: "Bundle multiple items together",
      icon: ShoppingBag,
      action: () => navigate("/studio/catalog/bundles/new"),
    },
    {
      title: "Create Collectible",
      description: "Create digital collectibles and NFTs",
      icon: Sparkles,
      action: () => navigate("/studio/catalog/collectibles/new"),
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
      case 'store':
        return ShoppingBag;
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
    <div className="space-y-6 ambient-bg">
      {/* Header - Premium Hero Style */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text">
            Creator Studio
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Here's your performance overview.
          </p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-500/40 hover:scale-[1.02]">
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

      {/* Key Metrics Cards - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Earnings Card - Primary Emphasis */}
        <Card className="metric-card metric-card--earnings relative overflow-hidden animate-fade-in-up stagger-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Earnings</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20">
              <DollarSign className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value stat-value--primary text-3xl font-bold tracking-tight">
              ${stats.todayEarnings.toFixed(2)}
            </div>
            <div className={`stat-change mt-2 ${stats.todayEarningsChange >= 0 ? 'stat-change--positive' : 'stat-change--negative'}`}>
              {stats.todayEarningsChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(stats.todayEarningsChange).toFixed(1)}% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* Sales Card */}
        <Card className="metric-card relative overflow-hidden animate-fade-in-up stagger-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/20">
              <ShoppingBag className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-3xl font-bold tracking-tight">{stats.todaySales}</div>
            <div className={`stat-change mt-2 ${stats.todaySalesChange >= 0 ? 'stat-change--positive' : 'stat-change--negative'}`}>
              {stats.todaySalesChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(stats.todaySalesChange).toFixed(1)}% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="metric-card relative overflow-hidden animate-fade-in-up stagger-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20">
              <Package className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-3xl font-bold tracking-tight">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active listings in catalog
            </p>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="metric-card relative overflow-hidden animate-fade-in-up stagger-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Customers</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value text-3xl font-bold tracking-tight">{stats.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Buyers this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Widgets Row - Per Spec Requirements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <EarningsSparkline />
        <TicketsSoldWidget />
        <InvitesWidget />
      </div>

      {/* Today's Sales Breakdown - Premium Design */}
      <Card className="studio-card overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Sales Breakdown</CardTitle>
              <CardDescription>Today's performance by category</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              <Clock className="w-3 h-3 mr-1" />
              Today
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {salesBreakdown.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {salesBreakdown.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={index} 
                      className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-border transition-all duration-300 hover:shadow-md"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bgClass} transition-transform group-hover:scale-110`}>
                        <Icon className={`h-5 w-5 ${item.textClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.category}</h4>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className="text-muted-foreground">{item.sales} sales</span>
                          <span className="font-semibold text-foreground">${item.earnings.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Today</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {salesBreakdown.reduce((sum, item) => sum + item.sales, 0)} sales
                    </span>
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                      ${salesBreakdown.reduce((sum, item) => sum + item.earnings, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mx-auto mb-3">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No sales today yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Sales will appear here as they come in</p>
            </div>
          )}
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
                <span className="text-sm">Active Live Sessions</span>
              </div>
              <Badge variant="secondary">{stats.liveSessions}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Unique Customers</span>
              </div>
              <Badge variant="secondary">{stats.uniqueCustomers}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Products Live</span>
              </div>
              <Badge variant="secondary">{stats.totalProducts}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Orders Today</span>
              </div>
              <Badge variant={stats.todaySales > 0 ? 'default' : 'secondary'}>{stats.todaySales}</Badge>
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

interface LabelWorkspaceDashboardProps {
  label: LabelMembership;
  navigate: ReturnType<typeof useNavigate>;
}

const LabelWorkspaceDashboard: React.FC<LabelWorkspaceDashboardProps> = ({ label, navigate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({
    team: 0,
    invites: 0,
    releases: 0,
    catalog: 0,
  });

  const labelQuickActions: QuickAction[] = [
    {
      title: "Manage roster",
      description: "Invite members and adjust roles",
      icon: Users,
      action: () => navigate(`/studio/label/${label.slug}/roster`),
    },
    {
      title: "Review catalog",
      description: "Check releases owned by the label",
      icon: Package,
      action: () => navigate(`/studio/label/${label.slug}/catalog`),
    },
    {
      title: "Customize storefront",
      description: "Update the public label page",
      icon: Store,
      action: () => navigate(`/studio/label/${label.slug}/storefront`),
      variant: "secondary",
    },
    {
      title: "Monitor finances",
      description: "Verify payouts and Stripe status",
      icon: CreditCard,
      action: () => navigate(`/studio/label/${label.slug}/financials`),
      variant: "secondary",
    },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchSnapshot = async () => {
      setLoading(true);
      try {
        const [{ count: teamCount, error: teamErr }, { count: inviteCount, error: inviteErr }, { count: releaseCount, error: releaseErr }] = await Promise.all([
          supabase
            .from("label_members")
            .select("id", { head: true, count: "exact" })
            .eq("label_id", label.id),
          supabase
            .from("label_invitations")
            .select("id", { head: true, count: "exact" })
            .eq("label_id", label.id)
            .is("accepted_at", null),
          supabase
            .from("releases")
            .select("id", { head: true, count: "exact" })
            .eq("owner_type", "label")
            .eq("owner_id", label.id),
        ]);

        if (teamErr || inviteErr || releaseErr) {
          throw teamErr || inviteErr || releaseErr;
        }

        let catalogCount = releaseCount ?? 0;

        // Attempt to include beats if schema supports owner columns
        try {
          const { count: beatCount } = await supabase
            .from("beats")
            .select("id", { head: true, count: "exact" })
            .eq("owner_type", "label")
            .eq("owner_id", label.id);
          if (typeof beatCount === "number") {
            catalogCount += beatCount;
          }
        } catch (err: any) {
          if (err?.code !== "42703") {
            toast({
              title: "Beat count unavailable",
              description: err.message || String(err),
              variant: "destructive",
            });
          }
        }

        if (!isMounted) return;
        setSnapshot({
          team: teamCount ?? 0,
          invites: inviteCount ?? 0,
          releases: releaseCount ?? 0,
          catalog: catalogCount,
        });
      } catch (err: any) {
        if (!isMounted) return;
        toast({
          title: "Could not load label metrics",
          description: err.message || String(err),
          variant: "destructive",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSnapshot();
    return () => {
      isMounted = false;
    };
  }, [label.id, toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Label workspace</p>
          <h1 className="text-3xl font-bold mt-1">{label.name || label.slug}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Manage roster, catalog, and label operations from here. Jump into Label Studio for deeper tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate(`/studio/label/${label.slug}/roster`)}>
            <Users className="h-4 w-4 mr-2" /> Manage Roster
          </Button>
          <Button variant="outline" onClick={() => navigate(`/studio/label/${label.slug}/catalog`)}>
            <Package className="h-4 w-4 mr-2" /> Open Label Catalog
          </Button>
          <Button variant="outline" onClick={() => navigate(`/studio/label/${label.slug}/settings`)}>
            <Settings className="h-4 w-4 mr-2" /> Label Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {labelQuickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.title} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 text-primary p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <Button
                  variant={action.variant === "secondary" ? "secondary" : "outline"}
                  size="sm"
                  onClick={action.action}
                >
                  Go
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <CardDescription>Active label roles</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loading ? "--" : snapshot.team}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <CardDescription>Awaiting acceptance</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loading ? "--" : snapshot.invites}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Releases</CardTitle>
            <CardDescription>Owned by this label</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loading ? "--" : snapshot.releases}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total catalog</CardTitle>
            <CardDescription>Releases + beats tracked under this label</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {loading ? "--" : snapshot.catalog}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>Key actions to keep your label running smoothly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Grow your roster</h3>
            <p className="text-sm text-muted-foreground">Invite collaborators and assign roles so everyone has the right access.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/studio/label/${label.slug}/roster`)}>
              <UserPlus className="h-4 w-4 mr-2" /> Send Invitation
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Review label catalog</h3>
            <p className="text-sm text-muted-foreground">Check release status, transfer ownership, and prep upcoming drops.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/studio/label/${label.slug}/catalog`)}>
              <Music className="h-4 w-4 mr-2" /> View Label Catalog
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Keep finances in sync</h3>
            <p className="text-sm text-muted-foreground">Complete Stripe onboarding and verify payout details.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/studio/label/${label.slug}/financials`)}>
              <CreditCard className="h-4 w-4 mr-2" /> Review Financials
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Update public profile</h3>
            <p className="text-sm text-muted-foreground">Refresh branding, bios, and storefront blocks.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/studio/label/${label.slug}/storefront`)}>
              <Store className="h-4 w-4 mr-2" /> Customize Storefront
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
