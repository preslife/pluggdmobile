import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { logger } from '@/lib/logger';
import { sentry } from '@/lib/sentry';
import useAnalytics from '@/hooks/useAnalytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level: 'page' | 'component' | 'feature';
  name: string;
  enableReporting?: boolean;
  enableRetry?: boolean;
  enableFeedback?: boolean;
  enableDiagnostics?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  showDiagnostics: boolean;
  errorReported: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private analytics = useAnalytics();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDiagnostics: false,
      errorReported: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    this.reportError(error, errorInfo);
    
    // Call custom onError handler
    this.props.onError?.(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    if (this.state.errorReported || !this.props.enableReporting) return;

    try {
      // Get additional context
      const context = {
        level: this.props.level,
        name: this.props.name,
        retryCount: this.state.retryCount,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      };

      // Log to custom logger
      await logger.critical('Error Boundary caught error', context, error);

      // Report to Sentry
      if (sentry.isInitialized()) {
        sentry.captureException(error, {
          ...context,
          errorInfo
        });
      }

      // Track analytics event
      this.analytics.trackError('error_boundary', error.message, context);

      this.setState({ errorReported: true });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    if (!this.props.enableRetry) return;

    const newRetryCount = this.state.retryCount + 1;
    
    logger.info('Error boundary retry attempted', {
      level: this.props.level,
      name: this.props.name,
      retryCount: newRetryCount,
      errorId: this.state.errorId
    });

    this.analytics.track('error_boundary_retry', {
      level: this.props.level,
      name: this.props.name,
      retryCount: newRetryCount
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: newRetryCount,
      showDiagnostics: false,
      errorReported: false
    });
  };

  private handleReload = () => {
    logger.info('Error boundary page reload', {
      level: this.props.level,
      name: this.props.name,
      errorId: this.state.errorId
    });

    this.analytics.track('error_boundary_reload', {
      level: this.props.level,
      name: this.props.name
    });

    window.location.reload();
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error || !this.props.enableFeedback) return;

    const bugReport = {
      errorId,
      level: this.props.level,
      name: this.props.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Create a mailto link with error details
    const subject = encodeURIComponent(`Bug Report: Error in ${this.props.name}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Component: ${this.props.name}
Level: ${this.props.level}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Error Message: ${error.message}

Stack Trace:
${error.stack}

Component Stack:
${errorInfo?.componentStack}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@pluggd.com?subject=${subject}&body=${body}`);

    this.analytics.track('error_boundary_bug_report', {
      level: this.props.level,
      name: this.props.name,
      errorId
    });
  };

  private handleDownloadDiagnostics = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!error) return;

    const diagnostics = {
      errorId,
      level: this.props.level,
      name: this.props.name,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount
      },
      localStorage: this.getLocalStorageSnapshot(),
      sessionStorage: this.getSessionStorageSnapshot(),
      logs: logger.getLocalLogs().slice(-50) // Last 50 log entries
    };

    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-diagnostics-${errorId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.analytics.track('error_boundary_diagnostics_download', {
      level: this.props.level,
      name: this.props.name,
      errorId
    });
  };

  private getLocalStorageSnapshot(): Record<string, any> {
    if (typeof localStorage === 'undefined') return {};
    
    try {
      const snapshot: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes('password') && !key.includes('token')) {
          snapshot[key] = localStorage.getItem(key);
        }
      }
      return snapshot;
    } catch {
      return {};
    }
  }

  private getSessionStorageSnapshot(): Record<string, any> {
    if (typeof sessionStorage === 'undefined') return {};
    
    try {
      const snapshot: Record<string, any> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !key.includes('password') && !key.includes('token')) {
          snapshot[key] = sessionStorage.getItem(key);
        }
      }
      return snapshot;
    } catch {
      return {};
    }
  }

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    if (!this.state.error) return 'low';
    
    const errorMessage = this.state.error.message.toLowerCase();
    
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'medium'; // Likely a loading/chunking issue
    }
    
    if (this.props.level === 'page') {
      return 'critical'; // Page-level errors are critical
    }
    
    if (this.state.retryCount > 2) {
      return 'high'; // Repeated failures
    }
    
    return 'medium';
  }

  private getSeverityColor(): string {
    const severity = this.getErrorSeverity();
    switch (severity) {
      case 'low': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const severityColor = this.getSeverityColor();

      return (
        <div className="min-h-[400px] bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl glass-panel animate-fade-in border-destructive/20">
            <CardHeader className="text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive animate-bounce-gentle" />
                <Badge className={`${severityColor} text-white`}>
                  {severity.toUpperCase()}
                </Badge>
              </div>
              <CardTitle className="text-destructive">
                {this.props.level === 'page' ? 'Page Error' : 
                 this.props.level === 'feature' ? 'Feature Error' : 
                 'Component Error'}
              </CardTitle>
              <CardDescription>
                {this.props.level === 'page' 
                  ? 'This page encountered an unexpected error and needs to restart.'
                  : `The ${this.props.name} ${this.props.level} encountered an error.`}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Summary */}
              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-destructive">Error Details</p>
                  {this.state.errorId && (
                    <code className="text-xs text-muted-foreground">
                      ID: {this.state.errorId}
                    </code>
                  )}
                </div>
                <p className="text-sm break-words">
                  {this.state.error?.message || 'An unknown error occurred'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {this.props.enableRetry !== false && (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    className="neon-border"
                    disabled={this.state.retryCount >= 3}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {this.state.retryCount > 0 ? `Retry (${3 - this.state.retryCount} left)` : 'Try Again'}
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  variant="destructive"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>

                {this.props.enableFeedback !== false && (
                  <Button
                    onClick={this.handleReportBug}
                    variant="secondary"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Report Bug
                  </Button>
                )}

                {this.props.enableDiagnostics !== false && (
                  <Button
                    onClick={this.handleDownloadDiagnostics}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Diagnostics
                  </Button>
                )}
              </div>

              {/* Technical Details (Collapsible) */}
              {this.props.enableDiagnostics !== false && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      Technical Details
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 space-y-3">
                      <div className="bg-card p-3 rounded border text-xs font-mono">
                        <p className="font-semibold mb-2">Error Stack:</p>
                        <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.error?.stack}
                        </pre>
                      </div>
                      
                      {this.state.errorInfo?.componentStack && (
                        <div className="bg-card p-3 rounded border text-xs font-mono">
                          <p className="font-semibold mb-2">Component Stack:</p>
                          <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      <div className="bg-card p-3 rounded border text-xs">
                        <p className="font-semibold mb-2">Context:</p>
                        <ul className="space-y-1">
                          <li><strong>Level:</strong> {this.props.level}</li>
                          <li><strong>Component:</strong> {this.props.name}</li>
                          <li><strong>Retry Count:</strong> {this.state.retryCount}</li>
                          <li><strong>URL:</strong> {window.location.href}</li>
                          <li><strong>Time:</strong> {new Date().toISOString()}</li>
                        </ul>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please{' '}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={this.handleReportBug}
                  >
                    <Mail className="mr-1 h-3 w-3" />
                    contact support
                  </Button>
                  {' '}with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withEnhancedErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<Props, 'children'> = { level: 'component', name: 'Unknown' }
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...options}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );
  
  WrappedComponent.displayName = `withEnhancedErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};