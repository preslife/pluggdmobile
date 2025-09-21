import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
import type { CLSMetric, FIDMetric, FCPMetric, LCPMetric, TTFBMetric, INPMetric } from 'web-vitals';
import { logger } from './logger';
import { sentry } from './sentry';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface WebVitalsConfig {
  enableLogging: boolean;
  enableSentry: boolean;
  enableSupabase: boolean;
  sampleRate: number;
  reportAllChanges: boolean;
}

class WebVitalsService {
  private config: WebVitalsConfig;
  private metrics: Map<string, PerformanceEntry> = new Map();
  private initialized = false;

  constructor(config: Partial<WebVitalsConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableSentry: true,
      enableSupabase: true,
      sampleRate: import.meta.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      reportAllChanges: false,
      ...config
    };
  }

  init() {
    if (this.initialized) return;

    // Only initialize in browser environment
    if (typeof window === 'undefined') return;

    // Check if we should report based on sample rate
    if (Math.random() > this.config.sampleRate) return;

    this.initialized = true;

    // Initialize all Core Web Vitals
    this.initializeCoreWebVitals();

    // Initialize custom performance metrics
    this.initializeCustomMetrics();

    logger.info('Web Vitals monitoring initialized', {
      config: this.config,
      category: 'performance_init'
    });
  }

  private initializeCoreWebVitals() {
    // Cumulative Layout Shift (CLS)
    onCLS((metric: CLSMetric) => {
      this.handleMetric('CLS', metric);
    }, { reportAllChanges: this.config.reportAllChanges });

    // First Input Delay (FID)
    onFID((metric: FIDMetric) => {
      this.handleMetric('FID', metric);
    }, { reportAllChanges: this.config.reportAllChanges });

    // First Contentful Paint (FCP)
    onFCP((metric: FCPMetric) => {
      this.handleMetric('FCP', metric);
    }, { reportAllChanges: this.config.reportAllChanges });

    // Largest Contentful Paint (LCP)
    onLCP((metric: LCPMetric) => {
      this.handleMetric('LCP', metric);
    }, { reportAllChanges: this.config.reportAllChanges });

    // Time to First Byte (TTFB)
    onTTFB((metric: TTFBMetric) => {
      this.handleMetric('TTFB', metric);
    }, { reportAllChanges: this.config.reportAllChanges });

    // Interaction to Next Paint (INP)
    onINP((metric: INPMetric) => {
      this.handleMetric('INP', metric);
    }, { reportAllChanges: this.config.reportAllChanges });
  }

  private initializeCustomMetrics() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.handleCustomMetric('Long Task', entry.duration, {
                startTime: entry.startTime,
                name: entry.name,
                type: entry.entryType
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        logger.warn('Long task observer not supported', { error });
      }

      // Monitor largest contentful paint elements
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          if (lastEntry) {
            this.handleCustomMetric('LCP Element', lastEntry.startTime, {
              element: (lastEntry as any).element?.tagName,
              url: (lastEntry as any).url,
              size: (lastEntry as any).size
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        logger.warn('LCP observer not supported', { error });
      }

      // Monitor first input
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            this.handleCustomMetric('First Input Delay', entry.processingStart - entry.startTime, {
              startTime: entry.startTime,
              processingStart: entry.processingStart,
              processingEnd: entry.processingEnd,
              target: (entry.target as any)?.tagName
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        logger.warn('FID observer not supported', { error });
      }
    }

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor connection quality
    this.monitorConnection();
  }

  private handleMetric(name: string, metric: any) {
    const performanceEntry: PerformanceEntry = {
      name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType || 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.metrics.set(name, performanceEntry);

    // Log to console and custom logger
    if (this.config.enableLogging) {
      logger.performance(`${name} metric`, metric.value, {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        category: 'web_vitals'
      });
    }

    // Send to Sentry
    if (this.config.enableSentry && sentry.isInitialized()) {
      sentry.capturePerformanceMetric(name, metric.value);
    }

    // Send to Supabase
    if (this.config.enableSupabase) {
      this.sendToSupabase(performanceEntry);
    }
  }

  private handleCustomMetric(name: string, value: number, metadata?: Record<string, any>) {
    const performanceEntry: PerformanceEntry = {
      name,
      value,
      rating: this.getRating(name, value),
      delta: value, // For custom metrics, delta equals value
      id: `${name}-${Date.now()}`,
      navigationType: 'unknown',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.config.enableLogging) {
      logger.performance(`${name} custom metric`, value, {
        ...metadata,
        rating: performanceEntry.rating,
        category: 'custom_performance'
      });
    }

    if (this.config.enableSentry && sentry.isInitialized()) {
      sentry.capturePerformanceMetric(name, value);
    }

    if (this.config.enableSupabase) {
      this.sendToSupabase(performanceEntry, metadata);
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    // Define thresholds for custom metrics
    const thresholds: Record<string, [number, number]> = {
      'Long Task': [50, 100],
      'Memory Usage': [50, 80], // percentage
      'Bundle Size': [1000, 2000], // KB
    };

    const threshold = thresholds[name] || [100, 200];
    
    if (value <= threshold[0]) return 'good';
    if (value <= threshold[1]) return 'needs-improvement';
    return 'poor';
  }

  private monitorMemoryUsage() {
    if ('memory' in performance && (performance as any).memory) {
      const updateMemoryMetrics = () => {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize;
        const totalMemory = memory.totalJSHeapSize;
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;

        this.handleCustomMetric('Memory Usage', memoryUsagePercent, {
          usedBytes: usedMemory,
          totalBytes: totalMemory,
          limitBytes: memory.jsHeapSizeLimit
        });
      };

      // Monitor memory every 30 seconds
      setInterval(updateMemoryMetrics, 30000);
      
      // Initial measurement
      updateMemoryMetrics();
    }
  }

  private monitorConnection() {
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      
      const updateConnectionMetrics = () => {
        this.handleCustomMetric('Effective Connection Type', 0, {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };

      connection.addEventListener('change', updateConnectionMetrics);
      updateConnectionMetrics(); // Initial measurement
    }
  }

  private async sendToSupabase(entry: PerformanceEntry, additionalMetadata?: Record<string, any>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('performance_metrics')
        .insert({
          user_id: user?.id,
          metric_name: entry.name,
          metric_value: entry.value,
          rating: entry.rating,
          delta: entry.delta,
          metric_id: entry.id,
          navigation_type: entry.navigationType,
          url: entry.url,
          user_agent: entry.userAgent,
          metadata: additionalMetadata || {},
          timestamp: new Date(entry.timestamp).toISOString()
        });
    } catch (error) {
      logger.warn('Failed to send performance metrics to Supabase', { error });
    }
  }

  // Get current metrics
  getMetrics(): Record<string, PerformanceEntry> {
    return Object.fromEntries(this.metrics);
  }

  // Get metric by name
  getMetric(name: string): PerformanceEntry | undefined {
    return this.metrics.get(name);
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
  }

  // Calculate performance score based on Core Web Vitals
  getPerformanceScore(): number {
    const cls = this.metrics.get('CLS');
    const fid = this.metrics.get('FID') || this.metrics.get('INP');
    const lcp = this.metrics.get('LCP');

    if (!cls || !fid || !lcp) return 0;

    let score = 100;

    // CLS scoring (0-100 scale)
    if (cls.rating === 'poor') score -= 40;
    else if (cls.rating === 'needs-improvement') score -= 20;

    // FID/INP scoring (0-100 scale)
    if (fid.rating === 'poor') score -= 30;
    else if (fid.rating === 'needs-improvement') score -= 15;

    // LCP scoring (0-100 scale)
    if (lcp.rating === 'poor') score -= 30;
    else if (lcp.rating === 'needs-improvement') score -= 15;

    return Math.max(score, 0);
  }

  // Enable/disable specific reporting
  configure(config: Partial<WebVitalsConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create and export singleton instance
export const webVitals = new WebVitalsService();

// Export types for external use
export type { PerformanceEntry, WebVitalsConfig };
export default webVitals;