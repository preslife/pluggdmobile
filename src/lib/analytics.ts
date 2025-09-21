import { supabase } from "@/integrations/supabase/client";

export const logAnalyticsEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: eventName,
        properties
      });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
};

// Enhanced event tracking for Phase 4 features
export const trackPhase4Events = {
  // API Developer Center events
  apiTokenCreated: (tokenLabel: string, scopes: string[]) => 
    logAnalyticsEvent('api_token_created', { token_label: tokenLabel, scopes }),
  
  apiTokenRevoked: (tokenId: string) =>
    logAnalyticsEvent('api_token_revoked', { token_id: tokenId }),
  
  apiUsageViewed: () =>
    logAnalyticsEvent('api_usage_viewed'),

  // Embed Gallery events  
  embedSettingsUpdated: (settings: Record<string, any>) =>
    logAnalyticsEvent('embed_settings_updated', settings),
  
  embedCodeCopied: (type: string) =>
    logAnalyticsEvent('embed_code_copied', { embed_type: type }),
  
  embedPlayerImpression: (contentId: string, contentType: string) =>
    logAnalyticsEvent('embed_player_impression', { content_id: contentId, content_type: contentType }),
  
  embedPlayerClickthrough: (contentId: string, contentType: string) =>
    logAnalyticsEvent('embed_player_clickthrough', { content_id: contentId, content_type: contentType }),

  // Onboarding events
  onboardingTaskCompleted: (taskId: string) =>
    logAnalyticsEvent('onboarding_task_completed', { task_id: taskId }),
  
  onboardingCompleted: () =>
    logAnalyticsEvent('onboarding_completed'),
  
  onboardingRewardsClaimed: (credits: number) =>
    logAnalyticsEvent('onboarding_rewards_claimed', { credits_amount: credits }),

  // Help & Support events
  helpPageViewed: (section?: string) =>
    logAnalyticsEvent('help_page_viewed', { section }),
  
  supportContactSubmitted: (subject: string) =>
    logAnalyticsEvent('support_contact_submitted', { subject }),

  // Dashboard engagement
  quickActionUsed: (action: string) =>
    logAnalyticsEvent('dashboard_quick_action', { action }),
  
  developerCenterAccessed: () =>
    logAnalyticsEvent('developer_center_accessed'),
  
  embedGalleryAccessed: () =>
    logAnalyticsEvent('embed_gallery_accessed')
};