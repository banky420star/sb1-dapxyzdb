import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface MarketData {
  symbol: string;
  price: number;
  timestamp: string;
  volume?: number;
  change?: number;
}

interface TradingSignal {
  id: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  confidence: number;
  timestamp: string;
}

interface Portfolio {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  profit: number;
  positions: Array<{
    id: number;
    symbol: string;
    type: 'BUY' | 'SELL';
    lots: number;
    openPrice: number;
    currentPrice: number;
    profit: number;
  }>;
}

export interface ModelActivity {
  model: string;
  epoch: number;
  epochs: number;
  batch: number;
  loss: number;
  acc: number;
  extra: {
    hiddenNorm: number;
    gradientNorm: number;
    qValue: number;
  };
  timestamp: number;
  status?: 'idle' | 'training' | 'completed';
}

interface TradingContextType {
  marketData: MarketData | null;
  signals: TradingSignal[];
  portfolio: Portfolio | null;
  activity: { [key: string]: ModelActivity };
  isConnected: boolean;
  startTraining: (model: string) => void;
  loading: boolean;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};

// Backward compatibility alias
export const useTradingContext = useTrading;

interface TradingProviderProps {
  children: React.ReactNode;
}

export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [activity, setActivity] = useState<{ [key: string]: ModelActivity }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || API_URL;

    const newSocket = io(WS_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to trading server');
      setIsConnected(true);
      setLoading(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from trading server');
      setIsConnected(false);
    });

    newSocket.on('market-data', (data: MarketData) => {
      setMarketData(data);
    });

    newSocket.on('model_activity', (data: ModelActivity) => {
      setActivity(prev => ({
        ...prev,
        [data.model]: data
      }));
    });

    setSocket(newSocket);

    // Fetch initial data
    fetchInitialData(API_URL);

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchInitialData = async (API_URL: string) => {
    try {
      const [signalsRes, portfolioRes] = await Promise.all([
        fetch(`${API_URL}/api/signals`),
        fetch(`${API_URL}/api/portfolio`)
      ]);

      if (signalsRes.ok) {
        const signalsData = await signalsRes.json();
        setSignals(signalsData);
      }

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolio(portfolioData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const startTraining = async (model: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${API_URL}/api/train/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log(`Started training for ${model}`);
      } else {
        console.error(`Failed to start training for ${model}`);
      }
    } catch (error) {
      console.error('Error starting training:', error);
    }
  };

  const value: TradingContextType = {
    marketData,
    signals,
    portfolio,
    activity,
    isConnected,
    startTraining,
    loading,
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};