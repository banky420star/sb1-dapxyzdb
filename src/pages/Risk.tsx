import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Activity,
  Zap,
  Target,
  Gauge,
  Clock,
  Eye
} from 'lucide-react';

// Mock risk data
const riskData = {
  totalExposure: 125000,
  maxDrawdown: -8.5,
  currentDrawdown: -3.2,
  sharpeRatio: 1.85,
  winRate: 68.5,
  totalTrades: 156,
  profitableTrades: 107,
  averageWin: 2.8,
  averageLoss: -1.9,
  maxLeverage: 10,
  currentLeverage: 3.2,
  marginUsage: 32.5,
  riskPerTrade: 1.5,
  dailyVaR: 2.8,
  weeklyVaR: 6.2,
  monthlyVaR: 12.5
};

const exposureByAsset = [
  { symbol: 'BTCUSDT', exposure: 45000, percentage: 36, risk: 'Medium' },
  { symbol: 'ETHUSDT', exposure: 32000, percentage: 25.6, risk: 'Low' },
  { symbol: 'SOLUSDT', exposure: 28000, percentage: 22.4, risk: 'High' },
  { symbol: 'ADAUSDT', exposure: 20000, percentage: 16, risk: 'Medium' }
];

const recentAlerts = [
  { id: 1, type: 'warning', message: 'SOLUSDT exposure exceeds 20% threshold', time: '2 min ago' },
  { id: 2, type: 'info', message: 'Daily VaR limit reached', time: '15 min ago' },
  { id: 3, type: 'success', message: 'Risk metrics within acceptable range', time: '1 hour ago' }
];

const Risk: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'success': return <Shield className="w-4 h-4 text-green-400" />;
      default: return <Eye className="w-4 h-4 text-blue-400" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Risk Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <Shield className="w-8 h-8 mr-3 text-accent" />
              Risk Management
            </h1>
            <p className="text-gray-400 mt-2">Monitor exposure, leverage, and risk metrics</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex bg-surface rounded-lg p-1">
              {['1H', '1D', '1W', '1M'].map((timeframe) => (
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

      {/* Risk Overview Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
        {/* Total Exposure */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Total Exposure</p>
              <p className="text-2xl font-bold text-white">${riskData.totalExposure.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-accent" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
            <span className="text-green-400">+2.3%</span>
            <span className="text-gray-400 ml-1">vs yesterday</span>
              </div>
            </div>

        {/* Current Drawdown */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-gray-400 text-sm">Current Drawdown</p>
              <p className="text-2xl font-bold text-white">{riskData.currentDrawdown}%</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-400">Max: {riskData.maxDrawdown}%</span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-white">{riskData.sharpeRatio}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-400">Excellent</span>
                </div>
              </div>

        {/* Win Rate */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-2xl font-bold text-white">{riskData.winRate}%</p>
            </div>
            <Target className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-400">{riskData.profitableTrades}/{riskData.totalTrades} trades</span>
            </div>
          </div>
        </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exposure by Asset */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Exposure by Asset</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {exposureByAsset.map((asset, index) => (
              <div key={asset.symbol} className="flex items-center justify-between p-3 bg-bg-deep rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                  <div>
                    <p className="font-medium text-white">{asset.symbol}</p>
                    <p className="text-sm text-gray-400">${asset.exposure.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{asset.percentage}%</p>
                  <p className={`text-sm ${getRiskColor(asset.risk)}`}>{asset.risk} Risk</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Risk Alerts */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Risk Alerts</h2>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
          
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-3 bg-bg-deep rounded-lg">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
            </div>
            </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Risk Metrics Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
      >
        {/* Leverage */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Current Leverage</p>
            <Gauge className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-bold text-white">{riskData.currentLeverage}x</p>
          <p className="text-sm text-gray-400">Max: {riskData.maxLeverage}x</p>
        </div>

        {/* Margin Usage */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Margin Usage</p>
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">{riskData.marginUsage}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-accent h-2 rounded-full" 
              style={{ width: `${riskData.marginUsage}%` }}
            ></div>
          </div>
        </div>

        {/* Daily VaR */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Daily VaR</p>
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{riskData.dailyVaR}%</p>
          <p className="text-sm text-gray-400">95% confidence</p>
        </div>

        {/* Risk per Trade */}
        <div className="bg-surface rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Risk per Trade</p>
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{riskData.riskPerTrade}%</p>
          <p className="text-sm text-gray-400">Target: 1-2%</p>
        </div>
      </motion.div>

      {/* Emergency Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
              Emergency Controls
            </h3>
            <p className="text-gray-400 mt-1">Use these controls in case of extreme market conditions</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
              Pause Trading
            </button>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
              Emergency Stop
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Risk;