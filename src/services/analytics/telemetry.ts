import { logger } from '@/lib/logger';

export type TelemetryPayload = Record<string, any>;

class TelemetryService {
  private readonly component = 'commerce.telemetry';

  track(event: string, metadata: TelemetryPayload = {}): void {
    void logger.info(`telemetry:${event}`, {
      ...metadata,
      component: this.component,
      event,
    });
  }

  store(event: string, metadata: TelemetryPayload = {}): void {
    this.track(`store.${event}`, metadata);
  }

  checkout(event: string, metadata: TelemetryPayload = {}): void {
    this.track(`checkout.${event}`, metadata);
  }
}

export const telemetry = new TelemetryService();
