import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Icon } from '../ui/Icon';

interface MetricEntry {
  timestamp: number;
  type: 'render' | 'network' | 'error' | 'performance';
  label: string;
  duration?: number;
  details?: any;
}

const MAX_ENTRIES = 100;

export const DevPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'network' | 'errors'>('metrics');
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        // Get performance metrics
        const entries = performance.getEntriesByType('measure');
        if (entries.length > 0) {
          setMetrics(prev => [
            ...prev,
            ...entries.map(entry => ({
              timestamp: Date.now(),
              type: 'performance',
              label: entry.name,
              duration: entry.duration,
            })),
          ].slice(-MAX_ENTRIES));
          performance.clearMeasures();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const addMetric = (metric: MetricEntry) => {
    if (!isPaused) {
      setMetrics(prev => [...prev, metric].slice(-MAX_ENTRIES));
    }
  };

  const clearMetrics = () => {
    setMetrics([]);
  };

  if (!isVisible) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-4 right-4 rounded-full bg-gray-800 p-3 text-white shadow-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
        onClick={() => setIsVisible(true)}
        title="Open Developer Panel (Ctrl+Shift+D)"
      >
        <Icon icon={AdjustmentsHorizontalIcon} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-4 right-4 z-50 w-96 rounded-lg bg-white shadow-xl dark:bg-gray-800"
    >
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Developer Tools</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`rounded px-2 py-1 text-sm ${
              isPaused
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <Icon icon={XMarkIcon} />
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-4">
          {(['metrics', 'network', 'errors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="h-96 overflow-auto p-4">
        {metrics.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            No metrics collected yet
          </div>
        ) : (
          <div className="space-y-2">
            {metrics
              .filter(metric => {
                if (activeTab === 'metrics') return metric.type === 'performance';
                if (activeTab === 'network') return metric.type === 'network';
                return metric.type === 'error';
              })
              .map((metric, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {metric.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {metric.duration && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Duration: {metric.duration.toFixed(2)}ms
                    </div>
                  )}
                  {metric.details && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                      {JSON.stringify(metric.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={clearMetrics}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Clear All
        </button>
      </div>
    </motion.div>
  );
}; 