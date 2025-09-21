import { supabase } from '@/integrations/supabase/client';

export interface InboxMessage {
  id: string;
  socialAccountId: string;
  channel: string;
  messageType: 'comment' | 'mention' | 'dm' | 'reply' | 'review';
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  mediaUrls?: string[];
  permalink?: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'unknown';
  requiresResponse: boolean;
  respondedAt?: Date;
  receivedAt: Date;
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  category?: string;
  shortcut?: string;
  useCount: number;
}

export interface InboxFilters {
  channels?: string[];
  messageTypes?: string[];
  isRead?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  sentiment?: string[];
  requiresResponse?: boolean;
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
}

export class InboxService {
  static async getMessages(
    userId: string,
    filters?: InboxFilters,
    pagination?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ messages: InboxMessage[]; total: number }> {
    try {
      let query = supabase
        .from('inbox_messages')
        .select(`
          *,
          social_accounts!inner (
            provider,
            account_name,
            user_id
          )
        `, { count: 'exact' })
        .eq('social_accounts.user_id', userId);

      if (filters?.channels && filters.channels.length > 0) {
        query = query.in('social_accounts.provider', filters.channels);
      }

      if (filters?.messageTypes && filters.messageTypes.length > 0) {
        query = query.in('message_type', filters.messageTypes);
      }

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.isStarred !== undefined) {
        query = query.eq('is_starred', filters.isStarred);
      }

      if (filters?.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      }

      if (filters?.sentiment && filters.sentiment.length > 0) {
        query = query.in('sentiment', filters.sentiment);
      }

      if (filters?.requiresResponse !== undefined) {
        query = query.eq('requires_response', filters.requiresResponse);
      }

      if (filters?.searchQuery) {
        query = query.or(`content.ilike.%${filters.searchQuery}%,author_name.ilike.%${filters.searchQuery}%`);
      }

      if (filters?.startDate) {
        query = query.gte('received_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('received_at', filters.endDate.toISOString());
      }

      query = query.order('received_at', { ascending: false });

      if (pagination?.limit) {
        query = query.limit(pagination.limit);
      }

      if (pagination?.offset) {
        query = query.range(pagination.offset, pagination.offset + (pagination.limit || 20) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const messages = data?.map(msg => ({
        id: msg.id,
        socialAccountId: msg.social_account_id,
        channel: msg.social_accounts.provider,
        messageType: msg.message_type,
        authorName: msg.author_name,
        authorHandle: msg.author_handle,
        authorAvatar: msg.author_avatar_url,
        content: msg.content,
        mediaUrls: msg.media_urls,
        permalink: msg.permalink,
        isRead: msg.is_read,
        isStarred: msg.is_starred,
        isArchived: msg.is_archived,
        sentiment: msg.sentiment,
        requiresResponse: msg.requires_response,
        respondedAt: msg.responded_at ? new Date(msg.responded_at) : undefined,
        receivedAt: new Date(msg.received_at)
      })) || [];

      return { messages, total: count || 0 };
    } catch (error) {
      console.error('Get messages error:', error);
      return { messages: [], total: 0 };
    }
  }

  static async markAsRead(messageIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('inbox_messages')
        .update({ is_read: true })
        .in('id', messageIds);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Mark as read error:', error);
      return { success: false, error: error.message };
    }
  }

  static async toggleStar(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: message } = await supabase
        .from('inbox_messages')
        .select('is_starred')
        .eq('id', messageId)
        .single();

      const { error } = await supabase
        .from('inbox_messages')
        .update({ is_starred: !message?.is_starred })
        .eq('id', messageId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Toggle star error:', error);
      return { success: false, error: error.message };
    }
  }

