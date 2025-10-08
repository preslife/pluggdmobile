import React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { logger } from './logger';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

interface SentryConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb) => Sentry.Breadcrumb | null;
}

class SentryService {
  private initialized = false;

  init(config?: Partial<SentryConfig>) {
    if (this.initialized) return;

    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    
    if (!sentryDsn) {
      console.warn('Sentry DSN not found. Error monitoring disabled.');
      return;
    }

    const defaultConfig: SentryConfig = {
      dsn: sentryDsn,
      environment: import.meta.env.NODE_ENV || 'development',
      tracesSampleRate: import.meta.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend: (event) => {
        // Filter out development errors in production
        if (import.meta.env.NODE_ENV === 'development') {
          return event;
        }

        // Log to our custom logger as well
        logger.error('Sentry Error', {
          event_id: event.event_id,
          fingerprint: event.fingerprint,
          tags: event.tags,
          level: event.level,
          message: event.message,
          category: 'sentry_error'
        });

        return event;
      },
      beforeBreadcrumb: (breadcrumb) => {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'ui.click' && breadcrumb.message?.includes('button')) {
          return null; // Skip button clicks
        }
        
        if (breadcrumb.category === 'navigation' && breadcrumb.data?.from === breadcrumb.data?.to) {
          return null; // Skip same-page navigations
        }

        return breadcrumb;
      }
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      Sentry.init({
        dsn: finalConfig.dsn,
        environment: finalConfig.environment,
        integrations: [
          new BrowserTracing({
            // Set up automatic route change tracking for SPA
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              React.useEffect,
              useLocation,
              useNavigationType,
              createRoutesFromChildren,
              matchRoutes
            ),
          }),
        ],
        tracesSampleRate: finalConfig.tracesSampleRate,
        beforeBreadcrumb: finalConfig.beforeBreadcrumb,
        
        // Additional configuration
        release: import.meta.env.VITE_APP_VERSION || 'unknown',
        initialScope: {
          tags: {
            component: 'web-app'
          }
        },
        
        // Performance monitoring
        profilesSampleRate: import.meta.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Session tracking
        autoSessionTracking: true,
        
        // Capture unhandled promise rejections
        captureUnhandledRejections: true,
        
        // Add user context
        beforeSend: (event) => {
          // This will be called before sending any event
          return finalConfig.beforeSend?.(event) || event;
        }
      });

      this.initialized = true;
      
      logger.info('Sentry initialized successfully', {
        environment: finalConfig.environment,
        tracesSampleRate: finalConfig.tracesSampleRate,
        category: 'monitoring_init'
      });

    } catch (error) {
      logger.error('Failed to initialize Sentry', { error: error.message }, error);
    }
  }

  // Set user context
  setUser(user: { id: string; email?: string; username?: string; [key: string]: any }) {
    if (!this.initialized) return;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      ...user
    });

    logger.info('Sentry user context set', { userId: user.id, category: 'user_context' });
  }

  // Clear user context (on logout)
  clearUser() {
    if (!this.initialized) return;
    
    Sentry.setUser(null);
    logger.info('Sentry user context cleared', { category: 'user_context' });
  }

  // Set additional context
  setContext(key: string, context: Record<string, any>) {
    if (!this.initialized) return;
    
    Sentry.setContext(key, context);
  }

  // Set tags
  setTag(key: string, value: string) {
    if (!this.initialized) return;
    
    Sentry.setTag(key, value);
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    if (!this.initialized) return;
    
    Sentry.addBreadcrumb(breadcrumb);
  }

  // Capture exception
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) {
      logger.error('Sentry not initialized, logging error locally', context, error);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setExtra(key, context[key]);
        });
      }
      
      Sentry.captureException(error);
    });

    // Also log to our custom logger
    logger.error('Exception captured by Sentry', context, error);
  }

  // Capture message
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
    if (!this.initialized) {
      logger.info(`Sentry not initialized, logging message locally: ${message}`, context);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setExtra(key, context[key]);
        });
      }
      
      Sentry.captureMessage(message, level);
    });
  }

  // Start transaction for performance monitoring
  startTransaction(name: string, operation?: string) {
    if (!this.initialized) return null;
    
    return Sentry.startTransaction({
      name,
      op: operation || 'navigation'
    });
  }

  // Capture performance metric
  capturePerformanceMetric(name: string, value: number, unit: string = 'millisecond') {
    if (!this.initialized) return;

    // Add as breadcrumb for now (Sentry doesn't have direct custom metrics API)
    this.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${value}${unit}`,
      level: 'info',
      data: {
        metric: name,
        value,
        unit
      }
    });

    // Also log to our custom logger
    logger.performance(name, value, { unit, category: 'sentry_performance' });
  }

  // Create Sentry error boundary HOC
  withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryOptions?: Parameters<typeof Sentry.withErrorBoundary>[1]
  ) {
    if (!this.initialized) return Component;

    return Sentry.withErrorBoundary(Component, {
      fallback: ({ error, resetError }) => (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. The error has been reported to our team.
            </p>
            <button 
              onClick={resetError}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      ),
      beforeCapture: (scope, error, errorInfo) => {
        scope.setTag('errorBoundary', true);
        scope.setContext('errorInfo', errorInfo);
      },
      ...errorBoundaryOptions
    });
  }

  // Check if Sentry is initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create and export singleton instance
export const sentry = new SentryService();

// Export Sentry for direct access if needed
export { Sentry };
export default sentry;
