import { useMemo, useRef } from 'react';
import baseLogger, { Logger, LogLevel } from '@/lib/logger';

export type LogMetadata = Record<string, unknown>;

export interface UseLoggerOptions {
  component?: string;
  feature?: string;
  view?: string;
  metadata?: LogMetadata;
  level?: LogLevel;
  correlationId?: string;
}

export interface ComponentLogger {
  logger: Logger;
  logDebug: (event: string, metadata?: LogMetadata) => Promise<void>;
  logEvent: (event: string, metadata?: LogMetadata) => Promise<void>;
  logWarn: (event: string, metadata?: LogMetadata) => Promise<void>;
  logError: (event: string, error: unknown, metadata?: LogMetadata) => Promise<void>;
  logUserAction: (action: string, metadata?: LogMetadata) => Promise<void>;
  logPerformance: (metric: string, durationMs: number, metadata?: LogMetadata) => Promise<void>;
  logApiCall: (
    method: string,
    endpoint: string,
    durationMs: number,
    status?: number,
    metadata?: LogMetadata,
  ) => Promise<void>;
  trackPromise: <T>(event: string, operation: () => Promise<T>, metadata?: LogMetadata) => Promise<T>;
  correlationId: string;
}

const normaliseError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error(JSON.stringify(error));
};

const mergeMetadata = (
  base: LogMetadata | undefined,
  extra: LogMetadata | undefined,
): LogMetadata | undefined => {
  if (!base && !extra) return undefined;
  return { ...(base ?? {}), ...(extra ?? {}) };
};

const generateCorrelationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const useLogger = (options: UseLoggerOptions = {}): ComponentLogger => {
  const { component = 'unknown_component', feature, view, metadata, level, correlationId: providedCorrelationId } = options;

  const correlationRef = useRef<string>();
  if (!correlationRef.current) {
    correlationRef.current = providedCorrelationId ?? generateCorrelationId();
  }
  const correlationId = correlationRef.current;

  const metadataKey = useMemo(() => JSON.stringify(metadata ?? {}), [metadata]);

  return useMemo(() => {
    const context: LogMetadata = {
      component,
      ...(feature ? { feature } : {}),
      ...(view ? { view } : {}),
      correlation_id: correlationId,
      ...(metadata ?? {}),
    };

    const childLogger = baseLogger.child(context);
    if (typeof level === 'number') {
      childLogger.setLevel(level);
    }

    const logDebug = (event: string, extra?: LogMetadata) =>
      childLogger.debug(event, mergeMetadata(context, extra));

    const logEvent = (event: string, extra?: LogMetadata) =>
      childLogger.info(event, mergeMetadata(context, extra));

    const logWarn = (event: string, extra?: LogMetadata) =>
      childLogger.warn(event, mergeMetadata(context, extra));

    const logError = (event: string, error: unknown, extra?: LogMetadata) =>
      childLogger.error(event, mergeMetadata(context, extra), normaliseError(error));

    const logUserAction = (action: string, extra?: LogMetadata) =>
      childLogger.userAction(action, component, mergeMetadata(context, extra));

    const logPerformance = (metric: string, durationMs: number, extra?: LogMetadata) =>
      childLogger.performance(metric, durationMs, mergeMetadata(context, { ...extra, durationMs }));

    const logApiCall = (
      method: string,
      endpoint: string,
      durationMs: number,
      status?: number,
      extra?: LogMetadata,
    ) => childLogger.apiCall(method, endpoint, durationMs, status, mergeMetadata(context, extra));

    const trackPromise = async <T,>(
      event: string,
      operation: () => Promise<T>,
      extra?: LogMetadata,
    ): Promise<T> => {
      const start = Date.now();
      await logEvent(`${event}_start`, extra);
      try {
        const result = await operation();
        const durationMs = Date.now() - start;
        await logEvent(`${event}_success`, mergeMetadata({ durationMs }, extra));
        return result;
      } catch (error) {
        const durationMs = Date.now() - start;
        await logError(`${event}_error`, error, mergeMetadata({ durationMs }, extra));
        throw error;
      }
    };

    return {
      logger: childLogger,
      logDebug,
      logEvent,
      logWarn,
      logError,
      logUserAction,
      logPerformance,
      logApiCall,
      trackPromise,
      correlationId,
    };
  }, [component, feature, view, level, metadataKey, correlationId]);
};

export default useLogger;
