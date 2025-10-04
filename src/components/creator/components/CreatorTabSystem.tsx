import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Music,
  Disc,
  ShoppingBag,
  Radio,
  BookOpen,
  Users,
  User,
  Play,
  Calendar,
  Clock,
  Eye,
  DollarSign,
  Star,
  TrendingUp,
  Heart
} from 'lucide-react';

// Tab content components
import { MusicTab } from './tabs/MusicTab';
import { BeatsTab } from './tabs/BeatsTab';
import { StoreTab } from './tabs/StoreTab';
import { LiveTab } from './tabs/LiveTab';
import { CoursesTab } from './tabs/CoursesTab';
import { CommunityTab } from './tabs/CommunityTab';
import { AboutTab } from './tabs/AboutTab';

interface CreatorProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  bio: string;
  genres?: string[];
  social_links?: any;
  created_at: string;
}

interface CreatorStats {
  total_releases: number;
  total_courses: number;
  total_live_sessions: number;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  priority: number;
  count?: number;
  hasContent: boolean;
  component: React.ComponentType<any>;
}

interface CreatorTabSystemProps {
  profile: CreatorProfile;
  stats: CreatorStats | null;
  visitorStatus: VisitorStatus | null;
}

const productTableFallbacks = ['products', 'store_products'] as const;

const isMissingRelationError = (error: any, tableName: string) => {
  if (!error) return false;
  const normalizedTable = tableName.toLowerCase();
  const compareStrings = [
    (error.message || '').toString().toLowerCase(),
    (error.details || '').toString().toLowerCase(),
    (error.hint || '').toString().toLowerCase()
  ];

  return (
    error.code === '42P01' ||
    compareStrings.some((text) => text.includes('does not exist') && text.includes(normalizedTable))
  );
};

export const CreatorTabSystem = ({ profile, stats, visitorStatus }: CreatorTabSystemProps) => {
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTabCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.user_id, visitorStatus?.isOwner]);

  const fetchProductCount = async () => {
    for (const tableName of productTableFallbacks) {
      try {
        let query = supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', profile.user_id);

        if (!visitorStatus?.isOwner) {
          query = query.eq('status', 'active');
        }

        const { count, error } = await query;

        if (error) {
          if (isMissingRelationError(error, tableName)) {
            continue;
          }
          throw error;
        }

        return count || 0;
      } catch (error: any) {
        if (isMissingRelationError(error, tableName)) {
          continue;
        }
        console.error('Error fetching product count:', error);
        break;
      }
    }

    return 0;
  };

  const fetchTabCounts = async () => {
    try {
      setLoading(true);

      // Fetch counts for all content types in parallel (products handled separately to support fallbacks)
      const [
        { count: releasesCount },
        { count: beatsCount },
        { data: liveData },
        { count: coursesCount },
        { count: communityPosts }
      ] = await Promise.all([
        supabase.from('releases').select('*', { count: 'exact', head: true }).eq('user_id', profile.user_id).eq('status', 'published'),
        supabase.from('beats').select('*', { count: 'exact', head: true }).eq('user_id', profile.user_id).eq('is_published', true),
        supabase.from('live_sessions').select('*').eq('creator_id', profile.user_id).gte('scheduled_for', new Date().toISOString()).order('scheduled_for', { ascending: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('creator_id', profile.user_id).eq('status', 'published'),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('creator_id', profile.user_id).eq('status', 'published')
      ]);

      const productsCount = await fetchProductCount();

      setTabCounts({
        music: releasesCount || 0,
        beats: beatsCount || 0,
        store: productsCount || 0,
        live: liveData?.length || 0,
        courses: coursesCount || 0,
        community: communityPosts || 0
      });

    } catch (error) {
      console.error('Error fetching tab counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Define all possible tabs with their configurations
  const allTabs: TabConfig[] = [
    {
      id: 'music',
      label: 'Music',
      icon: Music,
      priority: 1,
      count: tabCounts.music,
      hasContent: (tabCounts.music || 0) > 0,
      component: MusicTab
    },
    {
      id: 'beats',
      label: 'Beats',
      icon: Disc,
      priority: 2,
      count: tabCounts.beats,
      hasContent: (tabCounts.beats || 0) > 0,
      component: BeatsTab
    },
    {
      id: 'store',
      label: 'Store',
      icon: ShoppingBag,
      priority: 3,
      count: tabCounts.store,
      hasContent: (tabCounts.store || 0) > 0,
      component: StoreTab
    },
    {
      id: 'live',
      label: 'Live',
      icon: Radio,
      priority: 4,
      count: tabCounts.live,
      hasContent: (tabCounts.live || 0) > 0,
      component: LiveTab
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: BookOpen,
      priority: 5,
      count: tabCounts.courses,
      hasContent: (tabCounts.courses || 0) > 0,
      component: CoursesTab
    },
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      priority: 6,
      count: tabCounts.community,
      hasContent: (tabCounts.community || 0) > 0,
      component: CommunityTab
    },
    {
      id: 'about',
      label: 'About',
      icon: User,
      priority: 100, // Always last
      count: undefined,
      hasContent: true, // About tab always exists
      component: AboutTab
    }
  ];

  // Auto-reorder tabs based on content availability and priority
  const getOrderedTabs = (): TabConfig[] => {
    // For creators: show tabs with content first, ordered by priority
    // For visitors: show tabs with content, ordered by engagement potential

    const tabsWithContent = allTabs.filter(tab => tab.hasContent);
    
    if (visitorStatus?.isOwner) {
      // Owners see all tabs, with content-heavy ones first
      return allTabs.sort((a, b) => {
        // If both have content or both don't, sort by priority
        if (a.hasContent === b.hasContent) {
          return a.priority - b.priority;
        }
        // Prioritize tabs with content
        return b.hasContent ? 1 : -1;
      });
    }

    // For visitors, only show tabs with content, ordered by engagement value
    const engagementOrder: Record<string, number> = {
      music: 1,    // Highest engagement - main content
      beats: 2,    // High engagement - downloadable content
      live: 3,     // High engagement - real-time interaction
      courses: 4,  // Medium engagement - educational content
      store: 5,    // Medium engagement - purchase intent
      community: 6, // Lower engagement - requires membership often
      about: 7     // Lowest engagement - informational
    };

    return tabsWithContent.sort((a, b) => {
      const aEngagement = engagementOrder[a.id] || 999;
      const bEngagement = engagementOrder[b.id] || 999;
      return aEngagement - bEngagement;
    });
  };

  const orderedTabs = getOrderedTabs();
  const defaultTab = orderedTabs[0]?.id || 'about';

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-20 bg-muted rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 h-auto p-1">
        {orderedTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col items-center gap-1 p-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-h-[4rem]"
            >
              <IconComponent className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                  {tab.count > 99 ? '99+' : tab.count}
                </Badge>
              )}
              {!tab.hasContent && visitorStatus?.isOwner && (
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Tab Content */}
      {orderedTabs.map((tab) => {
        const TabComponent = tab.component;
        return (
          <TabsContent key={tab.id} value={tab.id} className="mt-6">
            <TabComponent
              profile={profile}
              stats={stats}
              visitorStatus={visitorStatus}
              count={tab.count}
            />
          </TabsContent>
        );
      })}

      {/* Helper text for owners with empty tabs */}
      {visitorStatus?.isOwner && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Tabs with 🟡 indicators need content. Add content to improve your storefront!
          </p>
        </div>
      )}
    </Tabs>
  );
};

export default CreatorTabSystem;
