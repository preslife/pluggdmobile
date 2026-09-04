import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import { APP_ENVIRONMENT, IS_PRODUCTION } from '../config/environment';
import { sanitizeObservabilityBreadcrumb } from './observabilityPolicy';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

export const IS_OBSERVABILITY_CONFIGURED = Boolean(SENTRY_DSN);

let initialized = false;

/**
 * Initialize crash and JS error reporting only when the public Sentry DSN is
 * present. Source-map upload credentials remain build-only EAS secrets.
 */
export function initializeObservability(): void {
  if (initialized || !SENTRY_DSN) return;

  initialized = true;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENVIRONMENT,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableLogs: false,
    sampleRate: 1,
    tracesSampleRate: IS_PRODUCTION ? 0.05 : 0,
    beforeBreadcrumb: sanitizeObservabilityBreadcrumb,
  });
}

/**
 * Sentry's wrapper installs the root React error boundary and native tracing.
 * Without a DSN the original component is returned, keeping local and App
 * Store behavior unchanged until the monitoring project is provisioned.
 */
export function observeRootComponent<P extends Record<string, unknown>>(
  RootComponent: ComponentType<P>,
): ComponentType<P> {
  return IS_OBSERVABILITY_CONFIGURED ? Sentry.wrap(RootComponent) : RootComponent;
}

export function captureException(error: unknown): void {
  if (IS_OBSERVABILITY_CONFIGURED) {
    Sentry.captureException(error);
  }
}
