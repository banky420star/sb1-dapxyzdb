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
  Cpu,
  Bitcoin,
  Coins,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import SplitPane from '../components/SplitPane';
import CommandPalette from '../components/CommandPalette';

// Crypto-specific data
const cryptoData = {
  BTCUSDT: { name: 'Bitcoin', price: 43250.67, change: 2.34, volume: 2847500000, marketCap: 847500000000 },
  ETHUSDT: { name: 'Ethereum', price: 2650.45, change: -1.23, volume: 1850000000, marketCap: 318000000000 },
  ADAUSDT: { name: 'Cardano', price: 0.485, change: 5.67, volume: 450000000, marketCap: 17000000000 },
  DOTUSDT: { name: 'Polkadot', price: 7.23, change: 3.45, volume: 320000000, marketCap: 8500000000 },
  SOLUSDT: { name: 'Solana', price: 98.45, change: -2.12, volume: 890000000, marketCap: 42000000000 },
  MATICUSDT: { name: 'Polygon', price: 0.89, change: 1.78, volume: 280000000, marketCap: 8500000000 }
};

const orderBookData = {
  bids: [
    { price: 43250.67, size: 0.125, total: 0.125 },
    { price: 43245.50, size: 0.089, total: 0.214 },
    { price: 43240.00, size: 0.156, total: 0.370 },
    { price: 43235.25, size: 0.234, total: 0.604 },
    { price: 43230.00, size: 0.189, total: 0.793 },
  ],
  asks: [
    { price: 43255.00, size: 0.098, total: 0.098 },
    { price: 43260.25, size: 0.145, total: 0.243 },
    { price: 43265.50, size: 0.210, total: 0.453 },
    { price: 43270.75, size: 0.178, total: 0.631 },
    { price: 43275.00, size: 0.234, total: 0.865 },
  ]
};

const tradeHistory = [
  { time: '14:32:15', price: 43255.00, size: 0.0125, side: 'buy' },
  { time: '14:32:12', price: 43250.67, size: 0.0089, side: 'sell' },
  { time: '14:32:08', price: 43255.00, size: 0.0234, side: 'buy' },
  { time: '14:32:05', price: 43250.67, size: 0.0156, side: 'sell' },
  { time: '14:32:01', price: 43255.00, size: 0.0445, side: 'buy' },
];

