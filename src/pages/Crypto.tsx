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
import CommandPalette, { Command } from '../components/CommandPalette';
import bybitApi, { BybitMarketData, BybitOrderBook, BybitTrade } from '../services/bybitApi';

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
  const handleOrderFormChange = (
    field: 'quantity' | 'price' | 'stopPrice',
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setOrderForm(prev => ({ ...prev, [field]: event.target.value }));
  };
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
  
  // Real-time data state
  const [marketData, setMarketData] = useState<BybitMarketData | null>(null);
  const [orderBook, setOrderBook] = useState<BybitOrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<BybitTrade[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Live prices for all cryptos
  const [livePrices, setLivePrices] = useState<Record<string, BybitMarketData>>({});

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Bybit WebSocket subscriptions
  useEffect(() => {
    // Subscribe to real-time data
    const unsubscribeTicker = bybitApi.subscribeToTicker(selectedCrypto, (data) => {
      if (data && data.length > 0) {
        setMarketData(data[0]);
        setIsConnected(true);
      }
    });

    const unsubscribeOrderBook = bybitApi.subscribeToOrderBook(selectedCrypto, (data) => {
      setOrderBook(data);
    });

    const unsubscribeTrades = bybitApi.subscribeToTrades(selectedCrypto, (data) => {
      setRecentTrades(data.slice(0, 10)); // Keep last 10 trades
    });

    // Load initial data
    const loadInitialData = async () => {
      try {
        const [tickers, orderBookData, tradesData] = await Promise.all([
          bybitApi.getTickers(),
          bybitApi.getOrderBook(selectedCrypto),
          bybitApi.getRecentTrades(selectedCrypto)
        ]);

        const currentTicker = tickers.find(t => t.symbol === selectedCrypto);
        if (currentTicker) {
          setMarketData(currentTicker);
        }
        setOrderBook(orderBookData);
        setRecentTrades(tradesData.slice(0, 10));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();

    // Cleanup subscriptions
    return () => {
      unsubscribeTicker();
      unsubscribeOrderBook();
      unsubscribeTrades();
    };
  }, [selectedCrypto]);

  // Command palette actions
  const commands: Command[] = [
    {
      id: 'buy-btc',
      title: 'Buy Bitcoin',
      description: 'Buy 0.001 BTC at market price',
      action: () => console.log('Buy Bitcoin'),
      category: 'trading'
    },
    {
      id: 'sell-eth',
      title: 'Sell Ethereum',
      description: 'Sell 0.01 ETH at market price',
      action: () => console.log('Sell Ethereum'),
      category: 'trading'
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

  // Fetch live prices for all cryptos
  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        const allPrices: Record<string, BybitMarketData> = {};
        
        // Fetch prices for all cryptos
        for (const symbol of Object.keys(cryptoData)) {
          try {
            const tickers = await bybitApi.getTickers();
            const ticker = tickers.find(t => t.symbol === symbol);
            if (ticker) {
              allPrices[symbol] = ticker;
            }
          } catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
          }
        }
        
        setLivePrices(allPrices);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to fetch all prices:', error);
      }
    };

    // Fetch initial prices
    fetchAllPrices();

    // Set up interval to refresh prices every 5 seconds
    const interval = setInterval(fetchAllPrices, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleOrderSubmit = async (side: 'buy' | 'sell') => {
    if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const orderData = {
      symbol: selectedCrypto,
      side,
      orderType,
      qty: orderForm.quantity,
      price: orderType === 'market' ? undefined : orderForm.price,
      stopPrice: orderType === 'stop' ? orderForm.stopPrice : undefined
    };
    
    setConfirmOrderData(orderData);
    setShowConfirmOrder(true);
  };

  const confirmOrder = async () => {
    if (!confirmOrderData) return;

    try {
      // Place order via Bybit API (through backend)
      const result = await bybitApi.placeOrder(confirmOrderData);
      console.log('Order placed successfully:', result);
      
      // Reset form
      setShowConfirmOrder(false);
      setOrderForm({ quantity: '', price: '', stopPrice: '' });
      setConfirmOrderData(null);
      
      // Show success message
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 glass-dark border-b border-white/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-gradient flex items-center">
            <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-orange-400" />
            <span className="hidden sm:inline">Crypto Trading Terminal</span>
            <span className="sm:hidden">Crypto Terminal</span>
          </h1>
          <div className="flex items-center space-x-2 sm:space-x-3 glass px-3 sm:px-4 py-2 rounded-xl">
            <span className="text-xs sm:text-sm text-slate-400 font-medium">{selectedCrypto}</span>
            <span className="text-sm sm:text-lg font-bold text-green-400">
              ${marketData ? parseFloat(marketData.lastPrice).toLocaleString() : cryptoData[selectedCrypto as keyof typeof cryptoData].price.toLocaleString()}
            </span>
            <div className={`flex items-center ${marketData ? (parseFloat(marketData.price24hPcnt) >= 0 ? 'text-green-400' : 'text-red-400') : (cryptoData[selectedCrypto as keyof typeof cryptoData].change >= 0 ? 'text-green-400' : 'text-red-400')}`}>
              {marketData ? (parseFloat(marketData.price24hPcnt) >= 0 ? (
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              )) : (cryptoData[selectedCrypto as keyof typeof cryptoData].change >= 0 ? (
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              ))}
              <span className="text-xs sm:text-sm font-semibold">
                {marketData ? Math.abs(parseFloat(marketData.price24hPcnt)).toFixed(2) : Math.abs(cryptoData[selectedCrypto as keyof typeof cryptoData].change)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 px-2 sm:px-3 py-1.5 glass rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-xs sm:text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <button className="p-2 sm:p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </button>
          <button className="p-2 sm:p-3 rounded-xl glass hover:bg-white/10 transition-all duration-300 group">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </button>
        </div>
      </motion.div>

      {/* Bot State Banner */}
      <motion.div 
        className="px-4 sm:px-6 py-3 glass-dark border-b border-white/10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm text-slate-300">Engine: {cryptoStatus.engine}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-300">${cryptoStatus.balance.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-300">{cryptoStatus.positions} pos</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              <span className="text-xs sm:text-sm text-green-400">+${cryptoStatus.pnl.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
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
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left Panel - Chart and Order Book */}
          <div className="flex flex-col h-full lg:w-2/3">
            {/* Chart Area */}
            <div className="flex-1 min-h-64 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10"></div>
              <div className="text-center relative z-10 p-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-r from-orange-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Live Crypto Chart</h3>
                <p className="text-slate-400 mb-4 text-sm sm:text-base">Real-time {selectedCrypto} price chart with AI indicators</p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1 sm:mr-2"></div>
                    <span>AI Signals</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-1 sm:mr-2"></div>
                    <span>Volume</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-1 sm:mr-2"></div>
                    <span>Predictions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Book and Trade History */}
            <div className="h-48 sm:h-64 flex flex-col sm:flex-row">
              {/* Order Book */}
              <div className="flex-1 p-3 sm:p-4 glass-dark border-b sm:border-b-0 sm:border-r border-white/10">
                <h3 className="text-base sm:text-lg font-bold text-gradient mb-3 sm:mb-4">Order Book</h3>
                <div className="space-y-1">
                  {orderBookData.asks.slice().reverse().map((ask, index) => (
                    <div key={`ask-${index}`} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-red-400">{ask.price.toLocaleString()}</span>
                      <span className="text-slate-400">{ask.size.toFixed(3)}</span>
                      <span className="text-slate-500 hidden sm:inline">{ask.total.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/20 my-1 sm:my-2"></div>
                  {orderBookData.bids.map((bid, index) => (
                    <div key={`bid-${index}`} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-green-400">{bid.price.toLocaleString()}</span>
                      <span className="text-slate-400">{bid.size.toFixed(3)}</span>
                      <span className="text-slate-500 hidden sm:inline">{bid.total.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade History */}
              <div className="flex-1 p-3 sm:p-4 glass-dark">
                <h3 className="text-base sm:text-lg font-bold text-gradient mb-3 sm:mb-4">Recent Trades</h3>
                <div className="space-y-1">
                  {tradeHistory.map((trade, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm">
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
          <div className="flex flex-col h-full glass-dark lg:w-1/3">
            {/* Crypto Selection */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-gradient mb-3">Select Crypto</h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(cryptoData).map(([symbol, data]) => {
                  const livePrice = livePrices[symbol];
                  const currentPrice = livePrice ? parseFloat(livePrice.lastPrice) : data.price;
                  const currentChange = livePrice ? parseFloat(livePrice.price24hPcnt) * 100 : data.change;
                  
                  return (
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
                          <div className="text-sm font-bold">${currentPrice.toLocaleString()}</div>
                          <div className={`text-xs ${currentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {currentChange >= 0 ? '+' : ''}{currentChange.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                    onChange={handleOrderFormChange('quantity')}
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
                      onChange={handleOrderFormChange('price')}
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
                      onChange={handleOrderFormChange('stopPrice')}
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
        </div>
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
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
