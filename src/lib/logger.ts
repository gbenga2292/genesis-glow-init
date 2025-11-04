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
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${context} ${message}`;
  }

  info(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, options), options?.data || '');
    }
  }

  warn(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, options), options?.data || '');
    }
  }

  error(message: string, error?: Error | unknown, options?: LogOptions) {
    // Always log errors, even in production
    const formattedMessage = this.formatMessage('error', message, options);
    
    if (this.isDevelopment) {
      console.error(formattedMessage, error, options?.data || '');
    } else {
      // In production, log minimal information without sensitive data
      console.error(formattedMessage);
      
      // Here you could integrate with error tracking service
      // e.g., Sentry, LogRocket, etc.
    }
  }

  debug(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, options), options?.data || '');
    }
  }
}

export const logger = new Logger();
