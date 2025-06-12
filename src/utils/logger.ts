type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

const colors = {
  debug: '#7f7f7f',
  info: '#0ea5e9',
  warn: '#f59e0b',
  error: '#ef4444',
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(
        `%c[DEBUG] ${message}`,
        `color: ${colors.debug}; font-weight: bold;`,
        ...args
      );
    }
  },

  info: (message: string, ...args: any[]) => {
    console.info(
      `%c[INFO] ${message}`,
      `color: ${colors.info}; font-weight: bold;`,
      ...args
    );
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(
      `%c[WARN] ${message}`,
      `color: ${colors.warn}; font-weight: bold;`,
      ...args
    );
  },

  error: (message: string, error?: Error, ...args: any[]) => {
    console.error(
      `%c[ERROR] ${message}`,
      `color: ${colors.error}; font-weight: bold;`,
      error?.message || '',
      ...args
    );
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }
  },

  group: (label: string, level: LogLevel = 'debug') => {
    if (isDevelopment || level !== 'debug') {
      console.group(`%c[${level.toUpperCase()}] ${label}`, `color: ${colors[level]}; font-weight: bold;`);
    }
  },

  groupEnd: () => {
    console.groupEnd();
  },
}; 