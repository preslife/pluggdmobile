import { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { sentry } from '@/lib/sentry';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: Date;
  sessionId?: string;
}

export interface UserEngagementMetrics {
  pageViews: number;
  timeSpent: number;
  interactions: number;
  features: string[];
  lastActivity: Date;
}

export interface ConversionMetrics {
  funnelStage: string;
  conversionRate: number;
  dropOffPoint?: string;
  timeToConvert?: number;
}

export interface AnalyticsConfig {
  enableAutoTracking: boolean;
  enableConversionTracking: boolean;
  enableEngagementTracking: boolean;
  enableRevenueTracking: boolean;
  enableGDPRCompliance: boolean;
  consentRequired: boolean;
}

export const useAnalytics = (config: Partial<AnalyticsConfig> = {}) => {
  const { user } = useAuth();
  
  const defaultConfig: AnalyticsConfig = {
    enableAutoTracking: true,
    enableConversionTracking: true,
    enableEngagementTracking: true,
    enableRevenueTracking: true,
    enableGDPRCompliance: true,
    consentRequired: false,
    ...config
  };

  // Track analytics event
  const track = useCallback(async (eventName: string, properties: Record<string, any> = {}) => {
    try {
      // GDPR compliance check
      if (defaultConfig.enableGDPRCompliance && defaultConfig.consentRequired) {
        const hasConsent = localStorage.getItem('analytics_consent') === 'true';
        if (!hasConsent) {
          logger.debug('Analytics tracking skipped - no user consent', { eventName });
          return;
        }
      }

      const event: AnalyticsEvent = {
        name: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        userId: user?.id,
        timestamp: new Date()
      };

      // Log to custom logger
      logger.userAction(eventName, 'analytics', event.properties);

      // Send to Supabase analytics table
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id,
          event_name: eventName,
          properties: event.properties
        });

      // Send to Sentry as breadcrumb for better error context
      if (sentry.isInitialized()) {
        sentry.addBreadcrumb({
          category: 'user_action',
          message: eventName,
          level: 'info',
          data: properties
        });
      }

      logger.debug('Analytics event tracked', { eventName, properties });
    } catch (error) {
      logger.error('Failed to track analytics event', { eventName, error }, error);
    }
  }, [user?.id, defaultConfig]);

  // Track page view
  const trackPageView = useCallback(async (page: string, properties: Record<string, any> = {}) => {
    await track('page_view', {
      page,
      title: document.title,
      ...properties
    });
  }, [track]);

  // Track user engagement
  const trackEngagement = useCallback(async (action: string, element: string, properties: Record<string, any> = {}) => {
    if (!defaultConfig.enableEngagementTracking) return;

    await track('user_engagement', {
      action,
      element,
      ...properties
    });
  }, [track, defaultConfig.enableEngagementTracking]);

  // Track conversion events
  const trackConversion = useCallback(async (
    conversionType: string, 
    value?: number, 
    properties: Record<string, any> = {}
  ) => {
    if (!defaultConfig.enableConversionTracking) return;

    await track('conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      ...properties
    });
  }, [track, defaultConfig.enableConversionTracking]);

  // Track revenue events
  const trackRevenue = useCallback(async (
    amount: number, 
    currency: string, 
    productId?: string, 
    properties: Record<string, any> = {}
  ) => {
    if (!defaultConfig.enableRevenueTracking) return;

    await track('revenue', {
      amount,
      currency,
      product_id: productId,
      ...properties
    });
  }, [track, defaultConfig.enableRevenueTracking]);

  // Track feature usage
  const trackFeature = useCallback(async (featureName: string, action: string, properties: Record<string, any> = {}) => {
    await track('feature_usage', {
      feature: featureName,
      action,
      ...properties
    });
  }, [track]);

  // Track errors for analytics purposes
  const trackError = useCallback(async (
    errorType: string, 
    errorMessage: string, 
    properties: Record<string, any> = {}
  ) => {
    await track('error', {
      error_type: errorType,
      error_message: errorMessage,
      ...properties
    });
  }, [track]);

  // Track search queries
  const trackSearch = useCallback(async (
    query: string, 
    resultsCount: number, 
    properties: Record<string, any> = {}
  ) => {
    await track('search', {
      query,
      results_count: resultsCount,
      ...properties
    });
  }, [track]);

  // Track social sharing
  const trackShare = useCallback(async (
    platform: string, 
    contentType: string, 
    contentId: string, 
    properties: Record<string, any> = {}
  ) => {
    await track('share', {
      platform,
      content_type: contentType,
      content_id: contentId,
      ...properties
    });
  }, [track]);

  // Track form interactions
  const trackFormEvent = useCallback(async (
    formName: string, 
    eventType: 'start' | 'complete' | 'abandon' | 'error', 
    properties: Record<string, any> = {}
  ) => {
    await track('form_interaction', {
      form_name: formName,
      event_type: eventType,
      ...properties
    });
  }, [track]);

  // Set user properties
  const setUserProperties = useCallback(async (properties: Record<string, any>) => {
    try {
      if (!user?.id) return;

      await supabase
        .from('user_properties')
        .upsert({
          user_id: user.id,
          properties,
          updated_at: new Date().toISOString()
        });

      // Update Sentry user context
      if (sentry.isInitialized()) {
        sentry.setUser({
          id: user.id,
          ...properties
        });
      }

      logger.debug('User properties updated', { userId: user.id, properties });
    } catch (error) {
      logger.error('Failed to set user properties', { error }, error);
    }
  }, [user?.id]);

  // Track session duration
  const trackSessionDuration = useCallback(() => {
    const sessionStart = sessionStorage.getItem('session_start_time');
    if (!sessionStart) {
      sessionStorage.setItem('session_start_time', Date.now().toString());
      return;
    }

    const duration = Date.now() - parseInt(sessionStart);
    track('session_duration', { duration_ms: duration });
  }, [track]);

  // Get user engagement metrics
  const getUserEngagementMetrics = useCallback(async (): Promise<UserEngagementMetrics | null> => {
    try {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_user_engagement_metrics', { user_id: user.id });

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Failed to get user engagement metrics', { error }, error);
      return null;
    }
  }, [user?.id]);

  // Get conversion funnel data
  const getConversionFunnelData = useCallback(async (funnelName: string): Promise<ConversionMetrics[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_conversion_funnel_data', { funnel_name: funnelName });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get conversion funnel data', { error }, error);
      return [];
    }
  }, []);

  // GDPR compliance methods
  const requestAnalyticsConsent = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      // This would typically show a consent modal
      const hasConsent = confirm('Do you consent to analytics tracking to help improve our service?');
      localStorage.setItem('analytics_consent', hasConsent.toString());
      resolve(hasConsent);
    });
  }, []);

  const revokeAnalyticsConsent = useCallback(() => {
    localStorage.removeItem('analytics_consent');
    // Clear any stored analytics data
    localStorage.removeItem('analytics_session_id');
  }, []);

  const hasAnalyticsConsent = useCallback(() => {
    return localStorage.getItem('analytics_consent') === 'true';
  }, []);

  // Auto-tracking setup
  useEffect(() => {
    if (!defaultConfig.enableAutoTracking) return;

    // Track page view on mount
    trackPageView(window.location.pathname);

    // Track session duration on unmount
    const handleBeforeUnload = () => {
      trackSessionDuration();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      trackSessionDuration();
    };
  }, [defaultConfig.enableAutoTracking, trackPageView, trackSessionDuration]);

  // Set up user context when user changes
  useEffect(() => {
    if (user && sentry.isInitialized()) {
      sentry.setUser({
        id: user.id,
        email: user.email,
      });
    } else if (!user && sentry.isInitialized()) {
      sentry.clearUser();
    }
  }, [user]);

  return {
    // Core tracking methods
    track,
    trackPageView,
    trackEngagement,
    trackConversion,
    trackRevenue,
    trackFeature,
    trackError,
    trackSearch,
    trackShare,
    trackFormEvent,
    
    // User management
    setUserProperties,
    
    // Data retrieval
    getUserEngagementMetrics,
    getConversionFunnelData,
    
    // GDPR compliance
    requestAnalyticsConsent,
    revokeAnalyticsConsent,
    hasAnalyticsConsent,
    
    // Utility
    trackSessionDuration
  };
};

export default useAnalytics;