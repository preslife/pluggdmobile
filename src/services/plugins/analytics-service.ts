import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export interface PostMetrics {
  postId: string;
  channel: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  plays?: number;
  averageWatchTime?: number;
  completionRate?: number;
  newFollowers: number;
  attributedSales: number;
  attributedPlays: number;
  attributedTips: number;
  attributedTickets: number;
  roi: number;
}

export interface ChannelPerformance {
  channel: string;
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  followerGrowth: number;
  totalAttributedSales: number;
  conversionRate: number;
  topPerformingPost?: {
    id: string;
    content: string;
    engagementRate: number;
  };
}

export interface AttributionData {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  conversions: number;
  revenue: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface ROIMetrics {
  postId: string;
  investment: number;
  revenue: number;
  roi: number;
  roiPercentage: number;
  paybackPeriod?: number;
}

export class AnalyticsService {
  static async getPostMetrics(
    postId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<PostMetrics[]> {
    try {
      let query = supabase
        .from('social_metrics')
        .select(`
          *,
          post_targets!inner (
            post_id,
            social_accounts (provider)
          )
        `)
        .eq('post_targets.post_id', postId);

      if (dateRange) {
        query = query
          .gte('fetched_at', dateRange.start.toISOString())
          .lte('fetched_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(metric => ({
        postId: postId,
        channel: metric.post_targets.social_accounts.provider,
        impressions: metric.impressions,
        reach: metric.reach,
        engagements: metric.engagements,
        likes: metric.likes,
        comments: metric.comments,
        shares: metric.shares,
        saves: metric.saves,
        clicks: metric.clicks,
        plays: metric.plays,
        averageWatchTime: metric.average_watch_time,
        completionRate: metric.completion_rate,
        newFollowers: metric.new_followers,
        attributedSales: parseFloat(metric.attributed_sales),
        attributedPlays: metric.attributed_plays,
        attributedTips: parseFloat(metric.attributed_tips),
        attributedTickets: metric.attributed_tickets,
        roi: this.calculateROI(
          parseFloat(metric.attributed_sales) + parseFloat(metric.attributed_tips),
          0
        )
      })) || [];
    } catch (error) {
      console.error('Get post metrics error:', error);
      return [];
    }
  }

  static async getChannelPerformance(
    userId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<ChannelPerformance[]> {
    try {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      switch (period) {
        case 'day':
          periodStart = startOfDay(now);
          periodEnd = endOfDay(now);
          break;
        case 'week':
          periodStart = startOfWeek(now);
          periodEnd = endOfWeek(now);
          break;
        case 'month':
          periodStart = startOfMonth(now);
          periodEnd = endOfMonth(now);
          break;
      }

      const { data, error } = await supabase
        .from('channel_analytics')
        .select(`
          *,
          social_accounts!inner (
            provider,
            user_id
          )
        `)
        .eq('social_accounts.user_id', userId)
        .eq('period_type', period)
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString());

      if (error) throw error;

      return data?.map(analytics => ({
        channel: analytics.social_accounts.provider,
        totalPosts: analytics.total_posts,
        totalImpressions: analytics.total_impressions,
        totalEngagements: analytics.total_engagements,
        engagementRate: parseFloat(analytics.engagement_rate),
        followerGrowth: analytics.follower_growth,
        totalAttributedSales: parseFloat(analytics.total_attributed_sales),
        conversionRate: parseFloat(analytics.conversion_rate)
      })) || [];
    } catch (error) {
      console.error('Get channel performance error:', error);
      return [];
    }
  }

