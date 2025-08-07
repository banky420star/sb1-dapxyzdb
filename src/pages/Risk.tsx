import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
  Percent,
  Users,
  Zap,
  PieChart,
  Calculator,
  Bell,
  AlertCircle,
  TrendingUp,
  Minus,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Cpu
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Risk() {
  const { state } = useTradingContext();
  const [activeTab, setActiveTab] = useState<'historical' | 'monte-carlo'>('historical');
  const [isRunningVaR, setIsRunningVaR] = useState(false);
  const [varResult, setVarResult] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const positions = state.positions || [];
  const trades = state.trades || [];
  const systemStatus = state.systemStatus || 'offline';

  // Calculate risk metrics
  const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * 100000), 0);
  const currentRisk = positions.reduce((sum, pos) => sum + Math.abs(pos.pnl || 0), 0);
  const maxDrawdown = Math.min(...trades.map(t => t.pnl || 0));
  const winRate = trades.length > 0 ? trades.filter(t => (t.pnl || 0) > 0).length / trades.length : 0;

  // Mock exposure data for sunburst
  const exposureData = [
    { name: 'Forex', value: 45, color: '#0E76FD' },
    { name: 'Crypto', value: 30, color: '#20C997' },
    { name: 'Stocks', value: 15, color: '#F04444' },
    { name: 'Commodities', value: 10, color: '#F59E0B' }
  ];

  // Mock alert rules
  const alertRules = [
    { id: 1, name: 'Daily Loss Limit', condition: '> $5,000', status: 'active', type: 'loss' },
    { id: 2, name: 'Position Size Limit', condition: '> $100,000', status: 'active', type: 'exposure' },
    { id: 3, name: 'Drawdown Alert', condition: '> 10%', status: 'inactive', type: 'drawdown' },
    { id: 4, name: 'Win Rate Alert', condition: '< 50%', status: 'active', type: 'performance' }
  ];

  const runVaR = () => {
    setIsRunningVaR(true);
    setTimeout(() => {
      setVarResult(Math.random() * 5000 + 1000);
      setIsRunningVaR(false);
    }, 3000);
  };

  return (
    <div className={`min-h-screen bg-futuristic text-slate-100 p-6 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-7xl mx-auto">
        {/* V2: Enhanced Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gradient flex items-center">
              <Shield className="w-8 h-8 mr-3 text-indigo-400" />
              Risk Management
            </h1>
            <p className="text-slate-400 text-lg">
              Monitor exposure, calculate VaR, and manage risk alerts
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 rounded-xl text-sm font-semibold glass text-green-400 border border-green-500/30">
              🟢 Risk Engine Online
            </div>
            <div className="px-4 py-2 rounded-xl text-sm font-semibold glass text-blue-400 border border-blue-500/30">
              🔵 Alerts Active
            </div>
          </div>
        </motion.div>

        {/* V2: Enhanced Risk Overview Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <motion.div 
            className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Current Risk</p>
                <p className="text-3xl font-bold text-white">
                  ${currentRisk.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500/20 to-pink-600/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Total Exposure</p>
                <p className="text-3xl font-bold text-white">
                  ${totalExposure.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Max Drawdown</p>
                <p className="text-3xl font-bold text-white">
                  ${Math.abs(maxDrawdown).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 font-medium">Win Rate</p>
                <p className="text-3xl font-bold text-white">
                  {(winRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* V2: Enhanced VaR Calculator */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Value at Risk (VaR) Calculator</h2>
          <div className="flex items-center space-x-6">
            <button
              onClick={runVaR}
              disabled={isRunningVaR}
              className="btn-futuristic px-8 py-4 flex items-center space-x-2 disabled:opacity-50"
            >
              <Calculator className="w-5 h-5" />
              <span>{isRunningVaR ? 'Calculating...' : 'Calculate VaR'}</span>
            </button>
            {varResult && (
              <div className="glass px-6 py-4 rounded-xl border border-white/20">
                <p className="text-slate-400 text-sm">95% VaR (1-day)</p>
                <p className="text-2xl font-bold text-white">${varResult.toFixed(2)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* V2: Enhanced Tab Navigation */}
        <motion.div 
          className="flex space-x-2 glass p-2 rounded-xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <button
            onClick={() => setActiveTab('historical')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'historical'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Historical VaR</span>
          </button>
          <button
            onClick={() => setActiveTab('monte-carlo')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'monte-carlo'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Monte Carlo</span>
          </button>
        </motion.div>

        {/* V2: Enhanced Exposure Breakdown */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Exposure Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
              <div className="space-y-3">
                {exposureData.map((asset, index) => (
                  <motion.div 
                    key={asset.name}
                    className="flex items-center justify-between p-3 glass rounded-lg border border-white/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 + index * 0.1, duration: 0.6 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: asset.color }}
                      ></div>
                      <span className="text-white font-medium">{asset.name}</span>
                    </div>
                    <span className="text-slate-400 font-semibold">{asset.value}%</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 glass rounded-lg border border-white/10">
                  <span className="text-slate-400">Volatility</span>
                  <span className="text-white font-semibold">12.5%</span>
                </div>
                <div className="flex justify-between items-center p-3 glass rounded-lg border border-white/10">
                  <span className="text-slate-400">Beta</span>
                  <span className="text-white font-semibold">1.2</span>
                </div>
                <div className="flex justify-between items-center p-3 glass rounded-lg border border-white/10">
                  <span className="text-slate-400">Correlation</span>
                  <span className="text-white font-semibold">0.85</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* V2: Enhanced Alert Rules */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Risk Alert Rules</h2>
          <div className="space-y-4">
            {alertRules.map((rule, index) => (
              <motion.div 
                key={rule.id}
                className="flex items-center justify-between p-4 glass rounded-xl border border-white/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    rule.status === 'active' ? 'bg-green-400' : 'bg-slate-500'
                  }`}></div>
                  <div>
                    <p className="text-white font-semibold">{rule.name}</p>
                    <p className="text-slate-400 text-sm">Trigger: {rule.condition}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    rule.status === 'active' ? 'text-green-400' : 'text-slate-400'
                  }`}>
                    {rule.status}
                  </span>
                  <button className="p-2 rounded-lg glass hover:bg-white/10 transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* V2: Enhanced System Status */}
        <motion.div 
          className="card-futuristic p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Risk System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-medium">Risk Engine Online</span>
            </div>
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-medium">Alerts Active</span>
            </div>
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-medium">VaR Calculator Ready</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}