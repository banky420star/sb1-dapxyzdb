import React, { useState, useEffect } from 'react'
import { useTradingContext } from '../contexts/TradingContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Play, Pause, RotateCcw, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Brain, Zap, Target, Award, Star, Trophy } from 'lucide-react'

interface TrainingSession {
  id: string
  modelName: string
  startTime: number
  status: 'training' | 'completed' | 'failed'
  progress: number
  currentEpoch: number
  totalEpochs: number
  duration?: number
  endTime?: number
  metrics: {
    loss: number[]
    accuracy: number[]
    validation_loss: number[]
    validation_accuracy: number[]
    learning_rate: number[]
  }
  config: any
  events: any[]
  reward?: {
    totalReward: number
    rewardBreakdown: any
    progress: number
    progressBonus: number
  }
}

interface TrainingMetrics {
  timestamp: number
  epoch: number
  progress: number
  loss?: number
  accuracy?: number
  validation_loss?: number
  validation_accuracy?: number
  learning_rate?: number
}

// Model-specific visual components
const RandomForestVisualizer: React.FC<{ session: TrainingSession }> = ({ session }) => {
  const treeData = Array.from({ length: 10 }, (_, i) => ({
    tree: i + 1,
    accuracy: session.metrics.accuracy?.[i] || 0.5 + Math.random() * 0.3,
    depth: Math.floor(Math.random() * 10) + 5,
    samples: Math.floor(Math.random() * 1000) + 500
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="w-5 h-5 text-green-500" />
        <h4 className="font-semibold text-green-700">Random Forest Training</h4>
      </div>
      
      {/* Tree Ensemble Visualization */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {treeData.map((tree, index) => (
          <div key={index} className="relative">
            <div className="bg-green-100 rounded-lg p-2 text-center">
              <div className="text-xs font-medium text-green-800">Tree {tree.tree}</div>
              <div className="text-lg font-bold text-green-600">
                {(tree.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-green-600">Depth: {tree.depth}</div>
            </div>
            <div 
              className="absolute bottom-0 left-0 bg-green-500 rounded-b-lg transition-all duration-300"
              style={{ 
                height: `${tree.accuracy * 100}%`,
                width: '100%',
                opacity: 0.3
              }}
            />
          </div>
        ))}
      </div>

      {/* Feature Importance */}
      <div className="bg-green-50 rounded-lg p-4">
        <h5 className="font-medium text-green-800 mb-2">Feature Importance</h5>
        <div className="space-y-2">
          {['RSI', 'MACD', 'Bollinger', 'Volume', 'Price'].map((feature, i) => (
            <div key={feature} className="flex items-center justify-between">
              <span className="text-sm text-green-700">{feature}</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(0.8 - i * 0.1) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-green-600">
                  {((0.8 - i * 0.1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const LSTMVisualizer: React.FC<{ session: TrainingSession }> = ({ session }) => {
  const sequenceData = Array.from({ length: 20 }, (_, i) => ({
    step: i,
    input: Math.sin(i * 0.5) + Math.random() * 0.2,
    hidden: Math.sin(i * 0.5 + 1) + Math.random() * 0.2,
    output: Math.sin(i * 0.5 + 2) + Math.random() * 0.2,
    memory: Math.abs(Math.sin(i * 0.3)) + Math.random() * 0.1
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="w-5 h-5 text-blue-500" />
        <h4 className="font-semibold text-blue-700">LSTM Neural Network</h4>
      </div>

      {/* LSTM Cell Visualization */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <h5 className="font-medium text-blue-800 mb-3">LSTM Cell States</h5>
        <div className="grid grid-cols-4 gap-2">
          {['Input Gate', 'Forget Gate', 'Cell State', 'Output Gate'].map((gate, i) => (
            <div key={gate} className="text-center">
              <div className="bg-blue-200 rounded-lg p-2 mb-1">
                <div className="text-xs font-medium text-blue-800">{gate}</div>
                <div className="text-lg font-bold text-blue-600">
                  {(0.7 + Math.random() * 0.3).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sequence Processing */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-3">Sequence Processing</h5>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sequenceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="input" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="hidden" stackId="1" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.3} />
              <Area type="monotone" dataKey="output" stackId="1" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Memory Cell Visualization */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">Memory Cell</h5>
        <div className="flex items-center space-x-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex-1">
              <div 
                className="bg-blue-500 rounded transition-all duration-300"
                style={{ 
                  height: `${(sequenceData[i]?.memory || 0) * 100}px`,
                  opacity: 0.7
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const DDQNVisualizer: React.FC<{ session: TrainingSession }> = ({ session }) => {
  const actionData = [
    { action: 'Buy', qValue: 0.8, exploration: 0.2, reward: 0.15 },
    { action: 'Sell', qValue: 0.6, exploration: 0.3, reward: -0.05 },
    { action: 'Hold', qValue: 0.9, exploration: 0.1, reward: 0.02 }
  ]

  const experienceData = Array.from({ length: 15 }, (_, i) => ({
    experience: i + 1,
    qValue: 0.5 + Math.random() * 0.4,
    targetQ: 0.6 + Math.random() * 0.3,
    loss: Math.random() * 0.5
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="w-5 h-5 text-purple-500" />
        <h4 className="font-semibold text-purple-700">Deep Q-Network (DDQN)</h4>
      </div>

      {/* Action Selection */}
      <div className="bg-purple-50 rounded-lg p-4 mb-4">
        <h5 className="font-medium text-purple-800 mb-3">Action Selection</h5>
        <div className="space-y-3">
          {actionData.map((action, i) => (
            <div key={action.action} className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">{action.action}</span>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-xs text-purple-600">Q-Value</div>
                  <div className="text-sm font-bold text-purple-800">
                    {action.qValue.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-purple-600">Exploration</div>
                  <div className="text-sm font-bold text-purple-800">
                    {(action.exploration * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-purple-600">Reward</div>
                  <div className={`text-sm font-bold ${action.reward >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {action.reward >= 0 ? '+' : ''}{action.reward.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Experience Replay */}
      <div className="bg-purple-50 rounded-lg p-4 mb-4">
        <h5 className="font-medium text-purple-800 mb-3">Experience Replay Buffer</h5>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }, (_, i) => (
            <div 
              key={i}
              className={`h-8 rounded transition-all duration-300 ${
                i < 15 ? 'bg-purple-400' : 'bg-purple-200'
              }`}
              style={{ opacity: 0.7 + (i < 15 ? 0.3 : 0) }}
            />
          ))}
        </div>
        <div className="text-xs text-purple-600 mt-2">
          {15}/25 experiences used
        </div>
      </div>

      {/* Q-Value Learning */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h5 className="font-medium text-purple-800 mb-3">Q-Value Learning</h5>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={experienceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="experience" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="qValue" stroke="#8b5cf6" strokeWidth={2} name="Q-Value" />
              <Line type="monotone" dataKey="targetQ" stroke="#a855f7" strokeWidth={2} name="Target Q" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// Reward System Visualization
const RewardVisualizer: React.FC<{ reward: any, modelType: string }> = ({ reward, modelType }) => {
  if (!reward) return null

  const rewardData = Object.entries(reward.rewardBreakdown || {}).map(([metric, data]: [string, any]) => ({
    metric: metric.charAt(0).toUpperCase() + metric.slice(1),
    value: data.weightedReward,
    fullValue: data.value,
    weight: data.weight,
    threshold: data.threshold
  }))

  const getRewardColor = (value: number) => {
    if (value >= 0.8) return '#10b981' // green
    if (value >= 0.6) return '#f59e0b' // yellow
    if (value >= 0.4) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getRewardIcon = (value: number) => {
    if (value >= 0.8) return <Trophy className="w-4 h-4 text-green-500" />
    if (value >= 0.6) return <Award className="w-4 h-4 text-yellow-500" />
    if (value >= 0.4) return <Star className="w-4 h-4 text-orange-500" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
      <div className="flex items-center space-x-2 mb-4">
        <Award className="w-5 h-5 text-yellow-600" />
        <h4 className="font-semibold text-yellow-800">Reward System</h4>
        <div className="ml-auto">
          <div className="text-2xl font-bold text-yellow-600">
            {(reward.totalReward * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-yellow-600">Total Reward</div>
        </div>
      </div>

      {/* Reward Radar Chart */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rewardData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 1]} />
            <Radar
              name="Reward"
              dataKey="value"
              stroke="#f59e0b"
              fill="#fbbf24"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Reward Breakdown */}
      <div className="space-y-2">
        {rewardData.map((item, index) => (
          <div key={item.metric} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getRewardIcon(item.value)}
              <span className="text-sm font-medium text-yellow-800">{item.metric}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-yellow-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${item.value * 100}%`,
                    backgroundColor: getRewardColor(item.value)
                  }}
                />
              </div>
              <span className="text-xs text-yellow-600 w-8 text-right">
                {(item.value * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bonus */}
      <div className="mt-4 pt-3 border-t border-yellow-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-yellow-700">Progress Bonus</span>
          <span className="text-sm font-bold text-yellow-600">
            +{(reward.progressBonus * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

const ModelTrainingVisualizer: React.FC = () => {
  const { socket } = useTradingContext()
  const [activeTrainings, setActiveTrainings] = useState<TrainingSession[]>([])
  const [trainingHistory, setTrainingHistory] = useState<TrainingSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([])
  const [trainingStats, setTrainingStats] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [rewards, setRewards] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (!socket) return

    // Listen for training events
    socket.on('training_started', (session: TrainingSession) => {
      setActiveTrainings(prev => [...prev, session])
    })

    socket.on('training_progress', (update: any) => {
      setActiveTrainings(prev => 
        prev.map(session => 
          session.id === update.sessionId 
            ? { ...session, ...update, progress: update.progress }
            : session
        )
      )
    })

    socket.on('training_completed', (session: TrainingSession) => {
      setActiveTrainings(prev => prev.filter(s => s.id !== session.id))
      setTrainingHistory(prev => [session, ...prev])
    })

    socket.on('training_failed', (data: { sessionId: string, error: string }) => {
      setActiveTrainings(prev => 
        prev.map(session => 
          session.id === data.sessionId 
            ? { ...session, status: 'failed' as const }
            : session
        )
      )
    })

    // Listen for reward updates
    socket.on('reward_update', (data: { sessionId: string, reward: any }) => {
      setRewards(prev => new Map(prev.set(data.sessionId, data.reward)))
    })

    // Initial data load
    loadTrainingData()

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadTrainingData()
      }
    }, 5000)

    return () => {
      socket.off('training_started')
      socket.off('training_progress')
      socket.off('training_completed')
      socket.off('training_failed')
      socket.off('reward_update')
      clearInterval(interval)
    }
  }, [socket, autoRefresh])

  const loadTrainingData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${API_URL}/api/ml/training-data`)
      if (response.ok) {
        const data = await response.json()
        setActiveTrainings(data.activeTrainings || [])
        setTrainingHistory(data.trainingHistory || [])
        setTrainingStats(data.trainingStats)
      }
    } catch (error) {
      console.error('Failed to load training data:', error)
    }
  }

  const loadSessionMetrics = async (sessionId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${API_URL}/api/ml/training-metrics/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setTrainingMetrics(data)
      }
    } catch (error) {
      console.error('Failed to load session metrics:', error)
    }
  }

  const startTraining = async (modelType: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${API_URL}/api/ml/start-training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelType })
      })
      if (response.ok) {
        console.log(`Started training for ${modelType}`)
      }
    } catch (error) {
      console.error('Failed to start training:', error)
    }
  }

  const stopTraining = async (sessionId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${API_URL}/api/ml/stop-training/${sessionId}`, {
        method: 'POST'
      })
      if (response.ok) {
        console.log(`Stopped training session ${sessionId}`)
      }
    } catch (error) {
      console.error('Failed to stop training:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'training':
        return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getModelVisualizer = (session: TrainingSession) => {
    const modelType = session.modelName.toLowerCase()
    
    switch (modelType) {
      case 'randomforest':
        return <RandomForestVisualizer session={session} />
      case 'lstm':
        return <LSTMVisualizer session={session} />
      case 'ddqn':
        return <DDQNVisualizer session={session} />
      default:
        return <div className="text-gray-500">No specific visualizer for {session.modelName}</div>
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Model Training Visualization</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={loadTrainingData}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Training Stats */}
      {trainingStats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Play className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-blue-600">{trainingStats.activeSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{trainingStats.completedSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-xl font-bold text-red-600">{trainingStats.failedSessions}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-purple-600">
                  {trainingStats.successRate ? (trainingStats.successRate * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Trainings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Training Sessions</h3>
        {activeTrainings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active training sessions</p>
        ) : (
          <div className="space-y-6">
            {activeTrainings.map((session) => (
              <div key={session.id} className="border rounded-lg p-6 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <h4 className="font-semibold text-gray-800">{session.modelName}</h4>
                      <p className="text-sm text-gray-600">Started: {formatTime(session.startTime)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => stopTraining(session.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Stop
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress: {(session.progress * 100).toFixed(1)}%</span>
                    <span>Epoch {session.currentEpoch}/{session.totalEpochs}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${session.progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* Model-Specific Visualization */}
                <div className="mb-4">
                  {getModelVisualizer(session)}
                </div>

                {/* Reward System */}
                {rewards.has(session.id) && (
                  <div className="mb-4">
                    <RewardVisualizer 
                      reward={rewards.get(session.id)} 
                      modelType={session.modelName}
                    />
                  </div>
                )}

                {/* Metrics Chart */}
                {session.metrics && session.metrics.loss && session.metrics.loss.length > 0 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={session.metrics.loss.map((loss, i) => ({ epoch: i, loss }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="epoch" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Training History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trainingHistory.slice(0, 10).map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{session.modelName}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      {getStatusIcon(session.status)}
                      <span className="ml-2 capitalize">{session.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {session.metrics?.accuracy?.[session.metrics.accuracy.length - 1]?.toFixed(4) || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {rewards.has(session.id) ? 
                      `${(rewards.get(session.id).totalReward * 100).toFixed(1)}%` : 
                      'N/A'
                    }
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {session.duration ? formatDuration(session.duration) : 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {formatTime(session.startTime)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedSession(session.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => startTraining('randomforest')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Train Random Forest
          </button>
          <button
            onClick={() => startTraining('lstm')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Train LSTM
          </button>
          <button
            onClick={() => startTraining('ddqn')}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Train DDQN
          </button>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Training Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <SessionDetails sessionId={selectedSession} />
          </div>
        </div>
      )}
    </div>
  )
}

// Session Details Component
const SessionDetails: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [sessionData, setSessionData] = useState<any>(null)
  const [metrics, setMetrics] = useState<any[]>([])

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin
        const [sessionResponse, metricsResponse] = await Promise.all([
          fetch(`${API_URL}/api/ml/training-session/${sessionId}`),
          fetch(`${API_URL}/api/ml/training-metrics/${sessionId}`)
        ])
        
        if (sessionResponse.ok) {
          const session = await sessionResponse.json()
          setSessionData(session)
        }
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }
      } catch (error) {
        console.error('Failed to load session details:', error)
      }
    }

    loadSessionData()
  }, [sessionId])

  if (!sessionData) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700">Model</h4>
          <p className="text-gray-600">{sessionData.modelName}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">Status</h4>
          <p className="text-gray-600 capitalize">{sessionData.status}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">Start Time</h4>
          <p className="text-gray-600">{new Date(sessionData.startTime).toLocaleString()}</p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">Duration</h4>
          <p className="text-gray-600">
            {sessionData.duration ? `${Math.floor(sessionData.duration / 1000)}s` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Metrics Charts */}
      {metrics.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Training Metrics</h4>
          
          {/* Loss Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} name="Training Loss" />
                <Line type="monotone" dataKey="validation_loss" stroke="#f59e0b" strokeWidth={2} name="Validation Loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Training Accuracy" />
                <Line type="monotone" dataKey="validation_accuracy" stroke="#3b82f6" strokeWidth={2} name="Validation Accuracy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelTrainingVisualizer 