/**
 * Sentry Configuration
 * Centralized configuration for Sentry error tracking and session replay
 */

/**
 * Sentry configuration interface
 */
export interface SentryConfig {
  dsn: string;
  environment: string;
  enableReplay: boolean;
  replaySampleRate: number;
  errorSampleRate: number;
  tracesSampleRate: number;
  release?: string;
}

/**
 * Default sample rates based on environment
 */
const getDefaultSampleRates = (environment: string) => {
  const isProduction = environment === 'production';
  
  return {
    // Lower sample rates in production to reduce costs
    replaySampleRate: isProduction ? 0.1 : 1.0,
    errorSampleRate: 1.0, // Always capture errors
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  };
};

/**
 * Parse and validate environment variables for Sentry configuration
 */
export const getSentryConfig = (): SentryConfig | null => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // If DSN is not provided, Sentry should not be initialized
  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') {
    return null;
  }

  const environment = import.meta.env.MODE || import.meta.env.NODE_ENV || 'development';
  const defaultRates = getDefaultSampleRates(environment);

  // Parse sample rates with validation
  const parseSampleRate = (value: string | undefined, defaultValue: number): number => {
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    // Validate range [0, 1]
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      console.warn(`Invalid sample rate: ${value}. Using default: ${defaultValue}`);
      return defaultValue;
    }
    return parsed;
  };

  return {
    dsn: dsn.trim(),
    environment,
    enableReplay: import.meta.env.VITE_SENTRY_ENABLE_REPLAY !== 'false',
    replaySampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE,
      defaultRates.replaySampleRate
    ),
    errorSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_ERROR_SAMPLE_RATE,
      defaultRates.errorSampleRate
    ),
    tracesSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
      defaultRates.tracesSampleRate
    ),
    release: import.meta.env.VITE_SENTRY_RELEASE,
  };
};

