// src/lib/api.ts
// Centralized API configuration for MetaTrader.xyz

export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.methtrader.xyz');

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// API endpoints that match our Railway backend
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
  
  // Trading actions
  executeTrade: (data: {symbol: string, side: string, confidence?: number}) => getJSON('/api/trade/execute', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  startTrading: () => getJSON('/api/trading/start', { method: 'POST' }),
  stopTrading: () => getJSON('/api/trading/stop', { method: 'POST' }),
  
  // Auto trading consensus
  autoTick: (data: {symbol?: string, candles?: any[]}) => getJSON('/api/auto/tick', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};

// Enhanced API with better error handling and types
export const enhancedApi = {
  // System status
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
        timestamp: health.timestamp
      };
    } catch (error) {
      console.error('Error fetching system status:', error);
      return {
        isOnline: false,
        tradingMode: 'paper',
        autonomousTrading: false,
        uptime: 0,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Account data
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
        tradingMode: positions.mode
      };
    } catch (error) {
      console.error('Error fetching account data:', error);
      return {
        balance: { total: 0, available: 0, currency: 'USDT', mode: 'paper' },
        positions: [],
        openOrders: [],
        pnlDayPct: 0,
        tradingMode: 'paper'
      };
    }
  },

  // Trading operations
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

  // Models and training
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

  // Trading actions with better error handling
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

  async executeManualTrade(tradeData: {symbol: string, side: string, confidence?: number}) {
    try {
      const result = await api.executeTrade(tradeData);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error executing trade:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Real-time data polling
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
  }
};

export default api; 