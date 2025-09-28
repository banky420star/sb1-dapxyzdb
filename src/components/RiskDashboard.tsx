/**
 * Risk Dashboard - Comprehensive risk monitoring and management
 * Provides real-time risk metrics, circuit breaker status, and risk controls
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingDown,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  Gauge,
  Settings
} from 'lucide-react';

// Types
interface RiskLimits {
  maxDrawdown: number;
  dailyDrawdownLimit: number;
  maxPositionSize: number;
  maxExposure: number;
  confidenceThreshold: number;
  volatilityTarget: number;
}

interface RiskStatus {
  currentDrawdown: number;
  dailyPnL: number;
  positionCount: number;
  totalExposure: number;
  riskUtilization: number;
  volatility: number;
  sharpeRatio: number;
  circuitBreakers: {
    dailyDrawdown: boolean;
    killSwitch: boolean;
    positionLimit: boolean;
    exposureLimit: boolean;
  };
  alerts: RiskAlert[];
}

interface RiskAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  risk: number;
}

export default function RiskDashboard() {
  const [riskLimits, setRiskLimits] = useState<RiskLimits | null>(null);
  const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch risk data
  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch risk limits
        const limitsResponse = await fetch('/api/risk/limits');
        const limits = await limitsResponse.json();
        setRiskLimits(limits.data);

        // Fetch risk status
        const statusResponse = await fetch('/api/risk/status');
        const status = await statusResponse.json();
        setRiskStatus(status.data);

        // Fetch positions
        const positionsResponse = await fetch('/api/positions');
        const positions = await positionsResponse.json();
        setPositions(positions.data || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiskData();
    
    // Set up real-time updates
    const interval = setInterval(fetchRiskData, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Handle risk limit updates
  const updateRiskLimits = async (newLimits: Partial<RiskLimits>) => {
    try {
      const response = await fetch('/api/risk/limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLimits),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRiskLimits(updated.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle alert acknowledgment
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/risk/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      
      // Refresh risk status
      const statusResponse = await fetch('/api/risk/status');
      const status = await statusResponse.json();
      setRiskStatus(status.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle kill switch
  const toggleKillSwitch = async () => {
    try {
      const response = await fetch('/api/risk/kill-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: riskStatus?.circuitBreakers.killSwitch ? 'disable' : 'enable' 
        }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setRiskStatus(updated.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading risk dashboard: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Risk Status Overview</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Drawdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Drawdown</p>
                <p className={`text-2xl font-bold ${
                  riskStatus && riskStatus.currentDrawdown < -0.02 
                    ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {riskStatus ? (riskStatus.currentDrawdown * 100).toFixed(2) : '0.00'}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-400" />
            </div>
            {riskLimits && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      riskStatus && riskStatus.currentDrawdown < -0.02 
                        ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.abs(riskStatus?.currentDrawdown || 0) / Math.abs(riskLimits.dailyDrawdownLimit) * 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Limit: {(riskLimits.dailyDrawdownLimit * 100).toFixed(2)}%
                </p>
              </div>
            )}
          </div>

          {/* Daily P&L */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily P&L</p>
                <p className={`text-2xl font-bold ${
                  riskStatus && riskStatus.dailyPnL >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${riskStatus ? riskStatus.dailyPnL.toFixed(2) : '0.00'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          {/* Risk Utilization */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Utilization</p>
                <p className={`text-2xl font-bold ${
                  riskStatus && riskStatus.riskUtilization > 80 
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  {riskStatus ? riskStatus.riskUtilization.toFixed(1) : '0.0'}%
                </p>
              </div>
              <Gauge className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    riskStatus && riskStatus.riskUtilization > 80 
                      ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${riskStatus?.riskUtilization || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Sharpe Ratio */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sharpe Ratio</p>
                <p className={`text-2xl font-bold ${
                  riskStatus && riskStatus.sharpeRatio > 1.5 
                    ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {riskStatus ? riskStatus.sharpeRatio.toFixed(2) : '0.00'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Circuit Breakers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Circuit Breakers</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskStatus && Object.entries(riskStatus.circuitBreakers).map(([key, isTriggered]) => (
            <div key={key} className={`rounded-lg p-4 ${
              isTriggered ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className={`text-sm ${
                    isTriggered ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isTriggered ? 'TRIGGERED' : 'ACTIVE'}
                  </p>
                </div>
                {isTriggered ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Kill Switch */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-900">Kill Switch</h4>
              <p className="text-sm text-gray-600">
                Immediately halt all trading activity
              </p>
            </div>
            <button
              onClick={toggleKillSwitch}
              className={`px-4 py-2 rounded-lg font-medium ${
                riskStatus?.circuitBreakers.killSwitch
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {riskStatus?.circuitBreakers.killSwitch ? 'ENABLE TRADING' : 'HALT TRADING'}
            </button>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {riskStatus && riskStatus.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Alerts</h3>
          
          <div className="space-y-3">
            {riskStatus.alerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
                alert.type === 'critical' 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center">
                  {alert.type === 'critical' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                  ) : (
                    <Shield className="h-5 w-5 text-yellow-500 mr-3" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Positions</h3>
        
        {positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {positions.map((position, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        position.side === 'long' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {position.size.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${position.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${position.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        position.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${position.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(position.risk * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No open positions</p>
        )}
      </div>

      {/* Risk Settings Modal */}
      {showSettings && riskLimits && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Daily Drawdown Limit (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={riskLimits.dailyDrawdownLimit * 100}
                    onChange={(e) => updateRiskLimits({ 
                      dailyDrawdownLimit: parseFloat(e.target.value) / 100 
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Position Size (USD)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.maxPositionSize}
                    onChange={(e) => updateRiskLimits({ 
                      maxPositionSize: parseFloat(e.target.value) 
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Exposure (USD)
                  </label>
                  <input
                    type="number"
                    value={riskLimits.maxExposure}
                    onChange={(e) => updateRiskLimits({ 
                      maxExposure: parseFloat(e.target.value) 
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={riskLimits.confidenceThreshold * 100}
                    onChange={(e) => updateRiskLimits({ 
                      confidenceThreshold: parseFloat(e.target.value) / 100 
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}