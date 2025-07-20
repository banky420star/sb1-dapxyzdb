import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity, 
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react'

interface Trade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  size: number
  entryPrice: number
  closePrice: number
  pnl: number
  timestamp: number
}

interface Performance {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnL: number
  winRate: string
  averagePnL: string
}

interface Model {
  name: string
  type: string
  status: string
  accuracy: number
  lastUpdate: string
  version: string
}

interface RiskMetrics {
  currentEquity: number
  peakEquity: number
  drawdown: string
  marginLevel: number
}

export default function Analytics() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [performance, setPerformance] = useState<Performance | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('24h')

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch trades
      const tradesResponse = await fetch(`/api/analytics/trades?limit=100`)
      const tradesData = await tradesResponse.json()
      setTrades(tradesData.trades || [])

      // Fetch performance
      const performanceResponse = await fetch(`/api/analytics/performance?hours=${timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720}`)
      const performanceData = await performanceResponse.json()
      setPerformance(performanceData.performance || null)

      // Fetch models
      const modelsResponse = await fetch('/api/analytics/models')
      const modelsData = await modelsResponse.json()
      setModels(modelsData.models || [])

      // Fetch risk data
      const riskResponse = await fetch('/api/analytics/risk')
      const riskData = await riskResponse.json()
      setRiskMetrics(riskData.riskMetrics || null)

    } catch (err) {
      setError('Failed to fetch analytics data')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
        return 'text-green-600'
      case 'offline':
      case 'inactive':
        return 'text-red-600'
      default:
        return 'text-yellow-600'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Performance analytics and trading insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Performance Overview */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total P&L</p>
                <p className={`text-2xl font-bold ${getPnLColor(performance.totalPnL)}`}>
                  {formatCurrency(performance.totalPnL)}
                </p>
              </div>
              {performance.totalPnL >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{performance.winRate}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Trades</p>
                <p className="text-2xl font-bold text-gray-900">{performance.totalTrades}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg P&L</p>
                <p className={`text-2xl font-bold ${getPnLColor(parseFloat(performance.averagePnL))}`}>
                  {formatCurrency(parseFloat(performance.averagePnL))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Equity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(riskMetrics.currentEquity)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Peak Equity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(riskMetrics.peakEquity)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Drawdown</p>
                <p className="text-2xl font-bold text-red-600">
                  {riskMetrics.drawdown}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Margin Level</p>
                <p className="text-2xl font-bold text-gray-900">
                  {riskMetrics.marginLevel}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Trades */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Trades</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.slice(0, 10).map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        trade.side === 'buy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.size}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getPnLColor(trade.pnl)}`}>
                      {formatCurrency(trade.pnl)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(trade.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trades.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No trades found for the selected time period
              </div>
            )}
          </div>
        </div>

        {/* Model Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Model Performance</h3>
          </div>
          <div className="p-6">
            {models.length > 0 ? (
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {model.status.toLowerCase() === 'online' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{model.name}</p>
                        <p className="text-xs text-gray-500">{model.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {(model.accuracy * 100).toFixed(1)}%
                      </p>
                      <p className={`text-xs ${getStatusColor(model.status)}`}>
                        {model.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No model data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trading Activity Chart Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Trading Activity</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <LineChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Chart visualization coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}