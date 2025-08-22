// src/components/LiveDataFeed.tsx
// Live Data Feed Component for AI Model Training

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getJSON } from '../lib/api'

interface LiveDataStats {
  totalDataPoints: number
  sources: Record<string, number>
  symbols: Record<string, number>
  lastUpdate: string
  isRunning: boolean
}

interface DataSource {
  status: string
  pairs: string[]
  description: string
}

interface LiveDataSources {
  bybit: DataSource
  alphavantage: DataSource
  synthetic: DataSource
}

const LiveDataFeed: React.FC = () => {
  const [stats, setStats] = useState<LiveDataStats | null>(null)
  const [sources, setSources] = useState<LiveDataSources | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = async () => {
    try {
      const data = await getJSON<{ ok: boolean } & LiveDataStats>('/api/live-data/status')
      if (data.ok) {
        setStats(data)
        setError(null)
      }
    } catch (err) {
      setError('Failed to fetch live data stats')
      console.error('Error fetching live data stats:', err)
    }
  }

  const fetchSources = async () => {
    try {
      const data = await getJSON<{ ok: boolean; sources: LiveDataSources }>('/api/live-data/sources')
      if (data.ok) {
        setSources(data.sources)
      }
    } catch (err) {
      console.error('Error fetching data sources:', err)
    }
  }

  const startDataFeed = async () => {
    try {
      await getJSON('/api/live-data/start', { method: 'POST' })
      await fetchStats()
    } catch (err) {
      setError('Failed to start live data feed')
    }
  }

  const stopDataFeed = async () => {
    try {
      await getJSON('/api/live-data/stop', { method: 'POST' })
      await fetchStats()
    } catch (err) {
      setError('Failed to stop live data feed')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchStats(), fetchSources()])
      setIsLoading(false)
    }

    loadData()

    if (autoRefresh) {
      const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            Live Data Feed
          </h3>
          <p className="text-gray-400 text-sm">
            Real-time market data for AI model training
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${stats?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {stats?.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-xs rounded ${
              autoRefresh 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {stats.totalDataPoints.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total Data Points</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {Object.keys(stats.sources).length}
            </div>
            <div className="text-gray-400 text-sm">Data Sources</div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {Object.keys(stats.symbols).length}
            </div>
            <div className="text-gray-400 text-sm">Trading Pairs</div>
          </div>
        </div>
      )}

      {sources && (
        <div className="space-y-4 mb-6">
          <h4 className="text-lg font-medium text-white">Data Sources</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(sources).map(([source, data]) => (
              <div key={source} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-white capitalize">{source}</h5>
                  <div className={`w-2 h-2 rounded-full ${
                    data.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <p className="text-gray-400 text-sm mb-2">{data.description}</p>
                <div className="text-xs text-gray-500">
                  {data.pairs.length} pairs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && (
        <div className="space-y-4 mb-6">
          <h4 className="text-lg font-medium text-white">Data Distribution</h4>
          <div className="space-y-3">
            {Object.entries(stats.sources).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{source}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(count / stats.totalDataPoints) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Last update: {stats?.lastUpdate ? new Date(stats.lastUpdate).toLocaleTimeString() : 'Never'}
        </div>
        
        <div className="flex space-x-2">
          {!stats?.isRunning ? (
            <button
              onClick={startDataFeed}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Start Feed
            </button>
          ) : (
            <button
              onClick={stopDataFeed}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop Feed
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default LiveDataFeed
