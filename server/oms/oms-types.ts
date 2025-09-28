/**
 * OMS Types - Type definitions for the Order Management System
 */

export type OrderStatus = 'NEW' | 'SUBMITTED' | 'ACK' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

export type OrderTimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTD';

export interface OrderIntent {
  idempotencyKey: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // For limit orders
  stopPrice?: number; // For stop orders
  timeInForce?: OrderTimeInForce;
  clientOrderId?: string;
  metadata?: Record<string, any>;
}

export interface OrderResult {
  orderId: string;
  idempotencyKey: string;
  status: OrderStatus;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  averagePrice?: number;
  stopPrice?: number;
  timeInForce?: OrderTimeInForce;
  clientOrderId?: string;
  statusMessage?: string;
  rejectReason?: string;
  timestamp: number;
  submittedAt?: number;
  acknowledgedAt?: number;
  filledAt?: number;
  cancelledAt?: number;
  rejectedAt?: number;
  metadata?: Record<string, any>;
  fills?: OrderFill[];
}

export interface OrderFill {
  fillId: string;
  orderId: string;
  quantity: number;
  price: number;
  timestamp: number;
  commission?: number;
  commissionAsset?: string;
}

export interface OrderState {
  orderId: string;
  idempotencyKey: string;
  status: OrderStatus;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  averagePrice?: number;
  stopPrice?: number;
  timeInForce?: OrderTimeInForce;
  clientOrderId?: string;
  statusMessage?: string;
  timestamp: number;
  submittedAt?: number;
  acknowledgedAt?: number;
  filledAt?: number;
  cancelledAt?: number;
  rejectedAt?: number;
  metadata?: Record<string, any>;
  fills: OrderFill[];
  retryCount: number;
  lastRetryAt?: number;
  errorCount: number;
  lastErrorAt?: number;
  lastErrorMessage?: string;
}

export interface OrderFilter {
  symbol?: string;
  status?: OrderStatus;
  side?: OrderSide;
  type?: OrderType;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface OrderMetrics {
  totalOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  fillRate: number;
  averageFillTime: number;
  totalVolume: number;
  totalCommission: number;
  errorRate: number;
  lastUpdate: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

export interface OMSConfig {
  // Database
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
  };
  
  // Exchange adapter
  exchange: {
    name: string;
    apiKey: string;
    apiSecret: string;
    sandbox?: boolean;
    rateLimits: RateLimitConfig;
  };
  
  // OMS settings
  oms: {
    maxRetries: number;
    retryDelayMs: number;
    orderTimeoutMs: number;
    cleanupIntervalMs: number;
    maxOrderAgeMs: number;
    enableIdempotency: boolean;
    enablePersistence: boolean;
    enableRateLimiting: boolean;
  };
  
  // Monitoring
  monitoring: {
    enableMetrics: boolean;
    metricsIntervalMs: number;
    enableAlerts: boolean;
    alertThresholds: {
      errorRate: number;
      fillRate: number;
      averageFillTime: number;
    };
  };
}

export interface OMSHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  exchange: boolean;
  rateLimiter: boolean;
  metrics: {
    ordersPerSecond: number;
    errorRate: number;
    fillRate: number;
    averageLatency: number;
  };
  lastUpdate: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  timestamp: number;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
  orderBook?: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  };
}

export interface ExecutionReport {
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  timestamp: number;
  commission: number;
  commissionAsset: string;
  tradeId: string;
}

export interface OrderError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  filledQuantity?: number;
  remainingQuantity?: number;
  averagePrice?: number;
  statusMessage?: string;
  timestamp: number;
  fill?: OrderFill;
}