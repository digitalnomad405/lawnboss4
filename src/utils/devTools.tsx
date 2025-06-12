import toast from 'react-hot-toast';
import { logger } from './logger';

const isDev = process.env.NODE_ENV === 'development';

interface DevNotifyOptions {
  type?: 'info' | 'success' | 'error' | 'warning' | 'network';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const iconStyles = {
  info: '💡',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  network: '🌐',
};

// Performance monitoring
const performanceMetrics = new Map<string, number>();

// Custom event for DevPanel communication
const devPanelEvent = new CustomEvent('dev-panel-update');

const createErrorMark = (error: Error) => {
  const markId = `error-${Date.now()}`;
  performance.mark(markId);
  return markId;
};

export const devTools = {
  notify: (message: string, options: DevNotifyOptions = {}) => {
    if (!isDev) return;

    const {
      type = 'info',
      duration = 4000,
      position = 'top-right'
    } = options;

    const icon = iconStyles[type];

    toast(
      (t) => (
        <div className="flex items-start space-x-3">
          <div className="text-lg">{icon}</div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Hey Developer! 👋
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {message}
            </div>
          </div>
        </div>
      ),
      {
        duration,
        position,
        className: 'bg-white dark:bg-gray-800 dark:text-white p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
      }
    );

    // Emit event for DevPanel
    window.dispatchEvent(devPanelEvent);

    // Handle logging based on type
    if (type === 'network' || type === 'info') {
      logger.info(message);
    } else if (type === 'error') {
      logger.error(message);
    } else if (type === 'warning') {
      logger.warn(message);
    } else {
      logger.info(message);
    }
  },

  error: (error: Error, context?: string) => {
    if (!isDev) return;

    const message = context ? `${context}: ${error.message}` : error.message;
    const markId = createErrorMark(error);

    toast.error(
      (t) => (
        <div className="space-y-2">
          <div className="font-medium text-red-800 dark:text-red-400">
            Development Error 🐛
          </div>
          <div className="text-sm text-red-600 dark:text-red-300">
            {message}
          </div>
          {error.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-400">
                View Stack Trace
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-50 p-2 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-300">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      ),
      {
        duration: 10000,
        position: 'top-right',
        className: 'bg-red-50 dark:bg-red-900/20 p-4 rounded-lg shadow-lg border border-red-200 dark:border-red-800',
      }
    );

    // Add to performance metrics
    performance.measure('Error occurred', markId);

    // Emit event for DevPanel
    window.dispatchEvent(devPanelEvent);

    logger.error(message, error);
  },

  // Network request monitoring
  network: {
    request: (url: string, method: string) => {
      if (!isDev) return;
      const startTime = performance.now();
      performanceMetrics.set(url, startTime);
      
      devTools.notify(`🚀 ${method} request to ${url}`, {
        type: 'network',
        duration: 2000,
      });

      // Add to performance metrics
      performance.mark(`request-${url}-start`);
    },

    response: (url: string, status: number, data?: any) => {
      if (!isDev) return;
      const startTime = performanceMetrics.get(url);
      const duration = startTime ? performance.now() - startTime : 0;
      performanceMetrics.delete(url);

      const isSuccess = status >= 200 && status < 300;
      const icon = isSuccess ? '✅' : '❌';
      const message = `${icon} ${status} response from ${url} (${duration.toFixed(0)}ms)`;

      devTools.notify(message, {
        type: 'network',
        duration: isSuccess ? 2000 : 4000,
      });

      // Add to performance metrics
      performance.mark(`request-${url}-end`);
      performance.measure(`API Request: ${url}`, `request-${url}-start`, `request-${url}-end`);

      if (!isSuccess) {
        logger.error(`API Error: ${url}`, new Error(JSON.stringify(data, null, 2)));
      }

      // Emit event for DevPanel
      window.dispatchEvent(devPanelEvent);
    }
  },

  // Performance monitoring
  performance: {
    start: (label: string) => {
      if (!isDev) return;
      performance.mark(`${label}-start`);
      performanceMetrics.set(label, performance.now());
    },

    end: (label: string) => {
      if (!isDev) return;
      const startTime = performanceMetrics.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        performanceMetrics.delete(label);
        
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);

        if (duration > 100) { // Only show if operation took more than 100ms
          devTools.notify(`⚡ ${label}: ${duration.toFixed(0)}ms`, {
            type: 'info',
            duration: 3000,
          });

          // Emit event for DevPanel
          window.dispatchEvent(devPanelEvent);
        }
      }
    }
  },

  // Component lifecycle monitoring
  component: {
    mount: (name: string) => {
      if (!isDev) return;
      devTools.notify(`🔨 Mounted: ${name}`, {
        type: 'info',
        duration: 2000,
      });

      // Add to performance metrics
      performance.mark(`${name}-mount-start`);
      performance.measure(`Component Mount: ${name}`, `${name}-mount-start`);

      // Emit event for DevPanel
      window.dispatchEvent(devPanelEvent);
    },

    update: (name: string, props: Record<string, any>) => {
      if (!isDev) return;
      devTools.notify(`🔄 Updated: ${name}\nProps: ${JSON.stringify(props, null, 2)}`, {
        type: 'info',
        duration: 2000,
      });

      // Add to performance metrics
      performance.mark(`${name}-update-${Date.now()}`);
      performance.measure(`Component Update: ${name}`, `${name}-update-${Date.now()}`);

      // Emit event for DevPanel
      window.dispatchEvent(devPanelEvent);
    },

    unmount: (name: string) => {
      if (!isDev) return;
      devTools.notify(`🗑️ Unmounted: ${name}`, {
        type: 'info',
        duration: 2000,
      });

      try {
        // Create unique marks for start and end of unmount
        const timestamp = Date.now();
        const startMark = `${name}-unmount-start-${timestamp}`;
        const endMark = `${name}-unmount-end-${timestamp}`;
        
        performance.mark(startMark);
        performance.mark(endMark);
        performance.measure(`Component Unmount: ${name}`, startMark, endMark);
      } catch (error) {
        // Silently handle any performance API errors
        console.debug('Performance measurement error:', error);
      }

      // Emit event for DevPanel
      window.dispatchEvent(devPanelEvent);
    }
  },

  warn: (message: string) => {
    devTools.notify(message, { type: 'warning' });
  },

  info: (message: string) => {
    devTools.notify(message, { type: 'info' });
  },

  success: (message: string) => {
    devTools.notify(message, { type: 'success' });
  },
}; 