import { logger } from './logger';
import { sentry } from './sentry';
import { supabase } from '@/integrations/supabase/client';

// Types for middleware
export interface APICallMetrics {
  method: string;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  status?: number;
  statusText?: string;
  requestSize?: number;
  responseSize?: number;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

export interface UserActionMetrics {
  action: string;
  component: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

// API Call Logging Middleware
class APIMiddleware {
  private static instance: APIMiddleware;
  private interceptorsSet = false;

  private constructor() {}

  static getInstance(): APIMiddleware {
    if (!APIMiddleware.instance) {
      APIMiddleware.instance = new APIMiddleware();
    }
    return APIMiddleware.instance;
  }

  initialize() {
    if (this.interceptorsSet) return;

    this.setupFetchInterceptor();
    this.setupSupabaseInterceptor();
    this.interceptorsSet = true;

    logger.info('API middleware initialized', { category: 'middleware_init' });
  }

  private setupFetchInterceptor() {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      
      let requestSize = 0;
      if (init?.body) {
        if (typeof init.body === 'string') {
          requestSize = new Blob([init.body]).size;
        } else if (init.body instanceof FormData) {
          // Approximate size for FormData
          requestSize = JSON.stringify(Object.fromEntries(init.body)).length;
        }
      }

      const user = await this.getCurrentUser();

      try {
        const response = await originalFetch(input, init);
        const endTime = performance.now();
        
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        const responseSize = new Blob([responseText]).size;

        const metrics: APICallMetrics = {
          method,
          url,
          startTime,
          endTime,
          duration: endTime - startTime,
          status: response.status,
          statusText: response.statusText,
          requestSize,
          responseSize,
          userId: user?.id,
          sessionId: logger.getSessionId()
        };

        this.logAPICall(metrics);

        return response;
      } catch (error) {
        const endTime = performance.now();

        const metrics: APICallMetrics = {
          method,
          url,
          startTime,
          endTime,
          duration: endTime - startTime,
          requestSize,
          error: error as Error,
          userId: user?.id,
          sessionId: logger.getSessionId()
        };

        this.logAPICall(metrics);
        throw error;
      }
    };
  }

  private setupSupabaseInterceptor() {
    // Intercept Supabase calls by wrapping the client
    const originalFrom = supabase.from;
    const originalRpc = supabase.rpc;
    const originalAuth = supabase.auth;

    // Wrap database operations
    supabase.from = (table: string) => {
      const query = originalFrom.call(supabase, table);
      const originalSelect = query.select;
      const originalInsert = query.insert;
      const originalUpdate = query.update;
      const originalDelete = query.delete;
      const originalUpsert = query.upsert;

      // Wrap select
      query.select = (...args: any[]) => {
        const startTime = performance.now();
        const promise = originalSelect.apply(query, args);
        
        this.trackSupabaseOperation('select', table, startTime, promise);
        return promise;
      };

      // Wrap insert
      query.insert = (...args: any[]) => {
        const startTime = performance.now();
        const promise = originalInsert.apply(query, args);
        
        this.trackSupabaseOperation('insert', table, startTime, promise);
        return promise;
      };

      // Wrap update
      query.update = (...args: any[]) => {
        const startTime = performance.now();
        const promise = originalUpdate.apply(query, args);
        
        this.trackSupabaseOperation('update', table, startTime, promise);
        return promise;
      };

      // Wrap delete
      query.delete = (...args: any[]) => {
        const startTime = performance.now();
        const promise = originalDelete.apply(query, args);
        
        this.trackSupabaseOperation('delete', table, startTime, promise);
        return promise;
      };

      // Wrap upsert
      query.upsert = (...args: any[]) => {
        const startTime = performance.now();
        const promise = originalUpsert.apply(query, args);
        
        this.trackSupabaseOperation('upsert', table, startTime, promise);
        return promise;
      };

      return query;
    };

    // Wrap RPC calls
    supabase.rpc = (functionName: string, ...args: any[]) => {
      const startTime = performance.now();
      const promise = originalRpc.apply(supabase, [functionName, ...args]);
      
      this.trackSupabaseOperation('rpc', functionName, startTime, promise);
      return promise;
    };
  }

