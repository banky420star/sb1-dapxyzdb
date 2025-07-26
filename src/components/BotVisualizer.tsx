import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { ModelActivity } from '../contexts/TradingContext'

interface BotVisualizerProps {
  activity: ModelActivity | null
  modelName: string
}

export const BotVisualizer: React.FC<BotVisualizerProps> = ({ activity, modelName }) => {
  const status = activity?.status || 'idle'
  const progress = activity ? (activity.epoch / activity.epochs) * 100 : 0
  
  // Prepare chart data from recent metrics
  const lossData = useMemo(() => {
    if (!activity) return []
    // For demo, create a simple array of loss values
    const data: Array<{epoch: number; value: number}> = []
    for (let i = 0; i <= activity.epoch; i++) {
      data.push({
        epoch: i,
        value: Math.max(0.1, 2.0 * Math.exp(-i / activity.epochs * 3) + Math.random() * 0.1)
      })
    }
    return data.slice(-20) // Keep last 20 points
  }, [activity])

  const accuracyData = useMemo(() => {
    if (!activity) return []
    const data: Array<{epoch: number; value: number}> = []
    for (let i = 0; i <= activity.epoch; i++) {
      data.push({
        epoch: i,
        value: Math.min(0.95, 0.3 + (i / activity.epochs) * 0.6 + Math.random() * 0.05)
      })
    }
    return data.slice(-20)
  }, [activity])

  const getStatusColor = () => {
    switch (status) {
      case 'training': return '#007AFF' // Apple blue
      case 'completed': return '#34C759' // Apple green
      default: return '#8E8E93' // Apple gray
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'training': return `Epoch ${activity?.epoch || 0} / ${activity?.epochs || 0}`
      case 'completed': return '✅ Completed'
      default: return 'Idle'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      data-model={modelName}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          {modelName}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'training' ? 'bg-blue-100 text-blue-700' :
          status === 'completed' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {getStatusBadge()}
        </span>
      </div>

      {/* Circular Progress */}
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32">
          <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#E5E7EB"
              strokeWidth="10"
              fill="none"
              className="sm:hidden"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
              className="hidden sm:block"
            />
            {/* Progress circle */}
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              stroke={getStatusColor()}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - progress / 100) }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="sm:hidden"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              stroke={getStatusColor()}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - progress / 100) }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="hidden sm:block"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Loss Chart */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Loss</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {activity?.loss.toFixed(4) || '0.0000'}
            </span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#E5E7EB' }}
                  labelStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => value.toFixed(4)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Chart */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {activity?.acc.toFixed(4) || '0.0000'}
            </span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#E5E7EB' }}
                  labelStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => value.toFixed(4)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gradient Norm Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Gradient Norm</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {activity?.extra?.gradientNorm?.toFixed(4) || '0.0000'}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${(activity?.extra?.gradientNorm || 0) * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Q-Value for DDQN */}
      {modelName === 'DDQN' && activity?.extra?.qValue !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Q-Value</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {activity.extra.qValue.toFixed(4)}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${activity.extra.qValue * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
} 