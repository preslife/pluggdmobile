import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export interface ScheduledPost {
  postId: string;
  channels: string[];
  scheduledAt: Date;
  timezone: string;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface ScheduleSlot {
  time: string;
  dayOfWeek?: number;
  isOptimal: boolean;
  engagementScore: number;
}

export interface QueueItem {
  id: string;
  postId: string;
  channel: string;
  scheduledAt: Date;
  status: string;
  retryCount: number;
}

export class SchedulerService {
  private static readonly OPTIMAL_TIMES = {
    instagram_business: [
      { hour: 7, minute: 0, score: 85 },
      { hour: 12, minute: 0, score: 95 },
      { hour: 17, minute: 0, score: 90 },
      { hour: 19, minute: 0, score: 88 }
    ],
    facebook_pages: [
      { hour: 9, minute: 0, score: 82 },
      { hour: 13, minute: 0, score: 88 },
      { hour: 15, minute: 0, score: 85 },
      { hour: 20, minute: 0, score: 80 }
    ],
    youtube: [
      { hour: 14, minute: 0, score: 92 },
      { hour: 15, minute: 0, score: 90 },
      { hour: 20, minute: 0, score: 85 },
      { hour: 21, minute: 0, score: 83 }
    ],
    tiktok_business: [
      { hour: 6, minute: 0, score: 88 },
      { hour: 10, minute: 0, score: 85 },
      { hour: 13, minute: 0, score: 82 },
      { hour: 19, minute: 0, score: 95 }
    ],
    twitter: [
      { hour: 8, minute: 0, score: 85 },
      { hour: 12, minute: 0, score: 88 },
      { hour: 17, minute: 0, score: 92 },
      { hour: 21, minute: 0, score: 80 }
    ],
    soundcloud: [
      { hour: 10, minute: 0, score: 80 },
      { hour: 14, minute: 0, score: 85 },
      { hour: 18, minute: 0, score: 82 },
      { hour: 22, minute: 0, score: 78 }
    ],
    discord: [
      { hour: 16, minute: 0, score: 85 },
      { hour: 19, minute: 0, score: 90 },
      { hour: 21, minute: 0, score: 88 },
      { hour: 23, minute: 0, score: 82 }
    ]
  };

  static async schedulePost(
    postId: string,
    accountIds: string[],
    scheduledAt: Date,
    timezone: string = 'UTC',
    options?: {
      retryOnFailure?: boolean;
      maxRetries?: number;
    }
  ): Promise<{ success: boolean; targetIds?: string[]; error?: string }> {
    try {
      const utcTime = timezone !== 'UTC' 
        ? zonedTimeToUtc(scheduledAt, timezone)
        : scheduledAt;

      const targets = accountIds.map(accountId => ({
        post_id: postId,
        social_account_id: accountId,
        scheduled_at: utcTime.toISOString(),
        timezone: timezone,
        status: 'queued',
        max_retries: options?.maxRetries || 3
      }));

      const { data, error } = await supabase
        .from('post_targets')
        .insert(targets)
        .select('id');

      if (error) throw error;

      await supabase
        .from('social_posts')
        .update({ status: 'scheduled' })
        .eq('id', postId);

      return { 
        success: true, 
        targetIds: data?.map(d => d.id) || [] 
      };
    } catch (error: any) {
      console.error('Schedule post error:', error);
      return { success: false, error: error.message };
    }
  }

  static async reschedulePost(
    targetId: string,
    newScheduledAt: Date,
    timezone?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const utcTime = timezone && timezone !== 'UTC'
        ? zonedTimeToUtc(newScheduledAt, timezone)
        : newScheduledAt;

      const { error } = await supabase
        .from('post_targets')
        .update({
          scheduled_at: utcTime.toISOString(),
          timezone: timezone || 'UTC',
          status: 'queued'
        })
        .eq('id', targetId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Reschedule error:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelScheduledPost(
    targetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('post_targets')
        .update({ status: 'cancelled' })
        .eq('id', targetId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Cancel scheduled post error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getQueue(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      channels?: string[];
      status?: string[];
    }
  ): Promise<QueueItem[]> {
    try {
      let query = supabase
        .from('post_targets')
        .select(`
          id,
          post_id,
          scheduled_at,
          status,
          retry_count,
          social_accounts!inner (
            provider,
            account_name,
            user_id
          ),
          social_posts!inner (
            content,
            media_urls
          )
        `)
        .eq('social_accounts.user_id', userId);

      if (options?.startDate) {
        query = query.gte('scheduled_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('scheduled_at', options.endDate.toISOString());
      }

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      const { data, error } = await query.order('scheduled_at', { ascending: true });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        postId: item.post_id,
        channel: item.social_accounts.provider,
        scheduledAt: new Date(item.scheduled_at),
        status: item.status,
        retryCount: item.retry_count
      })) || [];
    } catch (error) {
      console.error('Get queue error:', error);
      return [];
    }
  }

  static getOptimalTimes(
    channel: string,
    timezone: string = 'UTC',
    date: Date = new Date()
  ): ScheduleSlot[] {
    const times = this.OPTIMAL_TIMES[channel as keyof typeof this.OPTIMAL_TIMES] || [];
    const slots: ScheduleSlot[] = [];

    times.forEach(time => {
      const slotTime = new Date(date);
      slotTime.setHours(time.hour, time.minute, 0, 0);

      const zonedTime = timezone !== 'UTC'
        ? utcToZonedTime(slotTime, timezone)
        : slotTime;

      slots.push({
        time: format(zonedTime, 'HH:mm'),
        dayOfWeek: zonedTime.getDay(),
        isOptimal: time.score >= 85,
        engagementScore: time.score
      });
    });

    return slots.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  static async bulkSchedule(
    posts: {
      postId: string;
      accountIds: string[];
      scheduledAt: Date;
    }[],
    timezone: string = 'UTC',
    options?: {
      spacing?: number;
      avoidWeekends?: boolean;
    }
  ): Promise<{ success: boolean; scheduled: number; failed: number; errors?: string[] }> {
    const results = {
      scheduled: 0,
      failed: 0,
      errors: [] as string[]
    };

    let currentTime = posts[0]?.scheduledAt || new Date();

    for (const post of posts) {
      if (options?.spacing) {
        currentTime = addMinutes(currentTime, options.spacing);
      }

      if (options?.avoidWeekends) {
        const day = currentTime.getDay();
        if (day === 0) {
          currentTime.setDate(currentTime.getDate() + 1);
        } else if (day === 6) {
          currentTime.setDate(currentTime.getDate() + 2);
        }
      }

      const result = await this.schedulePost(
        post.postId,
        post.accountIds,
        currentTime,
        timezone
      );

      if (result.success) {
        results.scheduled++;
      } else {
        results.failed++;
        results.errors?.push(result.error || 'Unknown error');
      }
    }

    return {
      success: results.failed === 0,
      ...results
    };
  }

  static async getScheduleCalendar(
    userId: string,
    month: Date,
    timezone: string = 'UTC'
  ): Promise<Map<string, QueueItem[]>> {
    const startDate = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
    const endDate = endOfDay(new Date(month.getFullYear(), month.getMonth() + 1, 0));

    const queue = await this.getQueue(userId, {
      startDate,
      endDate
    });

    const calendar = new Map<string, QueueItem[]>();

    queue.forEach(item => {
      const zonedDate = timezone !== 'UTC'
        ? utcToZonedTime(item.scheduledAt, timezone)
        : item.scheduledAt;

      const dateKey = format(zonedDate, 'yyyy-MM-dd');
      
      if (!calendar.has(dateKey)) {
        calendar.set(dateKey, []);
      }
      
      calendar.get(dateKey)?.push(item);
    });

    return calendar;
  }

  static async createAutomation(
    userId: string,
    trigger: string,
    actions: {
      postToChannels: string[];
      useTemplate?: string;
      delayMinutes?: number;
      addSmartLink?: boolean;
    }
  ): Promise<{ success: boolean; automationId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          user_id: userId,
          name: `Auto-post on ${trigger}`,
          trigger_type: trigger,
          actions: {
            post_to_channels: actions.postToChannels,
            use_template: actions.useTemplate,
            delay_minutes: actions.delayMinutes || 0,
            add_smart_link: actions.addSmartLink || true
          },
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, automationId: data.id };
    } catch (error: any) {
      console.error('Create automation error:', error);
      return { success: false, error: error.message };
    }
  }

  static async retryFailedPosts(userId: string): Promise<{ retried: number; errors: string[] }> {
    try {
      const { data: failedTargets, error: fetchError } = await supabase
        .from('post_targets')
        .select(`
          id,
          retry_count,
          max_retries,
          social_accounts!inner (user_id)
        `)
        .eq('social_accounts.user_id', userId)
        .eq('status', 'failed')
        .lt('retry_count', supabase.raw('max_retries'));

      if (fetchError) throw fetchError;

      let retried = 0;
      const errors: string[] = [];

      for (const target of failedTargets || []) {
        const nextRetryAt = addMinutes(new Date(), Math.pow(2, target.retry_count) * 5);

        const { error } = await supabase
          .from('post_targets')
          .update({
            next_retry_at: nextRetryAt.toISOString(),
            retry_count: target.retry_count + 1,
            status: 'queued'
          })
          .eq('id', target.id);

        if (error) {
          errors.push(`Failed to retry target ${target.id}: ${error.message}`);
        } else {
          retried++;
        }
      }

      return { retried, errors };
    } catch (error: any) {
      console.error('Retry failed posts error:', error);
      return { retried: 0, errors: [error.message] };
    }
  }
}