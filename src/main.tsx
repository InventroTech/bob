/**
 * Application Entry Point
 * Initializes Sentry, sets up error boundaries, and renders the React app
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './hooks/useAuth.tsx';
import './utils/apiDebugger.tsx'; // Load API debugger for console testing
import { initSentry } from './lib/sentry';
import { getSentryConfig } from './lib/sentry/config';
import { SentryErrorBoundary } from './components/ErrorBoundary';

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
      <AuthProvider>
        <App />
      </AuthProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
);
