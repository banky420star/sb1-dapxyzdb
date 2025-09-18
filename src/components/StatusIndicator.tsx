import React from 'react'
import { useTrading } from '../contexts/TradingContext'
import { Activity, Wifi, WifiOff, Brain, Shield, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export default function StatusIndicator() {
  const { isConnected, portfolio, activity, tradingMode, systemStatus } = useTrading()

  const activeModels = Object.values(activity || {}).filter(a => a?.status === 'active').length
  const totalModels = 3 // LSTM, RF, DDQN
  const positions = portfolio?.positions || []
  const equity = portfolio?.equity || 0
  const dailyPnl = portfolio?.profit || 0

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'online':
        return 'text-green-600 dark:text-green-400'
      case 'offline':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusBg = () => {
    switch (systemStatus) {
      case 'online':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'offline':
        return 'bg-red-100 dark:bg-red-900/30'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30'
    }
  }

  return (
    <div className="space-y-4">
      {/* System Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">System Status</span>
          <div className={`p-2 rounded-lg ${getStatusBg()}`}>
            {getStatusIcon()}
          </div>
        </div>
        
        <div className={`px-3 py-2 rounded-xl ${getStatusBg()} border border-white/20`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
            <span className={`text-sm font-semibold capitalize ${getStatusColor()}`}>
              {systemStatus}
            </span>
          </div>
        </div>
      </div>
      
      {/* Trading Mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Trading Mode</span>
          <div className={`p-2 rounded-lg ${
            tradingMode === 'live'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          }`}>
            <Shield className={`h-4 w-4 ${
              tradingMode === 'live' 
                ? 'text-red-500' 
                : 'text-green-500'
            }`} />
          </div>
        </div>
        
        <div
          className={`px-3 py-2 rounded-xl ${
            tradingMode === 'live'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          } border border-white/20`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Mode</span>
            <span className={`text-sm font-semibold uppercase ${
              tradingMode === 'live' 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {tradingMode}
            </span>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="space-y-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Quick Stats</span>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-white/20">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Models</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {activeModels}/{totalModels}
            </span>
          </div>
          
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-white/20">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Positions</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {positions.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* Financial Summary */}
      <div className="space-y-3">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Financial</span>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-white/20">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Equity</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ${equity.toLocaleString()}
            </span>
          </div>
          
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl border border-white/20 ${
            dailyPnl >= 0 
              ? 'bg-green-50 dark:bg-green-900/20' 
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center space-x-2">
              {dailyPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-gray-600 dark:text-gray-400">Daily P&L</span>
            </div>
            <span className={`text-sm font-semibold ${
              dailyPnl >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
