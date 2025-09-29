/**
 * Alpha Pod Dashboard - Alpha pod performance and attribution
 * Provides detailed view of alpha pod signals, weights, and performance attribution
 */

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  BarChart3,
  PieChart,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Filler
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Filler
);

// Types
interface AlphaPod {
  name: string;
  type: 'trend' | 'mean_revert' | 'vol_regime' | 'xgboost';
  weight: number;
  signal: number;
  confidence: number;
  volatility: number;
  performance: number;
  attribution: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'error';
  warmupBars: number;
  barsProcessed: number;
}

interface PodSignal {
  timestamp: string;
  pod: string;
  signal: number;
  confidence: number;
  volatility: number;
}

interface PodPerformance {
  pod: string;
  period: string;
  returns: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
}

export default function AlphaPodDashboard() {
  const [pods, setPods] = useState<AlphaPod[]>([]);
  const [signals, setSignals] = useState<PodSignal[]>([]);
  const [performance, setPerformance] = useState<PodPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);

  // Fetch alpha pod data
  useEffect(() => {
    const fetchAlphaData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch pod status
        const podsResponse = await fetch('/api/alpha/pods/status');
        const pods = await podsResponse.json();
        setPods(pods.data || []);

        // Fetch recent signals
        const signalsResponse = await fetch('/api/alpha/signals/recent');
        const signals = await signalsResponse.json();
        setSignals(signals.data || []);

        // Fetch performance data
        const performanceResponse = await fetch('/api/alpha/performance');
        const performance = await performanceResponse.json();
        setPerformance(performance.data || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlphaData();
    
    // Set up real-time updates
    const interval = setInterval(fetchAlphaData, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Chart data for pod weights
  const podWeightData = {
    labels: pods.map(pod => pod.name),
    datasets: [
      {
        data: pods.map(pod => pod.weight * 100),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(168, 85, 247)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Chart data for pod performance
  const podPerformanceData = {
    labels: pods.map(pod => pod.name),
    datasets: [
      {
        label: 'Performance (%)',
        data: pods.map(pod => pod.performance * 100),
        backgroundColor: pods.map(pod => 
          pod.performance > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: pods.map(pod => 
          pod.performance > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1
      }
    ]
  };

  // Chart data for signal history
  const signalHistoryData = {
    labels: signals.slice(-20).map(s => new Date(s.timestamp).toLocaleTimeString()),
    datasets: pods.map((pod, index) => ({
      label: pod.name,
      data: signals
        .filter(s => s.pod === pod.name)
        .slice(-20)
        .map(s => s.signal),
      borderColor: [
        'rgb(59, 130, 246)',
        'rgb(34, 197, 94)',
        'rgb(251, 146, 60)',
        'rgb(168, 85, 247)'
      ][index],
      backgroundColor: [
        'rgba(59, 130, 246, 0.1)',
        'rgba(34, 197, 94, 0.1)',
        'rgba(251, 146, 60, 0.1)',
        'rgba(168, 85, 247, 0.1)'
      ][index],
      fill: false,
      tension: 0.1
    }))
  };

  // Get pod icon
  const getPodIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-5 w-5" />;
      case 'mean_revert': return <TrendingDown className="h-5 w-5" />;
      case 'vol_regime': return <Zap className="h-5 w-5" />;
      case 'xgboost': return <Brain className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  // Get pod status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get signal color
  const getSignalColor = (signal: number) => {
    if (signal > 0.1) return 'text-green-600';
    if (signal < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };

  // Get signal text
  const getSignalText = (signal: number) => {
    if (signal > 0.1) return 'BUY';
    if (signal < -0.1) return 'SELL';
    return 'HOLD';
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
          <span className="text-red-700">Error loading alpha pod dashboard: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alpha Pod Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alpha Pod Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pods.map((pod, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {getPodIcon(pod.type)}
                  <span className="ml-2 text-sm font-medium text-gray-900">{pod.name}</span>
                </div>
                <span className={`text-xs font-medium ${getStatusColor(pod.status)}`}>
                  {pod.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-medium">{(pod.weight * 100).toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Signal:</span>
                  <span className={`font-medium ${getSignalColor(pod.signal)}`}>
                    {getSignalText(pod.signal)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Confidence:</span>
                  <span className="font-medium">{(pod.confidence * 100).toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Performance:</span>
                  <span className={`font-medium ${
                    pod.performance > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(pod.performance * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Attribution:</span>
                  <span>${pod.attribution.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pod Weights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pod Weights</h3>
          <div className="h-64">
            <Pie data={podWeightData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom' as const,
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return context.label + ': ' + context.parsed.toFixed(1) + '%';
                    }
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Pod Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pod Performance</h3>
          <div className="h-64">
            <Bar data={podPerformanceData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
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
      </div>

      {/* Signal History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Signal History</h3>
        <div className="h-64">
          <Line data={signalHistoryData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toFixed(2);
                  }
                }
              }
            }
          }} />
        </div>
      </div>

      {/* Detailed Pod Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Pod Information</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                  Volatility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attribution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pods.map((pod, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getPodIcon(pod.type)}
                      <span className="ml-2 text-sm font-medium text-gray-900">{pod.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pod.type.replace('_', ' ').toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      pod.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : pod.status === 'inactive'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {pod.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(pod.weight * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getSignalColor(pod.signal)}`}>
                      {getSignalText(pod.signal)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {pod.signal.toFixed(3)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(pod.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(pod.volatility * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      pod.performance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(pod.performance * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${pod.attribution.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pod.lastUpdate).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Metrics */}
      {performance.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pod
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Returns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sharpe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max DD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trades
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performance.map((perf, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {perf.pod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        perf.returns > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(perf.returns * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.sharpe.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(perf.maxDrawdown * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(perf.winRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {perf.trades}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}