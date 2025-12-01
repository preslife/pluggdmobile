// Monitoring initialization for the main application
import { monitoring } from './monitoring';
import { logger } from './logger';

/**
 * Initialize monitoring services for the application
 * Call this function once during app startup
 */
export const initializeAppMonitoring = async () => {
  try {
    // Check if monitoring is enabled via environment variables
    const isMonitoringEnabled = import.meta.env.VITE_ENABLE_MONITORING === 'true';
    const isGDPREnabled = import.meta.env.VITE_ENABLE_GDPR_COMPLIANCE === 'true';
    
    if (!isMonitoringEnabled) {
      console.log('Monitoring disabled via environment variables');
      return;
    }

    // Initialize monitoring with configuration
    await monitoring.initialize({
      enableSentry: !!import.meta.env.VITE_SENTRY_DSN,
      enableWebVitals: true,
      enableMiddleware: true,
      enableGDPRCompliance: isGDPREnabled,
      logLevel: import.meta.env.NODE_ENV === 'development' ? 'debug' : 'info',
      environment: import.meta.env.NODE_ENV || 'development'
    });

    // Log successful initialization
    logger.info('Application monitoring initialized', {
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
      environment: import.meta.env.NODE_ENV,
      services: monitoring.getHealthStatus().services,
      category: 'app_init'
    });

    console.log('✅ Monitoring services initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize monitoring services:', error);
    
    // Log the error even if monitoring failed to initialize completely
    logger.error('Monitoring initialization failed', {
      error: error instanceof Error ? error.message : String(error),
      category: 'app_init_error'
    }, error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Set up user context when user logs in
 */
export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
  role?: string;
  plan?: string;
}) => {
  try {
    // Set Sentry user context
    import('./sentry').then(({ sentry }) => {
      if (sentry.isInitialized()) {
        sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.username
        });
      }
    });

    // Log user properties (analytics tracking is handled via React components)
    logger.info('User context set for monitoring', {
      userId: user.id,
      role: user.role,
      plan: user.plan,
      lastLogin: new Date().toISOString(),
      category: 'user_context'
    });

  } catch (error) {
    logger.warn('Failed to set user context', { error }, error instanceof Error ? error : undefined);
  }
};

/**
 * Clear user context when user logs out
 */
export const clearUserContext = () => {
  try {
    // Clear Sentry user context
    import('./sentry').then(({ sentry }) => {
      if (sentry.isInitialized()) {
        sentry.clearUser();
      }
    });

    logger.info('User context cleared from monitoring', {
      category: 'user_context'
    });

  } catch (error) {
    logger.warn('Failed to clear user context', { error }, error instanceof Error ? error : undefined);
  }
};

/**
 * Handle application errors globally
 */
export const setupGlobalErrorHandling = () => {
  // This is handled automatically by the monitoring service
  // but you can add custom error handling here if needed
  
  // Example: Handle React Router errors
  window.addEventListener('routeChangeError', (event) => {
    logger.error('Route change error', {
      route: (event as any).detail?.route,
      error: (event as any).detail?.error,
      category: 'routing_error'
    });
  });
};

/**
 * Performance monitoring helpers
 */
export const trackPagePerformance = (pageName: string) => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navigationEntry = navigationEntries[0];

    if (navigationEntry) {
      logger.performance('page_load_complete', navigationEntry.loadEventEnd - navigationEntry.loadEventStart, {
        page: pageName,
        domContentLoaded: navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
        firstPaint: navigationEntry.loadEventStart - navigationEntry.fetchStart,
        category: 'page_performance'
      });
    }
  }
};

/**
 * Track feature usage
 * Note: For full analytics tracking with user context, use the useAnalytics hook in React components.
 * This function provides basic logging without requiring React context.
 */
export const trackFeatureUsage = async (featureName: string, action: string, metadata?: Record<string, any>) => {
  try {
    // Log feature usage (full analytics tracking is handled via React components with useAnalytics hook)
    logger.info(`Feature usage: ${featureName}`, {
      feature: featureName,
      action,
      ...metadata,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      category: 'feature_usage'
    });

  } catch (error) {
    logger.warn('Failed to track feature usage', {
      feature: featureName,
      action,
      error
    }, error instanceof Error ? error : undefined);
  }
};

/**
 * Export monitoring data for debugging
 */
export const exportDiagnostics = async () => {
  try {
    await monitoring.exportMonitoringData();
    logger.info('Diagnostic data exported', { category: 'diagnostics' });
  } catch (error) {
    logger.error('Failed to export diagnostic data', { error }, error instanceof Error ? error : undefined);
  }
};

// Re-export monitoring utilities for easy access
export { monitoring, logger } from './monitoring';
export { sentry } from './sentry';
export { webVitals } from './webVitals';

// Default export
export default {
  initializeAppMonitoring,
  setUserContext,
  clearUserContext,
  setupGlobalErrorHandling,
  trackPagePerformance,
  trackFeatureUsage,
  exportDiagnostics,
  monitoring,
  logger
};