  private async trackSupabaseOperation(
    operation: string, 
    tableName: string, 
    startTime: number, 
    promise: Promise<any>
  ) {
    try {
      const result = await promise;
      const endTime = performance.now();
      const duration = endTime - startTime;

      const user = await this.getCurrentUser();

      await logger.apiCall(
        operation.toUpperCase(),
        `supabase:${tableName}`,
        duration,
        result.error ? 400 : 200,
        {
          operation,
          table: tableName,
          success: !result.error,
          errorMessage: result.error?.message,
          userId: user?.id,
          category: 'supabase_operation'
        }
      );

      // Track slow queries
      if (duration > 1000) { // Slower than 1 second
        logger.warn(`Slow Supabase query detected`, {
          operation,
          table: tableName,
          duration,
          category: 'performance_warning'
        });

        if (sentry.isInitialized()) {
          sentry.captureMessage(`Slow database query: ${operation} on ${tableName}`, 'warning', {
            duration,
            operation,
            table: tableName
          });
        }
      }

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      await logger.error(`Supabase ${operation} failed`, {
        operation,
        table: tableName,
        duration,
        error: (error as Error).message,
        category: 'supabase_error'
      }, error as Error);

      if (sentry.isInitialized()) {
        sentry.captureException(error as Error, {
          operation,
          table: tableName,
          duration
        });
      }
    }
  }

  private async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  }

  private async logAPICall(metrics: APICallMetrics) {
    try {
      // Log to custom logger
      await logger.apiCall(
        metrics.method,
        metrics.url,
        metrics.duration,
        metrics.status,
        {
          requestSize: metrics.requestSize,
          responseSize: metrics.responseSize,
          error: metrics.error?.message,
          userId: metrics.userId,
          sessionId: metrics.sessionId,
          category: 'api_call'
        }
      );

      // Log slow API calls
      if (metrics.duration > 2000) { // Slower than 2 seconds
        logger.warn(`Slow API call detected`, {
          method: metrics.method,
          url: metrics.url,
          duration: metrics.duration,
          category: 'performance_warning'
        });

        if (sentry.isInitialized()) {
          sentry.captureMessage(`Slow API call: ${metrics.method} ${metrics.url}`, 'warning', {
            duration: metrics.duration,
            status: metrics.status
          });
        }
      }

      // Log API errors
      if (metrics.error || (metrics.status && metrics.status >= 400)) {
        const errorMessage = metrics.error?.message || `HTTP ${metrics.status}: ${metrics.statusText}`;
        
        logger.error(`API call failed`, {
          method: metrics.method,
          url: metrics.url,
          status: metrics.status,
          error: errorMessage,
          category: 'api_error'
        }, metrics.error);

        if (sentry.isInitialized() && metrics.error) {
          sentry.captureException(metrics.error, {
            method: metrics.method,
            url: metrics.url,
            status: metrics.status
          });
        }
      }

    } catch (error) {
      console.warn('Failed to log API call:', error);
    }
  }
}

// User Action Logging Middleware
class UserActionMiddleware {
  private static instance: UserActionMiddleware;
  private eventListeners: Map<string, EventListener> = new Map();

  private constructor() {}

  static getInstance(): UserActionMiddleware {
    if (!UserActionMiddleware.instance) {
      UserActionMiddleware.instance = new UserActionMiddleware();
    }
    return UserActionMiddleware.instance;
  }

  initialize() {
    if (typeof window === 'undefined') return;

    this.setupClickTracking();
    this.setupFormTracking();
    this.setupScrollTracking();
    this.setupVisibilityTracking();
    this.setupRouteChangeTracking();

    logger.info('User action middleware initialized', { category: 'middleware_init' });
  }

  private setupClickTracking() {
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;
      const text = target.textContent?.substring(0, 50) || '';

      this.logUserAction('click', 'dom_element', {
        tagName,
        className,
        id,
        text,
        x: event.clientX,
        y: event.clientY
      });
    };

