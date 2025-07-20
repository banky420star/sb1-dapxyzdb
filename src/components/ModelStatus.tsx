import React from 'react'
import { Brain, Activity, Clock, AlertCircle } from 'lucide-react'

interface ModelStatusProps {
  models: Array<{
    name: string
    type: 'rf' | 'lstm' | 'ddqn'
    status: 'active' | 'training' | 'offline'
    accuracy: number
    lastUpdate: string
    version: string
  }>
}

export default function ModelStatus({ models = [] }: ModelStatusProps) {
  // Add null check for models
  const safeModels = models || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="h-4 w-4 text-success-500" />
      case 'training':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-danger-500" />
      default:
        return <Brain className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success-700 bg-success-100'
      case 'training':
        return 'text-yellow-700 bg-yellow-100'
      case 'offline':
        return 'text-danger-700 bg-danger-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  // Show empty state if no models
  if (!safeModels.length) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">No models available</p>
        <p className="text-gray-400 text-xs">Models will appear here when initialized</p>
      </div>
    )
  }

  // Apple-style model status card polish
  const cardStyle = {
    background: 'rgba(255,255,255,0.7)',
    borderRadius: '18px',
    boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '1.5rem',
    margin: '1rem 0',
    transition: 'box-shadow 0.2s',
  }

  return (
    <div style={cardStyle} className="model-status-card">
      {safeModels.map((model, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg">
              <Brain className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{model.name}</h4>
              <p className="text-sm text-gray-600">
                Accuracy: {((model.accuracy || 0) * 100).toFixed(1)}% • v{model.version || '1.0'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(model.status)}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
              {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}