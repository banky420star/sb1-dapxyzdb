// src/lib/api.ts
export const API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://normal-sofa-production-9d2b.up.railway.app')

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

// New API endpoints that match our Railway backend
export const api = {
  // Health and status
  health: () => getJSON('/api/health'),
  version: () => getJSON('/api/version'),
  
  // Account information
  getBalance: () => getJSON('/api/balance'),
  
  // Trading state
  getTradingState: () => getJSON('/api/trading/state'),
  
  // Models and training
  getModels: () => getJSON('/api/models'),
  getTrainingStatus: () => getJSON('/api/training/status'),
  
  // Legacy endpoints (for compatibility)
  status: () => getJSON('/api/health'),
  getPositions: () => getJSON('/api/trading/state').then(data => data.positions || []),
};

export default api; 