    document.addEventListener('click', clickHandler, { passive: true });
    this.eventListeners.set('click', clickHandler);
  }

  private setupFormTracking() {
    const formSubmitHandler = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.name || form.id || 'unnamed';
      const formData = new FormData(form);
      const fieldCount = Array.from(formData.keys()).length;

      this.logUserAction('form_submit', 'form', {
        formName,
        fieldCount,
        action: form.action,
        method: form.method
      });
    };

    const formFocusHandler = (event: FocusEvent) => {
      const input = event.target as HTMLInputElement;
      if (input.tagName.toLowerCase() === 'input' || input.tagName.toLowerCase() === 'textarea') {
        const form = input.closest('form');
        const formName = form?.name || form?.id || 'unnamed';

        this.logUserAction('form_field_focus', 'form_field', {
          formName,
          fieldName: input.name || input.id,
          fieldType: input.type
        });
      }
    };

    document.addEventListener('submit', formSubmitHandler, { passive: true });
    document.addEventListener('focusin', formFocusHandler, { passive: true });
    
    this.eventListeners.set('submit', formSubmitHandler);
    this.eventListeners.set('focusin', formFocusHandler);
  }

  private setupScrollTracking() {
    let scrollTimeout: NodeJS.Timeout;
    let lastScrollY = 0;
    let maxScrollDepth = 0;

    const scrollHandler = () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const currentScrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollDepth = Math.round((currentScrollY / documentHeight) * 100);
        
        if (scrollDepth > maxScrollDepth) {
          maxScrollDepth = scrollDepth;
        }

        const direction = currentScrollY > lastScrollY ? 'down' : 'up';
        lastScrollY = currentScrollY;

        this.logUserAction('scroll', 'page', {
          scrollDepth,
          maxScrollDepth,
          direction,
          scrollY: currentScrollY
        });
      }, 100);
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.eventListeners.set('scroll', scrollHandler);
  }

  private setupVisibilityTracking() {
    let visibilityStartTime = Date.now();

    const visibilityHandler = () => {
      if (document.hidden) {
        const timeSpent = Date.now() - visibilityStartTime;
        this.logUserAction('page_hide', 'visibility', {
          timeSpent,
          visibilityState: document.visibilityState
        });
      } else {
        visibilityStartTime = Date.now();
        this.logUserAction('page_show', 'visibility', {
          visibilityState: document.visibilityState
        });
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    this.eventListeners.set('visibilitychange', visibilityHandler);
  }

  private setupRouteChangeTracking() {
    // Track route changes for SPAs
    let currentPath = window.location.pathname;

    const routeChangeHandler = () => {
      if (window.location.pathname !== currentPath) {
        this.logUserAction('route_change', 'navigation', {
          from: currentPath,
          to: window.location.pathname,
          referrer: document.referrer
        });
        currentPath = window.location.pathname;
      }
    };

    // Listen for history changes
    window.addEventListener('popstate', routeChangeHandler);
    
    // Override pushState and replaceState to catch programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      routeChangeHandler();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      routeChangeHandler();
    };

    this.eventListeners.set('popstate', routeChangeHandler);
  }

  private async logUserAction(action: string, component: string, metadata: Record<string, any> = {}) {
    try {
      const user = await this.getCurrentUser();
      
      const actionMetrics: UserActionMetrics = {
        action,
        component,
        timestamp: Date.now(),
        userId: user?.id,
        sessionId: logger.getSessionId(),
        metadata: {
          ...metadata,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      // Log to custom logger
      await logger.userAction(action, component, actionMetrics.metadata);

      // Add breadcrumb to Sentry for better error context
      if (sentry.isInitialized()) {
        sentry.addBreadcrumb({
          category: 'user_action',
          message: `${action} on ${component}`,
          level: 'info',
          data: metadata
        });
      }

    } catch (error) {
      console.warn('Failed to log user action:', error);
    }
  }

  private async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  }

  cleanup() {
    // Remove all event listeners
    this.eventListeners.forEach((listener, event) => {
      if (event === 'click' || event === 'submit' || event === 'focusin' || event === 'visibilitychange') {
        document.removeEventListener(event, listener);
      } else if (event === 'scroll' || event === 'popstate') {
        window.removeEventListener(event, listener);
      }
    });
    this.eventListeners.clear();
  }
}

// Initialize middleware
export const initializeMiddleware = () => {
  const apiMiddleware = APIMiddleware.getInstance();
  const userActionMiddleware = UserActionMiddleware.getInstance();

  apiMiddleware.initialize();
  userActionMiddleware.initialize();

  logger.info('All middleware initialized', { category: 'middleware_init' });

  return {
    apiMiddleware,
    userActionMiddleware
  };
};

// Export middleware instances
export const apiMiddleware = APIMiddleware.getInstance();
export const userActionMiddleware = UserActionMiddleware.getInstance();

export default {
  apiMiddleware,
  userActionMiddleware,
  initializeMiddleware
};