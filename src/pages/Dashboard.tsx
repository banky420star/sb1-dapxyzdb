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
  Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';

// Mock data for demonstration
const equityData = [
  { date: 'Jan', value: 10000 },
  { date: 'Feb', value: 12000 },
  { date: 'Mar', value: 11500 },
  { date: 'Apr', value: 13500 },
  { date: 'May', value: 14200 },
  { date: 'Jun', value: 15800 },
  { date: 'Jul', value: 16500 },
];

const marketData = [
  { name: 'DJA', value: 32778.64, change: 293, changePercent: 0.90, color: 'text-primary' },
  { name: 'NAS', value: 32778.64, change: -78.81, changePercent: -0.24, color: 'text-red-500' },
  { name: 'S&P', value: 39345.64, change: 4.00, changePercent: 0.10, color: 'text-green-500' },
];

const watchlistData = [
  { symbol: 'PLTR', price: 124.20, change: 4.48, changePercent: 3.73 },
  { symbol: 'ETSY', price: 221.11, change: -2.42, changePercent: -1.08 },
  { symbol: 'PINS', price: 80.49, change: 0.32, changePercent: 0.40 },
  { symbol: 'SNOW', price: 37.85, change: -0.78, changePercent: -2.02 },
];

const recentTransactions = [
  { symbol: 'PINS', type: 'Buy', quantity: 15, price: 71.75, total: 3376.5 },
  { symbol: 'TWLO', type: 'Sell', quantity: 12, price: 369, total: 3320.5 },
  { symbol: 'PLTR', type: 'Buy', quantity: 45, price: 27.05, total: 2300.5 },
  { symbol: 'SQ', type: 'Buy', quantity: 10, price: 242, total: 2420.5 },
];

const Dashboard: React.FC = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('1M');

  const kpiData = [
    {
      title: 'Portfolio Value',
      value: showBalance ? '$10,581.50' : '••••••••',
      change: '+2,384.50',
      changePercent: '+29.1%',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Total Invested',
      value: showBalance ? '$8,210.50' : '••••••••',
      change: '+1,020.11',
      changePercent: '+14.2%',
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Available Funds',
      value: showBalance ? '$2,371.00' : '••••••••',
      change: '+456.23',
      changePercent: '+23.8%',
      icon: Zap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Daily P&L',
      value: showBalance ? '+$156.78' : '••••••••',
      change: '+12.45',
      changePercent: '+8.6%',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-deep text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">A quick preview of what's going on with markets</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">22</span>
          </button>
          <button 
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showBalance ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
          </button>
          <button className="px-6 py-2 bg-primary rounded-lg hover:bg-primary/90 transition-colors font-semibold">
            Trade
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-surface rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${kpi.changePercent.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {kpi.changePercent}
                </div>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">{kpi.title}</p>
              <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
              <p className={`text-sm ${kpi.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {kpi.change}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Overview */}
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-xl font-semibold mb-4">US Market Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketData.map((market) => (
                <div key={market.name} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{market.name}</span>
                    <div className={`text-sm font-medium ${market.color}`}>
                      {market.changePercent > 0 ? '+' : ''}{market.changePercent}%
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">{market.value.toLocaleString()}</div>
                  <div className={`text-sm ${market.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {market.change > 0 ? '+' : ''}{market.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equity Curve */}
          <div className="bg-surface rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Portfolio Performance</h2>
              <div className="flex space-x-2">
                {['1M', '6M', '1Y', 'ALL'].map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setActiveTimeframe(timeframe)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      activeTimeframe === timeframe
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E76FD" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0E76FD" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0E76FD" 
                    strokeWidth={2}
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-surface rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Overview</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Account</span>
                <span className="text-white">558WAS52</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Portfolio Value</span>
                <span className="text-white">$10,581.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Invested</span>
                <span className="text-white">$8,210.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Available Funds</span>
                <span className="text-green-500">+$1,020.11</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Daily P&L</span>
                <span className="text-green-500">+$156.78</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Upcoming Dividends</span>
                <span className="text-white">$56.70</span>
              </div>
            </div>
          </div>

          {/* Watchlist */}
          <div className="bg-surface rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Watchlist</h3>
            <div className="space-y-3">
              {watchlistData.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{item.symbol}</div>
                    <div className="text-sm text-gray-400">${item.price}</div>
                  </div>
                  <div className={`text-sm font-medium ${item.changePercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-surface rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Latest Transactions</h3>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={`${tx.symbol}-${tx.type}`} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{tx.symbol}</div>
                    <div className="text-sm text-gray-400">{tx.type} • {tx.quantity} @ ${tx.price}</div>
                  </div>
                  <div className="text-sm font-medium text-white">${tx.total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;