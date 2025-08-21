// src/lib/api.ts
// Centralized API configuration for MetaTrader.xyz
// Enhanced with secure authentication, rate limiting, and MetaTrader integration

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.methtrader.xyz');

// Secure API configuration
const API_CONFIG = {
  timeout: 10000, // 10 second timeout
  retries: 3,
  retryDelay: 1000,
  rateLimit: {
    requests: 100,
    window: 60000 // 1 minute
  }
};

// Rate limiting implementation
class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private window: number;

  constructor(limit: number, window: number) {
    this.limit = limit;
    this.window = window;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.window);
    return this.requests.length < this.limit;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(API_CONFIG.rateLimit.requests, API_CONFIG.rateLimit.window);

// Enhanced error handling with retry logic
async function fetchWithRetry(url: string, options: RequestInit, retries = API_CONFIG.retries): Promise<Response> {
  try {
    if (!rateLimiter.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '1.0',
        'X-Client': 'methtrader-web',
        ...options.headers,
      }
    });

    clearTimeout(timeoutId);
    rateLimiter.recordRequest();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (retries > 0 && (error instanceof TypeError || error.name === 'AbortError')) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  try {
    const res = await fetchWithRetry(url, {
      credentials: 'include',
      ...init,
    });
    
    return await res.json() as T;
  } catch (error) {
    console.error(`API Error (${path}):`, error);
    throw new Error(`Failed to fetch ${path}: ${error.message}`);
  }
}

// MetaTrader API integration types
interface MetaTraderConfig {
  accountId: string;
  server: string;
  token: string;
}

