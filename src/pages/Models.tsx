import React, { useState } from 'react';
import { useTrading } from '../contexts/TradingContext';
import { BotVisualizer } from '../components/BotVisualizer';
import ModelTrainingVisualizer from '../components/ModelTrainingVisualizer';
import { Brain, TrendingUp, Activity, Zap, BarChart3, Settings, CheckCircle } from 'lucide-react';

const Models: React.FC = () => {
  const { activity, isConnected } = useTrading();
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'analytics'>('overview');

  const models = ['LSTM', 'RF', 'DDQN'] as const;

  // Check if any model is currently training
  const hasActiveTraining = Object.values(activity).some(a => a?.status === 'training');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                AI Models Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced machine learning models with real-time training visualization
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
              {hasActiveTraining && (
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 animate-pulse">
                  🧠 Training Active
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'training'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Training</span>
              {hasActiveTraining && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((modelName) => {
                const modelActivity = activity[modelName] || null;
                
                // Add idle badge after 10 seconds of no activity
                if (modelActivity && modelActivity.timestamp && 
                    Date.now() - modelActivity.timestamp > 10000 && 
                    modelActivity.status !== 'completed') {
                  modelActivity.status = 'idle';
                }

                return (
                  <BotVisualizer
                    key={modelName}
                    modelName={modelName}
                    activity={modelActivity}
                  />
                );
              })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Models</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Object.values(activity).filter(a => a?.status === 'training').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Object.values(activity).filter(a => a?.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Object.keys(activity).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Accuracy</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Object.values(activity).length > 0 
                        ? Math.round(Object.values(activity).reduce((acc, a) => acc + ((a as any)?.accuracy || 0), 0) / Object.values(activity).length * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            <ModelTrainingVisualizer />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Model Performance Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed performance metrics and comparison charts will be displayed here.
              </p>
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
              <span className="text-gray-700 dark:text-gray-300">
                {isConnected ? 'API Connected' : 'API Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 ${isConnected ? 'bg-blue-500' : 'bg-gray-500'} rounded-full animate-pulse`}></div>
              <span className="text-gray-700 dark:text-gray-300">WebSocket Active</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 ${hasActiveTraining ? 'bg-purple-500 animate-pulse' : 'bg-gray-500'} rounded-full`}></div>
              <span className="text-gray-700 dark:text-gray-300">
                {hasActiveTraining ? 'Training in Progress' : 'No Active Training'}
              </span>
            </div>
          </div>
        </div>

        {/* Training Controls */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Training Information
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Models will automatically train based on available data</li>
            <li>• Watch the circular progress indicator fill as training progresses</li>
            <li>• Monitor loss and accuracy trends in real-time charts</li>
            <li>• View model-specific metrics like Q-Value (DDQN) and Gradient Norm</li>
            <li>• Training sessions are logged and can be reviewed in history</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Models;