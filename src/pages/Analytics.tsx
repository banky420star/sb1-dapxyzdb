import React, { useState } from 'react';
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
  Minimize2
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

export default function Analytics() {
  const { state } = useTradingContext();
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const [isExporting, setIsExporting] = useState(false);

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm">
            Performance analysis, strategy insights, and anomaly detection
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-gray-400 hover:text-white">
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Strategy Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-lg p-4 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total P&L</p>
              <p className="text-xl font-bold text-white">
                ${strategyData.reduce((sum, s) => sum + s.pnl, 0).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
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
              <p className="text-sm text-gray-400">Total Trades</p>
              <p className="text-xl font-bold text-white">
                {strategyData.reduce((sum, s) => sum + s.trades, 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
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
              <p className="text-sm text-gray-400">Avg Win Rate</p>
              <p className="text-xl font-bold text-white">
                {(strategyData.reduce((sum, s) => sum + s.winRate, 0) / strategyData.length * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-accent" />
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
              <p className="text-sm text-gray-400">Avg Sharpe</p>
              <p className="text-xl font-bold text-white">
                {(strategyData.reduce((sum, s) => sum + s.sharpe, 0) / strategyData.length).toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Heatmap */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Strategy Performance Heatmap</h3>
            <div className="flex items-center space-x-2">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="bg-bg-deep border border-gray-600 rounded-lg px-3 py-1 text-sm text-white"
              >
                <option value="1W">1W</option>
                <option value="1M">1M</option>
                <option value="3M">3M</option>
                <option value="1Y">1Y</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-30 gap-1">
              {heatmapData.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-sm ${getHeatmapColor(day.pnl)} cursor-pointer hover:opacity-80 transition-opacity`}
                  title={`${day.date.toLocaleDateString()}: $${day.pnl.toFixed(2)} (${day.trades} trades)`}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Loss</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              </div>
              <span>Profit</span>
            </div>
          </div>
        </motion.div>

        {/* Anomaly Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Anomaly Detection</h3>
            <AlertTriangle className="h-5 w-5 text-critical" />
          </div>
          
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div key={anomaly.id} className="p-3 bg-bg-deep rounded-lg border border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        anomaly.severity === 'high' ? 'bg-critical' :
                        anomaly.severity === 'medium' ? 'bg-yellow-500' : 'bg-accent'
                      }`} />
                      <span className="text-sm font-medium text-white capitalize">
                        {anomaly.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        anomaly.severity === 'high' ? 'bg-critical/20 text-critical' :
                        anomaly.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-accent/20 text-accent'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{anomaly.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {anomaly.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-white ml-2">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            <button className="w-full text-center text-sm text-primary hover:text-primary/80 py-2">
              View All Anomalies
            </button>
          </div>
        </motion.div>
      </div>

      {/* Strategy Performance Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-surface rounded-lg p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Strategy Performance</h3>
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-white">
              <Filter className="h-4 w-4" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Strategy</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">P&L</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Trades</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Win Rate</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Sharpe</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {strategyData.map((strategy, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-bg-deep/50">
                  <td className="py-3 px-4 text-sm font-medium text-white">{strategy.name}</td>
                  <td className={`py-3 px-4 text-sm text-right font-medium ${
                    strategy.pnl >= 0 ? 'text-accent' : 'text-critical'
                  }`}>
                    ${strategy.pnl.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-300">{strategy.trades}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-300">
                    {(strategy.winRate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-300">{strategy.sharpe}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    <button className="text-primary hover:text-primary/80">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Export Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-surface rounded-lg p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Export Analytics</h3>
            <p className="text-sm text-gray-400">Download performance data in various formats</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => exportData('csv')}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportData('json')}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-accent/80 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <FileJson className="h-4 w-4" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => exportData('pdf')}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2 bg-critical hover:bg-critical/80 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
        
        {isExporting && (
          <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-accent">Preparing export...</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}