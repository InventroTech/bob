/**
 * Error Boundary Component
 * Provides a user-friendly error UI when React errors occur
 */

import React from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorFallbackProps {
  error: unknown;
  resetError: () => void;
}

/**
 * Error Fallback UI Component
 * Displays a user-friendly error message with recovery options
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportError = () => {
    // Error is already reported to Sentry via ErrorBoundary
    // This is just for user feedback
    alert('Error has been reported. Thank you for your patience.');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#212529',
            }}
          >
            Something went wrong
          </h3>
          <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: '#dc3545',
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            <strong>Error:</strong> {errorMessage}
          </p>
          {errorStack && import.meta.env.MODE === 'development' && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: '#6c757d',
                }}
              >
                Stack trace (development only)
              </summary>
              <pre
                style={{
                  fontSize: '0.75rem',
                  color: '#6c757d',
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {errorStack}
              </pre>
            </details>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={resetError}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            Try again
          </button>
          <button
            onClick={handleReload}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#212529',
              backgroundColor: '#e9ecef',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dee2e6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
          >
            Reload page
          </button>
          <button
            onClick={handleReportError}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#6c757d',
              backgroundColor: 'transparent',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#212529';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#6c757d';
            }}
          >
            Report issue
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Sentry Error Boundary Wrapper
 * Catches React errors and displays fallback UI
 */
export const SentryErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  return (
    <Sentry.ErrorBoundary
      fallback={ErrorFallback}
      showDialog={false} // We have our own UI
      beforeCapture={(scope, error, errorInfo) => {
        // Add additional context before capturing
        scope.setContext('react', {
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

