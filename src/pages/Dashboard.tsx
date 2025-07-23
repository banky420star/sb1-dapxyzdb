import React, { useState, useEffect } from 'react'
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
  ArrowDownRight,
  Wifi,
  WifiOff,
  Bot,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  TrendingUp as ModelIcon,
  Layers,
  Database
} from 'lucide-react'
import MetricCard from '../components/MetricCard'
import EquityCurve from '../components/EquityCurve'

export default function Dashboard() {
  const { state, socket } = useTradingContext()
  const [trainingActive, setTrainingActive] = useState(false)
  const [selectedModel, setSelectedModel] = useState('ensemble')

  // Add null checks and default values
  const trades = state.trades || []
  const models = state.models || []
  const positions = state.positions || []
  const systemStatus = state.systemStatus || 'offline'
  
  // Use real-time data from context
  const realTimeData = {
    prices: state.realTimePrices || {},
    signals: state.realTimeSignals || [],
    lastUpdate: new Date().toISOString()
  }
  
  const aiStatus = state.aiStatus || {
    dataFetcher: { connected: false, isRunning: false },
    notificationAgent: null,
    models: []
  }

  // Training status and model management
  const trainingStatus = state.trainingStatus || {
    isTraining: false,
    currentModel: null,
    progress: 0,
    accuracy: 0,
    lastTraining: null
  }

  // Model performance data
  const modelPerformance = {
    randomforest: { accuracy: 67.5, trades: 142, profit: 2.34 },
    lstm: { accuracy: 71.2, trades: 98, profit: 3.12 },
    ddqn: { accuracy: 69.8, trades: 76, profit: 2.87 },
    ensemble: { accuracy: 72.8, trades: 316, profit: 8.33 }
  }

  // Handle training actions
  const startTraining = (modelType) => {
    if (socket) {
      socket.emit('start_training', { model: modelType })
      setTrainingActive(true)
    }
  }

  const stopTraining = () => {
    if (socket) {
      socket.emit('stop_training')
      setTrainingActive(false)
    }
  }

  const retrainModel = (modelType) => {
    if (socket) {
      socket.emit('retrain_model', { model: modelType })
    }
  }

  // Update AI status based on actual data availability
  const isDataConnected = Object.keys(realTimeData.prices).length > 0 && 
    Object.values(realTimeData.prices).some((price: any) => price && price.timestamp)

  const currentProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
  const todaysTrades = trades.filter(trade => {
    const today = new Date().toDateString()
    return new Date(trade.timestamp).toDateString() === today
  })

  const winRate = trades.length > 0 
    ? (trades.filter(trade => (trade.profit || 0) > 0).length / trades.length * 100).toFixed(1)
    : '0.0'

  // Real-time market summary
  const marketSummary = Object.entries(realTimeData.prices).slice(0, 4).map(([symbol, data]: [string, any]) => ({
    symbol,
    price: data?.price || data?.close || 0,
    change: data?.change || 0,
    changePercent: data?.changePercent || 0
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trading Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Real-time AI-powered trading system</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isDataConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isDataConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isDataConnected ? 'Live Data' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Last update: {new Date(realTimeData.lastUpdate).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Quick Stats - Fixed to 3-column grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total P&L"
            value={`$${currentProfit.toFixed(2)}`}
            change={currentProfit >= 0 ? 0 : 0}
            changeType={currentProfit >= 0 ? 'positive' : 'negative'}
            icon={DollarSign}
            color="green"
            trend="up"
            description="Total profit and loss"
          />
          <MetricCard
            title="Today's Trades"
            value={todaysTrades.length.toString()}
            change={0}
            changeType="neutral"
            icon={Activity}
            color="blue"
            trend="neutral"
            description={`${winRate}% win rate`}
          />
          <MetricCard
            title="Active Positions"
            value={positions.length.toString()}
            change={positions.filter((p: any) => p.profit > 0).length}
            changeType="neutral"
            icon={Target}
            color="purple"
            trend="neutral"
            description={`${positions.filter((p: any) => p.profit > 0).length} profitable`}
          />
        </section>

        {/* System Status - Separate card */}
        <div className="grid grid-cols-1 gap-6">
          <MetricCard
            title="System Status"
            value={systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
            change={0}
            changeType={isDataConnected ? 'positive' : 'negative'}
            icon={Bot}
            color={isDataConnected ? 'green' : 'red'}
            trend="neutral"
            description={isDataConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        {/* AI Models & Training Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI Models Performance
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedModel('ensemble')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedModel === 'ensemble'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Ensemble
                </button>
                <button
                  onClick={() => setSelectedModel('individual')}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedModel === 'individual'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            {selectedModel === 'ensemble' ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Ensemble Model</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Combined AI predictions</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {modelPerformance.ensemble.accuracy}%
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Accuracy</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-lg font-semibold">{modelPerformance.ensemble.trades}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-green-600">
                        +${modelPerformance.ensemble.profit}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Profit</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {['randomforest', 'lstm', 'ddqn'].map((model) => (
                  <div key={model} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ModelIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {model.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {modelPerformance[model].trades} trades
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{modelPerformance[model].accuracy}%</div>
                      <div className="text-sm text-green-600">+{modelPerformance[model].profit}%</div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startTraining(model)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                        title="Start Training"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => retrainModel(model)}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                        title="Retrain Model"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Training Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Training Status
              </h2>
              <div className="flex space-x-2">
                {trainingStatus.isTraining ? (
                  <button
                    onClick={stopTraining}
                    className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startTraining('ensemble')}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    <Play className="h-4 w-4" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>

            {trainingStatus.isTraining ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Model:</span>
                  <span className="text-blue-600 font-semibold">
                    {trainingStatus.currentModel?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{trainingStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${trainingStatus.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Accuracy:</span>
                  <span className="text-green-600 font-semibold">
                    {trainingStatus.accuracy}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <Brain className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">No training in progress</p>
                <p className="text-sm text-gray-500 mt-1">
                  Last training: {trainingStatus.lastTraining 
                    ? new Date(trainingStatus.lastTraining).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Market Overview & Data Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Market Data */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Live Market Data
            </h2>
            <div className="space-y-3">
              {marketSummary.length > 0 ? (
                marketSummary.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.symbol}</div>
                      <div className="text-2xl font-bold">{item.price.toFixed(5)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center ${
                        item.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span className="font-medium">
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(4)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-2" />
                  <p>No live data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Equity Curve - Fixed height to prevent vertical void */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Performance Chart</h2>
            <div className="h-72">
              <EquityCurve />
            </div>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            System Health
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                isDataConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                <Database className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">Data Feed</div>
              <div className={`text-xs ${isDataConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isDataConnected ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                models.length > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                <Brain className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">AI Models</div>
              <div className={`text-xs ${models.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {models.length > 0 ? `${models.length} Active` : 'Inactive'}
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-blue-100 text-blue-600">
                <Activity className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">Trading</div>
              <div className="text-xs text-blue-600">Paper Mode</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 bg-yellow-100 text-yellow-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium">Uptime</div>
              <div className="text-xs text-yellow-600">24h+</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}