  static async archiveMessages(messageIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('inbox_messages')
        .update({ is_archived: true })
        .in('id', messageIds);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Archive messages error:', error);
      return { success: false, error: error.message };
    }
  }

  static async respondToMessage(
    messageId: string,
    response: string,
    options?: {
      useTemplate?: string;
      sendViaChannel?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: message } = await supabase
        .from('inbox_messages')
        .select(`
          *,
          social_accounts (*)
        `)
        .eq('id', messageId)
        .single();

      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      let responseContent = response;

      if (options?.useTemplate) {
        const { data: template } = await supabase
          .from('saved_replies')
          .select('content')
          .eq('id', options.useTemplate)
          .single();

        if (template) {
          responseContent = template.content
            .replace('{{name}}', message.author_name)
            .replace('{{handle}}', message.author_handle);

          await supabase
            .from('saved_replies')
            .update({ use_count: supabase.raw('use_count + 1') })
            .eq('id', options.useTemplate);
        }
      }

      if (options?.sendViaChannel) {
        const response = await supabase.functions.invoke('send-reply', {
          body: {
            messageId: messageId,
            accountId: message.social_account_id,
            content: responseContent,
            replyToId: message.provider_message_id
          }
        });

        if (response.error) {
          throw response.error;
        }
      }

      await supabase
        .from('inbox_messages')
        .update({
          responded_at: new Date().toISOString(),
          requires_response: false
        })
        .eq('id', messageId);

      return { success: true };
    } catch (error: any) {
      console.error('Respond to message error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSavedReplies(userId: string): Promise<SavedReply[]> {
    try {
      const { data, error } = await supabase
        .from('saved_replies')
        .select('*')
        .eq('user_id', userId)
        .order('use_count', { ascending: false });

      if (error) throw error;

      return data?.map(reply => ({
        id: reply.id,
        title: reply.title,
        content: reply.content,
        category: reply.category,
        shortcut: reply.shortcut,
        useCount: reply.use_count
      })) || [];
    } catch (error) {
      console.error('Get saved replies error:', error);
      return [];
    }
  }

  static async createSavedReply(
    userId: string,
    reply: {
      title: string;
      content: string;
      category?: string;
      shortcut?: string;
    }
  ): Promise<{ success: boolean; replyId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('saved_replies')
        .insert({
          user_id: userId,
          title: reply.title,
          content: reply.content,
          category: reply.category,
          shortcut: reply.shortcut
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, replyId: data.id };
    } catch (error: any) {
      console.error('Create saved reply error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateSavedReply(
    replyId: string,
    updates: Partial<SavedReply>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_replies')
        .update({
          title: updates.title,
          content: updates.content,
          category: updates.category,
          shortcut: updates.shortcut
        })
        .eq('id', replyId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Update saved reply error:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteSavedReply(replyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_replies')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Delete saved reply error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  static async getMessageStats(userId: string): Promise<{
    total: number;
    unread: number;
    starred: number;
    requiresResponse: number;
    bySentiment: Record<string, number>;
    byChannel: Record<string, number>;
  }> {
    try {
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select(`
          is_read,
          is_starred,
          requires_response,
          sentiment,
          social_accounts!inner (
            provider,
            user_id
          )
        `)
        .eq('social_accounts.user_id', userId)
        .eq('is_archived', false);

      const stats = {
        total: messages?.length || 0,
        unread: 0,
        starred: 0,
        requiresResponse: 0,
        bySentiment: {} as Record<string, number>,
        byChannel: {} as Record<string, number>
      };

      messages?.forEach(msg => {
        if (!msg.is_read) stats.unread++;
        if (msg.is_starred) stats.starred++;
        if (msg.requires_response) stats.requiresResponse++;

        const sentiment = msg.sentiment || 'unknown';
        stats.bySentiment[sentiment] = (stats.bySentiment[sentiment] || 0) + 1;

        const channel = msg.social_accounts.provider;
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Get message stats error:', error);
      return {
        total: 0,
        unread: 0,
        starred: 0,
        requiresResponse: 0,
        bySentiment: {},
        byChannel: {}
      };
    }
  }

  static async bulkModerate(
    messageIds: string[],
    action: 'approve' | 'reject' | 'hide' | 'spam'
  ): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      const updates: any = {
        moderation_status: action === 'approve' ? 'approved' : 'rejected'
      };

      if (action === 'hide') {
        updates.is_hidden = true;
      }

      if (action === 'spam') {
        updates.is_spam = true;
        updates.is_hidden = true;
      }

      const { error } = await supabase
        .from('inbox_messages')
        .update(updates)
        .in('id', messageIds);

      if (error) throw error;

      return { success: true, processed: messageIds.length };
    } catch (error: any) {
      console.error('Bulk moderate error:', error);
      return { success: false, processed: 0, error: error.message };
    }
  }
}