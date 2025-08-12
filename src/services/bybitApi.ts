// Bybit V5 API Service for Frontend
// Handles public market data and connects to backend for private operations

export interface BybitMarketData {
  symbol: string;
  lastPrice: string;
  prevPrice24h: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
  turnover24h: string;
  volume24h: string;
  usdIndexPrice: string;
}

export interface BybitOrderBook {
  symbol: string;
  bids: [string, string][]; // [price, size]
  asks: [string, string][]; // [price, size]
  timestamp: number;
}

export interface BybitKline {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface BybitTrade {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  price: string;
  timestamp: number;
}

class BybitApiService {
  private baseUrl = 'https://api.bybit.com';
  private wsUrl = 'wss://stream.bybit.com/v5/public/linear';
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupWebSocket();
  }

  // WebSocket Management
  private setupWebSocket() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = this.handleWebSocketOpen.bind(this);
      this.ws.onmessage = this.handleWebSocketMessage.bind(this);
      this.ws.onclose = this.handleWebSocketClose.bind(this);
      this.ws.onerror = this.handleWebSocketError.bind(this);
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  }

  private handleWebSocketOpen() {
    console.log('Bybit WebSocket connected');
    this.reconnectAttempts = 0;
    this.startPingInterval();
  }

  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.op === 'pong') {
        return; // Handle ping/pong
      }

      if (data.topic) {
        this.notifySubscribers(data.topic, data.data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleWebSocketClose() {
    console.log('Bybit WebSocket disconnected');
    this.stopPingInterval();
    this.attemptReconnect();
  }

  private handleWebSocketError(error: Event) {
    console.error('Bybit WebSocket error:', error);
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000); // Ping every 20 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.setupWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Subscription Management
  private subscribe(topic: string, callback: (data: any) => void) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);

    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        op: 'subscribe',
        args: [topic]
      }));
    }
  }

  private unsubscribe(topic: string, callback: (data: any) => void) {
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.delete(callback);
      if (topicSubscribers.size === 0) {
        this.subscribers.delete(topic);
        // Send unsubscription message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            op: 'unsubscribe',
            args: [topic]
          }));
        }
      }
    }
  }

  private notifySubscribers(topic: string, data: any) {
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Public Market Data Methods
  public subscribeToTicker(symbol: string, callback: (data: BybitMarketData[]) => void) {
    const topic = `tickers.${symbol}`;
    this.subscribe(topic, callback);
    return () => this.unsubscribe(topic, callback);
  }

  public subscribeToOrderBook(symbol: string, callback: (data: BybitOrderBook) => void) {
    const topic = `orderBookL2_25.${symbol}`;
    this.subscribe(topic, callback);
    return () => this.unsubscribe(topic, callback);
  }

  public subscribeToKline(symbol: string, interval: string, callback: (data: BybitKline[]) => void) {
    const topic = `kline.${interval}.${symbol}`;
    this.subscribe(topic, callback);
    return () => this.unsubscribe(topic, callback);
  }

  public subscribeToTrades(symbol: string, callback: (data: BybitTrade[]) => void) {
    const topic = `publicTrade.${symbol}`;
    this.subscribe(topic, callback);
    return () => this.unsubscribe(topic, callback);
  }

  // REST API Methods (Public Data)
  public async getTickers(category: string = 'linear'): Promise<BybitMarketData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=${category}`);
      const data = await response.json();
      
      if (data.retCode === 0) {
        return data.result.list;
      } else {
        throw new Error(data.retMsg || 'Failed to fetch tickers');
      }
    } catch (error) {
      console.error('Error fetching tickers:', error);
      throw error;
    }
  }

  public async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 200
  ): Promise<BybitKline[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      const data = await response.json();
      
      if (data.retCode === 0) {
        return data.result.list.map((item: any) => ({
          timestamp: parseInt(item[0]),
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5]
        }));
      } else {
        throw new Error(data.retMsg || 'Failed to fetch klines');
      }
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw error;
    }
  }

  public async getOrderBook(symbol: string, limit: number = 25): Promise<BybitOrderBook> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v5/market/orderbook?category=linear&symbol=${symbol}&limit=${limit}`
      );
      const data = await response.json();
      
      if (data.retCode === 0) {
        return {
          symbol: data.result.s,
          bids: data.result.b,
          asks: data.result.a,
          timestamp: data.result.ts
        };
      } else {
        throw new Error(data.retMsg || 'Failed to fetch order book');
      }
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  public async getRecentTrades(symbol: string, limit: number = 100): Promise<BybitTrade[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v5/market/recent-trade?category=linear&symbol=${symbol}&limit=${limit}`
      );
      const data = await response.json();
      
      if (data.retCode === 0) {
        return data.result.list.map((item: any) => ({
          symbol: item.s,
          side: item.S,
          size: item.v,
          price: item.p,
          timestamp: item.T
        }));
      } else {
        throw new Error(data.retMsg || 'Failed to fetch recent trades');
      }
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      throw error;
    }
  }

  // Railway Backend API Methods (Production)
  private async callRailwayAPI(endpoint: string, options: RequestInit = {}) {
    // Railway/backend URL - prefer explicit Railway, then general API URL, else relative
    const RAILWAY_BASE_URL = (import.meta.env.VITE_RAILWAY_API_URL as string) || (import.meta.env.VITE_API_URL as string) || '';
    
    try {
      const response = await fetch(`${RAILWAY_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Railway API error:', error);
      // Fallback to demo mode if Railway is not available
      console.log('Falling back to demo mode...');
      return this.fallbackToDemo(endpoint, options);
    }
  }

  // Fallback to demo mode if Railway backend is unavailable
  private async fallbackToDemo(endpoint: string, options: RequestInit = {}) {
    console.log(`[DEMO MODE] Fallback for ${endpoint}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (endpoint.includes('/api/orders/create')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          orderId: 'demo-' + Date.now(),
          orderLinkId: body.orderLinkId || '',
          symbol: body.symbol || 'BTCUSDT',
          side: body.side || 'Buy',
          orderType: body.orderType || 'Market',
          qty: body.qty || '0.001',
          price: body.price || '35000',
          status: 'Filled',
          timeInForce: 'GTC',
          createdTime: Date.now().toString()
        }
      };
    }
    
    if (endpoint.includes('/api/positions')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [
            {
              symbol: 'BTCUSDT',
              side: 'Buy',
              size: '0.001',
              positionValue: '35.50',
              unrealisedPnl: '+2.15',
              markPrice: '35500.00',
              leverage: '10',
              entryPrice: '35000.00'
            },
            {
              symbol: 'ETHUSDT',
              side: 'Sell',
              size: '0.01',
              positionValue: '25.20',
              unrealisedPnl: '-0.85',
              markPrice: '2520.00',
              leverage: '5',
              entryPrice: '2600.00'
            }
          ]
        }
      };
    }
    
    if (endpoint.includes('/api/account/balance')) {
      return {
        retCode: 0,
        retMsg: 'OK',
        result: {
          list: [{
            coin: [
              {
                coin: 'USDT',
                walletBalance: '1247.85',
                availableBalance: '850.23',
                unrealisedPnl: '12.50'
              },
              {
                coin: 'BTC',
                walletBalance: '0.001',
                availableBalance: '0.001',
                unrealisedPnl: '0'
              }
            ]
          }]
        }
      };
    }
    
    throw new Error(`Demo fallback not implemented for ${endpoint}`);
  }

  // Private trading operations (Railway Backend)
  public async placeOrder(orderData: any) {
    return this.callRailwayAPI('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  public async getPositions(category: string = 'linear', symbol?: string) {
    const params = new URLSearchParams({ category });
    if (symbol) params.append('symbol', symbol);
    return this.callRailwayAPI(`/api/positions?${params.toString()}`);
  }

  public async getAccountBalance(accountType: string = 'UNIFIED', coin?: string) {
    const params = new URLSearchParams({ accountType });
    if (coin) params.append('coin', coin);
    return this.callRailwayAPI(`/api/account/balance?${params.toString()}`);
  }

  // Cleanup
  public disconnect() {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }
}

// Create singleton instance
export const bybitApi = new BybitApiService();

// Export for use in components
export default bybitApi; 