  static async getAttributionData(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AttributionData[]> {
    try {
      const { data: clicks } = await supabase
        .from('shortlink_clicks')
        .select(`
          *,
          shortlinks!inner (
            user_id,
            post_id
          )
        `)
        .eq('shortlinks.user_id', userId)
        .gte('clicked_at', dateRange.start.toISOString())
        .lte('clicked_at', dateRange.end.toISOString());

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const attributionMap = new Map<string, AttributionData>();

      clicks?.forEach(click => {
        const key = `${click.utm_source || 'direct'}_${click.utm_medium || 'none'}`;
        
        if (!attributionMap.has(key)) {
          attributionMap.set(key, {
            source: click.utm_source || 'direct',
            medium: click.utm_medium || 'none',
            campaign: click.utm_campaign,
            content: click.utm_content,
            conversions: 0,
            revenue: 0,
            conversionRate: 0,
            averageOrderValue: 0
          });
        }

        const attribution = attributionMap.get(key)!;
        
        const relatedOrders = orders?.filter(order => {
          const orderTime = new Date(order.created_at);
          const clickTime = new Date(click.clicked_at);
          const hoursDiff = (orderTime.getTime() - clickTime.getTime()) / (1000 * 60 * 60);
          return hoursDiff >= 0 && hoursDiff <= 24 && order.utm_source === click.utm_source;
        }) || [];

        attribution.conversions += relatedOrders.length;
        attribution.revenue += relatedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
      });

      const totalClicks = clicks?.length || 1;

      attributionMap.forEach(attribution => {
        attribution.conversionRate = (attribution.conversions / totalClicks) * 100;
        attribution.averageOrderValue = attribution.conversions > 0 
          ? attribution.revenue / attribution.conversions 
          : 0;
      });

      return Array.from(attributionMap.values());
    } catch (error) {
      console.error('Get attribution data error:', error);
      return [];
    }
  }

  static async calculatePostROI(
    postId: string,
    options?: {
      includePaidPromotion?: boolean;
      promotionCost?: number;
    }
  ): Promise<ROIMetrics> {
    try {
      const metrics = await this.getPostMetrics(postId);
      
      const totalRevenue = metrics.reduce((sum, m) => 
        sum + m.attributedSales + m.attributedTips, 0
      );

      const investment = options?.promotionCost || 0;

      const roi = this.calculateROI(totalRevenue, investment);
      const roiPercentage = investment > 0 ? ((totalRevenue - investment) / investment) * 100 : 0;

      const paybackPeriod = investment > 0 && totalRevenue > 0
        ? investment / (totalRevenue / 30)
        : undefined;

      return {
        postId,
        investment,
        revenue: totalRevenue,
        roi,
        roiPercentage,
        paybackPeriod
      };
    } catch (error) {
      console.error('Calculate post ROI error:', error);
      return {
        postId,
        investment: 0,
        revenue: 0,
        roi: 0,
        roiPercentage: 0
      };
    }
  }

  static async getFunnelAnalysis(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    stages: Array<{
      name: string;
      count: number;
      conversionRate: number;
    }>;
    overallConversion: number;
  }> {
    try {
      const { data: shortlinks } = await supabase
        .from('shortlinks')
        .select('id')
        .eq('user_id', userId);

      const shortlinkIds = shortlinks?.map(s => s.id) || [];

      const { count: clicks } = await supabase
        .from('shortlink_clicks')
        .select('*', { count: 'exact', head: true })
        .in('shortlink_id', shortlinkIds)
        .gte('clicked_at', dateRange.start.toISOString())
        .lte('clicked_at', dateRange.end.toISOString());

      const { count: pageViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const { count: addToCarts } = await supabase
        .from('cart_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'add_to_cart')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const { count: checkouts } = await supabase
        .from('cart_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('event_type', 'checkout_started')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const { count: purchases } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const stages = [
        { name: 'Link Clicks', count: clicks || 0, conversionRate: 100 },
        { name: 'Page Views', count: pageViews || 0, conversionRate: clicks ? ((pageViews || 0) / clicks) * 100 : 0 },
        { name: 'Add to Cart', count: addToCarts || 0, conversionRate: pageViews ? ((addToCarts || 0) / pageViews) * 100 : 0 },
        { name: 'Checkout', count: checkouts || 0, conversionRate: addToCarts ? ((checkouts || 0) / addToCarts) * 100 : 0 },
        { name: 'Purchase', count: purchases || 0, conversionRate: checkouts ? ((purchases || 0) / checkouts) * 100 : 0 }
      ];

      const overallConversion = clicks ? ((purchases || 0) / clicks) * 100 : 0;

      return { stages, overallConversion };
    } catch (error) {
      console.error('Get funnel analysis error:', error);
      return { stages: [], overallConversion: 0 };
    }
  }

  static async getTopPerformingContent(
    userId: string,
    limit: number = 10,
    metric: 'engagement' | 'revenue' | 'reach' = 'engagement'
  ): Promise<Array<{
    postId: string;
    content: string;
    channel: string;
    value: number;
    postedAt: Date;
  }>> {
    try {
      const { data: posts } = await supabase
        .from('social_posts')
        .select(`
          id,
          content,
          created_at,
          post_targets (
            id,
            social_accounts (provider)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'published');

      const postMetrics = await Promise.all(
        posts?.map(async post => {
          const metrics = await this.getPostMetrics(post.id);
          
          let value = 0;
          switch (metric) {
            case 'engagement':
              value = metrics.reduce((sum, m) => sum + m.engagements, 0);
              break;
            case 'revenue':
              value = metrics.reduce((sum, m) => sum + m.attributedSales + m.attributedTips, 0);
              break;
            case 'reach':
              value = metrics.reduce((sum, m) => sum + m.reach, 0);
              break;
          }

          return {
            postId: post.id,
            content: post.content.substring(0, 100),
            channel: post.post_targets[0]?.social_accounts?.provider || 'unknown',
            value,
            postedAt: new Date(post.created_at)
          };
        }) || []
      );

      return postMetrics
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    } catch (error) {
      console.error('Get top performing content error:', error);
      return [];
    }
  }

  static async getEngagementTrends(
    userId: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    impressions: number;
    engagements: number;
    engagementRate: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const { data } = await supabase
        .from('social_metrics')
        .select(`
          metrics_date,
          impressions,
          engagements,
          post_targets!inner (
            social_posts!inner (user_id)
          )
        `)
        .eq('post_targets.social_posts.user_id', userId)
        .gte('metrics_date', startDate.toISOString())
        .lte('metrics_date', endDate.toISOString())
        .order('metrics_date');

      const trendMap = new Map<string, { impressions: number; engagements: number }>();

      data?.forEach(metric => {
        const date = metric.metrics_date;
        if (!trendMap.has(date)) {
          trendMap.set(date, { impressions: 0, engagements: 0 });
        }
        const trend = trendMap.get(date)!;
        trend.impressions += metric.impressions;
        trend.engagements += metric.engagements;
      });

      return Array.from(trendMap.entries()).map(([date, metrics]) => ({
        date,
        impressions: metrics.impressions,
        engagements: metrics.engagements,
        engagementRate: metrics.impressions > 0 
          ? (metrics.engagements / metrics.impressions) * 100 
          : 0
      }));
    } catch (error) {
      console.error('Get engagement trends error:', error);
      return [];
    }
  }

  private static calculateROI(revenue: number, investment: number): number {
    if (investment === 0) return revenue;
    return ((revenue - investment) / investment) * 100;
  }

  static async syncChannelMetrics(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await supabase.functions.invoke('sync-channel-metrics', {
        body: { accountId }
      });

      if (response.error) {
        throw response.error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sync channel metrics error:', error);
      return { success: false, error: error.message };
    }
  }
}