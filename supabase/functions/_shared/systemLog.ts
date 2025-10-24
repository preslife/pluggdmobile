const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
} as const;

type LogLevelName = keyof typeof LOG_LEVELS;

export const generateCorrelationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

interface SystemLogBase {
  component: string;
  feature?: string;
  userId?: string | null;
  correlationId?: string;
  message?: string;
}

interface InsertOptions extends SystemLogBase {
  client: any;
  action: string;
  level?: LogLevelName;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

const toErrorMetadata = (error: unknown) => {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
};

export const insertSystemLog = async ({
  client,
  component,
  feature,
  userId,
  correlationId,
  message = 'Edge function event',
  action,
  level = 'info',
  metadata,
  error,
}: InsertOptions) => {
  try {
    await client.from('system_logs').insert({
      level: LOG_LEVELS[level],
      message,
      component,
      action,
      user_id: userId ?? null,
      metadata: {
        ...(metadata ?? {}),
        ...(feature ? { feature } : {}),
        ...(correlationId ? { correlation_id: correlationId } : {}),
        ...(error ? { error: toErrorMetadata(error) } : {}),
      },
    });
  } catch (insertError) {
    console.error('[systemLog] insert_failed', {
      component,
      action,
      error: insertError instanceof Error ? insertError.message : insertError,
    });
  }
};

export const createSystemLogger = (client: any, base: SystemLogBase) => {
  const correlationId = base.correlationId ?? generateCorrelationId();

  const info = (action: string, metadata?: Record<string, unknown>) =>
    insertSystemLog({ client, action, metadata, correlationId, level: 'info', ...base });

  const warn = (action: string, metadata?: Record<string, unknown>) =>
    insertSystemLog({ client, action, metadata, correlationId, level: 'warn', ...base });

  const error = (action: string, err: unknown, metadata?: Record<string, unknown>) =>
    insertSystemLog({ client, action, metadata, correlationId, level: 'error', error: err, ...base });

  return {
    correlationId,
    info,
    warn,
    error,
    log: (
      action: string,
      level: LogLevelName,
      metadata?: Record<string, unknown>,
      err?: unknown,
    ) => insertSystemLog({ client, action, metadata, correlationId, level, error: err, ...base }),
  };
};

export type SystemLogger = ReturnType<typeof createSystemLogger>;
