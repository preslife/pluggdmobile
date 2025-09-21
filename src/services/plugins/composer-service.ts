import { supabase } from '@/integrations/supabase/client';

export interface PostContent {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

export interface ChannelVariant {
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  mediaUrl?: string;
  thread?: string[];
  storySegments?: string[];
}

export interface ComposerPost {
  id?: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  channelVariants: Record<string, ChannelVariant>;
  smartLinkId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  postType: 'manual' | 'auto_release' | 'auto_live' | 'auto_course' | 'auto_campaign';
  relatedEntityType?: string;
  relatedEntityId?: string;
  status: 'draft' | 'scheduled' | 'published';
}

export class ComposerService {
  private static readonly CHANNEL_LIMITS = {
    instagram_business: {
      contentLength: 2200,
      hashtagLimit: 30,
      mentionLimit: 20,
      mediaTypes: ['image', 'video'],
      videoMaxDuration: 60,
      aspectRatios: ['1:1', '4:5', '9:16']
    },
    facebook_pages: {
      contentLength: 63206,
      hashtagLimit: null,
      mentionLimit: null,
      mediaTypes: ['image', 'video'],
      videoMaxDuration: 240
    },
    youtube: {
      titleLength: 100,
      descriptionLength: 5000,
      hashtagLimit: 15,
      mediaTypes: ['video'],
      videoMaxDuration: 43200
    },
    tiktok_business: {
      contentLength: 2200,
      hashtagLimit: 100,
      mentionLimit: null,
      mediaTypes: ['video'],
      videoMaxDuration: 180,
      aspectRatios: ['9:16']
    },
    twitter: {
      contentLength: 280,
      hashtagLimit: null,
      mentionLimit: null,
      mediaTypes: ['image', 'video', 'gif'],
      videoMaxDuration: 140,
      threadLimit: 25
    },
    soundcloud: {
      titleLength: 100,
      descriptionLength: 4000,
      mediaTypes: ['audio'],
      genreRequired: true
    },
    discord: {
      contentLength: 2000,
      embedLimit: 10,
      mediaTypes: ['image', 'video', 'audio']
    }
  };

