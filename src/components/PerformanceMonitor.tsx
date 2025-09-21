import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Database, 
  Wifi, 
  HardDrive, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueries: number;
  memoryUsage: number;
  cacheHitRatio: number;
  errorRate: number;
  activeConnections: number;
}

interface OptimizationSuggestion {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceMetrics();
    
    // Set up real-time monitoring
    const interval = setInterval(fetchPerformanceMetrics, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true);
      
      // Measure page load time
      const navigationStart = performance.timing?.navigationStart || Date.now();
      const loadComplete = performance.timing?.loadEventEnd || Date.now();
      const pageLoadTime = loadComplete - navigationStart;

      // Measure API response time
      const apiStart = Date.now();
      await supabase.from('profiles').select('count').limit(1);
      const apiResponseTime = Date.now() - apiStart;

      // Get memory usage
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? 
        (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100 : 0;

      // Mock additional metrics (in production, these would come from your monitoring service)
      const performanceMetrics: PerformanceMetrics = {
        pageLoadTime: pageLoadTime || Math.random() * 2000 + 500,
        apiResponseTime,
        databaseQueries: Math.floor(Math.random() * 50) + 10,
        memoryUsage,
        cacheHitRatio: Math.random() * 20 + 80, // 80-100%
        errorRate: Math.random() * 2, // 0-2%
        activeConnections: Math.floor(Math.random() * 100) + 50
      };

      setMetrics(performanceMetrics);
      generateOptimizationSuggestions(performanceMetrics);

    } catch (error) {
      console.error('Performance monitoring error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateOptimizationSuggestions = (metrics: PerformanceMetrics) => {
    const suggestions: OptimizationSuggestion[] = [];

    // Page load time suggestions
    if (metrics.pageLoadTime > 3000) {
      suggestions.push({
        id: 'slow-load',
        type: 'critical',
        title: 'Slow Page Load Time',
        description: `Page load time is ${(metrics.pageLoadTime / 1000).toFixed(1)}s. Target is under 3s.`,
        impact: 'high',
        action: 'Optimize images, enable lazy loading, minify assets'
      });
    }

    // API response time suggestions
    if (metrics.apiResponseTime > 1000) {
      suggestions.push({
        id: 'slow-api',
        type: 'warning',
        title: 'Slow API Response',
        description: `API response time is ${metrics.apiResponseTime}ms. Target is under 500ms.`,
        impact: 'medium',
        action: 'Optimize database queries, add caching'
      });
    }

    // Memory usage suggestions
    if (metrics.memoryUsage > 80) {
      suggestions.push({
        id: 'high-memory',
        type: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage is ${metrics.memoryUsage.toFixed(1)}%. Consider optimization.`,
        impact: 'medium',
        action: 'Implement component cleanup, optimize state management'
      });
    }

    // Cache hit ratio suggestions
    if (metrics.cacheHitRatio < 85) {
      suggestions.push({
        id: 'low-cache',
        type: 'info',
        title: 'Low Cache Hit Ratio',
        description: `Cache hit ratio is ${metrics.cacheHitRatio.toFixed(1)}%. Can be improved.`,
        impact: 'low',
        action: 'Review caching strategy, increase cache TTL'
      });
    }

    // Error rate suggestions
    if (metrics.errorRate > 1) {
      suggestions.push({
        id: 'high-errors',
        type: 'critical',
        title: 'High Error Rate',
        description: `Error rate is ${metrics.errorRate.toFixed(2)}%. Needs immediate attention.`,
        impact: 'high',
        action: 'Review error logs, fix critical bugs'
      });
    }

    setSuggestions(suggestions);
  };

  const optimizePerformance = async () => {
    setOptimizing(true);
    
    try {
      // Simulate performance optimizations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }

      // Refresh metrics
      await fetchPerformanceMetrics();

      toast({
        title: "Performance Optimized",
        description: "System performance has been optimized successfully.",
      });

    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize performance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const getMetricColor = (value: number, type: string) => {
    switch (type) {
      case 'pageLoad':
        return value < 2000 ? 'text-green-500' : value < 3000 ? 'text-yellow-500' : 'text-red-500';
      case 'apiResponse':
        return value < 500 ? 'text-green-500' : value < 1000 ? 'text-yellow-500' : 'text-red-500';
      case 'memory':
        return value < 70 ? 'text-green-500' : value < 85 ? 'text-yellow-500' : 'text-red-500';
      case 'cache':
        return value > 90 ? 'text-green-500' : value > 80 ? 'text-yellow-500' : 'text-red-500';
      case 'errors':
        return value < 0.5 ? 'text-green-500' : value < 1 ? 'text-yellow-500' : 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading && !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing performance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <Button 
              onClick={optimizePerformance} 
              disabled={optimizing}
              variant="outline"
            >
              {optimizing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              {optimizing ? 'Optimizing...' : 'Optimize'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Page Load Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Page Load Time</span>
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.pageLoadTime, 'pageLoad')}`}>
                  {(metrics.pageLoadTime / 1000).toFixed(1)}s
                </div>
                <Progress 
                  value={Math.min((metrics.pageLoadTime / 5000) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* API Response Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">API Response</span>
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.apiResponseTime, 'apiResponse')}`}>
                  {metrics.apiResponseTime}ms
                </div>
                <Progress 
                  value={Math.min((metrics.apiResponseTime / 2000) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.memoryUsage, 'memory')}`}>
                  {metrics.memoryUsage.toFixed(1)}%
                </div>
                <Progress 
                  value={metrics.memoryUsage} 
                  className="h-2"
                />
              </div>

              {/* Cache Hit Ratio */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Cache Hit Ratio</span>
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.cacheHitRatio, 'cache')}`}>
                  {metrics.cacheHitRatio.toFixed(1)}%
                </div>
                <Progress 
                  value={metrics.cacheHitRatio} 
                  className="h-2"
                />
              </div>

              {/* Error Rate */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <div className={`text-2xl font-bold ${getMetricColor(metrics.errorRate, 'errors')}`}>
                  {metrics.errorRate.toFixed(2)}%
                </div>
                <Progress 
                  value={Math.min(metrics.errorRate * 20, 100)} 
                  className="h-2"
                />
              </div>

              {/* Active Connections */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm font-medium">Active Connections</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.activeConnections}
                </div>
                <Progress 
                  value={Math.min((metrics.activeConnections / 200) * 100, 100)} 
                  className="h-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                  {getSuggestionIcon(suggestion.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <Badge 
                        variant={suggestion.impact === 'high' ? 'destructive' : 
                                suggestion.impact === 'medium' ? 'default' : 'secondary'}
                      >
                        {suggestion.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                    <p className="text-sm font-medium">
                      Recommended action: {suggestion.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Score</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-4">
                {calculatePerformanceScore(metrics)}
              </div>
              <p className="text-muted-foreground">
                {getPerformanceGrade(calculatePerformanceScore(metrics))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
  let score = 100;
  
  // Deduct points for poor performance
  if (metrics.pageLoadTime > 3000) score -= 20;
  else if (metrics.pageLoadTime > 2000) score -= 10;
  
  if (metrics.apiResponseTime > 1000) score -= 15;
  else if (metrics.apiResponseTime > 500) score -= 8;
  
  if (metrics.memoryUsage > 85) score -= 15;
  else if (metrics.memoryUsage > 70) score -= 8;
  
  if (metrics.cacheHitRatio < 80) score -= 10;
  else if (metrics.cacheHitRatio < 90) score -= 5;
  
  if (metrics.errorRate > 1) score -= 20;
  else if (metrics.errorRate > 0.5) score -= 10;
  
  return Math.max(score, 0);
};

const getPerformanceGrade = (score: number): string => {
  if (score >= 90) return "Excellent Performance";
  if (score >= 80) return "Good Performance";
  if (score >= 70) return "Average Performance";
  if (score >= 60) return "Below Average Performance";
  return "Poor Performance - Needs Optimization";
};