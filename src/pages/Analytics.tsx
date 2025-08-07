import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Calendar,
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  Filter,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Analytics() {
  const { state } = useTradingContext();
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const trades = state.trades || [];
  const positions = state.positions || [];

  // Mock strategy performance data
  const strategyData = [
    { name: 'LSTM Neural Net', pnl: 15420, trades: 127, winRate: 0.68, sharpe: 1.24 },
    { name: 'Random Forest', pnl: 8920, trades: 89, winRate: 0.62, sharpe: 0.98 },
    { name: 'DDQN Agent', pnl: 11230, trades: 156, winRate: 0.71, sharpe: 1.15 },
    { name: 'Mean Reversion', pnl: 5430, trades: 67, winRate: 0.58, sharpe: 0.87 }
  ];

  // Mock heatmap data (30 days)
  const heatmapData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
    pnl: Math.random() * 2000 - 1000,
    trades: Math.floor(Math.random() * 10) + 1
  }));

  // Mock anomaly data
  const anomalies = [
    { id: 1, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), type: 'spike', severity: 'high', description: 'Unusual volume spike detected' },
    { id: 2, timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), type: 'drawdown', severity: 'medium', description: 'Rapid drawdown in LSTM model' },
    { id: 3, timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), type: 'correlation', severity: 'low', description: 'High correlation between assets' }
  ];

  const getHeatmapColor = (pnl: number) => {
    if (pnl > 500) return 'bg-green-600';
    if (pnl > 100) return 'bg-green-500';
    if (pnl > -100) return 'bg-gray-500';
    if (pnl > -500) return 'bg-red-500';
    return 'bg-red-600';
  };

  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true);
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
    // In real implementation, this would call the API
    console.log(`Exporting data as ${format}`);
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
              <BarChart3 className="w-8 h-8 mr-3 text-indigo-400" />
              Analytics Hub
            </h1>
            <p className="text-slate-400 text-lg">
              Performance analysis, strategy insights, and anomaly detection
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
              <RefreshCw className="h-5 w-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </button>
            <button className="p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
              <Settings className="h-5 w-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </button>
          </div>
        </motion.div>

        {/* V2: Enhanced Strategy Performance Overview */}
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
                <p className="text-sm text-slate-400 font-medium">Total P&L</p>
                <p className="text-3xl font-bold text-white">
                  ${strategyData.reduce((sum, s) => sum + s.pnl, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
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
                <p className="text-sm text-slate-400 font-medium">Total Trades</p>
                <p className="text-3xl font-bold text-white">
                  {strategyData.reduce((sum, s) => sum + s.trades, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
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
                <p className="text-sm text-slate-400 font-medium">Avg Win Rate</p>
                <p className="text-3xl font-bold text-white">
                  {(strategyData.reduce((sum, s) => sum + s.winRate, 0) / strategyData.length * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
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
                <p className="text-sm text-slate-400 font-medium">Avg Sharpe Ratio</p>
                <p className="text-3xl font-bold text-white">
                  {(strategyData.reduce((sum, s) => sum + s.sharpe, 0) / strategyData.length).toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* V2: Enhanced Strategy Performance Table */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Strategy Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-slate-400 font-semibold">Strategy</th>
                  <th className="text-right p-4 text-slate-400 font-semibold">P&L</th>
                  <th className="text-right p-4 text-slate-400 font-semibold">Trades</th>
                  <th className="text-right p-4 text-slate-400 font-semibold">Win Rate</th>
                  <th className="text-right p-4 text-slate-400 font-semibold">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {strategyData.map((strategy, index) => (
                  <motion.tr 
                    key={strategy.name}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                  >
                    <td className="p-4 font-semibold text-white">{strategy.name}</td>
                    <td className={`p-4 text-right font-bold ${strategy.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${strategy.pnl.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-slate-300">{strategy.trades}</td>
                    <td className="p-4 text-right text-slate-300">{(strategy.winRate * 100).toFixed(1)}%</td>
                    <td className="p-4 text-right text-slate-300">{strategy.sharpe.toFixed(2)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* V2: Enhanced Export Controls */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Export Data</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => exportData('csv')}
              disabled={isExporting}
              className="btn-futuristic px-6 py-3 flex items-center space-x-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportData('json')}
              disabled={isExporting}
              className="btn-futuristic px-6 py-3 flex items-center space-x-2 disabled:opacity-50"
            >
              <FileJson className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => exportData('pdf')}
              disabled={isExporting}
              className="btn-futuristic px-6 py-3 flex items-center space-x-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </motion.div>

        {/* V2: Enhanced Anomaly Detection */}
        <motion.div 
          className="card-futuristic p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Anomaly Detection</h2>
          <div className="space-y-4">
            {anomalies.map((anomaly, index) => (
              <motion.div 
                key={anomaly.id}
                className="flex items-center justify-between p-4 glass rounded-xl border border-white/10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.1, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    anomaly.severity === 'high' ? 'bg-red-400' : 
                    anomaly.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}></div>
                  <div>
                    <p className="text-white font-semibold">{anomaly.description}</p>
                    <p className="text-slate-400 text-sm">{anomaly.timestamp.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-slate-400 text-sm capitalize">{anomaly.type}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* V2: Enhanced Performance Heatmap */}
        <motion.div 
          className="card-futuristic p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">Performance Heatmap (Last 30 Days)</h2>
          <div className="grid grid-cols-30 gap-1">
            {heatmapData.map((day, index) => (
              <motion.div
                key={index}
                className={`w-8 h-8 rounded ${getHeatmapColor(day.pnl)} flex items-center justify-center text-xs text-white font-bold cursor-pointer hover:scale-110 transition-transform`}
                title={`${day.date.toLocaleDateString()}: $${day.pnl.toFixed(0)} (${day.trades} trades)`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.3 + index * 0.01, duration: 0.3 }}
              >
                {day.trades}
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>High Profit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>Neutral</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Loss</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}