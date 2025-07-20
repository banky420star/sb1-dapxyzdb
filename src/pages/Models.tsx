import React, { useState, useEffect } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import { TrendingUp, Brain, Activity, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import ModelTrainingVisualizer from '../components/ModelTrainingVisualizer'

interface ModelStatus {
  name: string
  status: 'active' | 'inactive' | 'training'
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  lastTraining: string | null
  dataSize: number
  version: string
}

const Models: React.FC = () => {
  const { socket } = useTradingContext()
  const [models, setModels] = useState<ModelStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'status' | 'training'>('training')

  useEffect(() => {
    if (!socket) return

    // Listen for model updates
    socket.on('models_update', (modelsData: ModelStatus[]) => {
      setModels(modelsData)
      setLoading(false)
    })

    // Initial load
    loadModels()

    return () => {
      socket.off('models_update')
    }
  }, [socket])

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        setModels(data)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'inactive':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'training':
        return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'inactive':
        return 'text-red-600 bg-red-100'
      case 'training':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatAccuracy = (accuracy: number) => {
    return `${(accuracy * 100).toFixed(2)}%`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">AI Models</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'status'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Model Status
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'training'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Training Visualization
          </button>
        </div>
      </div>

      {activeTab === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.name} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Brain className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">
                    {model.name}
                  </h3>
                </div>
                {getStatusIcon(model.status)}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(model.status)}`}>
                    {model.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatAccuracy(model.accuracy)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Precision</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatAccuracy(model.precision)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recall</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatAccuracy(model.recall)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">F1 Score</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatAccuracy(model.f1Score)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Size</span>
                  <span className="text-sm font-medium text-gray-800">
                    {model.dataSize.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Version</span>
                  <span className="text-sm font-medium text-gray-800">
                    {model.version}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Training</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDate(model.lastTraining)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    Retrain
                  </button>
                  <button className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'training' && (
        <ModelTrainingVisualizer />
      )}
    </div>
  )
}

export default Models