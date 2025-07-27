import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Brain, 
  Shield, 
  TrendingUp, 
  Activity, 
  BarChart3,
  ArrowRight,
  Play,
  Eye,
  EyeOff,
  LogIn,
  User,
  Lock,
  Server,
  Wifi,
  Database
} from 'lucide-react';
import { useTrading } from '../contexts/TradingContext';
import StatusPill from '../components/StatusPill';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, activity } = useTrading();
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [infrastructureStatus, setInfrastructureStatus] = useState({
    node: { status: 'online' as const, latency: 12 },
    api: { status: 'online' as const, latency: 45 },
    broker: { status: 'online' as const, latency: 78 },
    websocket: { status: 'online' as const, latency: 23 }
  });

  // Simulate infrastructure status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setInfrastructureStatus(prev => ({
        node: { ...prev.node, latency: Math.floor(Math.random() * 20) + 10 },
        api: { ...prev.api, latency: Math.floor(Math.random() * 50) + 30 },
        broker: { ...prev.broker, latency: Math.floor(Math.random() * 100) + 50 },
        websocket: { ...prev.websocket, latency: Math.floor(Math.random() * 30) + 15 }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning models provide real-time market insights and predictive analytics.",
      color: "from-primary to-blue-600",
      route: "/models"
    },
    {
      icon: Zap,
      title: "Live Trading",
      description: "Ultra-low latency execution with real-time data feeds and instant order processing.",
      color: "from-accent to-teal-600",
      route: "/trading"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Bank-grade security with encrypted connections and redundant infrastructure.",
      color: "from-yellow-500 to-orange-500",
      route: "/risk"
    }
  ];

  const stats = [
    { value: "$2.5B+", label: "Trading Volume", color: "text-primary" },
    { value: "99.9%", label: "Uptime", color: "text-accent" },
    { value: "50K+", label: "Active Users", color: "text-yellow-400" },
    { value: "0.001s", label: "Latency", color: "text-blue-400" }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate login process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any login
      // In production, this would validate against your auth endpoint
      localStorage.setItem('authToken', 'demo-token');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccess = (route: string) => {
    // For demo purposes, allow direct access
    // In production, check authentication first
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-bg-deep text-white overflow-x-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 bg-surface/80 backdrop-blur-xl border-b border-gray-700 sticky top-0"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  MetaTrader Pro
                </h1>
                <p className="text-sm text-gray-400">AI-Powered Trading Platform</p>
              </div>
            </div>

            {/* Infrastructure Status */}
            <div className="hidden md:flex items-center space-x-3">
              <StatusPill 
                status={infrastructureStatus.node.status}
                label="Node"
                latency={infrastructureStatus.node.latency}
              />
              <StatusPill 
                status={infrastructureStatus.api.status}
                label="API"
                latency={infrastructureStatus.api.latency}
              />
              <StatusPill 
                status={infrastructureStatus.broker.status}
                label="Broker"
                latency={infrastructureStatus.broker.latency}
              />
              <StatusPill 
                status={infrastructureStatus.websocket.status}
                label="WebSocket"
                latency={infrastructureStatus.websocket.latency}
              />
            </div>

            {/* CTA */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLogin(true)}
              className="px-6 py-2 bg-primary rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <h2 className="text-5xl md:text-7xl font-bold mb-8">
                <span className="bg-gradient-to-r from-primary via-accent to-blue-400 bg-clip-text text-transparent">
                  Future of Trading
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Experience the next generation of algorithmic trading with our AI-powered platform. 
                Real-time analysis, predictive modeling, and automated execution.
              </p>
              
              {/* Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Institutional-grade infrastructure</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">AI-powered market analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-gray-300">Real-time risk management</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAccess('/dashboard')}
                  className="px-8 py-4 bg-primary rounded-lg text-lg font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <span>Access Platform</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAccess('/trading')}
                  className="px-8 py-4 bg-surface border border-gray-600 rounded-lg text-lg font-semibold hover:bg-gray-700 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Trading</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right - SVG Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Brain className="w-16 h-16 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">AI Trading Bot</div>
                  <div className="text-gray-400">Autonomous Market Analysis</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl font-bold mb-4 text-white">Platform Features</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Professional-grade tools for institutional trading
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                onClick={() => handleQuickAccess(feature.route)}
                className="bg-surface rounded-lg p-8 border border-gray-700 hover:border-primary/50 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-6`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-white">{feature.title}</h3>
                <p className="text-gray-400 mb-6">{feature.description}</p>
                <div className="flex items-center justify-center text-primary hover:text-primary/80 transition-colors">
                  <span className="text-sm font-medium">Explore</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className={`text-4xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl font-bold mb-4 text-white">Quick Access</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Jump directly to any section of the platform
            </p>
          </motion.div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Dashboard', route: '/dashboard', icon: BarChart3 },
              { name: 'Trading', route: '/trading', icon: Zap },
              { name: 'Models', route: '/models', icon: Brain },
              { name: 'Risk', route: '/risk', icon: Shield },
              { name: 'Analytics', route: '/analytics', icon: TrendingUp },
              { name: 'Settings', route: '/settings', icon: Activity }
            ].map((item, index) => (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => handleQuickAccess(item.route)}
                className="bg-surface rounded-lg p-6 border border-gray-700 hover:border-primary/50 transition-all duration-300 text-center"
              >
                <item.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-sm font-medium text-gray-300">{item.name}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-surface rounded-lg p-8 max-w-md w-full border border-gray-700"
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
              <p className="text-gray-400">Sign in to access your trading platform</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full py-3 bg-primary rounded-lg text-white font-semibold hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowLogin(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 bg-surface border-t border-gray-700 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              © 2024 MetaTrader Pro. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 