import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrainingRun {
  id: string;
  symbol: string;
  modelType: 'lstm' | 'random_forest' | 'ddqn' | 'ensemble';
  status: 'running' | 'completed' | 'failed' | 'pending';
  startTime: string;
  endTime?: string;
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  validationLoss: number;
  accuracy: number;
  gpuUtilization: number;
  memoryUsage: number;
  progress: number;
}

interface TrainingMonitorProps {
  maxRuns?: number;
}

export default function ModelTrainingMonitor({ maxRuns = 10 }: TrainingMonitorProps) {
  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [lossHistory, setLossHistory] = useState<Array<{ epoch: number; loss: number; valLoss: number }>>([]);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:8000', {
      path: '/ws',
      auth: { 
        token: localStorage.getItem('jwt') 
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to training WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from training WebSocket');
    });

    newSocket.on('training_start', (run: TrainingRun) => {
      setTrainingRuns(prev => {
        const filtered = prev.filter(r => r.id !== run.id);
        return [run, ...filtered.slice(0, maxRuns - 1)];
      });
    });

    newSocket.on('training_progress', (update: Partial<TrainingRun> & { id: string }) => {
      setTrainingRuns(prev => 
        prev.map(run => 
          run.id === update.id 
            ? { ...run, ...update }
            : run
        )
      );

      // Update loss history for selected run
      if (selectedRun === update.id && update.loss !== undefined) {
        setLossHistory(prev => [
          ...prev,
          {
            epoch: update.currentEpoch || 0,
            loss: update.loss,
            valLoss: update.validationLoss || 0
          }
        ]);
      }
    });

    newSocket.on('training_complete', (run: TrainingRun) => {
      setTrainingRuns(prev => 
        prev.map(r => 
          r.id === run.id 
            ? { ...r, ...run, status: 'completed' }
            : r
        )
      );
    });

    newSocket.on('training_failed', (run: TrainingRun) => {
      setTrainingRuns(prev => 
        prev.map(r => 
          r.id === run.id 
            ? { ...r, ...run, status: 'failed' }
            : r
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [maxRuns, selectedRun]);

  const getStatusColor = (status: TrainingRun['status']) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'completed': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: TrainingRun['status']) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getModelTypeColor = (modelType: TrainingRun['modelType']) => {
    switch (modelType) {
      case 'lstm': return 'text-purple-400';
      case 'random_forest': return 'text-green-400';
      case 'ddqn': return 'text-blue-400';
      case 'ensemble': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const selectedRunData = trainingRuns.find(run => run.id === selectedRun);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-lg font-semibold text-white">Model Training Monitor</h3>
          <span className="text-sm text-gray-400">
            ({trainingRuns.filter(r => r.status === 'running').length} active)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setTrainingRuns([])}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Training Runs List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Active Training Runs</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {trainingRuns.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {isConnected ? 'No active training runs' : 'Connecting...'}
              </div>
            ) : (
              trainingRuns.map((run) => (
                <div
                  key={run.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRun === run.id 
                      ? 'border-blue-500 bg-blue-900/20' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedRun(run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(run.status)}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">
                            {run.symbol}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getModelTypeColor(run.modelType)} bg-gray-800`}>
                            {run.modelType.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDuration(run.startTime, run.endTime)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(run.status)}`}>
                        {run.status}
                      </div>
                      {run.status === 'running' && (
                        <div className="text-xs text-gray-400">
                          Epoch {run.currentEpoch}/{run.totalEpochs}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {run.status === 'running' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(run.progress * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${run.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Run Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300">Training Details</h4>
          
          {selectedRunData ? (
            <div className="space-y-4">
              {/* Run Info */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white ml-2">{selectedRunData.symbol}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Model:</span>
                    <span className={`ml-2 ${getModelTypeColor(selectedRunData.modelType)}`}>
                      {selectedRunData.modelType.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className={`ml-2 ${getStatusColor(selectedRunData.status)}`}>
                      {selectedRunData.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white ml-2">
                      {formatDuration(selectedRunData.startTime, selectedRunData.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {selectedRunData.status === 'running' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Current Loss</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedRunData.loss.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Validation Loss</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedRunData.validationLoss.toFixed(4)}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Accuracy</div>
                    <div className="text-2xl font-bold text-white">
                      {(selectedRunData.accuracy * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">GPU Usage</div>
                    <div className="text-2xl font-bold text-white">
                      {selectedRunData.gpuUtilization.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Loss Chart */}
              {lossHistory.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-4">Training Loss</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={lossHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="epoch" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="loss" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="valLoss" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center space-x-4 mt-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-gray-400">Training Loss</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-400">Validation Loss</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Select a training run to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 