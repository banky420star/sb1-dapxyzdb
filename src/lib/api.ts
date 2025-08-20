// src/lib/api.ts
export const API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : '')

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export interface TradeRequest {
  symbol: string;
  features?: any;
  manualOverride?: {
    side: 'buy' | 'sell';
    confidence: number;
  };
}

export interface ConsensusResponse {
  passes: boolean;
  finalSignal: 'buy' | 'sell' | 'hold';
  avgConfidence: number;
  voteBreakdown: {
    buy: number;
    sell: number;
    hold: number;
  };
  models: Array<{
    name: string;
    signal: string;
    confidence: number;
  }>;
  timestamp: string;
  riskParams?: {
    positionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxTradeSize: number;
  };
}

export interface TradeResponse {
  ok: boolean;
  consensus: ConsensusResponse;
  tradeResult: any;
  appliedRisk: any;
  timestamp: string;
}

export const api = {
  // Status and health
  status: () => getJSON('/api/status'),
  health: () => getJSON('/health'),
  
  // Trading operations (v2)
  executeTrade: (payload: any) =>
    getJSON('/api/trade/execute', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    }),
  
  // Autonomous tick (v2)
  tick: (payload: any) => 
    getJSON('/api/auto/tick', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    }),
  
  // Account information
  getBalance: () => getJSON('/api/account/balance'),
  getPositions: (symbol?: string) => 
    getJSON(`/api/positions${symbol ? `?symbol=${symbol}` : ''}`),
  
  // AI consensus
  getConsensus: (features?: any): Promise<ConsensusResponse> =>
    getJSON('/api/ai/consensus', { 
      method: 'POST', 
      body: JSON.stringify({ features }) 
    }),
  
  // Autonomous trading control
  startAutonomousTrading: () =>
    getJSON('/api/trading/start', { method: 'POST' }),
  
  stopAutonomousTrading: () =>
    getJSON('/api/trading/stop', { method: 'POST' }),
  
  getTradingStatus: () => getJSON('/api/trading/status'),
};

export default api; 