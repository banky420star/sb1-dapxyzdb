import React, { useState } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
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
  Zap
} from 'lucide-react'

export default function Risk() {
  const { state } = useTradingContext()
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState('2')
  const [maxDailyLoss, setMaxDailyLoss] = useState('5')
  const [maxPositions, setMaxPositions] = useState('5')
  const [stopLossPercent, setStopLossPercent] = useState('2')
  const [takeProfitPercent, setTakeProfitPercent] = useState('4')

  const positions = state.positions || []
  const trades = state.trades || []
  const systemStatus = state.systemStatus || 'offline'

  // Calculate risk metrics
  const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * 100000), 0)
  const currentRisk = positions.reduce((sum, pos) => sum + Math.abs(pos.pnl || 0), 0)
  const maxDrawdown = Math.min(...trades.map(t => t.pnl || 0))
  const winRate = trades.length > 0 ? trades.filter(t => (t.pnl || 0) > 0).length / trades.length : 0

  const riskLevel = currentRisk > parseFloat(maxDailyLoss) * 1000 ? 'High' : 
                   currentRisk > parseFloat(maxDailyLoss) * 500 ? 'Medium' : 'Low'

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600'
      case 'Medium': return 'text-yellow-600'
      case 'High': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Risk Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Position sizing, stop losses, and risk controls
          </p>
        </div>
        <div className={`px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg ${
          systemStatus === 'online' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              systemStatus === 'online' ? 'bg-white' : 'bg-white/80'
            }`} />
            <span>{systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}</span>
          </div>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Risk</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${currentRisk.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Risk Level</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{riskLevel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Math.abs(maxDrawdown).toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(winRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Parameters */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Risk Parameters</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Risk Per Trade (%)
              </label>
              <input
                type="number"
                value={maxRiskPerTrade}
                onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                step="0.1"
                min="0.1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Daily Loss (%)
              </label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
                step="0.1"
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Concurrent Positions
              </label>
              <input
                type="number"
                value={maxPositions}
                onChange={(e) => setMaxPositions(e.target.value)}
                step="1"
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  value={takeProfitPercent}
                  onChange={(e) => setTakeProfitPercent(e.target.value)}
                  step="0.1"
                  min="0.1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Update Risk Settings
            </button>
          </div>
        </div>

        {/* Risk Alerts */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Risk Alerts</h3>
          
          <div className="space-y-3">
            <div className={`p-3 rounded-lg border ${
              currentRisk > parseFloat(maxDailyLoss) * 1000 
                ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                : 'border-green-200 bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center space-x-2">
                {currentRisk > parseFloat(maxDailyLoss) * 1000 ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  Daily Loss Limit: ${currentRisk.toFixed(2)} / ${(parseFloat(maxDailyLoss) * 1000).toFixed(2)}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              positions.length >= parseInt(maxPositions)
                ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                : 'border-green-200 bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center space-x-2">
                {positions.length >= parseInt(maxPositions) ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  Position Limit: {positions.length} / {maxPositions}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              totalExposure > 1000000
                ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                : 'border-green-200 bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center space-x-2">
                {totalExposure > 1000000 ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  Total Exposure: ${(totalExposure / 1000).toFixed(1)}k
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${
              winRate < 0.5
                ? 'border-red-200 bg-red-50 dark:bg-red-900/20' 
                : 'border-green-200 bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center space-x-2">
                {winRate < 0.5 ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  Win Rate: {(winRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Risk Analysis */}
      <div className="trading-card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Position Risk Analysis</h3>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active positions to analyze</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => {
              const riskPercent = Math.abs(position.pnl || 0) / (parseFloat(maxRiskPerTrade) * 1000) * 100
              return (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{position.symbol}</span>
                      <span className={`text-sm font-medium ${
                        position.side === 'buy' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.side.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded-full ${getRiskBgColor(
                      riskPercent > 80 ? 'High' : riskPercent > 50 ? 'Medium' : 'Low'
                    )}`}>
                      {riskPercent > 80 ? 'High Risk' : riskPercent > 50 ? 'Medium Risk' : 'Low Risk'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Size</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{position.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">P&L</p>
                      <p className={`text-sm font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${position.pnl?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Risk %</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {riskPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Exposure</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${(position.size * 100000).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Risk Metrics Chart */}
      <div className="trading-card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Risk Metrics</h3>
        <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Risk metrics charts coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}