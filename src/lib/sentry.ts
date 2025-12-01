/**
 * Sentry Module
 * Re-exports from the new modular structure for backward compatibility
 */

export { initSentry, setSentryUser, clearSentryUser, addBreadcrumb, Sentry } from './sentry/index';
export { getSentryConfig, type SentryConfig } from './sentry/config';

