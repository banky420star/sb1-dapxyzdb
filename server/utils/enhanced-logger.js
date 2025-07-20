import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from 'config';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS Z'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      message,
      service: service || 'ai-trading-system',
      pid: process.pid,
      hostname: require('os').hostname(),
      ...meta
    };
    
    return JSON.stringify(logObject);
  })
);

// Development format for console readability
const devFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports array
const transports = [];

// Console transport
if (config.get('logging.destinations.console.enabled')) {
  transports.push(new winston.transports.Console({
    level: config.get('logging.destinations.console.level'),
    format: process.env.NODE_ENV === 'development' ? devFormat : customFormat,
    handleExceptions: true,
    handleRejections: true
  }));
}

// Main log file with rotation
if (config.get('logging.destinations.file.enabled')) {
  transports.push(new DailyRotateFile({
    filename: path.join(logsDir, 'trading-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.get('logging.rotation.maxSize'),
    maxFiles: config.get('logging.rotation.maxFiles'),
    level: config.get('logging.destinations.file.level'),
    format: customFormat,
    handleExceptions: true,
    handleRejections: true
  }));
}

// Error-only log file
if (config.get('logging.destinations.error.enabled')) {
  transports.push(new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.get('logging.rotation.maxSize'),
    maxFiles: config.get('logging.rotation.maxFiles'),
    level: 'error',
    format: customFormat,
    handleExceptions: true,
    handleRejections: true
  }));
}

// Performance log file
if (config.get('logging.destinations.performance.enabled')) {
  transports.push(new DailyRotateFile({
    filename: path.join(logsDir, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.get('logging.rotation.maxSize'),
    maxFiles: config.get('logging.rotation.maxFiles'),
    level: 'info',
    format: customFormat
  }));
}

// Combined log file for all logs
transports.push(new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: config.get('logging.rotation.maxSize'),
  maxFiles: config.get('logging.rotation.maxFiles'),
  level: 'debug',
  format: customFormat,
  handleExceptions: true,
  handleRejections: true
}));

// Create the logger
const logger = winston.createLogger({
  level: config.get('logging.level'),
  format: customFormat,
  defaultMeta: { 
    service: 'ai-trading-system',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// Enhanced Logger class with additional methods
export class EnhancedLogger {
  constructor(service = 'ai-trading-system') {
    this.service = service;
    this.performanceMetrics = new Map();
  }

  // Standard logging methods
  error(message, meta = {}) {
    logger.error(message, { service: this.service, ...meta });
  }

  warn(message, meta = {}) {
    logger.warn(message, { service: this.service, ...meta });
  }

  info(message, meta = {}) {
    logger.info(message, { service: this.service, ...meta });
  }

  debug(message, meta = {}) {
    logger.debug(message, { service: this.service, ...meta });
  }

  verbose(message, meta = {}) {
    logger.verbose(message, { service: this.service, ...meta });
  }

  // Trading-specific logging methods
  trade(action, data = {}) {
    this.info(`Trading Action: ${action}`, {
      type: 'trading',
      action,
      ...data
    });
  }

  model(action, modelType, data = {}) {
    this.info(`Model Action: ${action}`, {
      type: 'ml_model',
      action,
      modelType,
      ...data
    });
  }

  risk(event, data = {}) {
    this.warn(`Risk Event: ${event}`, {
      type: 'risk_management',
      event,
      ...data
    });
  }

  performance(metric, value, data = {}) {
    this.info(`Performance Metric: ${metric}`, {
      type: 'performance',
      metric,
      value,
      ...data
    });
  }

  api(method, url, statusCode, duration, data = {}) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    this[level](`API Request: ${method} ${url}`, {
      type: 'api',
      method,
      url,
      statusCode,
      duration,
      ...data
    });
  }

  database(operation, table, duration, data = {}) {
    this.debug(`Database Operation: ${operation}`, {
      type: 'database',
      operation,
      table,
      duration,
      ...data
    });
  }

  // Performance timing utilities
  startTimer(name) {
    this.performanceMetrics.set(name, {
      startTime: Date.now(),
      startHrTime: process.hrtime()
    });
  }

  endTimer(name, data = {}) {
    const metrics = this.performanceMetrics.get(name);
    if (!metrics) {
      this.warn(`Timer '${name}' not found`);
      return null;
    }

    const duration = Date.now() - metrics.startTime;
    const hrDuration = process.hrtime(metrics.startHrTime);
    const hrDurationMs = hrDuration[0] * 1000 + hrDuration[1] / 1e6;

    this.performance(`Timer: ${name}`, duration, {
      durationMs: duration,
      hrDurationMs: hrDurationMs.toFixed(3),
      ...data
    });

    this.performanceMetrics.delete(name);
    return duration;
  }

  // Structured error logging
  logError(error, context = {}) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...context
    };

    this.error('Application Error', errorInfo);
  }

  // Health check logging
  healthCheck(component, status, data = {}) {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    this[level](`Health Check: ${component}`, {
      type: 'health_check',
      component,
      status,
      ...data
    });
  }

  // Security event logging
  security(event, data = {}) {
    this.warn(`Security Event: ${event}`, {
      type: 'security',
      event,
      ...data
    });
  }

  // Business logic logging
  business(event, data = {}) {
    this.info(`Business Event: ${event}`, {
      type: 'business',
      event,
      ...data
    });
  }

  // Rate limiting logging
  rateLimit(provider, usage, remaining, data = {}) {
    const level = usage > 0.8 ? 'warn' : 'info';
    this[level](`Rate Limit: ${provider}`, {
      type: 'rate_limit',
      provider,
      usage,
      remaining,
      ...data
    });
  }

  // ML training logging
  training(modelType, epoch, metrics, data = {}) {
    this.info(`Training Progress: ${modelType}`, {
      type: 'ml_training',
      modelType,
      epoch,
      metrics,
      ...data
    });
  }

  // Audit logging for compliance
  audit(action, user, resource, data = {}) {
    this.info(`Audit Log: ${action}`, {
      type: 'audit',
      action,
      user,
      resource,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  // Create child logger with additional context
  child(context = {}) {
    const childLogger = new EnhancedLogger(this.service);
    const originalMethods = ['error', 'warn', 'info', 'debug', 'verbose'];
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (message, meta = {}) => {
        originalMethod(message, { ...context, ...meta });
      };
    });

    return childLogger;
  }

  // Flush all pending logs (useful for graceful shutdown)
  async flush() {
    return new Promise((resolve) => {
      logger.on('finish', resolve);
      logger.end();
    });
  }
}

// Create and export default logger instance
export const Logger = EnhancedLogger;
export default new EnhancedLogger();

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    type: 'uncaught_exception',
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  
  // Give time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    type: 'unhandled_rejection',
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason,
    promise: promise.toString()
  });
});

// Graceful shutdown logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
}); 