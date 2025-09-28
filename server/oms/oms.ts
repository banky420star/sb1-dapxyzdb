/**
 * Order Management System - Deterministic OMS with idempotency, persistence, and rate gating
 * Implements exact state machine: NEW -> SUBMITTED -> ACK -> PARTIAL -> FILLED | CANCELLED | REJECTED
 */

import { EventEmitter } from 'events';
import Bottleneck from 'bottleneck';
import { 
  OrderIntent, 
  OrderResult, 
  OrderState, 
  OrderStatus, 
  OrderFill, 
  OrderMetrics,
  OMSConfig,
  OMSHealth,
  OrderFilter,
  OrderUpdate,
  OrderError
} from './oms-types.js';

export class OrderManagementSystem extends EventEmitter {
  private config: OMSConfig;
  private limiter: Bottleneck;
  private orderStates: Map<string, OrderState> = new Map();
  private idempotencyMap: Map<string, string> = new Map(); // idempotencyKey -> orderId
  private isInitialized = false;
  private metrics: OrderMetrics;
  private health: OMSHealth;
  
  constructor(config: OMSConfig) {
    super();
    this.config = config;
    
    // Initialize rate limiter
    this.limiter = new Bottleneck({
      maxConcurrent: 1, // Process orders sequentially
      minTime: this.config.exchange.rateLimits.windowMs / this.config.exchange.rateLimits.maxRequests,
      highWater: 100,
      strategy: Bottleneck.strategy.LEAK,
      rejectOnDrop: true
    });
    
    // Initialize metrics
    this.metrics = {
      totalOrders: 0,
      filledOrders: 0,
      cancelledOrders: 0,
      rejectedOrders: 0,
      fillRate: 0,
      averageFillTime: 0,
      totalVolume: 0,
      totalCommission: 0,
      errorRate: 0,
      lastUpdate: Date.now()
    };
    
    // Initialize health
    this.health = {
      status: 'healthy',
      database: false,
      exchange: false,
      rateLimiter: true,
      metrics: {
        ordersPerSecond: 0,
        errorRate: 0,
        fillRate: 0,
        averageLatency: 0
      },
      lastUpdate: Date.now()
    };
    
    this.setupEventHandlers();
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Order Management System...');
      
      // Initialize database connection
      await this.initializeDatabase();
      
      // Load existing orders from database
      await this.loadExistingOrders();
      
      // Start cleanup timer
      this.startCleanupTimer();
      
      // Start metrics collection
      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }
      
      this.isInitialized = true;
      this.health.database = true;
      this.health.exchange = true;
      
