/**
 * Application Entry Point
 * Initializes Sentry, sets up error boundaries, and renders the React app
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './utils/apiDebugger.tsx'; // Load API debugger for console testing
import { initSentry } from './lib/sentry';
import { getSentryConfig } from './lib/sentry/config';
import { SentryErrorBoundary } from './components/ErrorBoundary';

// Global error handler to catch and suppress AbortErrors
// This must be set up BEFORE Sentry initialization
const isAbortError = (error: any): boolean => {
  if (!error) return false;
  
  return (
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED' ||
    error.message?.includes('aborted') ||
    error.message?.includes('canceled') ||
    error.message?.includes('signal is aborted') ||
    String(error).includes('AbortError') ||
    String(error).includes('canceled')
  );
};

// Handle unhandled promise rejections (most common for AbortErrors)
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  if (isAbortError(error)) {
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
});

// Handle regular errors
window.addEventListener('error', (event) => {
  const error = event.error;
  
  if (isAbortError(error)) {
    event.preventDefault(); // Prevent the error from being logged
    return;
  }
});

// Initialize Sentry early, before React renders
// This ensures error tracking is available from the start
const sentryConfig = getSentryConfig();
if (sentryConfig) {
  try {
    initSentry(sentryConfig);
  } catch (error) {
    // Log initialization error but don't block app startup
    console.error('[Sentry] Failed to initialize:', error);
  }
}

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure index.html has a div with id="root"');
}

// Render application
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SentryErrorBoundary>
      <App />
    </SentryErrorBoundary>
  </React.StrictMode>
);
