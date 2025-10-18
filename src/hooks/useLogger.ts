import { useMemo } from 'react';
import baseLogger, { Logger, LogLevel } from '@/lib/logger';

export type LogMetadata = Record<string, unknown>;

export interface UseLoggerOptions {
  component?: string;
  feature?: string;
  view?: string;
  metadata?: LogMetadata;
  level?: LogLevel;
}

export interface ComponentLogger {
  logger: Logger;
  logDebug: (event: string, metadata?: LogMetadata) => Promise<void>;
  logEvent: (event: string, metadata?: LogMetadata) => Promise<void>;
  logWarn: (event: string, metadata?: LogMetadata) => Promise<void>;
  logError: (event: string, error: unknown, metadata?: LogMetadata) => Promise<void>;
  logUserAction: (action: string, metadata?: LogMetadata) => Promise<void>;
  logPerformance: (metric: string, durationMs: number, metadata?: LogMetadata) => Promise<void>;
  trackPromise: <T>(event: string, operation: () => Promise<T>, metadata?: LogMetadata) => Promise<T>;
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

export const useLogger = (options: UseLoggerOptions = {}): ComponentLogger => {
  const { component = 'unknown_component', feature, view, metadata, level } = options;

  const metadataKey = useMemo(() => JSON.stringify(metadata ?? {}), [metadata]);

  return useMemo(() => {
    const context: LogMetadata = {
      component,
      ...(feature ? { feature } : {}),
      ...(view ? { view } : {}),
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
      trackPromise,
    };
  }, [component, feature, view, level, metadataKey]);
};

export default useLogger;
