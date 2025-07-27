import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Eye,
  EyeOff,
  Bell,
  Search,
  Settings,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Play,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import SplitPane from '../components/SplitPane';
import CommandPalette from '../components/CommandPalette';

// Mock data
const orderBookData = {
  bids: [
    { price: 0.25812836, size: 1250.5, total: 1250.5 },
    { price: 0.25800000, size: 890.2, total: 2140.7 },
    { price: 0.25785000, size: 1567.8, total: 3708.5 },
    { price: 0.25770000, size: 2340.1, total: 6048.6 },
    { price: 0.25755000, size: 1890.3, total: 7938.9 },
  ],
  asks: [
    { price: 0.25866172, size: 980.4, total: 980.4 },
    { price: 0.25880000, size: 1456.7, total: 2437.1 },
    { price: 0.25895000, size: 2100.2, total: 4537.3 },
    { price: 0.25910000, size: 1789.5, total: 6326.8 },
    { price: 0.25925000, size: 2340.8, total: 8667.6 },
  ]
};

const tradeHistory = [
  { time: '14:32:15', price: 0.25866172, size: 125.5, side: 'buy' },
  { time: '14:32:12', price: 0.25812836, size: 89.2, side: 'sell' },
  { time: '14:32:08', price: 0.25866172, size: 234.1, side: 'buy' },
  { time: '14:32:05', price: 0.25812836, size: 156.7, side: 'sell' },
  { time: '14:32:01', price: 0.25866172, size: 445.3, side: 'buy' },
];

const Trading: React.FC = () => {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [botState, setBotState] = useState<'auto' | 'semi' | 'manual'>('auto');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [orderForm, setOrderForm] = useState({
    quantity: '',
    price: '',
    stopPrice: ''
  });
  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [confirmOrderData, setConfirmOrderData] = useState<any>(null);

  // Command palette actions
  const commands = [
    {
      id: 'buy-10',
      title: 'Buy 10%',
      description: 'Buy 10% of available balance',
      action: () => console.log('Buy 10%'),
      category: 'trading'
    },
    {
      id: 'sell-10',
      title: 'Sell 10%',
      description: 'Sell 10% of position',
      action: () => console.log('Sell 10%'),
      category: 'trading'
    },
    {
      id: 'pause-bot',
      title: 'Pause Bot',
      description: 'Pause automated trading',
      action: () => setBotState('manual'),
      category: 'bot'
    },
    {
      id: 'switch-model',
      title: 'Switch Model',
      description: 'Change to different AI model',
      action: () => console.log('Switch model'),
      category: 'system'
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOrderSubmit = (side: 'buy' | 'sell') => {
    const orderData = {
      side,
      type: orderType,
      quantity: parseFloat(orderForm.quantity),
      price: orderType === 'market' ? null : parseFloat(orderForm.price),
      stopPrice: orderType === 'stop' ? parseFloat(orderForm.stopPrice) : null
    };
    
    setConfirmOrderData(orderData);
    setShowConfirmOrder(true);
  };

  const confirmOrder = () => {
    // Here you would send the order to your API
    console.log('Order confirmed:', confirmOrderData);
    setShowConfirmOrder(false);
    setConfirmOrderData(null);
    // Reset form
    setOrderForm({ quantity: '', price: '', stopPrice: '' });
  };

  return (
    <div className="h-screen bg-bg-deep text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-surface">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Trading</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">XRP/USD</span>
            <span className="text-sm text-green-500">$0.25866172</span>
            <span className="text-xs text-green-500">+2.34%</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Bot State Banner */}
      <div className="bg-surface border-b border-gray-700 p-3">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-sm text-gray-400">Bot State:</span>
          {(['auto', 'semi', 'manual'] as const).map((state) => (
            <button
              key={state}
              onClick={() => setBotState(state)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                botState === state
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <SplitPane defaultSizes={[70, 30]}>
          {/* Left Panel - Chart */}
          <div className="flex flex-col h-full">
            {/* TradingView Widget Placeholder */}
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">TradingView Chart Widget</p>
                <p className="text-sm text-gray-500 mt-2">Real-time price chart would be embedded here</p>
              </div>
            </div>

            {/* Depth & Tape */}
            <div className="h-48 bg-surface border-t border-gray-700">
              <div className="grid grid-cols-2 h-full">
                {/* Order Book */}
                <div className="border-r border-gray-700">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium">Order Book</h3>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
                      <span>Size</span>
                      <span>Price</span>
                      <span>Total</span>
                    </div>
                    {orderBookData.asks.slice().reverse().map((ask, index) => (
                      <div key={`ask-${index}`} className="grid grid-cols-3 text-xs">
                        <span className="text-red-500">{ask.size.toFixed(1)}</span>
                        <span className="text-red-500">{ask.price.toFixed(8)}</span>
                        <span className="text-gray-400">{ask.total.toFixed(1)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-600 my-1"></div>
                    {orderBookData.bids.map((bid, index) => (
                      <div key={`bid-${index}`} className="grid grid-cols-3 text-xs">
                        <span className="text-green-500">{bid.size.toFixed(1)}</span>
                        <span className="text-green-500">{bid.price.toFixed(8)}</span>
                        <span className="text-gray-400">{bid.total.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade History */}
                <div>
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium">Recent Trades</h3>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
                      <span>Time</span>
                      <span>Price</span>
                      <span>Size</span>
                    </div>
                    {tradeHistory.map((trade, index) => (
                      <div key={index} className="grid grid-cols-3 text-xs">
                        <span className="text-gray-400">{trade.time}</span>
                        <span className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                          {trade.price.toFixed(8)}
                        </span>
                        <span className="text-gray-400">{trade.size.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Order Ticket */}
          <div className="flex flex-col h-full bg-surface">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Order Ticket</h2>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {/* Order Type Tabs */}
              <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
                {(['market', 'limit', 'stop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      orderType === type
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Order Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-2 text-xs text-gray-400">XRP</div>
                  </div>
                </div>

                {orderType === 'limit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                    <input
                      type="number"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {orderType === 'stop' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                      <input
                        type="number"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Stop Price</label>
                      <input
                        type="number"
                        value={orderForm.stopPrice}
                        onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                {/* Order Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOrderSubmit('sell')}
                    disabled={!orderForm.quantity}
                    className="py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
                  >
                    Sell / Short
                  </button>
                  <button
                    onClick={() => handleOrderSubmit('buy')}
                    disabled={!orderForm.quantity}
                    className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
                  >
                    Buy / Long
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SplitPane>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />

      {/* Order Confirmation Modal */}
      {showConfirmOrder && confirmOrderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">Confirm Order</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Side:</span>
                <span className={`font-medium ${confirmOrderData.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {confirmOrderData.side.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{confirmOrderData.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quantity:</span>
                <span className="text-white">{confirmOrderData.quantity} XRP</span>
              </div>
              {confirmOrderData.price && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-white">${confirmOrderData.price}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmOrder(false)}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className="flex-1 py-2 bg-primary hover:bg-primary/90 rounded-lg text-white font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Trading;