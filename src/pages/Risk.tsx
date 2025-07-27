import React, { useState } from 'react';
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
  Minus
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Risk() {
  const { state } = useTradingContext();
  const [activeTab, setActiveTab] = useState<'historical' | 'monte-carlo'>('historical');
  const [isRunningVaR, setIsRunningVaR] = useState(false);
  const [varResult, setVarResult] = useState<number | null>(null);

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Risk Management</h1>
          <p className="text-gray-400 text-sm">
            Monitor exposure, calculate VaR, and manage risk alerts
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusPill status="online" label="Risk Engine" />
          <StatusPill status="online" label="Alerts" />
        </div>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Current Risk</p>
              <p className="text-xl font-bold text-white">
                ${currentRisk.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-critical/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-critical" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Exposure</p>
              <p className="text-xl font-bold text-white">
                ${(totalExposure / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Max Drawdown</p>
              <p className="text-xl font-bold text-white">
                ${Math.abs(maxDrawdown).toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-critical/20 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-critical" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Win Rate</p>
              <p className="text-xl font-bold text-white">
                {(winRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-accent" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exposure Sunburst */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Exposure Breakdown</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="relative h-48 flex items-center justify-center">
            {/* Mock sunburst chart */}
            <div className="relative w-32 h-32">
              <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                />
                {exposureData.map((item, index) => {
                  const startAngle = exposureData
                    .slice(0, index)
                    .reduce((sum, d) => sum + (d.value / 100) * 360, 0);
                  const endAngle = startAngle + (item.value / 100) * 360;
                  const x1 = 64 + 60 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 64 + 60 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 64 + 60 * Math.cos((endAngle * Math.PI) / 180);
                  const y2 = 64 + 60 * Math.sin((endAngle * Math.PI) / 180);
                  const largeArcFlag = item.value > 50 ? 1 : 0;
                  
                  return (
                    <path
                      key={item.name}
                      d={`M 64 64 L ${x1} ${y1} A 60 60 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            {exposureData.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-300">{item.name}</span>
                <span className="text-sm font-medium text-white ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* VaR Module */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Value at Risk (VaR)</h3>
            <Calculator className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-bg-deep rounded-lg p-1">
              <button
                onClick={() => setActiveTab('historical')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'historical'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Historical
              </button>
              <button
                onClick={() => setActiveTab('monte-carlo')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'monte-carlo'
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monte Carlo
              </button>
            </div>

            {/* VaR Content */}
            <div className="space-y-4">
              {activeTab === 'historical' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-deep rounded-lg">
                    <span className="text-sm text-gray-400">Confidence Level</span>
                    <span className="text-sm font-medium text-white">95%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-deep rounded-lg">
                    <span className="text-sm text-gray-400">Time Horizon</span>
                    <span className="text-sm font-medium text-white">1 Day</span>
                  </div>
                </div>
              )}

              {activeTab === 'monte-carlo' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-bg-deep rounded-lg">
                    <span className="text-sm text-gray-400">Simulations</span>
                    <span className="text-sm font-medium text-white">10,000</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-deep rounded-lg">
                    <span className="text-sm text-gray-400">Confidence Level</span>
                    <span className="text-sm font-medium text-white">99%</span>
                  </div>
                </div>
              )}

              {/* VaR Result */}
              {varResult && (
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">VaR Result</span>
                    <span className="text-lg font-bold text-accent">
                      ${varResult.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={runVaR}
                disabled={isRunningVaR}
                className="w-full bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isRunningVaR ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    <span>Run VaR Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alert Rules */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-surface rounded-lg p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Alert Rules</h3>
          <button className="text-primary hover:text-primary/80 text-sm font-medium">
            + Add Rule
          </button>
        </div>
        
        <div className="space-y-3">
          {alertRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-4 bg-bg-deep rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  rule.status === 'active' ? 'bg-accent' : 'bg-gray-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-white">{rule.name}</p>
                  <p className="text-xs text-gray-400">{rule.condition}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  rule.status === 'active' 
                    ? 'bg-accent/20 text-accent' 
                    : 'bg-gray-600 text-gray-400'
                }`}>
                  {rule.status}
                </span>
                <button className="text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// StatusPill component (reusing from other pages)
const StatusPill: React.FC<{
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  latency?: number;
  className?: string;
}> = ({ status, label, latency, className = '' }) => {
  const statusConfig = {
    online: {
      color: 'bg-accent',
      dotColor: 'bg-accent',
      textColor: 'text-accent'
    },
    offline: {
      color: 'bg-gray-600',
      dotColor: 'bg-gray-400',
      textColor: 'text-gray-400'
    },
    warning: {
      color: 'bg-yellow-600',
      dotColor: 'bg-yellow-400',
      textColor: 'text-yellow-400'
    },
    error: {
      color: 'bg-critical',
      dotColor: 'bg-critical',
      textColor: 'text-critical'
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-700 ${className}`}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`}></div>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {label}
        </span>
      </div>
      {latency && (
        <span className="text-xs text-gray-500">
          {latency}ms
        </span>
      )}
    </motion.div>
  );
};