import React, { useState } from 'react';
import api, { TradeRequest } from '../lib/api';

interface TradeTriggerProps {
  onTradeExecuted?: (result: any) => void;
  onError?: (error: string) => void;
}

export const TradeTrigger: React.FC<TradeTriggerProps> = ({ 
  onTradeExecuted, 
  onError 
}) => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [isLoading, setIsLoading] = useState(false);
  const [useManualOverride, setUseManualOverride] = useState(false);
  const [manualSide, setManualSide] = useState<'buy' | 'sell'>('buy');
  const [manualConfidence, setManualConfidence] = useState(0.8);

  const handleTrade = async () => {
    setIsLoading(true);
    
    try {
      const payload: TradeRequest = {
        symbol,
        ...(useManualOverride && {
          manualOverride: {
            side: manualSide,
            confidence: manualConfidence
          }
        })
      };

      const result = await api.executeTrade(payload);
      
      if (onTradeExecuted) {
        onTradeExecuted(result);
      }
      
      console.log('Trade executed successfully:', result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Trade execution failed:', errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        AI Trading Trigger
      </h3>
      
      <div className="space-y-4">
        {/* Symbol Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Trading Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="BTCUSDT"
          />
        </div>

        {/* Manual Override Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="manual-override"
            checked={useManualOverride}
            onChange={(e) => setUseManualOverride(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="manual-override" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Manual Override (bypass AI consensus)
          </label>
        </div>

        {/* Manual Override Controls */}
        {useManualOverride && (
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trade Side
              </label>
              <select
                value={manualSide}
                onChange={(e) => setManualSide(e.target.value as 'buy' | 'sell')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confidence Level: {manualConfidence}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={manualConfidence}
                onChange={(e) => setManualConfidence(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleTrade}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Executing Trade...
            </div>
          ) : (
            useManualOverride ? 'Execute Manual Trade' : 'Execute AI Trade'
          )}
        </button>

        {/* Status Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {useManualOverride 
            ? 'Manual override will bypass AI consensus and execute immediately'
            : 'AI consensus will analyze market conditions before executing'
          }
        </div>
      </div>
    </div>
  );
};

export default TradeTrigger; 