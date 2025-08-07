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
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bot,
  Cpu
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
    <div className={`h-screen bg-futuristic text-slate-100 flex flex-col transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* V2: Enhanced Header */}
      <motion.div 
        className="flex items-center justify-between p-6 glass-dark border-b border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-gradient flex items-center">
            <Cpu className="w-6 h-6 mr-3 text-indigo-400" />
            AI Trading Terminal
          </h1>
          <div className="flex items-center space-x-3 glass px-4 py-2 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">XRP/USD</span>
            <span className="text-lg font-bold text-green-400">$0.25866172</span>
            <div className="flex items-center text-green-400">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span className="text-sm font-semibold">+2.34%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
            <Search className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </button>
          <button className="p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </button>
        </div>
      </motion.div>

      {/* V2: Enhanced Bot State Banner */}
      <motion.div 
        className="glass-dark border-b border-white/10 p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <span className="text-sm text-slate-400 font-medium">AI Bot State:</span>
          </div>
          {(['auto', 'semi', 'manual'] as const).map((state) => (
            <button
              key={state}
              onClick={() => setBotState(state)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                botState === state
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'glass text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* V2: Enhanced Main Content */}
      <div className="flex-1 overflow-hidden">
        <SplitPane defaultSizes={[70, 30]}>
          {/* V2: Enhanced Left Panel - Chart */}
          <div className="flex flex-col h-full">
            {/* V2: Enhanced TradingView Widget Placeholder */}
            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
              <div className="text-center relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Live Trading Chart</h3>
                <p className="text-slate-400 mb-4">Real-time price chart with AI indicators</p>
                <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>AI Signals</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <span>Volume</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                    <span>Predictions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* V2: Enhanced Depth & Tape */}
            <div className="h-48 glass-dark border-t border-white/10">
              <div className="grid grid-cols-2 h-full">
                {/* V2: Enhanced Order Book */}
                <div className="border-r border-white/10">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-gradient">Order Book</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="grid grid-cols-3 text-xs text-slate-400 mb-3 font-medium">
                      <span>Size</span>
                      <span>Price</span>
                      <span>Total</span>
                    </div>
                    {orderBookData.asks.slice().reverse().map((ask, index) => (
                      <motion.div 
                        key={`ask-${index}`} 
                        className="grid grid-cols-3 text-xs hover:bg-white/5 p-1 rounded transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className="text-red-400 font-medium">{ask.size.toFixed(1)}</span>
                        <span className="text-red-400 font-medium">{ask.price.toFixed(8)}</span>
                        <span className="text-slate-400">{ask.total.toFixed(1)}</span>
                      </motion.div>
                    ))}
                    <div className="border-t border-white/20 my-2"></div>
                    {orderBookData.bids.map((bid, index) => (
                      <motion.div 
                        key={`bid-${index}`} 
                        className="grid grid-cols-3 text-xs hover:bg-white/5 p-1 rounded transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index + 5) * 0.05 }}
                      >
                        <span className="text-green-400 font-medium">{bid.size.toFixed(1)}</span>
                        <span className="text-green-400 font-medium">{bid.price.toFixed(8)}</span>
                        <span className="text-slate-400">{bid.total.toFixed(1)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* V2: Enhanced Trade History */}
                <div>
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-gradient">Recent Trades</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="grid grid-cols-3 text-xs text-slate-400 mb-3 font-medium">
                      <span>Time</span>
                      <span>Price</span>
                      <span>Size</span>
                    </div>
                    {tradeHistory.map((trade, index) => (
                      <motion.div 
                        key={index} 
                        className="grid grid-cols-3 text-xs hover:bg-white/5 p-1 rounded transition-colors"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <span className="text-slate-400">{trade.time}</span>
                        <span className={trade.side === 'buy' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          {trade.price.toFixed(8)}
                        </span>
                        <span className="text-slate-400">{trade.size.toFixed(1)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* V2: Enhanced Right Panel - Order Ticket */}
          <div className="flex flex-col h-full glass-dark">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-gradient">Order Ticket</h2>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* V2: Enhanced Order Type Tabs */}
              <div className="flex space-x-2 glass p-2 rounded-xl">
                {(['market', 'limit', 'stop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      orderType === type
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* V2: Enhanced Order Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Quantity</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-3 text-sm text-slate-400 font-medium">XRP</div>
                  </div>
                </div>

                {orderType === 'limit' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Price</label>
                    <input
                      type="number"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {orderType === 'stop' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-3">Price</label>
                      <input
                        type="number"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                        className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-3">Stop Price</label>
                      <input
                        type="number"
                        value={orderForm.stopPrice}
                        onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                        className="w-full px-4 py-3 glass border border-white/20 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                {/* V2: Enhanced Order Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => handleOrderSubmit('sell')}
                    disabled={!orderForm.quantity}
                    className="py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Sell / Short</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleOrderSubmit('buy')}
                    disabled={!orderForm.quantity}
                    className="py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Buy / Long</span>
                    </span>
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

      {/* V2: Enhanced Order Confirmation Modal */}
      {showConfirmOrder && confirmOrderData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-futuristic p-8 max-w-md w-full mx-4 border border-white/20"
          >
            <h3 className="text-2xl font-bold mb-6 text-gradient">Confirm Order</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-3 glass rounded-lg">
                <span className="text-slate-400 font-medium">Side:</span>
                <span className={`font-bold ${confirmOrderData.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {confirmOrderData.side.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 glass rounded-lg">
                <span className="text-slate-400 font-medium">Type:</span>
                <span className="text-white font-bold">{confirmOrderData.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center p-3 glass rounded-lg">
                <span className="text-slate-400 font-medium">Quantity:</span>
                <span className="text-white font-bold">{confirmOrderData.quantity} XRP</span>
              </div>
              {confirmOrderData.price && (
                <div className="flex justify-between items-center p-3 glass rounded-lg">
                  <span className="text-slate-400 font-medium">Price:</span>
                  <span className="text-white font-bold">${confirmOrderData.price}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowConfirmOrder(false)}
                className="flex-1 py-3 glass hover:bg-white/10 rounded-xl text-white font-semibold transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl text-white font-bold transition-all duration-300 shadow-lg"
              >
                Confirm Order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Trading;