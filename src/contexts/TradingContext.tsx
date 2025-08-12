import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ModelStatus {
  status: 'idle' | 'training' | 'completed' | 'stopped';
  epoch: number;
  epochs: number;
  loss: number;
  acc: number;
  startTime?: string;
}

interface SyncData {
  backend: {
    status: string;
    uptime: number;
    timestamp: string;
  };
  trading: {
    accountBalance: any;
    positions: any[];
  };
  models: {
    LSTM: ModelStatus;
    RF: ModelStatus;
    DDQN: ModelStatus;
  };
  lastSync: string;
}

interface TradingContextType {
  activity: Record<string, any>;
  syncData: SyncData | null;
  isSyncing: boolean;
  lastSyncTime: string | null;
  startTraining: (model: string) => Promise<void>;
  stopTraining: (model: string) => Promise<void>;
  refreshSync: () => Promise<void>;
  syncError: string | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingContext must be used within a TradingProvider');
  }
  return context;
};

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activity, setActivity] = useState<Record<string, any>>({});
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const API_BASE = (import.meta as any).env?.VITE_RAILWAY_API_URL || 'https://sb1-dapxyzdb-trade-shit.up.railway.app';

  // Real-time sync function
  const syncWithBackend = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const response = await fetch(`${API_BASE}/api/sync/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSyncData(result.data);
        setLastSyncTime(new Date().toISOString());
        
        // Update activity state with model training status
        const newActivity = { ...activity };
        Object.entries(result.data.models).forEach(([model, status]: [string, any]) => {
          if (status.status === 'training') {
            newActivity[model] = {
              model,
              epoch: status.epoch,
              epochs: status.epochs,
              batch: 0,
              loss: status.loss,
              acc: status.acc,
              extra: {
                hiddenNorm: 0,
                gradientNorm: 0,
                qValue: 0
              },
              timestamp: Date.now(),
              status: 'training'
            };
          } else if (status.status === 'completed') {
            newActivity[model] = {
              model,
              epoch: status.epochs,
              epochs: status.epochs,
              batch: 0,
              loss: status.loss,
              acc: status.acc,
              extra: {
                hiddenNorm: 0,
                gradientNorm: 0,
                qValue: 0
              },
              timestamp: Date.now(),
              status: 'completed'
            };
          }
        });
        setActivity(newActivity);
      } else {
        throw new Error('Backend sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [activity]);

  // Manual refresh function
  const refreshSync = useCallback(async () => {
    await syncWithBackend();
  }, [syncWithBackend]);

  // Start training function
  const startTraining = async (model: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/models/start-training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Started training for ${model}:`, data);
        
        // Update activity state
        setActivity(prev => ({
          ...prev,
          [model]: {
            model,
            epoch: 0,
            epochs: model === 'LSTM' ? 20 : model === 'RF' ? 15 : 25,
            batch: 0,
            loss: 1.0,
            acc: 0.0,
            extra: {
              hiddenNorm: 0,
              gradientNorm: 0,
              qValue: 0
            },
            timestamp: Date.now(),
            status: 'training'
          }
        }));
        
        // Trigger immediate sync to get updated status
        setTimeout(() => syncWithBackend(), 1000);
      } else {
        console.error(`Failed to start training for ${model}`);
        throw new Error(`Failed to start training for ${model}`);
      }
    } catch (error) {
      console.error('Error starting training:', error);
      throw error;
    }
  };

  // Stop training function
  const stopTraining = async (model: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/models/stop-training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Stopped training for ${model}:`, data);
        
        // Update activity state
        setActivity(prev => ({
          ...prev,
          [model]: {
            ...prev[model],
            status: 'stopped',
            timestamp: Date.now()
          }
        }));
        
        // Trigger immediate sync
        setTimeout(() => syncWithBackend(), 1000);
      } else {
        console.error(`Failed to stop training for ${model}`);
        throw new Error(`Failed to stop training for ${model}`);
      }
    } catch (error) {
      console.error('Error stopping training:', error);
      throw error;
    }
  };

  // Initial sync on mount
  useEffect(() => {
    syncWithBackend();
  }, []);

  // Periodic sync every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      syncWithBackend();
    }, 5000);

    return () => clearInterval(interval);
  }, [syncWithBackend]);

  const value: TradingContextType = {
    activity,
    syncData,
    isSyncing,
    lastSyncTime,
    startTraining,
    stopTraining,
    refreshSync,
    syncError
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
};