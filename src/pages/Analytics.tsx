import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Target,
  Clock,
  Calendar,
  PieChart,
  LineChart,
  Filter,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

// Mock analytics data
const performanceData = {
  totalPnL: 28450,
  totalPnLPercentage: 28.45,
  dailyPnL: 1250,
  weeklyPnL: 8900,
  monthlyPnL: 28450,
  totalTrades: 156,
  winningTrades: 107,
  losingTrades: 49,
  winRate: 68.5,
  averageWin: 2.8,
  averageLoss: -1.9,
  profitFactor: 3.2,
  sharpeRatio: 1.85,
  maxDrawdown: -8.5,
  recoveryFactor: 3.35,
  expectancy: 1.2
};

const equityCurveData = [
  { date: '2024-01-01', equity: 100000, pnl: 0 },
  { date: '2024-01-02', equity: 102500, pnl: 2500 },
  { date: '2024-01-03', equity: 101800, pnl: -700 },
  { date: '2024-01-04', equity: 104200, pnl: 2400 },
  { date: '2024-01-05', equity: 103500, pnl: -700 },
  { date: '2024-01-06', equity: 106800, pnl: 3300 },
  { date: '2024-01-07', equity: 105200, pnl: -1600 },
  { date: '2024-01-08', equity: 108900, pnl: 3700 },
  { date: '2024-01-09', equity: 107300, pnl: -1600 },
  { date: '2024-01-10', equity: 111200, pnl: 3900 },
  { date: '2024-01-11', equity: 109600, pnl: -1600 },
  { date: '2024-01-12', equity: 113500, pnl: 3900 },
  { date: '2024-01-13', equity: 111900, pnl: -1600 },
  { date: '2024-01-14', equity: 115800, pnl: 3900 },
  { date: '2024-01-15', equity: 114200, pnl: -1600 },
  { date: '2024-01-16', equity: 118100, pnl: 3900 },
  { date: '2024-01-17', equity: 116500, pnl: -1600 },
  { date: '2024-01-18', equity: 120400, pnl: 3900 },
  { date: '2024-01-19', equity: 118800, pnl: -1600 },
  { date: '2024-01-20', equity: 122700, pnl: 3900 },
  { date: '2024-01-21', equity: 121100, pnl: -1600 },
  { date: '2024-01-22', equity: 125000, pnl: 3900 },
  { date: '2024-01-23', equity: 123400, pnl: -1600 },
  { date: '2024-01-24', equity: 127300, pnl: 3900 },
  { date: '2024-01-25', equity: 125700, pnl: -1600 },
  { date: '2024-01-26', equity: 129600, pnl: 3900 },
  { date: '2024-01-27', equity: 128000, pnl: -1600 },
  { date: '2024-01-28', equity: 131900, pnl: 3900 },
  { date: '2024-01-29', equity: 130300, pnl: -1600 },
  { date: '2024-01-30', equity: 134200, pnl: 3900 }
];

const assetPerformance = [
  { symbol: 'BTCUSDT', pnl: 12500, percentage: 44, trades: 45, winRate: 71 },
  { symbol: 'ETHUSDT', pnl: 8900, percentage: 31, trades: 38, winRate: 68 },
  { symbol: 'SOLUSDT', pnl: 4200, percentage: 15, trades: 32, winRate: 62 },
  { symbol: 'ADAUSDT', pnl: 2850, percentage: 10, trades: 41, winRate: 65 }
];

const recentTrades = [
  { id: 1, symbol: 'BTCUSDT', side: 'buy', size: 0.5, price: 43250, pnl: 1250, time: '2 min ago' },
  { id: 2, symbol: 'ETHUSDT', side: 'sell', size: 2.0, price: 2650, pnl: -450, time: '15 min ago' },
  { id: 3, symbol: 'SOLUSDT', side: 'buy', size: 25, price: 98.5, pnl: 320, time: '1 hour ago' },
  { id: 4, symbol: 'ADAUSDT', side: 'sell', size: 1000, price: 0.485, pnl: 180, time: '2 hours ago' },
  { id: 5, symbol: 'BTCUSDT', side: 'buy', size: 0.3, price: 43100, pnl: 890, time: '3 hours ago' }
];

