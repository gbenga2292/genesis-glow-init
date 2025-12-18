/**
 * Production-safe logging utility
 * Prevents sensitive data exposure and improves performance
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  context?: string;
  data?: Record<string, any>;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
  }

  private dispatchToElectron(level: LogLevel, message: string, data?: any) {
    if ((window as any).electronAPI?.log) {
      (window as any).electronAPI.log(level, message, data);
    }
  }

  info(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, options), options?.data || '');
    }
    this.dispatchToElectron('info', message, options?.data);
  }

  warn(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, options), options?.data || '');
    }
    this.dispatchToElectron('warn', message, options?.data);
  }

  error(message: string, error?: Error | unknown, options?: LogOptions) {
    const formattedMessage = this.formatMessage('error', message, options);

    // Always log to console in dev, or minimal in prod
    if (this.isDevelopment) {
      console.error(formattedMessage, error, options?.data || '');
    } else {
      console.error(formattedMessage);
    }

    // Send to Electron logger
    this.dispatchToElectron('error', message, { error: error ? String(error) : undefined, ...options?.data });
  }

  debug(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, options), options?.data || '');
    }
    // Debug logs might be too verbose for file logging, but let's include them for now if needed. 
    // Usually debug is skipped in prod file logs unless configured otherwise.
    this.dispatchToElectron('debug', message, options?.data);
  }
}

export const logger = new Logger();