interface TradingSignal {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

// API endpoints that match our Railway backend with MetaTrader integration
export const api = {
  // Health and status
  health: () => getJSON<{status: string, timestamp: string, uptime: number, memory: any, environment: string, version: string}>('/health'),
  status: () => getJSON<{status: string, mode: string, time: string, autonomousTrading: boolean}>('/api/status'),
  
  // Account information
  getBalance: () => getJSON<{total: number, available: number, currency: string, mode: string}>('/api/account/balance'),
  getPositions: () => getJSON<{positions: any[], mode: string}>('/api/account/positions'),
  
  // Trading state
  getTradingStatus: () => getJSON<{success: boolean, data: {isActive: boolean, config: any, tradeLog: any[], timestamp: string}}>('/api/trading/status'),
  getTradingState: () => getJSON<{mode: string, positions: any[], openOrders: any[], pnlDayPct: number, updatedAt: string}>('/api/trading/state'),
  
  // Models and training
  getModels: () => getJSON<{models: Array<{type: string, status: string, metrics?: {accuracy: number, trades: number, profitPct: number}}>}>('/api/models'),
  getTrainingStatus: () => getJSON<{isTraining: boolean, currentModel: string | null, progress: number, lastTraining: string | null, updatedAt: string}>('/api/training/status'),
  
  // Trading actions with enhanced security
  executeTrade: (data: TradingSignal) => getJSON('/api/trade/execute', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'X-Trade-Confirmation': 'required'
    }
  }),
  
  startTrading: () => getJSON('/api/trading/start', { 
    method: 'POST',
    headers: {
      'X-Admin-Required': 'true'
    }
  }),
  
  stopTrading: () => getJSON('/api/trading/stop', { 
    method: 'POST',
    headers: {
      'X-Admin-Required': 'true'
    }
  }),
  
  // Auto trading consensus
  autoTick: (data: {symbol?: string, candles?: any[]}) => getJSON('/api/auto/tick', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // MetaTrader specific endpoints
  getMetaTraderConfig: () => getJSON<MetaTraderConfig>('/api/metatrader/config'),
  updateMetaTraderConfig: (config: MetaTraderConfig) => getJSON('/api/metatrader/config', {
    method: 'PUT',
    body: JSON.stringify(config),
    headers: {
      'X-Admin-Required': 'true'
    }
  }),

  // Risk management
  getRiskSettings: () => getJSON<{
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPct: number;
    takeProfitPct: number;
    maxLeverage: number;
  }>('/api/risk/settings'),

  updateRiskSettings: (settings: any) => getJSON('/api/risk/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
    headers: {
      'X-Admin-Required': 'true'
    }
  }),

  // Market data
  getMarketData: (symbol: string) => getJSON<{
    symbol: string;
    price: number;
    change: number;
    volume: number;
    high: number;
    low: number;
    timestamp: string;
  }>(`/api/market/${symbol}`),

  // Performance analytics
  getPerformanceAnalytics: (timeframe: '1D' | '1W' | '1M' | '3M' | '1Y') => getJSON<{
    totalPnL: number;
    totalPnLPercentage: number;
    winRate: number;
    totalTrades: number;
    averageWin: number;
    averageLoss: number;
    sharpeRatio: number;
    maxDrawdown: number;
    equityCurve: Array<{date: string, equity: number, pnl: number}>;
  }>(`/api/analytics/performance?timeframe=${timeframe}`),

  // Risk management endpoints
  getRiskStatus: () => getJSON<{
    config: any;
    state: any;
    alerts: any[];
    violations: any[];
    riskLevel: string;
  }>('/api/risk/status'),

  getRiskConfig: () => getJSON<{
    maxPositionSize: number;
    maxTotalExposure: number;
    maxLeverage: number;
    defaultStopLoss: number;
    defaultTakeProfit: number;
    maxDailyLoss: number;
  }>('/api/risk/config'),

  updateRiskConfig: (config: any) => getJSON('/api/risk/config', {
    method: 'PUT',
    body: JSON.stringify(config),
    headers: {
      'X-Admin-Required': 'true'
    }
  }),

  getRiskViolations: (severity?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (severity) params.append('severity', severity)
    if (limit) params.append('limit', limit.toString())
    return getJSON<{
      data: any[];
      count: number;
    }>(`/api/risk/violations?${params.toString()}`)
  },

  emergencyStop: () => getJSON('/api/risk/emergency-stop', {
    method: 'POST',
    headers: {
      'X-Admin-Required': 'true'
    }
  }),

  resetDailyRisk: () => getJSON('/api/risk/reset-daily', {
    method: 'POST',
    headers: {
      'X-Admin-Required': 'true'
    }
  }),

  validatePosition: (data: {
    accountBalance: number;
    positionSize: number;
    symbol: string;
    currentPositions?: any[];
  }) => getJSON('/api/risk/validate-position', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  calculatePositionSize: (data: {
    accountBalance: number;
    entryPrice: number;
    stopLossPrice: number;
    riskPerTrade?: number;
  }) => getJSON('/api/risk/calculate-position-size', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Monitoring endpoints
  getMonitoringMetrics: () => getJSON<{
    api: any;
    trading: any;
    system: any;
    risk: any;
  }>('/api/monitoring/metrics'),

  getSystemHealth: () => getJSON<{
    status: string;
    lastCheck: string;
    issues: string[];
  }>('/api/monitoring/health'),

  getAlerts: (severity?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (severity) params.append('severity', severity)
    if (limit) params.append('limit', limit.toString())
    return getJSON<{
      data: any[];
      count: number;
    }>(`/api/monitoring/alerts?${params.toString()}`)
  },

  getApiPerformance: () => getJSON<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: string;
    averageLatency: string;
    lastLatency: number;
    errorRate: string;
  }>('/api/monitoring/api-performance'),

  getTradingPerformance: () => getJSON<{
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    successRate: string;
    averageSlippage: string;
    lastOrderLatency: number;
    failureRate: string;
  }>('/api/monitoring/trading-performance'),

  getSystemMetrics: () => getJSON<{
    memoryUsage: string;
    cpuUsage: string;
    activeConnections: number;
    uptime: number;
    uptimeFormatted: string;
  }>('/api/monitoring/system-metrics'),

  getRiskMetrics: () => getJSON<{
    violations: number;
    alerts: number;
    riskLevel: string;
  }>('/api/monitoring/risk-metrics'),

  getPerformanceReport: () => getJSON<{
    summary: any;
    api: any;
    trading: any;
    system: any;
    risk: any;
    recentAlerts: any[];
    issues: string[];
  }>('/api/monitoring/performance-report'),

  resetMetrics: () => getJSON('/api/monitoring/reset-metrics', {
    method: 'POST',
    headers: {
      'X-Admin-Required': 'true'
    }
  }),
};

