const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '';

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json().catch(() => ({}));
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
  status: () => request('/api/status'),
  health: () => request('/health'),
  
  // Trading operations (v2)
  executeTrade: (payload: any) =>
    request('/api/trade/execute', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    }),
  
  // Autonomous tick (v2)
  tick: (payload: any) => 
    request('/api/auto/tick', { 
      method: 'POST', 
      body: JSON.stringify(payload) 
    }),
  
  // Account information
  getBalance: () => request('/api/account/balance'),
  getPositions: (symbol?: string) => 
    request(`/api/positions${symbol ? `?symbol=${symbol}` : ''}`),
  
  // AI consensus
  getConsensus: (features?: any): Promise<ConsensusResponse> =>
    request('/api/ai/consensus', { 
      method: 'POST', 
      body: JSON.stringify({ features }) 
    }),
  
  // Autonomous trading control
  startAutonomousTrading: () =>
    request('/api/trading/start', { method: 'POST' }),
  
  stopAutonomousTrading: () =>
    request('/api/trading/stop', { method: 'POST' }),
  
  getTradingStatus: () => request('/api/trading/status'),
};

export default api; 