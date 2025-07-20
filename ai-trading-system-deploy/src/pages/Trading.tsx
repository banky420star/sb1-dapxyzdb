import React, { useState } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import TradingViewChart from '../components/TradingViewChart'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Square
} from 'lucide-react'

export default function Trading() {
  const { state } = useTradingContext()
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD')
  const [selectedInterval, setSelectedInterval] = useState('1D')
  const [orderType, setOrderType] = useState('market')
  const [orderSide, setOrderSide] = useState('buy')
  const [orderSize, setOrderSize] = useState('0.1')
  const [orderPrice, setOrderPrice] = useState('')

  const positions = state.positions || []
  const trades = state.trades || []
  const systemStatus = state.systemStatus || 'offline'

  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
  const intervals = ['1m', '5m', '15m', '1H', '4H', '1D', '1W']

  const recentTrades = trades.slice(-10).reverse()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trading Interface</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Live trading, position management, and market analysis
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

      {/* Chart Controls */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Market Analysis</h2>
          <div className="flex items-center space-x-4">
            {/* Symbol Selector */}
            <select 
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            
            {/* Interval Selector */}
            <select 
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              {intervals.map(interval => (
                <option key={interval} value={interval}>{interval}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* TradingView Chart */}
        <TradingViewChart 
          symbol={selectedSymbol}
          interval={selectedInterval}
          height={500}
        />
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Panel */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Place Order</h3>
          
          <div className="space-y-4">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Type
              </label>
              <select 
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
              </select>
            </div>

            {/* Order Side */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderSide('buy')}
                className={`p-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'buy' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`p-3 rounded-lg font-semibold transition-colors ${
                  orderSide === 'sell' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <TrendingDown className="w-4 h-4 inline mr-2" />
                Sell
              </button>
            </div>

            {/* Order Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size (Lots)
              </label>
              <input
                type="number"
                value={orderSize}
                onChange={(e) => setOrderSize(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            {/* Order Price (for limit/stop orders) */}
            {orderType !== 'market' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  step="0.00001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            )}

            {/* Place Order Button */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Place {orderSide.charAt(0).toUpperCase() + orderSide.slice(1)} Order
            </button>
          </div>
        </div>

        {/* Active Positions */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Positions</h3>
          
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active positions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{position.symbol}</span>
                    <span className={`text-sm font-medium ${
                      position.side === 'buy' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">{position.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">P&L:</span>
                      <span className={`ml-1 ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${position.pnl?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="trading-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Trades</h3>
          
          {recentTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent trades</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((trade, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{trade.symbol}</span>
                    <span className={`text-sm font-medium ${
                      trade.side === 'buy' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">{trade.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">P&L:</span>
                      <span className={`ml-1 ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${trade.pnl?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(trade.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}