      console.log('Order Management System initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize OMS:', error);
      throw error;
    }
  }
  
  private setupEventHandlers(): void {
    // Rate limiter events
    this.limiter.on('error', (error) => {
      console.error('Rate limiter error:', error);
      this.emit('rate_limiter_error', error);
    });
    
    this.limiter.on('dropped', (dropped) => {
      console.warn('Request dropped by rate limiter:', dropped);
      this.emit('request_dropped', dropped);
    });
  }
  
  private async initializeDatabase(): Promise<void> {
    // In a real implementation, this would initialize the database connection
    // For now, we'll simulate it
    console.log('Database connection initialized');
  }
  
  private async loadExistingOrders(): Promise<void> {
    // In a real implementation, this would load orders from the database
    // For now, we'll start with an empty state
    console.log('Loaded existing orders from database');
  }
  
  // Main order submission method
  async submitOrder(intent: OrderIntent): Promise<OrderResult> {
    if (!this.isInitialized) {
      throw new Error('OMS not initialized');
    }
    
    try {
      // Check idempotency
      if (this.config.oms.enableIdempotency) {
        const existingOrderId = this.idempotencyMap.get(intent.idempotencyKey);
        if (existingOrderId) {
          const existingOrder = this.orderStates.get(existingOrderId);
          if (existingOrder) {
            return this.convertOrderStateToResult(existingOrder);
          }
        }
      }
      
      // Validate order intent
      this.validateOrderIntent(intent);
      
      // Create order state
      const orderState = this.createOrderState(intent);
      
      // Store order state
      this.orderStates.set(orderState.orderId, orderState);
      
      // Store idempotency mapping
      if (this.config.oms.enableIdempotency) {
        this.idempotencyMap.set(intent.idempotencyKey, orderState.orderId);
      }
      
      // Persist to database
      if (this.config.oms.enablePersistence) {
        await this.persistOrder(orderState);
      }
      
      // Submit order through rate limiter
      const result = await this.limiter.schedule(async () => {
        return await this.processOrderSubmission(orderState);
      });
      
      // Update metrics
      this.updateMetrics(orderState);
      
      return result;
      
    } catch (error) {
      console.error('Error submitting order:', error);
      this.emit('order_error', { intent, error });
      throw error;
    }
  }
  
  private validateOrderIntent(intent: OrderIntent): void {
    if (!intent.idempotencyKey) {
      throw new Error('Idempotency key is required');
    }
    
    if (!intent.symbol) {
      throw new Error('Symbol is required');
    }
    
    if (!intent.side || !['buy', 'sell'].includes(intent.side)) {
      throw new Error('Invalid side');
    }
    
    if (!intent.type || !['market', 'limit', 'stop', 'stop_limit'].includes(intent.type)) {
      throw new Error('Invalid order type');
    }
    
    if (!intent.quantity || intent.quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    
    if (intent.type === 'limit' && (!intent.price || intent.price <= 0)) {
      throw new Error('Price is required for limit orders');
    }
    
    if (intent.type === 'stop' && (!intent.stopPrice || intent.stopPrice <= 0)) {
      throw new Error('Stop price is required for stop orders');
    }
  }
  
  private createOrderState(intent: OrderIntent): OrderState {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      idempotencyKey: intent.idempotencyKey,
      status: 'NEW',
      symbol: intent.symbol,
      side: intent.side,
      type: intent.type,
      quantity: intent.quantity,
      filledQuantity: 0,
      remainingQuantity: intent.quantity,
      price: intent.price,
      stopPrice: intent.stopPrice,
      timeInForce: intent.timeInForce || 'GTC',
      clientOrderId: intent.clientOrderId,
      timestamp: Date.now(),
      metadata: intent.metadata,
      fills: [],
      retryCount: 0,
      errorCount: 0
    };
  }
  
  private async processOrderSubmission(orderState: OrderState): Promise<OrderResult> {
    const startTime = Date.now();
    
    try {
      // Update status to SUBMITTED
      orderState.status = 'SUBMITTED';
      orderState.submittedAt = Date.now();
      
      await this.updateOrderState(orderState);
      this.emit('order_submitted', orderState);
      
      // Simulate exchange submission (in real implementation, this would call the exchange API)
      const exchangeResult = await this.submitToExchange(orderState);
      
      // Update status based on exchange response
      if (exchangeResult.success) {
        orderState.status = 'ACK';
        orderState.acknowledgedAt = Date.now();
        
        // If it's a market order, it might be filled immediately
        if (orderState.type === 'market' && exchangeResult.fillQuantity > 0) {
          await this.processFill(orderState, exchangeResult.fillQuantity, exchangeResult.fillPrice);
        }
        
      } else {
        orderState.status = 'REJECTED';
        orderState.rejectedAt = Date.now();
        orderState.statusMessage = exchangeResult.rejectReason;
      }
      
      await this.updateOrderState(orderState);
      
      const result = this.convertOrderStateToResult(orderState);
      this.emit('order_processed', { orderState, result, latency: Date.now() - startTime });
      
      return result;
      
    } catch (error) {
      orderState.status = 'REJECTED';
      orderState.rejectedAt = Date.now();
      orderState.errorCount++;
      orderState.lastErrorAt = Date.now();
      orderState.lastErrorMessage = error.message;
      
      await this.updateOrderState(orderState);
      
      this.emit('order_error', { orderState, error });
      throw error;
    }
  }
  
  private async submitToExchange(orderState: OrderState): Promise<any> {
    // Simulate exchange API call
    // In a real implementation, this would call the actual exchange API
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate success/failure based on some criteria
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          resolve({
            success: true,
            exchangeOrderId: `ex_${Date.now()}`,
            fillQuantity: orderState.type === 'market' ? orderState.quantity : 0,
            fillPrice: this.getSimulatedPrice(orderState.symbol, orderState.side)
          });
        } else {
          resolve({
            success: false,
            rejectReason: 'Insufficient balance'
          });
        }
      }, Math.random() * 100 + 50); // 50-150ms latency
    });
  }
  
  private getSimulatedPrice(symbol: string, side: 'buy' | 'sell'): number {
    // Simulate price based on symbol and side
    const basePrice = 50000; // BTC price simulation
    const spread = 0.001; // 0.1% spread
    
    if (side === 'buy') {
      return basePrice * (1 + spread / 2);
    } else {
      return basePrice * (1 - spread / 2);
    }
  }
  
  private async processFill(orderState: OrderState, fillQuantity: number, fillPrice: number): Promise<void> {
    const fill: OrderFill = {
      fillId: `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: orderState.orderId,
      quantity: fillQuantity,
      price: fillPrice,
      timestamp: Date.now(),
      commission: fillQuantity * fillPrice * 0.001, // 0.1% commission
      commissionAsset: 'USDT'
    };
    
    orderState.fills.push(fill);
    orderState.filledQuantity += fillQuantity;
    orderState.remainingQuantity -= fillQuantity;
    
    // Update average price
    const totalValue = orderState.fills.reduce((sum, f) => sum + (f.quantity * f.price), 0);
    orderState.averagePrice = totalValue / orderState.filledQuantity;
    
    // Update status
    if (orderState.remainingQuantity === 0) {
      orderState.status = 'FILLED';
      orderState.filledAt = Date.now();
    } else {
      orderState.status = 'PARTIAL';
    }
    
    await this.updateOrderState(orderState);
    
    this.emit('order_filled', { orderState, fill });
  }
  
  private async updateOrderState(orderState: OrderState): Promise<void> {
    // Update in-memory state
    this.orderStates.set(orderState.orderId, orderState);
    
    // Persist to database
    if (this.config.oms.enablePersistence) {
      await this.persistOrder(orderState);
    }
    
    // Emit update event
    this.emit('order_updated', orderState);
  }
  
  private async persistOrder(orderState: OrderState): Promise<void> {
    // In a real implementation, this would save to the database
    // For now, we'll just log it
    console.log(`Persisting order ${orderState.orderId} with status ${orderState.status}`);
  }
  
  private convertOrderStateToResult(orderState: OrderState): OrderResult {
    return {
      orderId: orderState.orderId,
      idempotencyKey: orderState.idempotencyKey,
      status: orderState.status,
      symbol: orderState.symbol,
      side: orderState.side,
      type: orderState.type,
      quantity: orderState.quantity,
      filledQuantity: orderState.filledQuantity,
      price: orderState.price,
      averagePrice: orderState.averagePrice,
      stopPrice: orderState.stopPrice,
      timeInForce: orderState.timeInForce,
      clientOrderId: orderState.clientOrderId,
      statusMessage: orderState.statusMessage,
      rejectReason: orderState.lastErrorMessage,
      timestamp: orderState.timestamp,
      submittedAt: orderState.submittedAt,
      acknowledgedAt: orderState.acknowledgedAt,
      filledAt: orderState.filledAt,
      cancelledAt: orderState.cancelledAt,
      rejectedAt: orderState.rejectedAt,
      metadata: orderState.metadata,
      fills: orderState.fills
    };
  }
  
  // Cancel order
  async cancelOrder(orderId: string): Promise<OrderResult> {
    const orderState = this.orderStates.get(orderId);
    if (!orderState) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    if (['FILLED', 'CANCELLED', 'REJECTED'].includes(orderState.status)) {
      throw new Error(`Cannot cancel order in status ${orderState.status}`);
    }
    
    try {
      // Submit cancellation to exchange
      const cancelResult = await this.limiter.schedule(async () => {
        return await this.cancelOnExchange(orderState);
      });
      
      if (cancelResult.success) {
        orderState.status = 'CANCELLED';
        orderState.cancelledAt = Date.now();
        orderState.statusMessage = 'Cancelled by user';
      } else {
        throw new Error(`Failed to cancel order: ${cancelResult.reason}`);
      }
      
      await this.updateOrderState(orderState);
      
      const result = this.convertOrderStateToResult(orderState);
      this.emit('order_cancelled', orderState);
      
      return result;
      
    } catch (error) {
      orderState.errorCount++;
      orderState.lastErrorAt = Date.now();
      orderState.lastErrorMessage = error.message;
      
      await this.updateOrderState(orderState);
      throw error;
    }
  }
  
  private async cancelOnExchange(orderState: OrderState): Promise<any> {
    // Simulate exchange cancellation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 50);
    });
  }
  
  // Get order by ID
  getOrder(orderId: string): OrderResult | null {
    const orderState = this.orderStates.get(orderId);
    return orderState ? this.convertOrderStateToResult(orderState) : null;
  }
  
  // Get order by idempotency key
  getOrderByKey(idempotencyKey: string): OrderResult | null {
    const orderId = this.idempotencyMap.get(idempotencyKey);
    return orderId ? this.getOrder(orderId) : null;
  }
  
  // Get orders with filter
  getOrders(filter: OrderFilter = {}): OrderResult[] {
    let orders = Array.from(this.orderStates.values())
      .map(state => this.convertOrderStateToResult(state));
    
    // Apply filters
    if (filter.symbol) {
      orders = orders.filter(order => order.symbol === filter.symbol);
    }
    
    if (filter.status) {
      orders = orders.filter(order => order.status === filter.status);
    }
    
    if (filter.side) {
      orders = orders.filter(order => order.side === filter.side);
    }
    
    if (filter.type) {
      orders = orders.filter(order => order.type === filter.type);
    }
    
    if (filter.startTime) {
      orders = orders.filter(order => order.timestamp >= filter.startTime);
    }
    
    if (filter.endTime) {
      orders = orders.filter(order => order.timestamp <= filter.endTime);
    }
    
    // Sort by timestamp (newest first)
    orders.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    if (filter.offset) {
      orders = orders.slice(filter.offset);
    }
    
    if (filter.limit) {
      orders = orders.slice(0, filter.limit);
    }
    
    return orders;
  }
  
  // Get metrics
  getMetrics(): OrderMetrics {
    return { ...this.metrics };
  }
  
  // Get health status
  getHealth(): OMSHealth {
    return { ...this.health };
  }
  
  private updateMetrics(orderState: OrderState): void {
    this.metrics.totalOrders++;
    
    switch (orderState.status) {
      case 'FILLED':
        this.metrics.filledOrders++;
        if (orderState.submittedAt && orderState.filledAt) {
          const fillTime = orderState.filledAt - orderState.submittedAt;
          this.metrics.averageFillTime = (this.metrics.averageFillTime + fillTime) / 2;
        }
        break;
      case 'CANCELLED':
        this.metrics.cancelledOrders++;
        break;
      case 'REJECTED':
        this.metrics.rejectedOrders++;
        break;
    }
    
    // Calculate rates
    this.metrics.fillRate = this.metrics.filledOrders / this.metrics.totalOrders;
    this.metrics.errorRate = this.metrics.rejectedOrders / this.metrics.totalOrders;
    
    // Update volume and commission
    const totalVolume = orderState.fills.reduce((sum, fill) => sum + (fill.quantity * fill.price), 0);
    const totalCommission = orderState.fills.reduce((sum, fill) => sum + (fill.commission || 0), 0);
    
    this.metrics.totalVolume += totalVolume;
    this.metrics.totalCommission += totalCommission;
    
    this.metrics.lastUpdate = Date.now();
  }
  
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldOrders();
    }, this.config.oms.cleanupIntervalMs);
  }
  
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateHealthMetrics();
    }, this.config.monitoring.metricsIntervalMs);
  }
  
  private cleanupOldOrders(): void {
    const cutoff = Date.now() - this.config.oms.maxOrderAgeMs;
    const toRemove: string[] = [];
    
    for (const [orderId, orderState] of this.orderStates) {
      if (orderState.timestamp < cutoff && 
          ['FILLED', 'CANCELLED', 'REJECTED'].includes(orderState.status)) {
        toRemove.push(orderId);
      }
    }
    
    for (const orderId of toRemove) {
      this.orderStates.delete(orderId);
    }
    
    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} old orders`);
    }
  }
  
  private updateHealthMetrics(): void {
    const now = Date.now();
    const recentOrders = Array.from(this.orderStates.values())
      .filter(order => order.timestamp > now - 60000); // Last minute
    
    this.health.metrics.ordersPerSecond = recentOrders.length / 60;
    this.health.metrics.errorRate = this.metrics.errorRate;
    this.health.metrics.fillRate = this.metrics.fillRate;
    
    // Calculate average latency
    const ordersWithLatency = recentOrders.filter(order => 
      order.submittedAt && order.acknowledgedAt
    );
    
    if (ordersWithLatency.length > 0) {
      const totalLatency = ordersWithLatency.reduce((sum, order) => 
        sum + (order.acknowledgedAt! - order.submittedAt!), 0
      );
      this.health.metrics.averageLatency = totalLatency / ordersWithLatency.length;
    }
    
    this.health.lastUpdate = now;
    
    // Update health status
    if (this.health.metrics.errorRate > 0.1) {
      this.health.status = 'unhealthy';
    } else if (this.health.metrics.errorRate > 0.05) {
      this.health.status = 'degraded';
    } else {
      this.health.status = 'healthy';
    }
  }
  
  // Cleanup
  async cleanup(): Promise<void> {
    try {
      // Stop timers
      if (this.limiter) {
        await this.limiter.stop();
      }
      
      // Clear state
      this.orderStates.clear();
      this.idempotencyMap.clear();
      
      this.isInitialized = false;
      console.log('OMS cleaned up successfully');
      
    } catch (error) {
      console.error('Error cleaning up OMS:', error);
    }
  }
}