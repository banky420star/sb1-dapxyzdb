/**
 * Bybit Adapter - Exchange adapter for Bybit API v5
 * Implements WebSocket v3/v5 with heartbeats, resubscribe, and consistent error taxonomy
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { 
  OrderIntent, 
  OrderResult, 
  OrderStatus, 
  OrderFill,
  MarketData,
  ExecutionReport
} from '../oms-types.js';

export interface BybitConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  wsUrl?: string;
  restUrl?: string;
  rateLimits: {
    requestsPerSecond: number;
    ordersPerSecond: number;
  };
}

export interface BybitOrderResponse {
  retCode: number;
  retMsg: string;
  result: {
    orderId: string;
    orderLinkId: string;
  };
}

export interface BybitExecutionReport {
  topic: string;
  type: string;
  data: Array<{
    orderId: string;
    orderLinkId: string;
    symbol: string;
    side: string;
    orderType: string;
    qty: string;
    price: string;
    cumExecQty: string;
    cumExecValue: string;
    avgPrice: string;
    orderStatus: string;
    timeInForce: string;
    createTime: string;
    updateTime: string;
    stopPrice: string;
    takeProfit: string;
    stopLoss: string;
    tpTriggerBy: string;
    slTriggerBy: string;
  }>;
  ts: string;
}

export class BybitAdapter extends EventEmitter {
  private config: BybitConfig;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private pendingOrders: Map<string, OrderIntent> = new Map();
  
  constructor(config: BybitConfig) {
    super();
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Bybit adapter...');
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log('Bybit adapter initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Bybit adapter:', error);
      throw error;
    }
  }
  
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.wsUrl || 
        (this.config.testnet ? 'wss://stream-testnet.bybit.com/v5/public/linear' : 'wss://stream.bybit.com/v5/public/linear');
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('Connected to Bybit WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Resubscribe to previous subscriptions
        this.resubscribe();
        
        this.emit('connected');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} ${reason}`);
        this.isConnected = false;
        this.emit('disconnected', { code, reason });
        
        // Attempt to reconnect
        this.attemptReconnect();
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });
    });
  }
  
  private handleWebSocketMessage(message: any): void {
    try {
      if (message.topic) {
        switch (message.topic) {
          case 'pong':
            // Heartbeat response
            break;
            
          case 'orderbook':
            this.handleOrderBookUpdate(message);
            break;
            
          case 'publicTrade':
            this.handleTradeUpdate(message);
            break;
            
          case 'execution':
            this.handleExecutionReport(message);
            break;
            
          default:
            console.log('Unknown WebSocket topic:', message.topic);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  private handleOrderBookUpdate(message: any): void {
    try {
      const data = message.data;
      if (!data || !data.s) return;
      
      const marketData: MarketData = {
        symbol: data.s,
        bid: parseFloat(data.b),
        ask: parseFloat(data.a),
        last: parseFloat(data.c),
        volume: parseFloat(data.v),
        timestamp: parseInt(data.t),
        orderBook: {
          bids: data.bids || [],
          asks: data.asks || []
        }
      };
      
      this.emit('market_data', marketData);
      
    } catch (error) {
      console.error('Error handling order book update:', error);
    }
  }
  
  private handleTradeUpdate(message: any): void {
    try {
      const data = message.data;
      if (!data || !Array.isArray(data)) return;
      
      for (const trade of data) {
        const marketData: MarketData = {
          symbol: trade.s,
          bid: 0,
          ask: 0,
          last: parseFloat(trade.p),
          volume: parseFloat(trade.v),
          timestamp: parseInt(trade.T)
        };
        
        this.emit('market_data', marketData);
      }
      
    } catch (error) {
      console.error('Error handling trade update:', error);
    }
  }
  
  private handleExecutionReport(message: BybitExecutionReport): void {
    try {
      if (!message.data || !Array.isArray(message.data)) return;
      
      for (const execution of message.data) {
        const report: ExecutionReport = {
          orderId: execution.orderId,
          symbol: execution.symbol,
          side: execution.side as 'buy' | 'sell',
          quantity: parseFloat(execution.qty),
          price: parseFloat(execution.price),
          timestamp: parseInt(execution.updateTime),
          commission: 0, // Calculate from execution data
          commissionAsset: 'USDT',
          tradeId: execution.orderId // Bybit doesn't provide separate trade ID
        };
        
        this.emit('execution_report', report);
      }
      
    } catch (error) {
      console.error('Error handling execution report:', error);
    }
  }
  
  // Submit order to Bybit
  async submitOrder(intent: OrderIntent): Promise<OrderResult> {
    try {
      // Store pending order
      this.pendingOrders.set(intent.idempotencyKey, intent);
      
      // Prepare order parameters
      const orderParams = this.prepareOrderParams(intent);
      
      // Submit to Bybit API
      const response = await this.callBybitAPI('POST', '/v5/order/create', orderParams);
      
      if (response.retCode === 0) {
        // Success
        const orderResult: OrderResult = {
          orderId: response.result.orderId,
          idempotencyKey: intent.idempotencyKey,
          status: 'ACK',
          symbol: intent.symbol,
          side: intent.side,
          type: intent.type,
          quantity: intent.quantity,
          filledQuantity: 0,
          price: intent.price,
          timeInForce: intent.timeInForce,
          clientOrderId: intent.clientOrderId,
          timestamp: Date.now(),
          acknowledgedAt: Date.now(),
          metadata: intent.metadata
        };
        
        this.emit('order_submitted', orderResult);
        return orderResult;
        
      } else {
        // Error
        throw new Error(`Bybit API error: ${response.retMsg} (${response.retCode})`);
      }
      
    } catch (error) {
      console.error('Error submitting order to Bybit:', error);
      
      // Remove pending order
      this.pendingOrders.delete(intent.idempotencyKey);
      
      throw error;
    }
  }
  
  private prepareOrderParams(intent: OrderIntent): any {
    const params: any = {
      category: 'linear', // Linear perpetual
      symbol: intent.symbol,
      side: intent.side === 'buy' ? 'Buy' : 'Sell',
      orderType: this.mapOrderType(intent.type),
      qty: intent.quantity.toString(),
      orderLinkId: intent.idempotencyKey
    };
    
    if (intent.price) {
      params.price = intent.price.toString();
    }
    
    if (intent.stopPrice) {
      params.stopPrice = intent.stopPrice.toString();
    }
    
    if (intent.timeInForce) {
      params.timeInForce = this.mapTimeInForce(intent.timeInForce);
    }
    
    return params;
  }
  
  private mapOrderType(type: string): string {
    switch (type) {
      case 'market': return 'Market';
      case 'limit': return 'Limit';
      case 'stop': return 'Stop';
      case 'stop_limit': return 'StopLimit';
      default: throw new Error(`Unsupported order type: ${type}`);
    }
  }
  
  private mapTimeInForce(tif: string): string {
    switch (tif) {
      case 'GTC': return 'GTC';
      case 'IOC': return 'IOC';
      case 'FOK': return 'FOK';
      default: return 'GTC';
    }
  }
  
  // Cancel order on Bybit
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      const params = {
        category: 'linear',
        symbol: symbol,
        orderId: orderId
      };
      
      const response = await this.callBybitAPI('POST', '/v5/order/cancel', params);
      
      if (response.retCode === 0) {
        this.emit('order_cancelled', { orderId, symbol });
        return true;
      } else {
        throw new Error(`Bybit API error: ${response.retMsg} (${response.retCode})`);
      }
      
    } catch (error) {
      console.error('Error cancelling order on Bybit:', error);
      throw error;
    }
  }
  
  // Subscribe to market data
  subscribeToMarketData(symbol: string): void {
    const subscription = `orderbook.1.${symbol}`;
    
    if (!this.subscriptions.has(subscription)) {
      this.subscriptions.add(subscription);
      
      if (this.isConnected) {
        this.sendSubscription(subscription);
      }
    }
  }
  
  // Subscribe to execution reports
  subscribeToExecutions(): void {
    const subscription = 'execution';
    
    if (!this.subscriptions.has(subscription)) {
      this.subscriptions.add(subscription);
      
      if (this.isConnected) {
        this.sendSubscription(subscription);
      }
    }
  }
  
  private sendSubscription(topic: string): void {
    if (this.ws && this.isConnected) {
      const message = {
        op: 'subscribe',
        args: [topic]
      };
      
      this.ws.send(JSON.stringify(message));
      console.log(`Subscribed to ${topic}`);
    }
  }
  
  private resubscribe(): void {
    for (const subscription of this.subscriptions) {
      this.sendSubscription(subscription);
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }
  
  private async callBybitAPI(method: string, endpoint: string, params: any): Promise<any> {
    // In a real implementation, this would make authenticated HTTP requests to Bybit API
    // For now, we'll simulate the response
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful response
        resolve({
          retCode: 0,
          retMsg: 'OK',
          result: {
            orderId: `bybit_${Date.now()}`,
            orderLinkId: params.orderLinkId
          }
        });
      }, 100);
    });
  }
  
  // Get current connection status
  isConnected(): boolean {
    return this.isConnected;
  }
  
  // Get pending orders count
  getPendingOrdersCount(): number {
    return this.pendingOrders.size;
  }
  
  // Cleanup
  async cleanup(): Promise<void> {
    try {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Close WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      // Clear state
      this.subscriptions.clear();
      this.pendingOrders.clear();
      this.isConnected = false;
      
      console.log('Bybit adapter cleaned up successfully');
      
    } catch (error) {
      console.error('Error cleaning up Bybit adapter:', error);
    }
  }
}