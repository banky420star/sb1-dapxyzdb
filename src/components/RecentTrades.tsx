import React from 'react'
import { TrendingUp, TrendingDown, Clock, DollarSign, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTradingContext } from '../contexts/TradingContext'

export default function RecentTrades() {
  const { state } = useTradingContext()
  const trades = state.positions // or state.trades if available

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Target className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No recent trades</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Trades will appear here when executed</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {trades.slice(0, 5).map((trade, index) => (
        <div 
          key={trade.id || index} 
          className="group flex items-center justify-between p-4 bg-gradient-to-r from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-800/30 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              trade.pnl >= 0 
                ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                : 'bg-gradient-to-br from-red-500 to-pink-500'
            }`}>
              {trade.pnl >= 0 ? (
                <TrendingUp className="h-6 w-6 text-white" />
              ) : (
                <TrendingDown className="h-6 w-6 text-white" />
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{trade.symbol}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trade.side === 'long' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {trade.side.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Size: {trade.size}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span>Entry: ${trade.entryPrice}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <div className={`text-lg font-bold ${
              trade.pnl >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2) || '0.00'}
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(trade.timestamp || Date.now()), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      ))}
      
      {trades.length > 5 && (
        <div className="text-center pt-4">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            View all {trades.length} trades
          </button>
        </div>
      )}
    </div>
  )
}