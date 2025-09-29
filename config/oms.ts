/**
 * OMS Configuration - Centralized configuration for Order Management System
 */

import { z } from "zod";
import { OMSConfig } from '../server/oms/oms-types.js';

export const OMSConfigSchema = z.object({
  // Database configuration
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    database: z.string().default('trading_oms'),
    username: z.string().default('trading_user'),
    password: z.string().default(''),
    ssl: z.boolean().default(false),
    poolSize: z.number().default(10)
  }),
  
  // Exchange configuration
  exchange: z.object({
    name: z.string().default('bybit'),
    apiKey: z.string(),
    apiSecret: z.string(),
    sandbox: z.boolean().default(true),
    rateLimits: z.object({
      maxRequests: z.number().default(120), // requests per minute
      windowMs: z.number().default(60000), // 1 minute
      burstLimit: z.number().optional(),
      backoffMultiplier: z.number().default(2),
      maxBackoffMs: z.number().default(30000)
    })
  }),
  
  // OMS settings
  oms: z.object({
    maxRetries: z.number().default(3),
    retryDelayMs: z.number().default(1000),
    orderTimeoutMs: z.number().default(300000), // 5 minutes
    cleanupIntervalMs: z.number().default(300000), // 5 minutes
    maxOrderAgeMs: z.number().default(7 * 24 * 60 * 60 * 1000), // 7 days
    enableIdempotency: z.boolean().default(true),
    enablePersistence: z.boolean().default(true),
    enableRateLimiting: z.boolean().default(true)
  }),
  
  // Monitoring configuration
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsIntervalMs: z.number().default(5000), // 5 seconds
    enableAlerts: z.boolean().default(true),
    alertThresholds: z.object({
      errorRate: z.number().default(0.05), // 5%
      fillRate: z.number().default(0.8), // 80%
      averageFillTime: z.number().default(5000) // 5 seconds
    })
  })
});

export type OMSConfigType = z.infer<typeof OMSConfigSchema>;

// Default configuration
export const defaultOMSConfig: OMSConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'trading_oms',
    username: 'trading_user',
    password: '',
    ssl: false,
    poolSize: 10
  },
  exchange: {
    name: 'bybit',
    apiKey: '',
    apiSecret: '',
    sandbox: true,
    rateLimits: {
      maxRequests: 120,
      windowMs: 60000,
      burstLimit: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 30000
    }
  },
  oms: {
    maxRetries: 3,
    retryDelayMs: 1000,
    orderTimeoutMs: 300000,
    cleanupIntervalMs: 300000,
    maxOrderAgeMs: 7 * 24 * 60 * 60 * 1000,
    enableIdempotency: true,
    enablePersistence: true,
    enableRateLimiting: true
  },
  monitoring: {
    enableMetrics: true,
    metricsIntervalMs: 5000,
    enableAlerts: true,
    alertThresholds: {
      errorRate: 0.05,
      fillRate: 0.8,
      averageFillTime: 5000
    }
  }
};

