import React from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Brain,
  Shield,
  Zap,
  Target,
  Clock,
  Users,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import MetricCard from '../components/MetricCard'
import EquityCurve from '../components/EquityCurve'

export default function Dashboard() {
  const { state } = useTradingContext()

  // Add null checks and default values
  const trades = state.trades || []
  const models = state.models || []
  const positions = state.positions || []
  const systemStatus = state.systemStatus || 'offline'

  const metrics = [
    {
      title: 'Total P&L',
      value: `$${(state.totalPnL || 0).toFixed(2)}`,
      change: state.pnlChange || 0,
      changeType: (state.pnlChange || 0) >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'green',
      trend: (state.pnlChange || 0) >= 0 ? 'up' : 'down',
      description: 'Total profit and loss'
    },
    {
      title: 'Win Rate',
      value: `${((state.winRate || 0) * 100).toFixed(1)}%`,
      change: (state.winRate || 0) - 0.5,
      changeType: (state.winRate || 0) >= 0.5 ? 'positive' : 'negative',
      icon: Target,
      color: 'blue',
      trend: (state.winRate || 0) >= 0.5 ? 'up' : 'down',
      description: 'Percentage of winning trades'
    },
    {
      title: 'Active Positions',
      value: positions.length.toString(),
      change: 0,
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'purple',
      trend: 'neutral',
      description: 'Currently open positions'
    },
    {
      title: 'System Load',
      value: `${((state.systemLoad || 0) * 100).toFixed(1)}%`,
      change: 0,
      changeType: (state.systemLoad || 0) < 0.8 ? 'positive' : 'negative',
      icon: Activity,
      color: (state.systemLoad || 0) < 0.8 ? 'green' : 'red',
      trend: (state.systemLoad || 0) < 0.8 ? 'neutral' : 'up',
      description: 'Current system utilization'
    },
    {
      title: 'Model Accuracy',
      value: `${((state.modelAccuracy || 0) * 100).toFixed(1)}%`,
      change: (state.modelAccuracy || 0) - 0.6,
      changeType: (state.modelAccuracy || 0) >= 0.6 ? 'positive' : 'negative',
      icon: Brain,
      color: 'indigo',
      trend: (state.modelAccuracy || 0) >= 0.6 ? 'up' : 'down',
      description: 'Average model prediction accuracy'
    },
    {
      title: 'Risk Level',
      value: state.riskLevel || 'Low',
      change: 0,
      changeType: 'neutral',
      icon: Shield,
      color: 'yellow',
      trend: 'neutral',
      description: 'Current risk assessment'
    }
  ]

  const quickStats = [
    {
      label: 'Total Trades',
      value: trades.length.toString(),
      icon: Activity,
      color: 'blue'
    },
    {
      label: 'Avg Trade Time',
      value: '2.4h',
      icon: Clock,
      color: 'green'
    },
    {
      label: 'Max Drawdown',
      value: '12.3%',
      icon: TrendingDown,
      color: 'red'
    },
    {
      label: 'Risk Score',
      value: 'Low',
      icon: Shield,
      color: 'purple'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trading Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            System overview and performance metrics
          </p>
        </div>
        <div className={`px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg ${
          systemStatus === 'online' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            : systemStatus === 'offline'
            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
            : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              systemStatus === 'online' ? 'bg-white' : 'bg-white/80'
            }`} />
            <span>{systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="status-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 flex items-center justify-center`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Equity Curve */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Performance Overview</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
          </div>
        </div>
        <EquityCurve />
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {trades.slice(-5).reverse().map((trade, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    trade.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{trade.symbol}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${trade.pnl?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {trade.side.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Trading Engine</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Processing orders</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">ML Models</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{models.length} active</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Risk Manager</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring positions</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Data Feed</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Real-time updates</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}