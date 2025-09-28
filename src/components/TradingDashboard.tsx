/**
 * Enhanced Trading Dashboard - P&L truth, risk dashboard, and pod attribution
 * Provides comprehensive view of trading performance, risk metrics, and alpha pod contributions
 */

import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle, 
  Activity,
  DollarSign,
  Target,
  Zap,
  Brain,
  BarChart3,
  PieChart,
  Gauge
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface PnLData {
  timestamp: string;
  totalPnL: number;
  dailyPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  riskUtilization: number;
  positionCount: number;
  exposure: number;
  volatility: number;
  sharpeRatio: number;
}

interface AlphaPodData {
  name: string;
  weight: number;
  signal: number;
  confidence: number;
  performance: number;
  attribution: number;
}

interface TradingMode {
  mode: 'paper' | 'live' | 'halt';
  lastUpdate: string;
}

export default function TradingDashboard() {
  const [pnlData, setPnlData] = useState<PnLData[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [alphaPods, setAlphaPods] = useState<AlphaPodData[]>([]);
  const [tradingMode, setTradingMode] = useState<TradingMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch P&L data
        const pnlResponse = await fetch('/api/trading/pnl/history');
        const pnl = await pnlResponse.json();
        setPnlData(pnl.data || []);

        // Fetch risk metrics
        const riskResponse = await fetch('/api/risk/metrics');
        const risk = await riskResponse.json();
        setRiskMetrics(risk.data);

        // Fetch alpha pod data
        const alphaResponse = await fetch('/api/alpha/pods/status');
        const alpha = await alphaResponse.json();
        setAlphaPods(alpha.data || []);

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

    fetchData();
    
    // Set up real-time updates
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // P&L Chart Data
  const pnlChartData = {
    labels: pnlData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Total P&L',
        data: pnlData.map(d => d.totalPnL),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.1
      },
      {
        label: 'Daily P&L',
        data: pnlData.map(d => d.dailyPnL),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.1
      }
    ]
  };

  // Alpha Pod Performance Chart
  const alphaPodChartData = {
    labels: alphaPods.map(pod => pod.name),
    datasets: [
      {
        label: 'Weight',
        data: alphaPods.map(pod => pod.weight * 100),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: 'Performance',
        data: alphaPods.map(pod => pod.performance * 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }
    ]
  };

  // Risk Gauge Data
  const riskGaugeData = riskMetrics ? [
    {
      label: 'Drawdown',
      value: Math.abs(riskMetrics.currentDrawdown),
      max: Math.abs(riskMetrics.maxDrawdown),
      color: riskMetrics.currentDrawdown < -0.02 ? 'red' : 'orange'
    },
    {
      label: 'Risk Utilization',
      value: riskMetrics.riskUtilization,
      max: 100,
      color: riskMetrics.riskUtilization > 80 ? 'red' : 'green'
    }
  ] : [];

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
          <span className="text-red-700">Error loading dashboard: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Mode Banner */}
      {tradingMode && (
        <div className={`rounded-lg p-4 ${
          tradingMode.mode === 'live' ? 'bg-red-50 border border-red-200' :
          tradingMode.mode === 'paper' ? 'bg-blue-50 border border-blue-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {tradingMode.mode === 'live' ? (
                <Activity className="h-5 w-5 text-red-500 mr-2" />
              ) : tradingMode.mode === 'paper' ? (
                <Target className="h-5 w-5 text-blue-500 mr-2" />
              ) : (
                <Shield className="h-5 w-5 text-gray-500 mr-2" />
              )}
              <span className={`font-semibold ${
                tradingMode.mode === 'live' ? 'text-red-700' :
                tradingMode.mode === 'paper' ? 'text-blue-700' :
                'text-gray-700'
              }`}>
                Trading Mode: {tradingMode.mode.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Last updated: {new Date(tradingMode.lastUpdate).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total P&L */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total P&L</p>
              <p className={`text-2xl font-bold ${
                pnlData.length > 0 && pnlData[pnlData.length - 1].totalPnL >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                ${pnlData.length > 0 ? pnlData[pnlData.length - 1].totalPnL.toFixed(2) : '0.00'}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Daily P&L</p>
              <p className={`text-2xl font-bold ${
                pnlData.length > 0 && pnlData[pnlData.length - 1].dailyPnL >= 0 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                ${pnlData.length > 0 ? pnlData[pnlData.length - 1].dailyPnL.toFixed(2) : '0.00'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Current Drawdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Drawdown</p>
              <p className={`text-2xl font-bold ${
                riskMetrics && riskMetrics.currentDrawdown < -0.02 
                  ? 'text-red-600' : 'text-orange-600'
              }`}>
                {riskMetrics ? (riskMetrics.currentDrawdown * 100).toFixed(2) : '0.00'}%
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sharpe Ratio</p>
              <p className={`text-2xl font-bold ${
                riskMetrics && riskMetrics.sharpeRatio > 1.5 
                  ? 'text-green-600' : 'text-orange-600'
              }`}>
                {riskMetrics ? riskMetrics.sharpeRatio.toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L Performance</h3>
          <Line data={pnlChartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
              },
              title: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function(value) {
                    return '$' + value.toFixed(2);
                  }
                }
              }
            }
          }} />
        </div>

        {/* Alpha Pod Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alpha Pod Performance</h3>
          <Bar data={alphaPodChartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
              },
              title: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value + '%';
                  }
                }
              }
            }
          }} />
        </div>
      </div>

      {/* Risk Dashboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Dashboard</h3>
        
        {riskMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Risk Gauges */}
            {riskGaugeData.map((gauge, index) => (
              <div key={index} className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-2">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - gauge.value / gauge.max)}`}
                      className={`text-${gauge.color}-500`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold">{gauge.value.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{gauge.label}</p>
              </div>
            ))}

            {/* Risk Metrics */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Position Count:</span>
                <span className="font-semibold">{riskMetrics.positionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Exposure:</span>
                <span className="font-semibold">${riskMetrics.exposure.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Volatility:</span>
                <span className="font-semibold">{(riskMetrics.volatility * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alpha Pod Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alpha Pod Details</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pod Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attribution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alphaPods.map((pod, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{pod.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{(pod.weight * 100).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      pod.signal > 0 ? 'text-green-600' : pod.signal < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {pod.signal > 0 ? 'BUY' : pod.signal < 0 ? 'SELL' : 'HOLD'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{(pod.confidence * 100).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      pod.performance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(pod.performance * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">${pod.attribution.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}