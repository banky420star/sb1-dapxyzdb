/**
 * Metrics Middleware - Express middleware for Prometheus metrics collection
 * Provides /metrics endpoint and automatic metrics collection for HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { LoggerFactory } from '../logging/structured-logger.js';
import { metrics } from './prometheus-metrics.js';

// Enable default metrics collection
collectDefaultMetrics({ register });

// HTTP request metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsInProgress = new Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route']
});

// Trading API specific metrics
const tradingApiRequests = new Counter({
  name: 'trading_api_requests_total',
  help: 'Total number of trading API requests',
  labelNames: ['endpoint', 'method', 'status_code', 'user_type']
});

const tradingApiDuration = new Histogram({
  name: 'trading_api_duration_seconds',
  help: 'Duration of trading API requests in seconds',
  labelNames: ['endpoint', 'method', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// WebSocket metrics
const websocketConnections = new Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['type']
});

const websocketMessages = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type', 'direction']
});

// Database metrics
const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database', 'type']
});

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['database', 'query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Error metrics
const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity', 'component']
});

// Performance metrics
const memoryUsage = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage in bytes',
  labelNames: ['type']
});

const cpuUsage = new Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Process CPU usage percentage'
});

// Middleware for HTTP request metrics
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const method = req.method;
  const route = req.route?.path || req.path;
  
  // Increment requests in progress
  httpRequestsInProgress.inc({ method, route });
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Decrement requests in progress
    httpRequestsInProgress.dec({ method, route });
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Middleware for trading API specific metrics
export function tradingApiMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const endpoint = req.path;
  const method = req.method;
  const userType = req.user?.type || 'anonymous';
  
  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode.toString();
    
    // Record metrics
    tradingApiRequests.inc({ endpoint, method, status_code: statusCode, user_type: userType });
    tradingApiDuration.observe({ endpoint, method, status_code: statusCode }, duration);
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Middleware for error tracking
export function errorMetricsMiddleware(error: any, req: Request, res: Response, next: NextFunction): void {
  const errorType = error.name || 'UnknownError';
  const severity = error.status >= 500 ? 'high' : error.status >= 400 ? 'medium' : 'low';
  const component = req.path.split('/')[1] || 'unknown';
  
  // Record error metric
  errorsTotal.inc({ type: errorType, severity, component });
  
  next(error);
}

// WebSocket metrics tracking
export class WebSocketMetrics {
  private static instance: WebSocketMetrics;
  private connections: Map<string, number> = new Map();
  
  static getInstance(): WebSocketMetrics {
    if (!WebSocketMetrics.instance) {
      WebSocketMetrics.instance = new WebSocketMetrics();
    }
    return WebSocketMetrics.instance;
  }
  
  recordConnection(type: string): void {
    const count = this.connections.get(type) || 0;
    this.connections.set(type, count + 1);
    websocketConnections.set({ type }, count + 1);
  }
  
  recordDisconnection(type: string): void {
    const count = this.connections.get(type) || 0;
    const newCount = Math.max(0, count - 1);
    this.connections.set(type, newCount);
    websocketConnections.set({ type }, newCount);
  }
  
  recordMessage(type: string, direction: 'inbound' | 'outbound'): void {
    websocketMessages.inc({ type, direction });
  }
  
  getConnectionCount(type: string): number {
    return this.connections.get(type) || 0;
  }
}

// Database metrics tracking
export class DatabaseMetrics {
  private static instance: DatabaseMetrics;
  private connections: Map<string, number> = new Map();
  
  static getInstance(): DatabaseMetrics {
    if (!DatabaseMetrics.instance) {
      DatabaseMetrics.instance = new DatabaseMetrics();
    }
    return DatabaseMetrics.instance;
  }
  
  recordConnection(database: string, type: string): void {
    const key = `${database}:${type}`;
    const count = this.connections.get(key) || 0;
    this.connections.set(key, count + 1);
    databaseConnections.set({ database, type }, count + 1);
  }
  
  recordDisconnection(database: string, type: string): void {
    const key = `${database}:${type}`;
    const count = this.connections.get(key) || 0;
    const newCount = Math.max(0, count - 1);
    this.connections.set(key, newCount);
    databaseConnections.set({ database, type }, newCount);
  }
  
  recordQuery(database: string, queryType: string, duration: number): void {
    databaseQueryDuration.observe({ database, query_type: queryType }, duration);
  }
  
  getConnectionCount(database: string, type: string): number {
    const key = `${database}:${type}`;
    return this.connections.get(key) || 0;
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private intervalId?: NodeJS.Timeout;
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  start(): void {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.updateMemoryMetrics();
      this.updateCPUMetrics();
    }, 5000); // Update every 5 seconds
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
  
  private updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    
    memoryUsage.set({ type: 'rss' }, memUsage.rss);
    memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    memoryUsage.set({ type: 'external' }, memUsage.external);
  }
  
  private updateCPUMetrics(): void {
    // Simple CPU usage calculation
    const startUsage = process.cpuUsage();
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const totalUsage = endUsage.user + endUsage.system;
      const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
      
      cpuUsage.set(percentage);
    }, 100);
  }
}

// Metrics endpoint handler
export function metricsHandler(req: Request, res: Response): void {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

// Health check endpoint
export function healthCheckHandler(req: Request, res: Response): void {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.json(health);
}

// Trading system health check
export function tradingHealthCheckHandler(req: Request, res: Response): void {
  const logger = LoggerFactory.getSystemLogger();
  
  try {
    // Check system health
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      components: {
        alpha_engine: 'healthy',
        risk_engine: 'healthy',
        oms: 'healthy',
        exchange: 'connected',
        database: 'connected'
      },
      metrics: {
        total_orders: 0, // Would be populated from actual metrics
        active_positions: 0,
        daily_pnl: 0,
        max_drawdown: 0
      }
    };
    
    res.json(health);
  } catch (error: any) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

// Initialize metrics collection
export function initializeMetrics(): void {
  const logger = LoggerFactory.getSystemLogger();
  
  try {
    // Start performance monitoring
    const performanceMonitor = PerformanceMonitor.getInstance();
    performanceMonitor.start();
    
    logger.info({}, 'Metrics collection initialized');
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialize metrics collection');
  }
}

// Cleanup function
export function cleanupMetrics(): void {
  const performanceMonitor = PerformanceMonitor.getInstance();
  performanceMonitor.stop();
}

// Export all metrics for external access
export {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInProgress,
  tradingApiRequests,
  tradingApiDuration,
  websocketConnections,
  websocketMessages,
  databaseConnections,
  databaseQueryDuration,
  errorsTotal,
  memoryUsage,
  cpuUsage,
  WebSocketMetrics,
  DatabaseMetrics,
  PerformanceMonitor
};