// Configuration loader with environment variable override
export function loadOMSConfig(): OMSConfig {
  const config = { ...defaultOMSConfig };
  
  // Override with environment variables
  if (process.env.DATABASE_HOST) {
    config.database.host = process.env.DATABASE_HOST;
  }
  
  if (process.env.DATABASE_PORT) {
    config.database.port = parseInt(process.env.DATABASE_PORT);
  }
  
  if (process.env.DATABASE_NAME) {
    config.database.database = process.env.DATABASE_NAME;
  }
  
  if (process.env.DATABASE_USER) {
    config.database.username = process.env.DATABASE_USER;
  }
  
  if (process.env.DATABASE_PASSWORD) {
    config.database.password = process.env.DATABASE_PASSWORD;
  }
  
  if (process.env.DATABASE_SSL) {
    config.database.ssl = process.env.DATABASE_SSL === 'true';
  }
  
  if (process.env.DATABASE_POOL_SIZE) {
    config.database.poolSize = parseInt(process.env.DATABASE_POOL_SIZE);
  }
  
  // Exchange configuration
  if (process.env.BYBIT_API_KEY) {
    config.exchange.apiKey = process.env.BYBIT_API_KEY;
  }
  
  if (process.env.BYBIT_API_SECRET) {
    config.exchange.apiSecret = process.env.BYBIT_API_SECRET;
  }
  
  if (process.env.BYBIT_SANDBOX) {
    config.exchange.sandbox = process.env.BYBIT_SANDBOX === 'true';
  }
  
  if (process.env.EXCHANGE_RATE_LIMIT_REQUESTS) {
    config.exchange.rateLimits.maxRequests = parseInt(process.env.EXCHANGE_RATE_LIMIT_REQUESTS);
  }
  
  if (process.env.EXCHANGE_RATE_LIMIT_WINDOW) {
    config.exchange.rateLimits.windowMs = parseInt(process.env.EXCHANGE_RATE_LIMIT_WINDOW);
  }
  
  // OMS settings
  if (process.env.OMS_MAX_RETRIES) {
    config.oms.maxRetries = parseInt(process.env.OMS_MAX_RETRIES);
  }
  
  if (process.env.OMS_RETRY_DELAY) {
    config.oms.retryDelayMs = parseInt(process.env.OMS_RETRY_DELAY);
  }
  
  if (process.env.OMS_ORDER_TIMEOUT) {
    config.oms.orderTimeoutMs = parseInt(process.env.OMS_ORDER_TIMEOUT);
  }
  
  if (process.env.OMS_CLEANUP_INTERVAL) {
    config.oms.cleanupIntervalMs = parseInt(process.env.OMS_CLEANUP_INTERVAL);
  }
  
  if (process.env.OMS_MAX_ORDER_AGE) {
    config.oms.maxOrderAgeMs = parseInt(process.env.OMS_MAX_ORDER_AGE);
  }
  
  if (process.env.OMS_ENABLE_IDEMPOTENCY) {
    config.oms.enableIdempotency = process.env.OMS_ENABLE_IDEMPOTENCY === 'true';
  }
  
  if (process.env.OMS_ENABLE_PERSISTENCE) {
    config.oms.enablePersistence = process.env.OMS_ENABLE_PERSISTENCE === 'true';
  }
  
  if (process.env.OMS_ENABLE_RATE_LIMITING) {
    config.oms.enableRateLimiting = process.env.OMS_ENABLE_RATE_LIMITING === 'true';
  }
  
  // Monitoring settings
  if (process.env.OMS_ENABLE_METRICS) {
    config.monitoring.enableMetrics = process.env.OMS_ENABLE_METRICS === 'true';
  }
  
  if (process.env.OMS_METRICS_INTERVAL) {
    config.monitoring.metricsIntervalMs = parseInt(process.env.OMS_METRICS_INTERVAL);
  }
  
  if (process.env.OMS_ENABLE_ALERTS) {
    config.monitoring.enableAlerts = process.env.OMS_ENABLE_ALERTS === 'true';
  }
  
  if (process.env.OMS_ALERT_ERROR_RATE) {
    config.monitoring.alertThresholds.errorRate = parseFloat(process.env.OMS_ALERT_ERROR_RATE);
  }
  
  if (process.env.OMS_ALERT_FILL_RATE) {
    config.monitoring.alertThresholds.fillRate = parseFloat(process.env.OMS_ALERT_FILL_RATE);
  }
  
  if (process.env.OMS_ALERT_AVERAGE_FILL_TIME) {
    config.monitoring.alertThresholds.averageFillTime = parseInt(process.env.OMS_ALERT_AVERAGE_FILL_TIME);
  }
  
  // Validate configuration
  const validationResult = OMSConfigSchema.safeParse(config);
  if (!validationResult.success) {
    console.error('OMS configuration validation failed:', validationResult.error);
    throw new Error('Invalid OMS configuration');
  }
  
  return validationResult.data as OMSConfig;
}