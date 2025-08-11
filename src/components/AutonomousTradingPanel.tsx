import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TradingStatus {
  isActive: boolean;
  isRunning: boolean;
  tradingState: {
    totalTrades: number;
    successfulTrades: number;
    dailyPnL: number;
    riskMetrics: {
      winRate: number;
      maxDrawdown: number;
      sharpeRatio: number;
    };
    lastTrade: any;
  };
  config: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxDailyLoss: number;
    minConfidence: number;
  };
  lastAnalysis: any;
}

const AutonomousTradingPanel: React.FC = () => {
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const fetchTradingStatus = async () => {
    try {
      const response = await fetch('https://sb1-dapxyzdb-trade-shit.up.railway.app/api/trading/status');
      if (response.ok) {
        const result = await response.json();
        setTradingStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching trading status:', error);
    }
  };

  useEffect(() => {
    fetchTradingStatus();
    const interval = setInterval(fetchTradingStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const startTrading = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://sb1-dapxyzdb-trade-shit.up.railway.app/api/trading/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchTradingStatus();
      } else {
        throw new Error('Failed to start trading bot');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start trading');
    } finally {
      setIsLoading(false);
    }
  };

  const stopTrading = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://sb1-dapxyzdb-trade-shit.up.railway.app/api/trading/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchTradingStatus();
      } else {
        throw new Error('Failed to stop trading bot');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop trading');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!tradingStatus) return 'text-gray-400';
    return tradingStatus.isActive ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = () => {
    if (!tradingStatus) return <Clock className="w-5 h-5" />;
    return tradingStatus.isActive ? 
      <CheckCircle className="w-5 h-5" /> : 
      <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Autonomous Trading Bot</h3>
            <p className="text-gray-400 text-sm">AI-powered automated trading system</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {tradingStatus?.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={startTrading}
          disabled={isLoading || tradingStatus?.isActive}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Start Bot</span>
        </button>
        
        <button
          onClick={stopTrading}
          disabled={isLoading || !tradingStatus?.isActive}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          <Square className="w-4 h-4" />
          <span>Stop Bot</span>
        </button>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Config</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Trading Statistics */}
      {tradingStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Trades</span>
              <span className="text-white font-semibold">{tradingStatus.tradingState.totalTrades}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Win Rate</span>
              <span className="text-white font-semibold">
                {(tradingStatus.tradingState.riskMetrics.winRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Daily P&L</span>
              <span className={`font-semibold ${tradingStatus.tradingState.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${tradingStatus.tradingState.dailyPnL.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && tradingStatus && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="text-white font-semibold mb-4">Trading Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Max Position Size</label>
              <span className="text-white">{tradingStatus.config.maxPositionSize} BTC</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Stop Loss</label>
              <span className="text-white">{(tradingStatus.config.stopLoss * 100).toFixed(1)}%</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Take Profit</label>
              <span className="text-white">{(tradingStatus.config.takeProfit * 100).toFixed(1)}%</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Max Daily Loss</label>
              <span className="text-white">{(tradingStatus.config.maxDailyLoss * 100).toFixed(1)}%</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Min Confidence</label>
              <span className="text-white">{(tradingStatus.config.minConfidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Last Trade Information */}
      {tradingStatus?.tradingState.lastTrade && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Last Trade</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Pair:</span>
              <span className="text-white ml-2">{tradingStatus.tradingState.lastTrade.pair}</span>
            </div>
            <div>
              <span className="text-gray-400">Action:</span>
              <span className={`ml-2 font-medium ${
                tradingStatus.tradingState.lastTrade.action === 'BUY' ? 'text-green-400' : 'text-red-400'
              }`}>
                {tradingStatus.tradingState.lastTrade.action}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Price:</span>
              <span className="text-white ml-2">${tradingStatus.tradingState.lastTrade.executedPrice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {tradingStatus && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Risk Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Max Drawdown:</span>
              <span className="text-white ml-2">{(tradingStatus.tradingState.riskMetrics.maxDrawdown * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Sharpe Ratio:</span>
              <span className="text-white ml-2">{tradingStatus.tradingState.riskMetrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Successful Trades:</span>
              <span className="text-white ml-2">{tradingStatus.tradingState.successfulTrades}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutonomousTradingPanel; 