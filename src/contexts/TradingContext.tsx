import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { getJSON } from '../lib/api';
import { getWsBase, resolveEndpoint } from '../lib/env';

type Model = {
  type: string;
  status: string;
  metrics?: {
    accuracy?: number;
    trades?: number;
    profitPct?: number;
    loss?: number;
  };
};

export type ModelStatus = {
  status: 'idle' | 'active' | 'training' | 'completed' | 'error';
  epoch: number;
  epochs: number;
  loss: number;
  acc: number;
  updatedAt: string;
  timestamp?: number;
  extra?: Record<string, number | undefined>;
};

export type ModelActivity = Record<string, ModelStatus>;

export interface TradingAlert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'critical';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AutonomousConfig {
  maxPositionSize?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  minConfidence?: number;
  [key: string]: unknown;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown?: number;
}

export interface TradingMetrics {
  equityCurve: EquityPoint[];
}

export interface TradingPosition {
  id?: string;
  symbol: string;
  side?: string;
  size?: number;
  entry?: number;
  entryPrice?: number;
  pnl?: number;
  pnlPct?: number;
  timestamp?: string;
  ts?: string;
}

interface TradingOrder {
  id?: string;
  symbol: string;
  side?: string;
  price?: number;
  qty?: number;
  ts?: string;
}

interface TradeLogEntry {
  id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  price?: number;
  timestamp: string;
  [key: string]: unknown;
}

export interface TradingState {
  systemStatus: 'online' | 'offline';
  tradingMode: 'paper' | 'live';
  balance?: {
    currency: string;
    total: number;
    available: number;
    equity: number;
    pnl24hPct: number;
    updatedAt: string;
  };
  positions: TradingPosition[];
  openOrders: TradingOrder[];
  models: Model[];
  training: {
    isTraining: boolean;
    currentModel: string | null;
    progress: number;
    lastTraining: string | null;
  };
  autonomousTrading: {
    isActive: boolean;
    config: AutonomousConfig;
    tradeLog: TradeLogEntry[];
    lastUpdate: string;
  };
  alerts: TradingAlert[];
  metrics: TradingMetrics;
}

const defaultState: TradingState = {
  systemStatus: 'offline',
  tradingMode: 'paper',
  positions: [],
  openOrders: [],
  models: [],
  training: {
    isTraining: false,
    currentModel: null,
    progress: 0,
    lastTraining: null,
  },
  autonomousTrading: {
    isActive: false,
    config: {},
    tradeLog: [],
    lastUpdate: new Date().toISOString(),
  },
  alerts: [],
  metrics: {
    equityCurve: [],
  },
};

type TradingAction =
  | { type: 'SET_STATE'; payload: Partial<TradingState> }
  | { type: 'SET_ALERTS'; payload: TradingAlert[] }
  | { type: 'ADD_ALERT'; payload: TradingAlert }
  | { type: 'MARK_ALERT_READ'; payload: string };

function tradingReducer(state: TradingState, action: TradingAction): TradingState {
  switch (action.type) {
    case 'SET_STATE': {
      const nextMetrics = action.payload.metrics
        ? { ...state.metrics, ...action.payload.metrics }
        : state.metrics;

      const nextAutonomous = action.payload.autonomousTrading
        ? { ...state.autonomousTrading, ...action.payload.autonomousTrading }
        : state.autonomousTrading;

      return {
        ...state,
        systemStatus: action.payload.systemStatus ?? state.systemStatus,
        tradingMode: action.payload.tradingMode ?? state.tradingMode,
        balance: action.payload.balance ?? state.balance,
        positions: action.payload.positions ?? state.positions,
        openOrders: action.payload.openOrders ?? state.openOrders,
        models: action.payload.models ?? state.models,
        training: action.payload.training ?? state.training,
        autonomousTrading: nextAutonomous,
        metrics: nextMetrics,
        alerts: action.payload.alerts ?? state.alerts,
      };
    }
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [action.payload, ...state.alerts].slice(0, 100) };
    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.payload ? { ...alert, read: true } : alert,
        ),
      };
    default:
      return state;
  }
}

