import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ModelStatus } from '../contexts/TradingContext'

interface BotChipProps {
  modelName: string
  activity: ModelStatus | null
}

export const BotChip: React.FC<BotChipProps> = ({ modelName, activity }) => {
  const navigate = useNavigate()
  const status = activity?.status || 'idle'
  const progress = activity ? (activity.epoch / activity.epochs) * 100 : 0
  
  const getStatusColor = () => {
    switch (status) {
      case 'training': return '#007AFF' // Apple blue
      case 'completed': return '#34C759' // Apple green
      default: return '#8E8E93' // Apple gray
    }
  }
  
  const getModelIcon = () => {
    switch (modelName) {
      case 'LSTM': return '🧠'
      case 'RF': return '🌳'
      case 'DDQN': return '🎯'
      default: return '🤖'
    }
  }
  
  const handleClick = () => {
    navigate('/models')
    // Scroll to the specific model card after navigation
    setTimeout(() => {
      const element = document.querySelector(`[data-model="${modelName}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }
  
  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      type="button"
    >
      {/* Model Icon */}
      <span className="text-lg">{getModelIcon()}</span>
      
      {/* Model Name */}
      <span className="font-medium text-gray-900 dark:text-white text-sm">
        {modelName}
      </span>
      
      {/* Progress Ring */}
      <div className="relative w-6 h-6">
        <svg className="w-6 h-6 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#E5E7EB"
            strokeWidth="2"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            stroke={getStatusColor()}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 10}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 10 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 10 * (1 - progress / 100) }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </svg>
        {status === 'training' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          </motion.div>
        )}
      </div>
      
      {/* Status/Metrics */}
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {status === 'training' ? `Epoch ${activity?.epoch || 0}` : 
           status === 'completed' ? 'Done' : 
           'Idle'}
        </span>
        {activity && status === 'training' && (
          <motion.span
            key={activity.loss}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            Loss: {activity.loss.toFixed(3)} | Acc: {(activity.acc * 100).toFixed(1)}%
          </motion.span>
        )}
      </div>
    </motion.button>
  )
} 