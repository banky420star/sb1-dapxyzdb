import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

const AutonomousTradingPanel: React.FC = () => {
  const { state, startTrading, stopTrading } = useTradingContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const handleStartTrading = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await startTrading();
      if (!result.success) {
        setError(result.error || 'Failed to start trading bot');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start trading');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTrading = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await stopTrading();
      if (!result.success) {
        setError(result.error || 'Failed to stop trading bot');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop trading');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    return state.autonomousTrading.isActive ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = () => {
    return state.autonomousTrading.isActive ? 
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
            {state.autonomousTrading.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={handleStartTrading}
          disabled={isLoading || state.autonomousTrading.isActive}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Start Bot</span>
        </button>
        
        <button
          onClick={handleStopTrading}
          disabled={isLoading || !state.autonomousTrading.isActive}
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
      {state.autonomousTrading.tradeLog.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Trades</span>
              <span className="text-white font-semibold">{state.autonomousTrading.tradeLog.length}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Last Trade</span>
              <span className="text-white font-semibold">
                {state.autonomousTrading.tradeLog[state.autonomousTrading.tradeLog.length - 1]?.symbol || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Last Update</span>
              <span className="text-white font-semibold text-sm">
                {new Date(state.autonomousTrading.lastUpdate).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && state.autonomousTrading.config && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="text-white font-semibold mb-4">Trading Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Max Position Size</label>
              <span className="text-white">{state.autonomousTrading.config.maxPositionSize || 'N/A'}</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Stop Loss %</label>
              <span className="text-white">{state.autonomousTrading.config.stopLossPercent || 'N/A'}%</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Take Profit %</label>
              <span className="text-white">{state.autonomousTrading.config.takeProfitPercent || 'N/A'}%</span>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Min Confidence</label>
              <span className="text-white">{state.autonomousTrading.config.minConfidence || 'N/A'}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {state.autonomousTrading.tradeLog.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4">Recent Trades</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {state.autonomousTrading.tradeLog.slice(-5).reverse().map((trade, index) => (
              <div key={trade.id || index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-white">{trade.symbol}</span>
                  <span className="text-gray-400">{trade.side.toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <span className="text-white">${trade.price?.toFixed(2) || 'N/A'}</span>
                  <span className="text-gray-400 ml-2">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutonomousTradingPanel; 