  static async createPost(post: Partial<ComposerPost>): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const smartLinkId = post.smartLinkId || await this.createSmartLink(post);

      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          user_id: user.id,
          content: post.content,
          media_urls: post.mediaUrls || [],
          media_types: post.mediaTypes || [],
          channel_variants: post.channelVariants || {},
          smart_link_id: smartLinkId,
          utm_source: post.utmSource,
          utm_medium: post.utmMedium || 'social',
          utm_campaign: post.utmCampaign,
          utm_content: post.utmContent,
          post_type: post.postType || 'manual',
          related_entity_type: post.relatedEntityType,
          related_entity_id: post.relatedEntityId,
          status: post.status || 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, postId: data.id };
    } catch (error: any) {
      console.error('Create post error:', error);
      return { success: false, error: error.message };
    }
  }

  static async updatePost(postId: string, updates: Partial<ComposerPost>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('social_posts')
        .update({
          content: updates.content,
          media_urls: updates.mediaUrls,
          media_types: updates.mediaTypes,
          channel_variants: updates.channelVariants,
          utm_source: updates.utmSource,
          utm_campaign: updates.utmCampaign,
          utm_content: updates.utmContent,
          status: updates.status
        })
        .eq('id', postId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Update post error:', error);
      return { success: false, error: error.message };
    }
  }

  static generateChannelVariants(
    baseContent: string,
    channels: string[],
    options?: {
      hashtags?: string[];
      mentions?: string[];
      mediaUrl?: string;
      linkUrl?: string;
    }
  ): Record<string, ChannelVariant> {
    const variants: Record<string, ChannelVariant> = {};

    channels.forEach(channel => {
      const limits = this.CHANNEL_LIMITS[channel as keyof typeof this.CHANNEL_LIMITS];
      if (!limits) return;

      let variant: ChannelVariant = {};

      switch (channel) {
        case 'twitter':
          variant = this.createTwitterVariant(baseContent, limits, options);
          break;
        case 'instagram_business':
          variant = this.createInstagramVariant(baseContent, limits, options);
          break;
        case 'youtube':
          variant = this.createYouTubeVariant(baseContent, limits, options);
          break;
        case 'tiktok_business':
          variant = this.createTikTokVariant(baseContent, limits, options);
          break;
        default:
          variant = this.createDefaultVariant(baseContent, limits, options);
      }

      variants[channel] = variant;
    });

    return variants;
  }

  private static createTwitterVariant(
    content: string,
    limits: any,
    options?: any
  ): ChannelVariant {
    const hashtags = options?.hashtags?.slice(0, 3) || [];
    const shortLink = options?.linkUrl ? this.shortenUrl(options.linkUrl) : '';
    
    let tweetContent = content;
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
    const totalLength = tweetContent.length + hashtagText.length + shortLink.length + 2;

    if (totalLength > limits.contentLength) {
      const availableLength = limits.contentLength - hashtagText.length - shortLink.length - 5;
      tweetContent = content.substring(0, availableLength) + '...';
    }

    const finalContent = `${tweetContent} ${hashtagText} ${shortLink}`.trim();

    if (content.length > limits.contentLength * 2) {
      const thread = this.createThread(content, limits.contentLength, hashtags, shortLink);
      return {
        content: thread[0],
        thread: thread.slice(1),
        hashtags,
        mediaUrl: options?.mediaUrl
      };
    }

    return {
      content: finalContent,
      hashtags,
      mediaUrl: options?.mediaUrl
    };
  }

  private static createInstagramVariant(
    content: string,
    limits: any,
    options?: any
  ): ChannelVariant {
    const hashtags = options?.hashtags?.slice(0, limits.hashtagLimit) || [];
    const mentions = options?.mentions?.slice(0, limits.mentionLimit) || [];
    
    const hashtagBlock = '\n\n' + hashtags.map(tag => `#${tag}`).join(' ');
    const mentionText = mentions.map(m => `@${m}`).join(' ');
    
    let igContent = content;
    if (igContent.length + hashtagBlock.length > limits.contentLength) {
      igContent = content.substring(0, limits.contentLength - hashtagBlock.length - 5) + '...';
    }

    return {
      content: `${mentionText ? mentionText + '\n\n' : ''}${igContent}${hashtagBlock}`,
      hashtags,
      mentions,
      mediaUrl: options?.mediaUrl
    };
  }

  private static createYouTubeVariant(
    content: string,
    limits: any,
    options?: any
  ): ChannelVariant {
    const lines = content.split('\n');
    const title = lines[0].substring(0, limits.titleLength);
    const description = lines.slice(1).join('\n');
    
    const hashtags = options?.hashtags?.slice(0, limits.hashtagLimit) || [];
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
    
    const chapters = this.extractChapters(description);
    const fullDescription = `${description}\n\n${chapters ? 'Chapters:\n' + chapters + '\n\n' : ''}${hashtagText}`;

    return {
      content: `${title}\n\n${fullDescription.substring(0, limits.descriptionLength)}`,
      hashtags,
      mediaUrl: options?.mediaUrl
    };
  }

  private static createTikTokVariant(
    content: string,
    limits: any,
    options?: any
  ): ChannelVariant {
    const hashtags = options?.hashtags || [];
    const trendingHashtags = ['fyp', 'foryou', 'music', ...hashtags];
    
    const hashtagText = trendingHashtags.slice(0, 10).map(tag => `#${tag}`).join(' ');
    let tiktokContent = content;
    
    if (tiktokContent.length + hashtagText.length > limits.contentLength) {
      tiktokContent = content.substring(0, limits.contentLength - hashtagText.length - 5) + '...';
    }

    return {
      content: `${tiktokContent}\n\n${hashtagText}`,
      hashtags: trendingHashtags,
      mediaUrl: options?.mediaUrl
    };
  }

  private static createDefaultVariant(
    content: string,
    limits: any,
    options?: any
  ): ChannelVariant {
    let variantContent = content;
    
    if (limits.contentLength && content.length > limits.contentLength) {
      variantContent = content.substring(0, limits.contentLength - 3) + '...';
    }

    return {
      content: variantContent,
      hashtags: options?.hashtags,
      mentions: options?.mentions,
      mediaUrl: options?.mediaUrl
    };
  }

  private static createThread(
    content: string,
    charLimit: number,
    hashtags: string[],
    link: string
  ): string[] {
    const thread: string[] = [];
    const words = content.split(' ');
    let currentTweet = '';
    let tweetCount = 1;
    const maxTweets = 25;

    words.forEach(word => {
      const testTweet = currentTweet ? `${currentTweet} ${word}` : word;
      const tweetNumber = `${tweetCount}/${maxTweets}`;
      
      if (testTweet.length + tweetNumber.length + 2 <= charLimit - 20) {
        currentTweet = testTweet;
      } else {
        thread.push(`${currentTweet} ${tweetNumber}`);
        currentTweet = word;
        tweetCount++;
      }
    });

    if (currentTweet) {
      const lastTweet = `${currentTweet} ${hashtags.map(h => `#${h}`).join(' ')} ${link} ${tweetCount}/${maxTweets}`;
      thread.push(lastTweet);
    }

    return thread;
  }

  private static extractChapters(content: string): string {
    const timeRegex = /(\d{1,2}:\d{2})/g;
    const matches = content.match(timeRegex);
    
    if (!matches || matches.length < 2) return '';
    
    const chapters: string[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (timeRegex.test(line)) {
        chapters.push(line.trim());
      }
    });

    return chapters.slice(0, 10).join('\n');
  }

  private static shortenUrl(url: string): string {
    if (url.length <= 23) return url;
    return url.substring(0, 20) + '...';
  }

  private static async createSmartLink(post: Partial<ComposerPost>): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return undefined;

      const shortCode = await this.generateShortCode();
      const destinationUrl = post.relatedEntityId 
        ? `${window.location.origin}/${post.relatedEntityType}/${post.relatedEntityId}`
        : window.location.origin;

      const { data, error } = await supabase
        .from('shortlinks')
        .insert({
          user_id: user.id,
          short_code: shortCode,
          destination_url: destinationUrl,
          title: post.content?.substring(0, 100)
        })
        .select()
        .single();

      if (error) {
        console.error('Smart link creation error:', error);
        return undefined;
      }

      return data.id;
    } catch (error) {
      console.error('Smart link error:', error);
      return undefined;
    }
  }

  private static async generateShortCode(): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const { data } = await supabase
      .from('shortlinks')
      .select('id')
      .eq('short_code', code)
      .single();

    if (data) {
      return this.generateShortCode();
    }

    return code;
  }

  static validateChannelContent(channel: string, variant: ChannelVariant): { valid: boolean; errors: string[] } {
    const limits = this.CHANNEL_LIMITS[channel as keyof typeof this.CHANNEL_LIMITS];
    if (!limits) {
      return { valid: false, errors: ['Unknown channel'] };
    }

    const errors: string[] = [];

    if (variant.content && limits.contentLength && variant.content.length > limits.contentLength) {
      errors.push(`Content exceeds ${limits.contentLength} character limit`);
    }

    if (variant.hashtags && limits.hashtagLimit && variant.hashtags.length > limits.hashtagLimit) {
      errors.push(`Too many hashtags (max ${limits.hashtagLimit})`);
    }

    if (variant.mentions && limits.mentionLimit && variant.mentions.length > limits.mentionLimit) {
      errors.push(`Too many mentions (max ${limits.mentionLimit})`);
    }

    if (variant.thread && channel === 'twitter' && variant.thread.length > 24) {
      errors.push('Thread exceeds 25 tweet limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}