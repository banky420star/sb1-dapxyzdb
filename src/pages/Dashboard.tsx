import React from 'react';
import TradeFeed from '../components/TradeFeed';
import ModelTrainingMonitor from '../components/ModelTrainingMonitor';
import DataPipelineMonitor from '../components/DataPipelineMonitor';
import AutonomousTradingPanel from '../components/AutonomousTradingPanel';
import { useTradingContext } from '../contexts/TradingContext';
import { format } from 'date-fns';

export default function Dashboard() {
  const { state, refresh } = useTradingContext();
  const bal = state.balance;
  const ensemble = state.models.find(m => m.type === 'ensemble')?.metrics ?? { accuracy: 0, trades: 0, profitPct: 0 };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPnLColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getSharpeColor = (value: number) => {
    if (value >= 1.5) return 'text-green-500';
    if (value >= 1.0) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-bold text-white">MetaTrader.xyz</h1>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
                <div className={`w-2 h-2 rounded-full ${state.systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{state.systemStatus === 'online' ? 'Live Trading System' : 'System Offline'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-400">
              <span className="hidden sm:inline">Last update: {format(new Date(), 'HH:mm:ss')}</span>
              <button
                onClick={refresh}
                className="text-gray-400 hover:text-white px-2 sm:px-3 py-1 rounded hover:bg-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Autonomous Trading Bot Section */}
        <div className="mb-6 sm:mb-8">
          <AutonomousTradingPanel />
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {/* Portfolio Value */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Portfolio Value</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {bal ? formatCurrency(bal.equity) : '$0'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">💰</div>
            </div>
          </div>

          {/* Daily P&L */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Daily P&L</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${getPnLColor(bal?.pnl24hPct || 0)}`}>
                  {bal ? formatPercentage(bal.pnl24hPct) : '0.00%'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">📈</div>
            </div>
          </div>

          {/* Ensemble Accuracy */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">AI Accuracy</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${getSharpeColor(ensemble.accuracy)}`}>
                  {ensemble.accuracy.toFixed(1)}%
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">⚡</div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Trades</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {ensemble.trades.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">🔄</div>
            </div>
          </div>
        </div>

        {/* Activity Metrics */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Active Models</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {state.models.filter(m => m.status === 'ready').length}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">🤖</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Trading Mode</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {state.tradingMode.toUpperCase()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">🎯</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Profit %</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {formatPercentage(ensemble.profitPct)}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">📊</div>
            </div>
          </div>
        </div>

        {/* Main Monitoring Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Trade Feed */}
          <div>
            <TradeFeed maxTrades={25} />
          </div>

          {/* Model Training Monitor */}
          <div>
            <ModelTrainingMonitor maxRuns={5} />
          </div>
        </div>

        {/* Data Pipeline Monitor - Full Width */}
        <div className="mt-4 sm:mt-8">
          <DataPipelineMonitor refreshInterval={15000} />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-400 space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
              <span>MetaTrader.xyz - Autonomous Trading System</span>
              <span className="hidden sm:inline">•</span>
              <span>Always Learning, Self-Upgrading, Pair-Hoovering</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span>Status: {state.systemStatus === 'online' ? 'Operational' : 'Offline'}</span>
              <span className="hidden sm:inline">•</span>
              <span>Mode: {state.tradingMode.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}