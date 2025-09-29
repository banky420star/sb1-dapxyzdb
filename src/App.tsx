/**
 * Enhanced App Component - Main application with enhanced trading dashboard
 * Integrates all the new components: TradingDashboard, RiskDashboard, and AlphaPodDashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Shield, 
  Brain, 
  Settings, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import TradingDashboard from './components/TradingDashboard';
import RiskDashboard from './components/RiskDashboard';
import AlphaPodDashboard from './components/AlphaPodDashboard';

// Types
interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastUpdate: string;
}

interface TradingMode {
  mode: 'paper' | 'live' | 'halt';
  lastUpdate: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'trading' | 'risk' | 'alpha'>('trading');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch system status
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setIsLoading(true);
        
        // Fetch system health
        const healthResponse = await fetch('/api/health');
        const health = await healthResponse.json();
        setSystemStatus(health.data);

        // Fetch trading mode
        const modeResponse = await fetch('/api/trading/mode');
        const mode = await modeResponse.json();
        setTradingMode(mode.data);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStatus();
    
    // Set up real-time updates
    const interval = setInterval(fetchSystemStatus, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get trading mode color
  const getTradingModeColor = (mode: string) => {
    switch (mode) {
      case 'live': return 'text-red-600 bg-red-50 border-red-200';
      case 'paper': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'halt': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Trading System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <div className="flex items-center mb-4">
            <XCircle className="h-8 w-8 text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-red-800">System Error</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  AI Trading System
                </h1>
                <p className="text-sm text-gray-500">
                  Profit-Hunting Cyborg Dashboard
                </p>
              </div>
            </div>

            {/* System Status */}
            <div className="flex items-center space-x-4">
              {/* Trading Mode */}
              {tradingMode && (
                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getTradingModeColor(tradingMode.mode)}`}>
                  {tradingMode.mode.toUpperCase()}
                </div>
              )}

              {/* System Status */}
              {systemStatus && (
                <div className="flex items-center">
                  {getStatusIcon(systemStatus.status)}
                  <span className={`ml-2 text-sm font-medium ${getStatusColor(systemStatus.status)}`}>
                    {systemStatus.status.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Settings */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('trading')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trading'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Trading Dashboard
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('risk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'risk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Risk Dashboard
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('alpha')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'alpha'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Brain className="h-4 w-4 mr-2" />
                Alpha Pods
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'trading' && <TradingDashboard />}
        {activeTab === 'risk' && <RiskDashboard />}
        {activeTab === 'alpha' && <AlphaPodDashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 AI Trading System. Built with React, Node.js, and Python.
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Version 2.0.0</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}