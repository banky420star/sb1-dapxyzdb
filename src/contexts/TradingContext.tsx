// src/contexts/TradingContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getJSON } from '../lib/api'

type Model = { type: string; status: string; metrics?: { accuracy: number; trades: number; profitPct: number } }

type TradingState = {
  systemStatus: 'online' | 'offline'
  tradingMode: 'paper' | 'live'
  balance?: { currency: string; available: number; equity: number; pnl24hPct: number; updatedAt: string }
  positions: any[]
  openOrders: any[]
  models: Model[]
  training: { isTraining: boolean; currentModel: string | null; progress: number; lastTraining: string | null }
}

const defaultState: TradingState = {
  systemStatus: 'offline',
  tradingMode: 'paper',
  positions: [],
  openOrders: [],
  models: [],
  training: { isTraining: false, currentModel: null, progress: 0, lastTraining: null },
}

const Ctx = createContext<{ state: TradingState; refresh: () => Promise<void> }>({
  state: defaultState, refresh: async () => {}
})

export const useTradingContext = () => useContext(Ctx)

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TradingState>(defaultState)

  const refresh = async () => {
    const [health, balance, trading, models, training] = await Promise.all([
      getJSON<{ status: string }>('/api/health').catch(() => null),
      getJSON<{ mode: string; currency: string; available: number; equity: number; pnl24hPct: number; updatedAt: string }>('/api/balance').catch(() => null),
      getJSON<{ mode: string; positions: any[]; openOrders: any[]; pnlDayPct: number; updatedAt: string }>('/api/trading/state').catch(() => null),
      getJSON<{ models: Model[] }>('/api/models').catch(() => null),
      getJSON<{ isTraining: boolean; currentModel: string | null; progress: number; lastTraining: string | null; updatedAt: string }>('/api/training/status').catch(() => null),
    ])

    setState(s => ({
      ...s,
      systemStatus: health?.status === 'healthy' ? 'online' : 'offline',
      tradingMode: (trading?.mode ?? s.tradingMode) as 'paper' | 'live',
      balance: balance ? {
        currency: balance.currency, available: balance.available,
        equity: balance.equity, pnl24hPct: balance.pnl24hPct, updatedAt: balance.updatedAt
      } : s.balance,
      positions: trading?.positions ?? s.positions,
      openOrders: trading?.openOrders ?? s.openOrders,
      models: models?.models ?? s.models,
      training: training ? {
        isTraining: training.isTraining,
        currentModel: training.currentModel,
        progress: training.progress,
        lastTraining: training.lastTraining,
      } : s.training,
    }))
  }

  useEffect(() => { refresh() }, [])

  return <Ctx.Provider value={{ state, refresh }}>{children}</Ctx.Provider>
}