import React, { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { devTools } from '../utils/devTools';

interface Props {
  children: React.ReactNode;
}

export const DevToolsProvider = ({ children }: Props) => {
  useEffect(() => {
    let originalConsoleError = console.error;
    let isHandlingError = false;

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (!isHandlingError) {
        isHandlingError = true;
        try {
          devTools.error(event.error, 'Unhandled Error');
        } finally {
          isHandlingError = false;
        }
      }
      event.preventDefault();
    };

    // Listen for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (!isHandlingError) {
        isHandlingError = true;
        try {
          devTools.error(
            new Error(event.reason?.message || 'Promise rejected'),
            'Unhandled Promise Rejection'
          );
        } finally {
          isHandlingError = false;
        }
      }
      event.preventDefault();
    };

    // Listen for console errors
    console.error = (...args) => {
      if (!isHandlingError) {
        isHandlingError = true;
        try {
          const error = args[0] instanceof Error ? args[0] : new Error(args.join(' '));
          devTools.error(error, 'Console Error');
        } finally {
          isHandlingError = false;
        }
      }
      originalConsoleError.apply(console, args);
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Welcome message for developers
    devTools.info('Development tools initialized! 🚀');

    return () => {
      // Clean up
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}; 