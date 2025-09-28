/**
 * OMS Manager - Main orchestrator for the Order Management System
 * Integrates OMS, Bybit Adapter, and provides unified interface
 */

import { EventEmitter } from 'events';
import { OrderManagementSystem } from './oms.js';
import { BybitAdapter } from './adapters/bybit-adapter.js';
import { 
  OrderIntent, 
  OrderResult, 
  OMSConfig, 
  OMSHealth,
  OrderFilter,
  OrderMetrics,
  MarketData,
  ExecutionReport
} from './oms-types.js';

export interface OMSManagerConfig extends OMSConfig {
  // Additional manager-specific config
  enableRealTimeUpdates: boolean;
  enableMarketData: boolean;
  enableExecutionReports: boolean;
  updateIntervalMs: number;
}

export class OMSManager extends EventEmitter {
  private config: OMSManagerConfig;
  private oms: OrderManagementSystem;
  private bybitAdapter: BybitAdapter;
  private isInitialized = false;
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor(config: OMSManagerConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.oms = new OrderManagementSystem(config);
    this.bybitAdapter = new BybitAdapter({
      apiKey: config.exchange.apiKey,
      apiSecret: config.exchange.apiSecret,
      testnet: config.exchange.sandbox,
      rateLimits: {
        requestsPerSecond: config.exchange.rateLimits.maxRequests / (config.exchange.rateLimits.windowMs / 1000),
        ordersPerSecond: config.exchange.rateLimits.maxRequests / (config.exchange.rateLimits.windowMs / 1000)
      }
    });
    
    this.setupEventHandlers();
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('Initializing OMS Manager...');
      
      // Initialize OMS
      await this.oms.initialize();
      
      // Initialize Bybit adapter
      await this.bybitAdapter.initialize();
      
      // Start real-time updates if enabled
      if (this.config.enableRealTimeUpdates) {
        this.startRealTimeUpdates();
      }
      
      // Subscribe to market data if enabled
      if (this.config.enableMarketData) {
        this.subscribeToMarketData();
      }
      
      // Subscribe to execution reports if enabled
      if (this.config.enableExecutionReports) {
        this.subscribeToExecutionReports();
      }
      
      this.isInitialized = true;
      console.log('OMS Manager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize OMS Manager:', error);
      throw error;
    }
  }
  
  private setupEventHandlers(): void {
    // OMS events
    this.oms.on('order_submitted', (data) => {
      this.emit('order_submitted', data);
    });
    
    this.oms.on('order_filled', (data) => {
      this.emit('order_filled', data);
    });
    
    this.oms.on('order_cancelled', (data) => {
      this.emit('order_cancelled', data);
    });
    
    this.oms.on('order_updated', (data) => {
      this.emit('order_updated', data);
    });
    
    this.oms.on('order_error', (data) => {
      this.emit('order_error', data);
    });
    
    // Bybit adapter events
    this.bybitAdapter.on('connected', () => {
      this.emit('exchange_connected');
    });
    
    this.bybitAdapter.on('disconnected', (data) => {
      this.emit('exchange_disconnected', data);
    });
    
    this.bybitAdapter.on('market_data', (data) => {
      this.emit('market_data', data);
    });
    
    this.bybitAdapter.on('execution_report', (data) => {
      this.emit('execution_report', data);
    });
    
    this.bybitAdapter.on('error', (error) => {
      this.emit('exchange_error', error);
    });
  }
  
  // Submit order
  async submitOrder(intent: OrderIntent): Promise<OrderResult> {
    if (!this.isInitialized) {
      throw new Error('OMS Manager not initialized');
    }
    
    try {
      // Submit through OMS (which handles idempotency, persistence, etc.)
      const result = await this.oms.submitOrder(intent);
      
      // If order was successfully submitted, also submit to exchange
      if (result.status === 'ACK' && this.bybitAdapter.isConnected()) {
        try {
          await this.bybitAdapter.submitOrder(intent);
        } catch (error) {
          console.error('Failed to submit order to exchange:', error);
          // Order is still in OMS, but not submitted to exchange
          // This could trigger a retry mechanism
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error;
    }
  }
  
  // Cancel order
  async cancelOrder(orderId: string, symbol: string): Promise<OrderResult> {
    if (!this.isInitialized) {
      throw new Error('OMS Manager not initialized');
    }
    
    try {
      // Cancel through OMS
      const result = await this.oms.cancelOrder(orderId);
      
      // Also cancel on exchange
      if (result.status === 'CANCELLED' && this.bybitAdapter.isConnected()) {
        try {
          await this.bybitAdapter.cancelOrder(orderId, symbol);
        } catch (error) {
          console.error('Failed to cancel order on exchange:', error);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }
  
  // Get order by ID
  getOrder(orderId: string): OrderResult | null {
    return this.oms.getOrder(orderId);
  }
  
  // Get order by idempotency key
  getOrderByKey(idempotencyKey: string): OrderResult | null {
    return this.oms.getOrderByKey(idempotencyKey);
  }
  
  // Get orders with filter
  getOrders(filter: OrderFilter = {}): OrderResult[] {
    return this.oms.getOrders(filter);
  }
  
  // Get metrics
  getMetrics(): OrderMetrics {
    return this.oms.getMetrics();
  }
  
  // Get health status
  getHealth(): OMSHealth {
    const omsHealth = this.oms.getHealth();
    
    return {
      ...omsHealth,
      exchange: this.bybitAdapter.isConnected(),
      lastUpdate: Date.now()
    };
  }
  
  // Subscribe to market data for symbol
  subscribeToMarketData(symbol: string): void {
    if (this.config.enableMarketData) {
      this.bybitAdapter.subscribeToMarketData(symbol);
    }
  }
  
  // Subscribe to execution reports
  subscribeToExecutionReports(): void {
    if (this.config.enableExecutionReports) {
      this.bybitAdapter.subscribeToExecutions();
    }
  }
  
  // Start real-time updates
  private startRealTimeUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.performRealTimeUpdate();
    }, this.config.updateIntervalMs);
  }
  
  // Stop real-time updates
  private stopRealTimeUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  // Perform real-time update
  private performRealTimeUpdate(): void {
    try {
      // Get current health status
      const health = this.getHealth();
      
      // Emit health update
      this.emit('health_update', health);
      
      // Check for any orders that need attention
      this.checkPendingOrders();
      
    } catch (error) {
      console.error('Error in real-time update:', error);
      this.emit('update_error', error);
    }
  }
  
  // Check for pending orders that might need updates
  private checkPendingOrders(): void {
    try {
      const pendingOrders = this.oms.getOrders({
        status: 'SUBMITTED'
      });
      
      for (const order of pendingOrders) {
        // Check if order is stuck (submitted but no ACK for too long)
        if (order.submittedAt && Date.now() - order.submittedAt > 30000) { // 30 seconds
          console.warn(`Order ${order.orderId} appears to be stuck`);
          this.emit('stuck_order', order);
        }
      }
      
    } catch (error) {
      console.error('Error checking pending orders:', error);
    }
  }
  
  // Handle execution report from exchange
  private handleExecutionReport(report: ExecutionReport): void {
    try {
      // Find the corresponding order in OMS
      const order = this.oms.getOrder(report.orderId);
      
      if (order) {
        // Update order with execution details
        // This would typically involve updating the OMS with fill information
        this.emit('order_executed', { order, report });
      }
      
    } catch (error) {
      console.error('Error handling execution report:', error);
    }
  }
  
  // Handle market data update
  private handleMarketDataUpdate(marketData: MarketData): void {
    try {
      // Emit market data to subscribers
      this.emit('market_data_update', marketData);
      
      // Check if any pending orders should be triggered by price movements
      this.checkPriceTriggeredOrders(marketData);
      
    } catch (error) {
      console.error('Error handling market data update:', error);
    }
  }
  
  // Check for price-triggered orders (stop orders, etc.)
  private checkPriceTriggeredOrders(marketData: MarketData): void {
    try {
      const pendingOrders = this.oms.getOrders({
        symbol: marketData.symbol,
        status: 'ACK'
      });
      
      for (const order of pendingOrders) {
        if (order.type === 'stop' && order.stopPrice) {
          const shouldTrigger = this.shouldTriggerStopOrder(order, marketData);
          
          if (shouldTrigger) {
            console.log(`Stop order ${order.orderId} triggered by price movement`);
            this.emit('stop_order_triggered', order);
          }
        }
      }
      
    } catch (error) {
      console.error('Error checking price-triggered orders:', error);
    }
  }
  
  // Check if stop order should be triggered
  private shouldTriggerStopOrder(order: OrderResult, marketData: MarketData): boolean {
    if (!order.stopPrice) return false;
    
    const currentPrice = marketData.last;
    const stopPrice = order.stopPrice;
    
    if (order.side === 'buy') {
      // Buy stop: trigger when price rises above stop price
      return currentPrice >= stopPrice;
    } else {
      // Sell stop: trigger when price falls below stop price
      return currentPrice <= stopPrice;
    }
  }
  
  // Get connection status
  isConnected(): boolean {
    return this.bybitAdapter.isConnected();
  }
  
  // Get pending orders count
  getPendingOrdersCount(): number {
    return this.bybitAdapter.getPendingOrdersCount();
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<OMSManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update OMS config
    this.oms.updateConfig?.(newConfig);
    
    // Restart real-time updates if interval changed
    if (newConfig.updateIntervalMs) {
      this.stopRealTimeUpdates();
      this.startRealTimeUpdates();
    }
  }
  
  // Get current configuration
  getConfig(): OMSManagerConfig {
    return { ...this.config };
  }
  
  // Emergency stop (cancel all orders)
  async emergencyStop(): Promise<void> {
    try {
      console.log('Emergency stop activated - cancelling all orders');
      
      // Get all active orders
      const activeOrders = this.oms.getOrders({
        status: 'ACK'
      });
      
      // Cancel all active orders
      for (const order of activeOrders) {
        try {
          await this.cancelOrder(order.orderId, order.symbol);
        } catch (error) {
          console.error(`Failed to cancel order ${order.orderId}:`, error);
        }
      }
      
      this.emit('emergency_stop_completed', { cancelledOrders: activeOrders.length });
      
    } catch (error) {
      console.error('Error during emergency stop:', error);
      throw error;
    }
  }
  
  // Cleanup
  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up OMS Manager...');
      
      // Stop real-time updates
      this.stopRealTimeUpdates();
      
      // Cleanup OMS
      await this.oms.cleanup();
      
      // Cleanup Bybit adapter
      await this.bybitAdapter.cleanup();
      
      // Remove all event listeners
      this.removeAllListeners();
      
      this.isInitialized = false;
      console.log('OMS Manager cleaned up successfully');
      
    } catch (error) {
      console.error('Error cleaning up OMS Manager:', error);
    }
  }
}

// Factory function for easy initialization
export async function createOMSManager(config: OMSManagerConfig): Promise<OMSManager> {
  const manager = new OMSManager(config);
  await manager.initialize();
  return manager;
}