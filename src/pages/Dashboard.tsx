import React, { useState, useEffect } from 'react';
import TradeFeed from '../components/TradeFeed';
import ModelTrainingMonitor from '../components/ModelTrainingMonitor';
import DataPipelineMonitor from '../components/DataPipelineMonitor';
import AutonomousTradingPanel from '../components/AutonomousTradingPanel';
import { format } from 'date-fns';

interface SystemMetrics {
  totalTrades: number;
  activeModels: number;
  dataSources: number;
  portfolioValue: number;
  dailyPnL: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export default function Dashboard() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalTrades: 0,
    activeModels: 0,
    dataSources: 0,
    portfolioValue: 0,
    dailyPnL: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemMetrics();
    
    const interval = setInterval(() => {
      fetchSystemMetrics();
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/metrics');
      if (response.ok) {
        const metrics = await response.json();
        setSystemMetrics(metrics);
      }
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-bold text-white">MetaTrader.xyz</h1>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Live Trading System</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-400">
              <span className="hidden sm:inline">Last update: {format(lastUpdate, 'HH:mm:ss')}</span>
              <button
                onClick={fetchSystemMetrics}
                className="text-gray-400 hover:text-white px-2 sm:px-3 py-1 rounded hover:bg-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  {formatCurrency(systemMetrics.portfolioValue)}
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
                <p className={`text-lg sm:text-2xl font-bold truncate ${getPnLColor(systemMetrics.dailyPnL)}`}>
                  {formatPercentage(systemMetrics.dailyPnL)}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">📈</div>
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Sharpe Ratio</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${getSharpeColor(systemMetrics.sharpeRatio)}`}>
                  {systemMetrics.sharpeRatio.toFixed(2)}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">⚡</div>
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Max Drawdown</p>
                <p className="text-lg sm:text-2xl font-bold text-red-500 truncate">
                  {formatPercentage(systemMetrics.maxDrawdown)}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">📉</div>
            </div>
          </div>
        </div>

        {/* Activity Metrics */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Total Trades</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {systemMetrics.totalTrades.toLocaleString()}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">🔄</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Active Models</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {systemMetrics.activeModels}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl ml-2">🤖</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 sm:p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">Data Sources</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {systemMetrics.dataSources}
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
              <span>Status: Operational</span>
              <span className="hidden sm:inline">•</span>
              <span>Uptime: 99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}