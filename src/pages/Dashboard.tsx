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
import ModelStatus from '../components/ModelStatus'
import RecentTrades from '../components/RecentTrades'
import TradingViewDashboard from '../components/TradingViewDashboard'
import { 
  EconomicCalendar, 
  QuotesTable, 
  TickerStrip, 
  PriceChart, 
  TechnicalIndicators, 
  NewsFeed 
} from '../components/MQL5Widgets'

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
            Real-time system overview and performance metrics
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

      {/* TradingView Dashboard */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Market Data</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
          </div>
        </div>
        <TradingViewDashboard />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Equity Curve */}
        <div className="trading-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equity Curve</h3>
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">+12.4%</span>
            </div>
          </div>
          <EquityCurve />
        </div>

        {/* Model Status */}
        <div className="trading-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Model Status</h3>
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {models.filter(m => m.status === 'active').length} Active
              </span>
            </div>
          </div>
          <ModelStatus models={models} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Trades</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </button>
        </div>
        <RecentTrades />
      </div>

      {/* MQL5 Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quotes Table */}
          <div className="trading-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Quotes</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Real-time</span>
              </div>
            </div>
            <QuotesTable />
          </div>
          
          {/* Price Chart */}
          <div className="trading-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Analysis</h3>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">EUR/USD</span>
              </div>
            </div>
            <PriceChart />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Economic Calendar */}
          <div className="trading-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Economic Calendar</h3>
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
            <EconomicCalendar />
          </div>
          
          {/* Technical Indicators */}
          <div className="trading-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Technical Indicators</h3>
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </div>
            <TechnicalIndicators />
          </div>
          
          {/* News Feed */}
          <div className="trading-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market News</h3>
              <Users className="h-4 w-4 text-gray-500" />
            </div>
            <NewsFeed />
          </div>
        </div>
      </div>

      {/* Ticker Strip - Full Width */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Ticker</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Streaming</span>
          </div>
        </div>
        <TickerStrip />
      </div>
    </div>
  )
}