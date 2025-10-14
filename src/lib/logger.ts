import { supabase } from '@/integrations/supabase/client';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  error?: Error;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalEntries: number;
  batchSize: number;
  flushInterval: number; // milliseconds
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableRemote: true,
      enableLocalStorage: true,
      maxLocalEntries: 1000,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
    
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      
      // Capture unhandled errors
      window.addEventListener('error', (event) => {
        this.error('Unhandled Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', {
          reason: event.reason,
          stack: event.reason?.stack
        });
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getCurrentUser() {
    const auth = (supabase as any)?.auth;
    if (!auth || typeof auth.getUser !== 'function') {
      return null;
    }

    try {
      const { data: { user } } = await auth.getUser();
      return user;
    } catch {
      return null;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel;
  }

  private async createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): Promise<LogEntry> {
    const user = await this.getCurrentUser();
    
    return {
      level,
      message,
      timestamp: new Date(),
      userId: user?.id,
      sessionId: this.sessionId,
      metadata,
      error,
      stack: error?.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...metadata
    };
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const levelColors = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#DC2626'];
    
    const timestamp = entry.timestamp.toISOString();
    const levelName = levelNames[entry.level];
    const color = levelColors[entry.level];
    
    const prefix = `%c[${timestamp}] ${levelName}`;
    const style = `color: ${color}; font-weight: bold;`;
    
    const args = [prefix, style, entry.message];
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      args.push('\nMetadata:', entry.metadata);
    }
    
    if (entry.error) {
      args.push('\nError:', entry.error);
    }

    if (entry.level >= LogLevel.ERROR) {
      console.error(...args);
    } else if (entry.level >= LogLevel.WARN) {
      console.warn(...args);
    } else {
      console.log(...args);
    }
  }

  private saveToLocalStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') return;

    try {
      const storageKey = 'pluggd_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      existingLogs.push({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      });

      // Keep only the most recent entries
      if (existingLogs.length > this.config.maxLocalEntries) {
        existingLogs.splice(0, existingLogs.length - this.config.maxLocalEntries);
      }

      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      console.warn('Failed to save log to localStorage:', error);
    }
  }

  private queueForRemote(entry: LogEntry): void {
    if (!this.config.enableRemote || !this.canSendToRemote()) return;

    this.logQueue.push(entry);

    if (this.logQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private async sendLogsToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.canSendToRemote()) {
      return;
    }

    try {
      const table = (supabase as any)?.from?.('system_logs');
      if (!table || typeof table.insert !== 'function') {
        return;
      }

      const logsForSupabase = entries.map(entry => ({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        user_id: entry.userId,
        session_id: entry.sessionId,
        component: entry.component,
        action: entry.action,
        metadata: {
          ...entry.metadata,
          userAgent: entry.userAgent,
          url: entry.url,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          } : undefined
        }
      }));

      await table.insert(logsForSupabase);
    } catch (error) {
      console.warn('Failed to send logs to remote:', error);
      // Re-queue the entries for retry
      this.logQueue.unshift(...entries);
    }
  }

  private canSendToRemote(): boolean {
    const client = supabase as any;
    return !!client && typeof client.from === 'function';
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private async log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry = await this.createLogEntry(level, message, metadata, error);

    this.logToConsole(entry);
    this.saveToLocalStorage(entry);
    this.queueForRemote(entry);
  }

  // Public logging methods
  debug(message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): Promise<void> {
    return this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>, error?: Error): Promise<void> {
    return this.log(LogLevel.ERROR, message, metadata, error);
  }

  critical(message: string, metadata?: Record<string, any>, error?: Error): Promise<void> {
    return this.log(LogLevel.CRITICAL, message, metadata, error);
  }

  // Specialized logging methods
  userAction(action: string, component: string, metadata?: Record<string, any>): Promise<void> {
    return this.info(`User Action: ${action}`, {
      ...metadata,
      component,
      action,
      category: 'user_action'
    });
  }

  apiCall(method: string, endpoint: string, duration: number, status?: number, metadata?: Record<string, any>): Promise<void> {
    const level = status && status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    return this.log(level, `API Call: ${method} ${endpoint}`, {
      ...metadata,
      method,
      endpoint,
      duration,
      status,
      category: 'api_call'
    });
  }

  performance(metric: string, value: number, metadata?: Record<string, any>): Promise<void> {
    return this.info(`Performance: ${metric}`, {
      ...metadata,
      metric,
      value,
      category: 'performance'
    });
  }

  security(event: string, metadata?: Record<string, any>): Promise<void> {
    return this.warn(`Security Event: ${event}`, {
      ...metadata,
      event,
      category: 'security'
    });
  }

  // Utility methods
  async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const entries = [...this.logQueue];
    this.logQueue = [];

    await this.sendLogsToRemote(entries);
  }

  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Get logs from localStorage for debugging
  getLocalLogs(): any[] {
    if (typeof localStorage === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem('pluggd_logs') || '[]');
    } catch {
      return [];
    }
  }

  clearLocalLogs(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pluggd_logs');
    }
  }

  // Create a child logger with additional context
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.config);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger.log = async (level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error) => {
      return originalLog(level, message, { ...context, ...metadata }, error);
    };
    
    return childLogger;
  }
}

// Create and export default logger instance
export const logger = new Logger({
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
});

// Export types and logger class for advanced usage
export { Logger };
export default logger;