const Analytics: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const [showChart, setShowChart] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getPnLIcon = (pnl: number) => {
    return pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        className="mb-6"
        >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-accent" />
              Performance Analytics
            </h1>
            <p className="text-gray-400 mt-2">Track performance, analyze trades, and optimize strategies</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {showChart ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <div className="flex bg-surface rounded-lg p-1">
              {['1W', '1M', '3M', '1Y'].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedTimeframe === timeframe
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
          </div>
        </motion.div>

      {/* Performance Overview Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Total P&L */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Total P&L</p>
              <p className="text-2xl font-bold text-white">${performanceData.totalPnL.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-accent" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
            <span className="text-green-400">+{performanceData.totalPnLPercentage}%</span>
            <span className="text-gray-400 ml-1">total return</span>
              </div>
            </div>

        {/* Win Rate */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-white">{performanceData.winRate}%</p>
            </div>
            <Target className="w-8 h-8 text-green-400" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-400">{performanceData.winningTrades}/{performanceData.totalTrades} trades</span>
              </div>
            </div>

        {/* Sharpe Ratio */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-white">{performanceData.sharpeRatio}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-400">Excellent</span>
              </div>
            </div>

        {/* Max Drawdown */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Max Drawdown</p>
              <p className="text-2xl font-bold text-white">{performanceData.maxDrawdown}%</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-400">Recovery: {performanceData.recoveryFactor}x</span>
              </div>
            </div>
        </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve Chart */}
        <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Equity Curve</h2>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          
          {showChart ? (
            <div className="h-64 bg-bg-deep rounded-lg p-4 flex items-center justify-center">
              <div className="text-center">
                <LineChart className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Interactive Chart Coming Soon</p>
                <p className="text-sm text-gray-500">Equity curve visualization with zoom and pan</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {equityCurveData.slice(-10).map((point, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-bg-deep rounded">
                  <span className="text-sm text-gray-400">{point.date}</span>
                  <span className="text-sm text-white">${point.equity.toLocaleString()}</span>
                  <span className={`text-sm ${getPnLColor(point.pnl)}`}>
                    {point.pnl >= 0 ? '+' : ''}{point.pnl}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Asset Performance */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Asset Performance</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {assetPerformance.map((asset) => (
              <div key={asset.symbol} className="p-3 bg-bg-deep rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{asset.symbol}</span>
                  <span className={`text-sm font-medium ${getPnLColor(asset.pnl)}`}>
                    ${asset.pnl.toLocaleString()}
                  </span>
                  </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{asset.percentage}% of total</span>
                  <span>{asset.trades} trades</span>
                  <span>{asset.winRate}% win rate</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Performance Metrics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
      >
        {/* Profit Factor */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Profit Factor</p>
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{performanceData.profitFactor}</p>
                     <p className="text-sm text-gray-400">Target: &gt;2.0</p>
        </div>

        {/* Expectancy */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Expectancy</p>
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{performanceData.expectancy}%</p>
          <p className="text-sm text-gray-400">Per trade</p>
            </div>

        {/* Average Win */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Average Win</p>
            <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
          <p className="text-2xl font-bold text-white">{performanceData.averageWin}%</p>
          <p className="text-sm text-gray-400">Winning trades</p>
            </div>

        {/* Average Loss */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Average Loss</p>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{performanceData.averageLoss}%</p>
          <p className="text-sm text-gray-400">Losing trades</p>
          </div>
        </motion.div>

      {/* Recent Trades */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-surface rounded-lg p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Trades</h2>
          <Filter className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400 font-medium">Symbol</th>
                <th className="text-left py-2 text-gray-400 font-medium">Side</th>
                <th className="text-left py-2 text-gray-400 font-medium">Size</th>
                <th className="text-left py-2 text-gray-400 font-medium">Price</th>
                <th className="text-left py-2 text-gray-400 font-medium">P&L</th>
                <th className="text-left py-2 text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-gray-800">
                  <td className="py-3 text-white font-medium">{trade.symbol}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'buy' 
                        ? 'bg-green-900/30 text-green-400' 
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-gray-300">{trade.size}</td>
                  <td className="py-3 text-gray-300">${trade.price.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`flex items-center ${getPnLColor(trade.pnl)}`}>
                      {getPnLIcon(trade.pnl)}
                      <span className="ml-1">${trade.pnl.toLocaleString()}</span>
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-sm">{trade.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
              </div>
      </motion.div>
      </div>
    </div>
  );
};

export default Analytics;