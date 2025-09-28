/**
 * Structured Logger - JSON logging with correlation IDs for observability
 * Provides structured logging using pino with correlation IDs, error tracking, and audit trails
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Create the base logger
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    timestamp: () => ({ timestamp: new Date().toISOString() })
  },
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  },
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]'
    ],
    censor: '[REDACTED]'
  }
});

// Logger interface with correlation ID support
export interface Logger {
  trace: (obj: any, msg?: string, ...args: any[]) => void;
  debug: (obj: any, msg?: string, ...args: any[]) => void;
  info: (obj: any, msg?: string, ...args: any[]) => void;
  warn: (obj: any, msg?: string, ...args: any[]) => void;
  error: (obj: any, msg?: string, ...args: any[]) => void;
  fatal: (obj: any, msg?: string, ...args: any[]) => void;
  
  // Child logger with correlation ID
  child: (bindings: Record<string, any>) => Logger;
  
  // Audit logging
  audit: (action: string, details: Record<string, any>) => void;
  
  // Trading-specific logging
  trade: (trade: TradeLog) => void;
  order: (order: OrderLog) => void;
  risk: (risk: RiskLog) => void;
  alpha: (alpha: AlphaLog) => void;
  system: (system: SystemLog) => void;
}

// Log interfaces
export interface TradeLog {
  correlationId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  pnl?: number;
  fees?: number;
  exchange: string;
  orderId: string;
}

export interface OrderLog {
  correlationId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  quantity: number;
  price?: number;
  status: 'NEW' | 'SUBMITTED' | 'ACK' | 'PARTIAL' | 'FILLED' | 'CANCELED' | 'REJECTED';
  timestamp: string;
  exchange: string;
  orderId: string;
  error?: string;
  latency?: number;
}

export interface RiskLog {
  correlationId: string;
  type: 'violation' | 'check' | 'circuit_breaker' | 'position_sizing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol: string;
  details: Record<string, any>;
  timestamp: string;
  action: string;
  result: 'passed' | 'failed' | 'halted';
}

export interface AlphaLog {
  correlationId: string;
  symbol: string;
  pod: string;
  signal: number;
  confidence: number;
  volatility: number;
  timestamp: string;
  weight?: number;
  attribution?: Record<string, number>;
}

export interface SystemLog {
  correlationId: string;
  component: string;
  event: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  details: Record<string, any>;
  timestamp: string;
  duration?: number;
  memory?: number;
  cpu?: number;
}

// Create logger with correlation ID support
export class StructuredLogger implements Logger {
  private logger: pino.Logger;
  private correlationId: string;
  
  constructor(logger: pino.Logger, correlationId?: string) {
    this.logger = logger;
    this.correlationId = correlationId || uuidv4();
  }
  
  trace(obj: any, msg?: string, ...args: any[]): void {
    this.logger.trace({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  debug(obj: any, msg?: string, ...args: any[]): void {
    this.logger.debug({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  info(obj: any, msg?: string, ...args: any[]): void {
    this.logger.info({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  warn(obj: any, msg?: string, ...args: any[]): void {
    this.logger.warn({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  error(obj: any, msg?: string, ...args: any[]): void {
    this.logger.error({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  fatal(obj: any, msg?: string, ...args: any[]): void {
    this.logger.fatal({ correlationId: this.correlationId, ...obj }, msg, ...args);
  }
  
  child(bindings: Record<string, any>): Logger {
    const childLogger = this.logger.child({ ...bindings, correlationId: this.correlationId });
    return new StructuredLogger(childLogger, this.correlationId);
  }
  
  // Audit logging for compliance and debugging
  audit(action: string, details: Record<string, any>): void {
    this.info({
      type: 'audit',
      action,
      ...details
    }, `Audit: ${action}`);
  }
  
  // Trading-specific logging methods
  trade(trade: TradeLog): void {
    this.info({
      type: 'trade',
      ...trade
    }, `Trade executed: ${trade.symbol} ${trade.side} ${trade.quantity} @ ${trade.price}`);
  }
  
  order(order: OrderLog): void {
    const level = order.status === 'REJECTED' ? 'error' : 'info';
    this.logger[level]({
      type: 'order',
      ...order
    }, `Order ${order.status}: ${order.symbol} ${order.side} ${order.quantity}`);
  }
  
  risk(risk: RiskLog): void {
    const level = risk.severity === 'critical' ? 'error' : 
                  risk.severity === 'high' ? 'warn' : 'info';
    this.logger[level]({
      type: 'risk',
      ...risk
    }, `Risk ${risk.type}: ${risk.result} - ${risk.details}`);
  }
  
  alpha(alpha: AlphaLog): void {
    this.debug({
      type: 'alpha',
      ...alpha
    }, `Alpha signal: ${alpha.pod} ${alpha.symbol} signal=${alpha.signal} conf=${alpha.confidence}`);
  }
  
  system(system: SystemLog): void {
    this.logger[system.level]({
      type: 'system',
      ...system
    }, `System ${system.event}: ${system.component}`);
  }
}

// Logger factory
export class LoggerFactory {
  private static loggers: Map<string, StructuredLogger> = new Map();
  
  static getLogger(component: string, correlationId?: string): Logger {
    const key = `${component}:${correlationId || 'default'}`;
    
    if (!this.loggers.has(key)) {
      const childLogger = baseLogger.child({ component });
      const logger = new StructuredLogger(childLogger, correlationId);
      this.loggers.set(key, logger);
    }
    
    return this.loggers.get(key)!;
  }
  
  static getTradingLogger(correlationId?: string): Logger {
    return this.getLogger('trading', correlationId);
  }
  
  static getRiskLogger(correlationId?: string): Logger {
    return this.getLogger('risk', correlationId);
  }
  
  static getOMSLogger(correlationId?: string): Logger {
    return this.getLogger('oms', correlationId);
  }
  
  static getAlphaLogger(correlationId?: string): Logger {
    return this.getLogger('alpha', correlationId);
  }
  
  static getSystemLogger(correlationId?: string): Logger {
    return this.getLogger('system', correlationId);
  }
  
  static getExchangeLogger(exchange: string, correlationId?: string): Logger {
    return this.getLogger(`exchange:${exchange}`, correlationId);
  }
  
  static getDatabaseLogger(database: string, correlationId?: string): Logger {
    return this.getLogger(`database:${database}`, correlationId);
  }
  
  static getModelLogger(model: string, correlationId?: string): Logger {
    return this.getLogger(`model:${model}`, correlationId);
  }
  
  // Clean up old loggers to prevent memory leaks
  static cleanup(): void {
    // Keep only the last 100 loggers per component
    const componentCounts: Map<string, number> = new Map();
    
    for (const [key] of this.loggers) {
      const component = key.split(':')[0];
      componentCounts.set(component, (componentCounts.get(component) || 0) + 1);
    }
    
    for (const [component, count] of componentCounts) {
      if (count > 100) {
        // Remove oldest loggers for this component
        const toRemove: string[] = [];
        let removed = 0;
        
        for (const [key] of this.loggers) {
          if (key.startsWith(component + ':') && removed < count - 100) {
            toRemove.push(key);
            removed++;
          }
        }
        
        toRemove.forEach(key => this.loggers.delete(key));
      }
    }
  }
}

// Middleware for Express to add correlation IDs
export function correlationIdMiddleware(req: any, res: any, next: any): void {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}

// Error logging utility
export function logError(logger: Logger, error: Error, context: Record<string, any> = {}): void {
  logger.error({
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }, `Error: ${error.message}`);
}

// Performance logging utility
export function logPerformance(logger: Logger, operation: string, startTime: number, context: Record<string, any> = {}): void {
  const duration = Date.now() - startTime;
  logger.info({
    ...context,
    operation,
    duration,
    type: 'performance'
  }, `Performance: ${operation} took ${duration}ms`);
}

// Trading event logging utilities
export function logTradeEvent(logger: Logger, event: string, details: Record<string, any>): void {
  logger.info({
    type: 'trade_event',
    event,
    ...details
  }, `Trade Event: ${event}`);
}

export function logRiskEvent(logger: Logger, event: string, details: Record<string, any>): void {
  logger.warn({
    type: 'risk_event',
    event,
    ...details
  }, `Risk Event: ${event}`);
}

export function logSystemEvent(logger: Logger, event: string, details: Record<string, any>): void {
  logger.info({
    type: 'system_event',
    event,
    ...details
  }, `System Event: ${event}`);
}

// Export default logger
export const logger = LoggerFactory.getSystemLogger();

// Export factory for easy access
export { LoggerFactory as Logger };

// Export base logger for direct use if needed
export { baseLogger };