const Crypto: React.FC = () => {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('BTCUSDT');
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
  const [cryptoStatus, setCryptoStatus] = useState({
    engine: 'running',
    balance: 25000,
    positions: 2,
    pnl: 1250,
    risk: 'low'
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Command palette actions
  const commands = [
    {
      id: 'buy-btc',
      title: 'Buy Bitcoin',
      description: 'Buy 0.001 BTC at market price',
      action: () => console.log('Buy Bitcoin'),
      category: 'crypto'
    },
    {
      id: 'sell-eth',
      title: 'Sell Ethereum',
      description: 'Sell 0.01 ETH at market price',
      action: () => console.log('Sell Ethereum'),
      category: 'crypto'
    },
    {
      id: 'pause-crypto-bot',
      title: 'Pause Crypto Bot',
      description: 'Pause automated crypto trading',
      action: () => setBotState('manual'),
      category: 'bot'
    },
    {
      id: 'switch-crypto-strategy',
      title: 'Switch Strategy',
      description: 'Change crypto trading strategy',
      action: () => console.log('Switch strategy'),
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
      symbol: selectedCrypto,
      side,
      type: orderType,
      quantity: parseFloat(orderForm.quantity),
      price: orderType === 'market' ? undefined : parseFloat(orderForm.price),
      stopPrice: orderType === 'stop' ? parseFloat(orderForm.stopPrice) : undefined
    };
    
    setConfirmOrderData(orderData);
    setShowConfirmOrder(true);
  };

  const confirmOrder = () => {
    console.log('Order confirmed:', confirmOrderData);
    setShowConfirmOrder(false);
    setOrderForm({ quantity: '', price: '', stopPrice: '' });
  };

  const getCryptoIcon = (symbol: string) => {
    switch (symbol) {
      case 'BTCUSDT': return <Bitcoin className="w-5 h-5" />;
      case 'ETHUSDT': return <Coins className="w-5 h-5" />;
      default: return <Coins className="w-5 h-5" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
            <Bitcoin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Crypto Terminal</h2>
          <p className="text-slate-400">Connecting to Bybit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between p-6 glass-dark border-b border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-gradient flex items-center">
            <Bitcoin className="w-6 h-6 mr-3 text-orange-400" />
            Crypto Trading Terminal
          </h1>
          <div className="flex items-center space-x-3 glass px-4 py-2 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">{selectedCrypto}</span>
            <span className="text-lg font-bold text-green-400">${cryptoData[selectedCrypto as keyof typeof cryptoData].price.toLocaleString()}</span>
            <div className={`flex items-center ${cryptoData[selectedCrypto as keyof typeof cryptoData].change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {cryptoData[selectedCrypto as keyof typeof cryptoData].change >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span className="text-sm font-semibold">{Math.abs(cryptoData[selectedCrypto as keyof typeof cryptoData].change)}%</span>
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

      {/* Bot State Banner */}
      <motion.div 
        className="px-6 py-3 glass-dark border-b border-white/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300">Crypto Engine: {cryptoStatus.engine}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Balance: ${cryptoStatus.balance.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Positions: {cryptoStatus.positions}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">P&L: +${cryptoStatus.pnl.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className={`text-sm ${getRiskColor(cryptoStatus.risk)}`}>Risk: {cryptoStatus.risk}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setBotState(botState === 'auto' ? 'manual' : 'auto')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${
                botState === 'auto' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                  : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
              }`}
            >
              {botState === 'auto' ? 'AUTO' : 'MANUAL'}
            </button>
            <button className="p-2 rounded-lg glass hover:bg-white/10 transition-all duration-300">
              <Bell className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <SplitPane defaultSizes={[70, 30]}>
          {/* Left Panel - Chart and Order Book */}
          <div className="flex flex-col h-full">
            {/* Chart Area */}
            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10"></div>
              <div className="text-center relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Live Crypto Chart</h3>
                <p className="text-slate-400 mb-4">Real-time {selectedCrypto} price chart with AI indicators</p>
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

            {/* Order Book and Trade History */}
            <div className="h-64 flex">
              {/* Order Book */}
              <div className="flex-1 p-4 glass-dark border-r border-white/10">
                <h3 className="text-lg font-bold text-gradient mb-4">Order Book</h3>
                <div className="space-y-1">
                  {orderBookData.asks.slice().reverse().map((ask, index) => (
                    <div key={`ask-${index}`} className="flex justify-between text-sm">
                      <span className="text-red-400">{ask.price.toLocaleString()}</span>
                      <span className="text-slate-400">{ask.size.toFixed(3)}</span>
                      <span className="text-slate-500">{ask.total.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/20 my-2"></div>
                  {orderBookData.bids.map((bid, index) => (
                    <div key={`bid-${index}`} className="flex justify-between text-sm">
                      <span className="text-green-400">{bid.price.toLocaleString()}</span>
                      <span className="text-slate-400">{bid.size.toFixed(3)}</span>
                      <span className="text-slate-500">{bid.total.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade History */}
              <div className="flex-1 p-4 glass-dark">
                <h3 className="text-lg font-bold text-gradient mb-4">Recent Trades</h3>
                <div className="space-y-1">
                  {tradeHistory.map((trade, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-slate-400">{trade.time}</span>
                      <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {trade.price.toLocaleString()}
                      </span>
                      <span className="text-slate-400">{trade.size.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Order Ticket and Crypto List */}
          <div className="flex flex-col h-full glass-dark">
            {/* Crypto Selection */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-gradient mb-3">Select Crypto</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(cryptoData).map(([symbol, data]) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedCrypto(symbol)}
                    className={`p-3 rounded-lg text-left transition-all duration-300 ${
                      selectedCrypto === symbol 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                        : 'glass hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCryptoIcon(symbol)}
                        <span className="font-semibold">{symbol.replace('USDT', '')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">${data.price.toLocaleString()}</div>
                        <div className={`text-xs ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.change >= 0 ? '+' : ''}{data.change}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Order Ticket */}
            <div className="flex-1 p-4">
              <h2 className="text-lg font-bold text-gradient mb-4">Order Ticket</h2>
              
              {/* Order Type Tabs */}
              <div className="flex space-x-2 glass p-2 rounded-xl mb-4">
                {(['market', 'limit', 'stop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      orderType === type
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Order Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    placeholder="0.001"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {orderType !== 'market' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
                    <input
                      type="number"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                      placeholder="43250.00"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {orderType === 'stop' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Stop Price</label>
                    <input
                      type="number"
                      value={orderForm.stopPrice}
                      onChange={(e) => setOrderForm({ ...orderForm, stopPrice: e.target.value })}
                      placeholder="43000.00"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Order Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOrderSubmit('buy')}
                    className="py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Buy</span>
                  </button>
                  <button
                    onClick={() => handleOrderSubmit('sell')}
                    className="py-3 px-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>Sell</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SplitPane>
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* Order Confirmation Modal */}
      {showConfirmOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Confirm Order</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Symbol:</span>
                <span className="text-white font-semibold">{confirmOrderData?.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Side:</span>
                <span className={`font-semibold ${confirmOrderData?.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {confirmOrderData?.side?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="text-white font-semibold">{confirmOrderData?.type?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity:</span>
                <span className="text-white font-semibold">{confirmOrderData?.quantity}</span>
              </div>
              {confirmOrderData?.price && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Price:</span>
                  <span className="text-white font-semibold">${confirmOrderData?.price}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmOrder(false)}
                className="flex-1 py-2 px-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
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

export default Crypto; 