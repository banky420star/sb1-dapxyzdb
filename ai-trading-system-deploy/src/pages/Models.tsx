import React, { useState } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import { 
  Brain, 
  Play, 
  Pause, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  BarChart3
} from 'lucide-react'

export default function Models() {
  const { state } = useTradingContext()
  const [selectedModel, setSelectedModel] = useState('randomforest')
  const [isTraining, setIsTraining] = useState(false)

  const models = state.models || []
  const systemStatus = state.systemStatus || 'offline'

  // Mock model data - replace with real data from context
  const modelData = [
    {
      id: 'randomforest',
      name: 'Random Forest',
      status: 'trained',
      accuracy: 0.78,
      lastTrained: '2024-01-15T10:30:00Z',
      trainingTime: '45m',
      performance: 0.82,
      isActive: true
    },
    {
      id: 'lstm',
      name: 'LSTM Neural Network',
      status: 'training',
      accuracy: 0.75,
      lastTrained: '2024-01-15T09:15:00Z',
      trainingTime: '2h 15m',
      performance: 0.79,
      isActive: true
    },
    {
      id: 'ddqn',
      name: 'Double DQN',
      status: 'trained',
      accuracy: 0.71,
      lastTrained: '2024-01-14T16:45:00Z',
      trainingTime: '1h 30m',
      performance: 0.73,
      isActive: false
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trained': return 'text-green-600'
      case 'training': return 'text-yellow-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'trained': return CheckCircle
      case 'training': return RefreshCw
      case 'failed': return XCircle
      default: return AlertTriangle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Model Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            ML model training, deployment, and performance monitoring
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

      {/* Model Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Models</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{modelData.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Models</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {modelData.filter(m => m.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Accuracy</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {((modelData.reduce((acc, m) => acc + m.accuracy, 0) / modelData.length) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="trading-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Training</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {modelData.filter(m => m.status === 'training').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Model List */}
      <div className="trading-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Model Status</h2>
          <button 
            onClick={() => setIsTraining(!isTraining)}
            disabled={isTraining}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {isTraining ? (
              <>
                <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 inline mr-2" />
                Train All
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          {modelData.map((model) => {
            const StatusIcon = getStatusIcon(model.status)
            return (
              <div key={model.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center`}>
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(model.status)}`} />
                        <span className={`text-sm font-medium ${getStatusColor(model.status)}`}>
                          {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                        </span>
                        {model.isActive && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(model.accuracy * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Performance</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(model.performance * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Trained</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(model.lastTrained).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Training Time</p>
                    <p className="text-sm text-gray-900 dark:text-white">{model.trainingTime}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <button 
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
                      disabled={model.status === 'training'}
                    >
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      Retrain
                    </button>
                    <button 
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        model.isActive 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {model.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      +{((model.performance - model.accuracy) * 100).toFixed(1)}% vs accuracy
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Model Performance Chart */}
      <div className="trading-card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Trends</h3>
        <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Performance charts coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}