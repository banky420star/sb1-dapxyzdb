import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';

interface Trade {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  pnl: number;
  modelId?: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
}

interface TradeFeedProps {
  maxTrades?: number;
  autoScroll?: boolean;
}

export default function TradeFeed({ maxTrades = 50, autoScroll = true }: TradeFeedProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      console.log('🔌 Connected to trading WebSocket');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from trading WebSocket');
    });

    newSocket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      console.error('WebSocket connection error:', err);
    });

    newSocket.on('trade', (trade: Trade) => {
      setTrades(prev => {
        const newTrades = [trade, ...prev.slice(0, maxTrades - 1)];
        return newTrades;
      });
    });

    newSocket.on('trade_update', (update: Partial<Trade> & { id: string }) => {
      setTrades(prev => 
        prev.map(trade => 
          trade.id === update.id 
            ? { ...trade, ...update }
            : trade
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [maxTrades]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(quantity);
  };

  const formatPnl = (pnl: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(pnl));
    
    return pnl >= 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'filled': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      case 'cancelled': return 'text-gray-500';
      case 'rejected': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getSideColor = (side: Trade['side']) => {
    return side === 'buy' ? 'text-green-500' : 'text-red-500';
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h3 className="text-lg font-semibold text-white">Live Trade Feed</h3>
          <span className="text-sm text-gray-400">
            ({trades.length} trades)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {error && (
            <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
              {error}
            </span>
          )}
          <button
            onClick={() => setTrades([])}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Side
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {isConnected ? 'Waiting for trades...' : 'Connecting...'}
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-2 text-sm text-gray-300">
                    {format(new Date(trade.timestamp), 'HH:mm:ss')}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-white">
                    {trade.symbol}
                  </td>
                  <td className={`px-4 py-2 text-sm font-medium ${getSideColor(trade.side)}`}>
                    {trade.side.toUpperCase()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-300">
                    {formatQuantity(trade.quantity)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-300">
                    ${formatPrice(trade.price)}
                  </td>
                  <td className={`px-4 py-2 text-sm font-medium ${getPnlColor(trade.pnl)}`}>
                    {formatPnl(trade.pnl)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Last update: {trades.length > 0 ? format(new Date(trades[0].timestamp), 'HH:mm:ss') : 'Never'}
          </span>
          <span>
            Connection: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
} 