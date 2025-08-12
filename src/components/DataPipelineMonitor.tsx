import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';

interface DataSource {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  lastUpdate: string;
  lagSeconds: number;
  missingCandles: number;
  cacheHitRate: number;
  throughput: number;
}

interface PairDiscovery {
  symbol: string;
  discoveredAt: string;
  volume24h: number;
  status: 'new' | 'updated' | 'removed';
}

interface DataPipelineMonitorProps {
  refreshInterval?: number;
}

export default function DataPipelineMonitor({ refreshInterval = 15000 }: DataPipelineMonitorProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [pairDiscoveries, setPairDiscoveries] = useState<PairDiscovery[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');

  useEffect(() => {
    // Initialize WebSocket connection
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_WS_URL || API_URL;

    const newSocket = io(WS_URL, {
      path: '/ws',
      auth: { 
        token: localStorage.getItem('jwt') 
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to data pipeline WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from data pipeline WebSocket');
    });

    newSocket.on('data_source_update', (source: DataSource) => {
      setDataSources(prev => {
        const filtered = prev.filter(s => s.name !== source.name);
        return [source, ...filtered];
      });
    });

    newSocket.on('pair_discovery', (discovery: PairDiscovery) => {
      setPairDiscoveries(prev => {
        const filtered = prev.filter(p => p.symbol !== discovery.symbol);
        return [discovery, ...filtered.slice(0, 49)]; // Keep last 50 discoveries
      });
    });

    newSocket.on('pipeline_health', (health: { status: 'healthy' | 'warning' | 'error' }) => {
      setOverallHealth(health.status);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Fetch initial data
    fetchDataSources();
    fetchPairDiscoveries();

    // Set up periodic refresh
    const interval = setInterval(() => {
      fetchDataSources();
      fetchPairDiscoveries();
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchDataSources = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${API_URL}/api/data/sources`);
      if (response.ok) {
        const sources = await response.json();
        setDataSources(sources);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const fetchPairDiscoveries = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
      const response = await fetch(`${API_URL}/api/data/discoveries`);
      if (response.ok) {
        const discoveries = await response.json();
        setPairDiscoveries(discoveries);
      }
    } catch (error) {
      console.error('Failed to fetch pair discoveries:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getLagColor = (lagSeconds: number) => {
    if (lagSeconds < 60) return 'text-green-500';
    if (lagSeconds < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatLag = (lagSeconds: number) => {
    if (lagSeconds < 60) return `${lagSeconds}s`;
    if (lagSeconds < 3600) return `${Math.floor(lagSeconds / 60)}m`;
    return `${Math.floor(lagSeconds / 3600)}h`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const getDiscoveryStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-green-500';
      case 'updated': return 'text-blue-500';
      case 'removed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getDiscoveryStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return '🆕';
      case 'updated': return '🔄';
      case 'removed': return '🗑️';
      default: return '❓';
    }
  };

  const totalMissingCandles = dataSources.reduce((sum, source) => sum + source.missingCandles, 0);
  const avgCacheHitRate = dataSources.length > 0 
    ? dataSources.reduce((sum, source) => sum + source.cacheHitRate, 0) / dataSources.length 
    : 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-lg font-semibold text-white">Data Pipeline Monitor</h3>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${getStatusColor(overallHealth)}`}>
            <span>{getStatusIcon(overallHealth)}</span>
            <span className="capitalize">{overallHealth}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>Last refresh: {format(lastRefresh, 'HH:mm:ss')}</span>
          <button
            onClick={() => {
              fetchDataSources();
              fetchPairDiscoveries();
              setLastRefresh(new Date());
            }}
            className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Data Sources */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300">Data Sources</h4>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Missing Candles</div>
              <div className={`text-2xl font-bold ${totalMissingCandles > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {totalMissingCandles}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Cache Hit Rate</div>
              <div className="text-2xl font-bold text-white">
                {(avgCacheHitRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Sources List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dataSources.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No data sources available
              </div>
            ) : (
              dataSources.map((source) => (
                <div key={source.name} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(source.status)}</span>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {source.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Last update: {format(new Date(source.lastUpdate), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getLagColor(source.lagSeconds)}`}>
                        {formatLag(source.lagSeconds)} lag
                      </div>
                      <div className="text-xs text-gray-400">
                        {source.missingCandles} missing
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Cache:</span>
                      <span className="text-white ml-1">{(source.cacheHitRate * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Throughput:</span>
                      <span className="text-white ml-1">{source.throughput.toFixed(0)}/s</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className={`ml-1 ${getStatusColor(source.status)}`}>
                        {source.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pair Discovery */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-300">Pair Discovery</h4>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pairDiscoveries.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No recent pair discoveries
              </div>
            ) : (
              pairDiscoveries.map((discovery) => (
                <div key={`${discovery.symbol}-${discovery.discoveredAt}`} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getDiscoveryStatusIcon(discovery.status)}</span>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {discovery.symbol}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(discovery.discoveredAt), 'MMM dd, HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getDiscoveryStatusColor(discovery.status)}`}>
                        {discovery.status}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatVolume(discovery.volume24h)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {dataSources.length} data sources, {pairDiscoveries.length} recent discoveries
          </span>
          <span>
            Auto-refresh: {refreshInterval / 1000}s
          </span>
        </div>
      </div>
    </div>
  );
} 