// Enhanced API with better error handling, types, and MetaTrader integration
export const enhancedApi = {
  // System status with enhanced monitoring
  async getSystemStatus() {
    try {
      const [health, status] = await Promise.all([
        api.health(),
        api.status()
      ]);
      return {
        isOnline: health.status === 'healthy',
        tradingMode: status.mode,
        autonomousTrading: status.autonomousTrading,
        uptime: health.uptime,
        timestamp: health.timestamp,
        memory: health.memory,
        environment: health.environment,
        version: health.version
      };
    } catch (error) {
      console.error('Error fetching system status:', error);
      return {
        isOnline: false,
        tradingMode: 'paper',
        autonomousTrading: false,
        uptime: 0,
        timestamp: new Date().toISOString(),
        memory: null,
        environment: 'unknown',
        version: 'unknown'
      };
    }
  },

  // Account data with enhanced error handling
  async getAccountData() {
    try {
      const [balance, positions, tradingState] = await Promise.all([
        api.getBalance(),
        api.getPositions(),
        api.getTradingState()
      ]);
      return {
        balance: {
          total: balance.total,
          available: balance.available,
          currency: balance.currency,
          mode: balance.mode
        },
        positions: positions.positions,
        openOrders: tradingState.openOrders,
        pnlDayPct: tradingState.pnlDayPct,
        tradingMode: positions.mode,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching account data:', error);
      return {
        balance: { total: 0, available: 0, currency: 'USDT', mode: 'paper' },
        positions: [],
        openOrders: [],
        pnlDayPct: 0,
        tradingMode: 'paper',
        lastUpdated: new Date().toISOString()
      };
    }
  },

  // Trading operations with enhanced security
  async getTradingData() {
    try {
      const tradingStatus = await api.getTradingStatus();
      return {
        isActive: tradingStatus.data.isActive,
        config: tradingStatus.data.config,
        tradeLog: tradingStatus.data.tradeLog,
        timestamp: tradingStatus.data.timestamp
      };
    } catch (error) {
      console.error('Error fetching trading data:', error);
      return {
        isActive: false,
        config: {},
        tradeLog: [],
        timestamp: new Date().toISOString()
      };
    }
  },

  // Models and training with enhanced monitoring
  async getModelsData() {
    try {
      const [models, training] = await Promise.all([
        api.getModels(),
        api.getTrainingStatus()
      ]);
      return {
        models: models.models,
        training: {
          isTraining: training.isTraining,
          currentModel: training.currentModel,
          progress: training.progress,
          lastTraining: training.lastTraining,
          updatedAt: training.updatedAt
        }
      };
    } catch (error) {
      console.error('Error fetching models data:', error);
      return {
        models: [],
        training: {
          isTraining: false,
          currentModel: null,
          progress: 0,
          lastTraining: null,
          updatedAt: new Date().toISOString()
        }
      };
    }
  },

  // Enhanced trading actions with confirmation dialogs
  async startAutonomousTrading() {
    try {
      const result = await api.startTrading();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error starting autonomous trading:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async stopAutonomousTrading() {
    try {
      const result = await api.stopTrading();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error stopping autonomous trading:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async executeManualTrade(tradeData: TradingSignal) {
    try {
      const result = await api.executeTrade(tradeData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error executing trade:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // MetaTrader integration
  async getMetaTraderStatus() {
    try {
      const config = await api.getMetaTraderConfig();
      return { connected: true, config };
    } catch (error) {
      console.error('Error fetching MetaTrader status:', error);
      return { connected: false, config: null };
    }
  },

  // Risk management
  async getRiskManagementData() {
    try {
      const [riskSettings, performance] = await Promise.all([
        api.getRiskSettings(),
        api.getPerformanceAnalytics('1M')
      ]);
      return { riskSettings, performance };
    } catch (error) {
      console.error('Error fetching risk management data:', error);
      return { 
        riskSettings: null, 
        performance: null 
      };
    }
  },

  // Real-time data polling with enhanced error handling
  async pollTradingStatus(callback: (data: any) => void, interval: number = 5000) {
    const poll = async () => {
      try {
        const data = await this.getTradingData();
        callback(data);
      } catch (error) {
        console.error('Error polling trading status:', error);
      }
    };
    
    // Initial call
    await poll();
    
    // Set up interval
    const intervalId = setInterval(poll, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  },

  // Market data polling
  async pollMarketData(symbols: string[], callback: (data: any) => void, interval: number = 1000) {
    const poll = async () => {
      try {
        const marketData = await Promise.all(
          symbols.map(symbol => api.getMarketData(symbol))
        );
        callback(marketData);
      } catch (error) {
        console.error('Error polling market data:', error);
      }
    };
    
    // Initial call
    await poll();
    
    // Set up interval
    const intervalId = setInterval(poll, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}; 