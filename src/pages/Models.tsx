import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTradingContext, useTrading } from '../contexts/TradingContext';
import { BotVisualizer } from '../components/BotVisualizer';
import ModelTrainingVisualizer from '../components/ModelTrainingVisualizer';
import CandlestickLoader from '../components/CandlestickLoader';
import { 
  Brain, 
  TrendingUp, 
  Activity, 
  Zap, 
  BarChart3, 
  Settings, 
  CheckCircle, 
  Play, 
  Square, 
  Trash2,
  Sparkles,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Target
} from 'lucide-react';

const Models: React.FC = () => {
  const { activity, syncData } = useTradingContext();
  const { isConnected } = useTrading();
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'analytics'>('overview');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const models = ['LSTM', 'RF', 'DDQN'] as const;

  // Check if any model is currently training
  const hasActiveTraining = Object.values(activity).some(a => a?.status === 'training');

  return (
    <div className={`min-h-screen bg-futuristic text-slate-100 flex flex-col transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* V2: Enhanced Header */}
          <motion.div 
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gradient mb-2 sm:mb-3 flex items-center">
                  <Brain className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-indigo-400" />
                  AI Models Hub
                </h1>
                <p className="text-slate-400 text-sm sm:text-lg">
                  Advanced machine learning models with real-time training visualization
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold glass ${
                  syncData ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'
                } border`}>
                  {syncData ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
                {hasActiveTraining && (
                  <div className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 animate-pulse">
                    🧠 Training Active
                  </div>
                )}
              </div>
            </div>

            {/* V2: Enhanced Tab Navigation */}
            <div className="flex flex-wrap gap-1 sm:gap-2 glass p-2 rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'training'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Training</span>
              {hasActiveTraining && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Analytics</span>
            </button>
          </div>
        </motion.div>

        {/* V2: Enhanced Tab Content */}
        {activeTab === 'overview' && (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {/* V2: Enhanced Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {models.map((modelName, index) => {
                const modelActivity = activity[modelName] || null;
                
                // Add idle badge after 10 seconds of no activity
                if (modelActivity && modelActivity.timestamp && 
                    Date.now() - modelActivity.timestamp > 10000 && 
                    modelActivity.status !== 'completed') {
                  modelActivity.status = 'idle';
                }

                return (
                  <motion.div
                    key={modelName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                  >
                    <BotVisualizer
                      modelName={modelName}
                      activity={modelActivity}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* V2: Enhanced Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-medium">Active Models</p>
                    <p className="text-3xl font-bold text-white">
                      {Object.values(activity).filter(a => a?.status === 'training').length}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-medium">Completed</p>
                    <p className="text-3xl font-bold text-white">
                      {Object.values(activity).filter(a => a?.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-medium">Total Sessions</p>
                    <p className="text-3xl font-bold text-white">
                      {Object.keys(activity).length}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="card-futuristic p-6 hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-medium">Avg Accuracy</p>
                    <div className="flex items-center justify-center">
                      <CandlestickLoader 
                        progress={Object.values(activity).length > 0 
                          ? Math.round(Object.values(activity).reduce((acc, a) => acc + ((a as any)?.accuracy || 0), 0) / Object.values(activity).length * 100)
                          : 0}
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'training' && (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <ModelTrainingVisualizer />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="card-futuristic p-8">
              <h3 className="text-2xl font-bold text-gradient mb-6">
                Model Performance Analytics
              </h3>
              <p className="text-slate-400 text-lg">
                Detailed performance metrics and comparison charts will be displayed here.
              </p>
            </div>
          </motion.div>
        )}

        {/* V2: Enhanced System Status */}
        <motion.div 
          className="mt-8 card-futuristic p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-6">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className={`w-4 h-4 ${isConnected ? 'bg-green-400' : 'bg-red-400'} rounded-full animate-pulse`}></div>
              <span className="text-slate-300 font-medium">
                {isConnected ? 'API Connected' : 'API Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className={`w-4 h-4 ${isConnected ? 'bg-blue-400' : 'bg-slate-500'} rounded-full animate-pulse`}></div>
              <span className="text-slate-300 font-medium">WebSocket Active</span>
            </div>
            <div className="flex items-center space-x-4 p-4 glass rounded-xl">
              <div className={`w-4 h-4 ${hasActiveTraining ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'} rounded-full`}></div>
              <span className="text-slate-300 font-medium">
                {hasActiveTraining ? 'Training in Progress' : 'No Active Training'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* V2: Enhanced Training Controls */}
        <motion.div 
          className="mt-8 card-futuristic p-8 border border-indigo-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <h3 className="text-xl font-bold text-gradient mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-400" />
            Training Information
          </h3>
          <ul className="text-slate-300 space-y-3">
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>Models will automatically train based on available data</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>Watch the circular progress indicator fill as training progresses</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>Monitor loss and accuracy trends in real-time charts</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>View model-specific metrics like Q-Value (DDQN) and Gradient Norm</span>
            </li>
            <li className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span>Training sessions are logged and can be reviewed in history</span>
            </li>
          </ul>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Models;
