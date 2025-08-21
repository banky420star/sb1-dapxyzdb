import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Shield, 
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  ChevronDown,
  Grid3X3,
  Monitor,
  Maximize2,
  Minimize2,
  Bell,
  Search,
  User,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWidgets, setShowWidgets] = useState(true);
  const [multiMonitor, setMultiMonitor] = useState(false);
  const { state, refresh } = useTradingContext();
  const location = useLocation();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auto-refresh management
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Enhanced navigation with grouping
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: TrendingUp,
      description: 'Overview & KPIs'
    },
    { 
      name: 'Trading', 
      href: '/trading', 
      icon: Activity,
      description: 'Positions & Orders'
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3,
      description: 'Performance & Charts'
    },
    { 
      name: 'AI & Risk', 
      href: '/models', 
      icon: Shield,
      description: 'Models & Risk Mgmt'
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      description: 'Configuration'
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const getStatusColor = () => {
    return state.systemStatus === 'online' ? 'text-success' : 'text-error';
  };

  const getStatusIcon = () => {
    return state.systemStatus === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  const getModeBadge = () => {
    const isLive = state.tradingMode === 'live';
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
        isLive ? 'badge-live' : 'badge-paper'
      }`}>
        {state.tradingMode.toUpperCase()}
      </span>
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`min-h-screen bg-bg-primary transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-bg-secondary border-r border-border-primary transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <img src="/logo.svg" alt="MetaTrader" className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold text-text-primary">MetaTrader</h1>
              <p className="text-xs text-text-tertiary">Autonomous Trading</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-text-tertiary hover:text-text-primary focus-ring"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enhanced Navigation */}
        <nav className="mt-6 px-3 flex-1">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-brand-primary text-white shadow-lg'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className={`text-xs mt-0.5 ${
                      isActive(item.href) ? 'text-white/70' : 'text-text-tertiary'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                  {isActive(item.href) && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-border-primary">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 px-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full flex items-center px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                <Search className="w-4 h-4 mr-3" />
                Search Markets
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                <Bell className="w-4 h-4 mr-3" />
                Notifications
              </button>
              <button className="w-full flex items-center px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                <HelpCircle className="w-4 h-4 mr-3" />
                Help & Support
              </button>
            </div>
          </div>
        </nav>

        {/* Enhanced System Status */}
        <div className="p-4 border-t border-border-primary">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary">System Status</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-xs font-medium ${getStatusColor()}`}>
                  {state.systemStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary">Trading Mode</span>
              {getModeBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary">Widgets</span>
              <button
                onClick={() => setShowWidgets(!showWidgets)}
                className={`p-1 rounded text-xs ${
                  showWidgets ? 'bg-success text-white' : 'bg-bg-tertiary text-text-secondary'
                }`}
              >
                <Grid3X3 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main content */}
      <div className="lg:pl-72">
        {/* Enhanced Header */}
        <header className="sticky top-0 z-30 bg-bg-secondary border-b border-border-primary">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-text-tertiary hover:text-text-primary focus-ring"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Enhanced Header content */}
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-4">
                <span className="text-sm text-text-secondary">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-text-tertiary">Multi-Monitor:</span>
                  <button
                    onClick={() => setMultiMonitor(!multiMonitor)}
                    className={`p-1 rounded text-xs ${
                      multiMonitor ? 'bg-brand-primary text-white' : 'bg-bg-tertiary text-text-secondary'
                    }`}
                    title="Toggle multi-monitor mode"
                  >
                    <Monitor className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Header actions */}
            <div className="flex items-center space-x-2">
              {/* Auto-refresh controls */}
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`p-2 rounded-md text-sm font-medium transition-colors ${
                    autoRefresh 
                      ? 'bg-success text-white' 
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                  title={`Auto-refresh ${autoRefresh ? 'enabled' : 'disabled'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                </button>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-bg-tertiary text-text-primary text-xs rounded-md px-2 py-1 border border-border-primary focus-ring"
                  >
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                  </select>
                )}
              </div>

              {/* Manual refresh */}
              <button
                onClick={refresh}
                className="p-2 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary focus-ring"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary focus-ring"
                title={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary focus-ring"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* User menu */}
              <button className="p-2 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary focus-ring">
                <User className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Enhanced Main content area */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className={`max-w-7xl mx-auto ${multiMonitor ? 'grid grid-cols-1 xl:grid-cols-2 gap-6' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;