interface TradingContextValue {
  state: TradingState;
  refresh: () => Promise<void>;
  startTrading: () => Promise<{ success: boolean; error?: string }>;
  stopTrading: () => Promise<{ success: boolean; error?: string }>;
  executeTrade: (data: { symbol: string; side: string; confidence?: number }) => Promise<{ success: boolean; error?: string }>;
  dispatch: React.Dispatch<TradingAction>;
  socket: Socket | null;
  activity: ModelActivity;
  syncData: boolean;
}

const TradingContext = createContext<TradingContextValue>({
  state: defaultState,
  refresh: async () => undefined,
  startTrading: async () => ({ success: false, error: 'not-initialised' }),
  stopTrading: async () => ({ success: false, error: 'not-initialised' }),
  executeTrade: async () => ({ success: false, error: 'not-initialised' }),
  dispatch: () => undefined,
  socket: null,
  activity: {},
  syncData: false,
});

export const useTradingContext = () => useContext(TradingContext);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(tradingReducer, defaultState);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activity, setActivity] = useState<ModelActivity>({});
  const [syncData, setSyncData] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [tradingState, accountBalance, tradingStatus, modelsData] = await Promise.all([
        getJSON<Record<string, unknown>>('/api/trading/state').catch(() => null),
        getJSON<Record<string, unknown>>('/api/account/balance').catch(() => null),
        getJSON<Record<string, unknown>>('/api/trading/status').catch(() => null),
        getJSON<{ models?: Model[] }>('/api/models').catch(() => null),
      ]);

      const balancePayload = accountBalance
        ? {
            currency: String(accountBalance.currency ?? 'USDT'),
            total: Number(accountBalance.total ?? accountBalance.available ?? 0),
            available: Number(accountBalance.available ?? 0),
            equity: Number(accountBalance.equity ?? accountBalance.total ?? 0),
            pnl24hPct: Number(accountBalance.pnl24hPct ?? 0),
            updatedAt: String(accountBalance.updatedAt ?? new Date().toISOString()),
          }
        : undefined;

      const positions = Array.isArray(tradingState?.positions)
        ? (tradingState?.positions as TradingPosition[])
        : undefined;

      const openOrders = Array.isArray(tradingState?.openOrders)
        ? (tradingState?.openOrders as TradingOrder[])
        : undefined;

      const tradeLog = Array.isArray(tradingStatus?.tradeLog)
        ? (tradingStatus?.tradeLog as TradeLogEntry[])
        : undefined;

      const newActivity: ModelActivity | null = Array.isArray(modelsData?.models)
        ? modelsData!.models.reduce<ModelActivity>((acc, model) => {
            const metrics = model.metrics ?? {};
            acc[model.type] = acc[model.type] ?? {
              status: (model.status as ModelStatus['status']) || 'idle',
              epoch: 0,
              epochs: 0,
              loss: Number(metrics.loss ?? 0),
              acc: Number(metrics.accuracy ?? 0),
              updatedAt: new Date().toISOString(),
              timestamp: Date.now(),
            };
            return acc;
          }, {})
        : null;

      if (newActivity && Object.keys(newActivity).length > 0) {
        setActivity((prev) => ({ ...prev, ...newActivity }));
      }

      const autonomousTradingPayload: Partial<TradingState['autonomousTrading']> = {};
      if (tradingStatus?.isActive !== undefined) {
        autonomousTradingPayload.isActive = Boolean(tradingStatus.isActive);
      }
      if (tradingStatus?.config) {
        autonomousTradingPayload.config = tradingStatus.config as AutonomousConfig;
      }
      if (tradeLog) {
        autonomousTradingPayload.tradeLog = tradeLog;
      }
      if (tradingStatus?.lastUpdate) {
        autonomousTradingPayload.lastUpdate = String(tradingStatus.lastUpdate);
      }

      const payload: Partial<TradingState> = {
        systemStatus: 'online',
      };

      const mode = tradingState?.mode === 'live' ? 'live' : tradingState?.mode === 'paper' ? 'paper' : undefined;
      if (mode) {
        payload.tradingMode = mode;
      }
      if (balancePayload) {
        payload.balance = balancePayload;
      }
      if (positions) {
        payload.positions = positions;
      }
      if (openOrders) {
        payload.openOrders = openOrders;
      }
      if (Array.isArray(modelsData?.models)) {
        payload.models = modelsData?.models;
      }
      if (Object.keys(autonomousTradingPayload).length) {
        payload.autonomousTrading = {
          ...defaultState.autonomousTrading,
          ...autonomousTradingPayload,
        };
      }

      dispatch({
        type: 'SET_STATE',
        payload,
      });
      setSyncData(true);
    } catch (error) {
      console.error('Error refreshing trading context:', error);
      setSyncData(false);
      dispatch({
        type: 'SET_STATE',
        payload: { systemStatus: 'offline' },
      });
    }
  }, []);

  const startTrading = useCallback(async () => {
    try {
      const response = await fetch(resolveEndpoint('/api/trading/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result?.ok) {
        await refresh();
        return { success: true };
      }
      return { success: false, error: result?.message ?? 'Failed to start trading' };
    } catch (error) {
      console.error('Error starting trading:', error);
      return { success: false, error: 'Network error' };
    }
  }, [refresh]);

  const stopTrading = useCallback(async () => {
    try {
      const response = await fetch(resolveEndpoint('/api/trading/stop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result?.ok) {
        await refresh();
        return { success: true };
      }
      return { success: false, error: result?.message ?? 'Failed to stop trading' };
    } catch (error) {
      console.error('Error stopping trading:', error);
      return { success: false, error: 'Network error' };
    }
  }, [refresh]);

  const executeTrade = useCallback(
    async (data: { symbol: string; side: string; confidence?: number }) => {
      try {
        await fetch(resolveEndpoint('/api/trade/execute'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await refresh();
        return { success: true };
      } catch (error) {
        console.error('Error executing trade:', error);
        return { success: false, error: 'Network error' };
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const url = getWsBase();
    const ws = io(url, {
      path: '/ws',
      transports: ['websocket', 'polling'],
    });

    ws.on('connect', () => setSyncData(true));
    ws.on('disconnect', () => setSyncData(false));

    ws.on('model_activity', (payload: { model: string; status: ModelStatus }) => {
      setActivity((prev) => ({ ...prev, [payload.model]: payload.status }));
    });

    ws.on('alert', (incoming: Partial<TradingAlert> & { id: string; message: string }) => {
      const formatted: TradingAlert = {
        id: incoming.id,
        message: incoming.message,
        type: (incoming.type as TradingAlert['type']) ?? 'info',
        timestamp: incoming.timestamp ?? new Date().toISOString(),
        read: Boolean(incoming.read),
      };

      dispatch({
        type: 'ADD_ALERT',
        payload: formatted,
      });
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const value = useMemo<TradingContextValue>(
    () => ({
      state,
      refresh,
      startTrading,
      stopTrading,
      executeTrade,
      dispatch,
      socket,
      activity,
      syncData,
    }),
    [activity, executeTrade, refresh, socket, startTrading, state, stopTrading, syncData],
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const { state, activity } = useTradingContext();
  const portfolio = state.balance
    ? {
        equity: state.balance.equity,
        positions: state.positions,
        profit: (state.balance.pnl24hPct / 100) * state.balance.total,
      }
    : null;

  return {
    isConnected: state.systemStatus === 'online',
    portfolio,
    activity,
    tradingMode: state.tradingMode,
    systemStatus: state.systemStatus,
  };
}
