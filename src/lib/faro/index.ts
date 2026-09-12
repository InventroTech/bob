/**
 * Grafana Faro initialization
 * Sends frontend errors, logs, web vitals, and optional traces to Grafana Cloud
 */

import {
  faro,
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import type { FaroConfig } from './config';

/**
 * Initialize Faro early (before React renders), same timing as Sentry.
 */
export function initFaro(config: FaroConfig): void {
  const { url, appName, appVersion, environment, enableTracing } = config;

  initializeFaro({
    url,
    app: {
      name: appName,
      version: appVersion,
      environment,
    },
    // Avoid feedback loops / noise from our own collectors
    ignoreUrls: [
      /faro-collector/i,
      /\/collect\//i,
      /sentry\.io/i,
    ],
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),
      ...(enableTracing ? [new TracingInstrumentation()] : []),
    ],
  });

  if (environment === 'development' || import.meta.env.MODE === 'development') {
    console.log('[Faro] Initialized', {
      appName,
      environment,
      tracingEnabled: enableTracing,
    });
  }
}

/**
 * Set user context when the user logs in
 */
export function setFaroUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  if (!faro.api) return;

  faro.api.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  if (import.meta.env.MODE === 'development') {
    console.log('[Faro] User context set:', { id: user.id, email: user.email });
  }
}

/**
 * Clear user context on logout
 */
export function clearFaroUser(): void {
  if (!faro.api) return;

  faro.api.resetUser();

  if (import.meta.env.MODE === 'development') {
    console.log('[Faro] User context cleared');
  }
}

export { getFaroConfig } from './config';
