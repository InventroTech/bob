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

const isChunkLoadError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  );
};

const RELOAD_KEY = 'pyro_chunk_reload';

function handleChunkError() {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  if (Date.now() - lastReload < 10_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
}

// Handle unhandled promise rejections (most common for AbortErrors)
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  if (isAbortError(error)) {
    event.preventDefault();
    return;
  }

  if (isChunkLoadError(error)) {
    event.preventDefault();
    handleChunkError();
    return;
  }
});

// Handle regular errors
window.addEventListener('error', (event) => {
  const error = event.error;
  
  if (isAbortError(error)) {
    event.preventDefault();
    return;
  }

  if (isChunkLoadError(error)) {
    event.preventDefault();
    handleChunkError();
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
