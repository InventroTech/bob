/**
 * Sentry Initialization
 * Centralized Sentry setup with best practices
 */

import * as Sentry from "@sentry/react";
import type { SentryConfig } from "./config";

/**
 * Common errors that should be ignored (not actionable)
 */
const IGNORED_ERRORS = [
  // Browser extension errors
  "top.GLOBALS",
  "originalCreateNotification",
  "canvas.contentDocument",
  "MyApp_RemoveAllHighlights",
  "atomicFindClose",
  // Network errors that are not actionable
  "NetworkError",
  "Network request failed",
  "Failed to fetch",
  // ResizeObserver errors (common browser quirk, not actionable)
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  // Chrome extension errors
  "chrome-extension://",
  "moz-extension://",
] as const;

/**
 * URLs that should be denied from error tracking
 */
const DENIED_URLS = [
  // Browser extensions
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  // Browser internals
  /^about:/i,
] as const;

/**
 * Sanitize error event before sending to Sentry
 * Removes sensitive data and filters unwanted errors
 */
const sanitizeEvent = (event: Sentry.ErrorEvent, hint: Sentry.EventHint): Sentry.ErrorEvent | null => {
  // Filter ignored errors
  if (event.exception) {
    const errorMessage = event.exception.values?.[0]?.value || '';
    if (IGNORED_ERRORS.some(ignored => errorMessage.includes(ignored))) {
      return null; // Drop the event
    }
  }

  // Filter by URL
  if (event.request?.url) {
    if (DENIED_URLS.some(pattern => pattern.test(event.request!.url!))) {
      return null; // Drop the event
    }
  }

  // Remove sensitive data from user context if needed
  // This is a placeholder - customize based on your needs
  if (event.user) {
    // Don't send full user objects, only IDs
    event.user = {
      id: event.user.id,
      // Explicitly exclude sensitive fields
    };
  }

  return event;
};

/**
 * Initialize Sentry with replay functionality
 * 
 * @param config - Sentry configuration object
 * @throws {Error} If DSN is invalid
 */
export function initSentry(config: SentryConfig): void {
  const {
    dsn,
    environment,
    enableReplay,
    replaySampleRate,
    errorSampleRate,
    tracesSampleRate,
    release,
  } = config;

  // Validate DSN format (basic validation)
  // DSN format: https://<key>@<host>/<project-id>
  if (!dsn.startsWith('https://') || !dsn.includes('@')) {
    throw new Error('Invalid Sentry DSN format. Expected format: https://<key>@<host>/<project-id>');
  }

  const integrations: Array<
    | ReturnType<typeof Sentry.browserTracingIntegration>
    | ReturnType<typeof Sentry.replayIntegration>
    | ReturnType<typeof Sentry.captureConsoleIntegration>
    | ReturnType<typeof Sentry.httpClientIntegration>
  > = [
    // Standard error tracking integrations
    // Note: Global error and unhandled rejection tracking are enabled by default
    Sentry.captureConsoleIntegration({
      levels: ['error'], // Only capture console.error, not warnings/info
    }),
    Sentry.httpClientIntegration({
      // Capture HTTP errors
      failedRequestStatusCodes: [[400, 599]], // Capture 4xx and 5xx errors
      failedRequestTargets: [/.*/], // Capture all failed requests
    }),
    // Performance monitoring
    Sentry.browserTracingIntegration({
      // Trace navigation
      enableInp: true, // Interaction to Next Paint
    }),
  ];

  // Add replay integration if enabled
  if (enableReplay) {
    integrations.push(
      Sentry.replayIntegration({
        // Privacy settings - mask sensitive content
        maskAllText: true,
        blockAllMedia: false,
        // Performance settings
        networkDetailAllowUrls: [
          // Only capture network details for your API endpoints
          window.location.origin,
        ],
        networkCaptureBodies: false, // Don't capture request/response bodies
      })
    );
  }

  Sentry.init({
    dsn,
    environment,
    release,
    
    // Integrations
    integrations,
    
    // Performance Monitoring
    tracesSampleRate,
    
    // Session Replay Configuration
    replaysSessionSampleRate: enableReplay ? replaySampleRate : 0,
    replaysOnErrorSampleRate: enableReplay ? errorSampleRate : 0,
    
    // Event processing
    beforeSend: sanitizeEvent,
    
    // Error filtering
    ignoreErrors: [...IGNORED_ERRORS],
    denyUrls: [...DENIED_URLS],
    
    // Additional options
    sendDefaultPii: false, // Don't send PII by default
    
    // Debug mode (only in development)
    debug: environment === 'development' && import.meta.env.VITE_SENTRY_DEBUG === 'true',
  });

  // Log initialization (only in development)
  if (environment === 'development') {
    console.log('[Sentry] Initialized', {
      environment,
      replayEnabled: enableReplay,
      replaySampleRate,
      errorSampleRate,
      tracesSampleRate,
    });
  }
}

/**
 * Set user context for Sentry
 * Use this when user logs in
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  const userContext = {
    id: user.id,
    email: user.email,
    username: user.username,
  };
  
  Sentry.setUser(userContext);
  
  // Log in development to verify user context is being set
  if (import.meta.env.MODE === 'development') {
    console.log('[Sentry] User context set:', userContext);
  }
}

/**
 * Clear user context
 * Use this when user logs out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  
  // Log in development to verify user context is being cleared
  if (import.meta.env.MODE === 'development') {
    console.log('[Sentry] User context cleared');
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel
): void {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}

// Re-export Sentry for convenience
export { Sentry };

