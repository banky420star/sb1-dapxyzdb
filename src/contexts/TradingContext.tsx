// src/contexts/TradingContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { enhancedApi } from '../lib/api'

type Model = { type: string; status: string; metrics?: { accuracy: number; trades: number; profitPct: number } }

type TradingState = {
  systemStatus: 'online' | 'offline'
  tradingMode: 'paper' | 'live'
  balance?: { currency: string; available: number; equity: number; pnl24hPct: number; updatedAt: string }
  positions: any[]
  openOrders: any[]
  models: Model[]
  training: { isTraining: boolean; currentModel: string | null; progress: number; lastTraining: string | null }
  autonomousTrading: {
    isActive: boolean
    config: any
    tradeLog: any[]
    lastUpdate: string
  }
}

const defaultState: TradingState = {
  systemStatus: 'offline',
  tradingMode: 'paper',
  positions: [],
  openOrders: [],
  models: [],
  training: { isTraining: false, currentModel: null, progress: 0, lastTraining: null },
  autonomousTrading: {
    isActive: false,
    config: {},
    tradeLog: [],
    lastUpdate: new Date().toISOString()
  }
}

const Ctx = createContext<{ 
  state: TradingState; 
  refresh: () => Promise<void>;
  startTrading: () => Promise<{success: boolean, error?: string}>;
  stopTrading: () => Promise<{success: boolean, error?: string}>;
  executeTrade: (data: {symbol: string, side: string, confidence?: number}) => Promise<{success: boolean, error?: string}>;
}>({
  state: defaultState, 
  refresh: async () => {},
  startTrading: async () => ({success: false}),
  stopTrading: async () => ({success: false}),
  executeTrade: async () => ({success: false})
})

export const useTradingContext = () => useContext(Ctx)

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TradingState>(defaultState)

  const refresh = async () => {
    try {
      const [systemStatus, accountData, tradingData, modelsData] = await Promise.all([
        enhancedApi.getSystemStatus(),
        enhancedApi.getAccountData(),
        enhancedApi.getTradingData(),
        enhancedApi.getModelsData()
      ]);

      setState(s => ({
        ...s,
        systemStatus: systemStatus.isOnline ? 'online' : 'offline',
        tradingMode: systemStatus.tradingMode as 'paper' | 'live',
        balance: accountData.balance ? {
          currency: accountData.balance.currency,
          available: accountData.balance.available,
          equity: accountData.balance.total,
          pnl24hPct: accountData.pnlDayPct || 0,
          updatedAt: new Date().toISOString()
        } : s.balance,
        positions: accountData.positions || s.positions,
        openOrders: accountData.openOrders || s.openOrders,
        models: modelsData.models || s.models,
        training: {
          isTraining: modelsData.training.isTraining,
          currentModel: modelsData.training.currentModel,
          progress: modelsData.training.progress,
          lastTraining: modelsData.training.lastTraining,
        },
        autonomousTrading: {
          isActive: tradingData.isActive,
          config: tradingData.config,
          tradeLog: tradingData.tradeLog,
          lastUpdate: tradingData.timestamp
        }
      }));
    } catch (error) {
      console.error('Error refreshing trading context:', error);
      setState(s => ({
        ...s,
        systemStatus: 'offline'
      }));
    }
  }

  const startTrading = async () => {
    try {
      const result = await enhancedApi.startAutonomousTrading();
      if (result.success) {
        await refresh(); // Refresh data after starting
      }
      return result;
    } catch (error) {
      console.error('Error starting trading:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const stopTrading = async () => {
    try {
      const result = await enhancedApi.stopAutonomousTrading();
      if (result.success) {
        await refresh(); // Refresh data after stopping
      }
      return result;
    } catch (error) {
      console.error('Error stopping trading:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const executeTrade = async (tradeData: {symbol: string, side: string, confidence?: number}) => {
    try {
      const result = await enhancedApi.executeManualTrade(tradeData);
      if (result.success) {
        await refresh(); // Refresh data after trade
      }
      return result;
    } catch (error) {
      console.error('Error executing trade:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  useEffect(() => { 
    refresh();
    
    // Set up real-time polling
    let cleanup: (() => void) | undefined;
    
    const setupPolling = async () => {
      cleanup = await enhancedApi.pollTradingStatus((tradingData) => {
        setState(s => ({
          ...s,
          autonomousTrading: {
            isActive: tradingData.isActive,
            config: tradingData.config,
            tradeLog: tradingData.tradeLog,
            lastUpdate: tradingData.timestamp
          }
        }));
      }, 5000); // Poll every 5 seconds
    };

    setupPolling();

    return () => {
      if (cleanup) cleanup();
    };
  }, [])

  return <Ctx.Provider value={{ state, refresh, startTrading, stopTrading, executeTrade }}>{children}</Ctx.Provider>
}