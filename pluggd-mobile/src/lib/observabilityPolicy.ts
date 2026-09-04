export type ObservabilityBreadcrumb = {
  data?: Record<string, unknown>;
};

const SENSITIVE_DATA_KEY = /authorization|cookie|email|password|secret|token/i;

/**
 * Keep route and request-path diagnostics while removing query strings,
 * fragments, credentials, and common secret-bearing breadcrumb properties.
 */
export function sanitizeObservabilityUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

export function sanitizeObservabilityBreadcrumb<T extends ObservabilityBreadcrumb>(
  breadcrumb: T,
): T {
  if (!breadcrumb.data) return breadcrumb;

  const data = Object.fromEntries(
    Object.entries(breadcrumb.data)
      .filter(([key]) => !SENSITIVE_DATA_KEY.test(key))
      .map(([key, value]) => [
        key,
        key.toLowerCase() === 'url' && typeof value === 'string'
          ? sanitizeObservabilityUrl(value)
          : value,
      ]),
  );

  return { ...breadcrumb, data };
}
