import { logger } from './logger';
import { sentry } from './sentry';
import { webVitals } from './webVitals';
import { initializeMiddleware } from './middleware';

interface MonitoringConfig {
  enableSentry: boolean;
  enableWebVitals: boolean;
  enableMiddleware: boolean;
  enableGDPRCompliance: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  environment: string;
}

class MonitoringService {
  private static instance: MonitoringService;
  private initialized = false;
  private config: MonitoringConfig;

  private constructor() {
    this.config = {
      enableSentry: true,
      enableWebVitals: true,
      enableMiddleware: true,
      enableGDPRCompliance: true,
      logLevel: import.meta.env.NODE_ENV === 'development' ? 'debug' : 'info',
      environment: import.meta.env.NODE_ENV || 'development'
    };
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async initialize(config: Partial<MonitoringConfig> = {}) {
    if (this.initialized) return;

    this.config = { ...this.config, ...config };

    try {
      logger.info('Initializing monitoring services', {
        config: this.config,
        category: 'monitoring_init'
      });

      // Initialize Sentry error monitoring
      if (this.config.enableSentry) {
        sentry.init({
          environment: this.config.environment,
          beforeSend: (event) => {
            // GDPR compliance check
            if (this.config.enableGDPRCompliance) {
              const hasConsent = localStorage.getItem('monitoring_consent') === 'true';
              if (!hasConsent) {
                logger.debug('Sentry event blocked - no user consent', { eventId: event.event_id });
                return null;
              }
            }
            return event;
          }
        });
      }

      // Initialize Web Vitals performance monitoring
      if (this.config.enableWebVitals) {
        webVitals.configure({
          enableSupabase: true,
          enableSentry: this.config.enableSentry,
          enableLogging: true
        });
        webVitals.init();
      }

      // Initialize API and user action middleware
      if (this.config.enableMiddleware) {
        initializeMiddleware();
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Set up GDPR compliance if enabled
      if (this.config.enableGDPRCompliance) {
        this.setupGDPRCompliance();
      }

      this.initialized = true;

      logger.info('All monitoring services initialized successfully', {
        services: {
          sentry: this.config.enableSentry,
          webVitals: this.config.enableWebVitals,
          middleware: this.config.enableMiddleware,
          gdpr: this.config.enableGDPRCompliance
        },
        category: 'monitoring_init'
      });

    } catch (error) {
      logger.error('Failed to initialize monitoring services', {}, error);
      console.error('Monitoring initialization failed:', error);
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.critical('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
        category: 'unhandled_error'
      });

      if (sentry.isInitialized()) {
        sentry.captureException(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
          extra: { reason: event.reason }
        });
      }
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      logger.critical('Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        category: 'global_error'
      });

      if (sentry.isInitialized()) {
        sentry.captureException(event.error || new Error(event.message), {
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      }
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        logger.warn('Resource Loading Error', {
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
          message: event.message,
          category: 'resource_error'
        });
      }
    }, true);
  }

  private setupPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > 50) {
            logger.warn('Long Task Detected', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
              category: 'performance_warning'
            });
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        logger.debug('Long task observer not supported');
      }
    }

    // Monitor memory usage periodically
    if ('memory' in performance) {
      const monitorMemory = () => {
        const memory = (performance as any).memory;
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (memoryUsage > 90) {
          logger.warn('High Memory Usage Detected', {
            usagePercent: memoryUsage,
            usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
            category: 'performance_warning'
          });
        }

        logger.performance('Memory Usage', memoryUsage, {
          usedBytes: memory.usedJSHeapSize,
          totalBytes: memory.totalJSHeapSize,
          limitBytes: memory.jsHeapSizeLimit
        });
      };

      // Monitor every 30 seconds
      setInterval(monitorMemory, 30000);
      monitorMemory(); // Initial check
    }

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      logger.info('Page Visibility Changed', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        category: 'user_behavior'
      });
    });
  }

  private setupGDPRCompliance() {
    const showConsentBanner = () => {
      // Create a simple consent banner (you can customize this)
      const banner = document.createElement('div');
      banner.id = 'monitoring-consent-banner';
      banner.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 16px;
        z-index: 10000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      banner.innerHTML = `
        <div>
          <p style="margin: 0; font-size: 14px;">
            We use monitoring tools to improve our service. Your data helps us identify and fix issues.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="consent-accept" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Accept
          </button>
          <button id="consent-decline" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Decline
          </button>
        </div>
      `;

      document.body.appendChild(banner);

      // Handle consent
      document.getElementById('consent-accept')?.addEventListener('click', () => {
        this.setMonitoringConsent(true);
        banner.remove();
      });

      document.getElementById('consent-decline')?.addEventListener('click', () => {
        this.setMonitoringConsent(false);
        banner.remove();
      });
    };

    // Check if consent has already been given
    const hasConsentDecision = localStorage.getItem('monitoring_consent') !== null;
    if (!hasConsentDecision) {
      // Show consent banner after a delay
      setTimeout(showConsentBanner, 2000);
    }
  }

  // Public methods for managing monitoring consent
  setMonitoringConsent(consent: boolean) {
    localStorage.setItem('monitoring_consent', consent.toString());
    localStorage.setItem('analytics_consent', consent.toString());

    logger.info('Monitoring consent updated', {
      consent,
      timestamp: new Date().toISOString(),
      category: 'gdpr_compliance'
    });

    if (!consent) {
      // Clear any existing monitoring data
      this.clearMonitoringData();
    }
  }

  hasMonitoringConsent(): boolean {
    if (!this.config.enableGDPRCompliance) return true;
    return localStorage.getItem('monitoring_consent') === 'true';
  }

  revokeMonitoringConsent() {
    this.setMonitoringConsent(false);
  }

  private clearMonitoringData() {
    // Clear local monitoring data
    logger.clearLocalLogs();
    
    // Clear Sentry user data
    if (sentry.isInitialized()) {
      sentry.clearUser();
    }

    logger.info('Monitoring data cleared due to consent revocation', {
      category: 'gdpr_compliance'
    });
  }

  // Utility methods
  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Monitoring configuration updated', {
      newConfig: this.config,
      category: 'config_update'
    });
  }

  // Get monitoring health status
  getHealthStatus() {
    return {
      initialized: this.initialized,
      services: {
        logger: true, // Logger is always available
        sentry: sentry.isInitialized(),
        webVitals: this.config.enableWebVitals,
        middleware: this.config.enableMiddleware
      },
      consent: this.hasMonitoringConsent(),
      config: this.config
    };
  }

  // Export monitoring data for debugging
  async exportMonitoringData() {
    const data = {
      healthStatus: this.getHealthStatus(),
      localLogs: logger.getLocalLogs(),
      webVitalsMetrics: webVitals.getMetrics(),
      performanceScore: webVitals.getPerformanceScore(),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info('Monitoring data exported', {
      recordCount: {
        logs: logger.getLocalLogs().length,
        metrics: Object.keys(webVitals.getMetrics()).length
      },
      category: 'data_export'
    });
  }
}

// Create and export singleton instance
export const monitoring = MonitoringService.getInstance();

// Export for direct access
export default monitoring;