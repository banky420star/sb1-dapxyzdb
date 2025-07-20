import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  Brain, 
  Shield, 
  TrendingUp, 
  Settings, 
  Bell,
  Menu,
  X,
  Power,
  AlertTriangle,
  Bot,
  Moon,
  Sun,
  Activity,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react'
import { useTradingContext } from '../contexts/TradingContext'
import StatusIndicator from './StatusIndicator'
import AlertPanel from './AlertPanel'
import AINotificationPanel from './AINotificationPanel'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, description: 'System overview' },
  { name: 'Trading', href: '/trading', icon: TrendingUp, description: 'Live trading' },
  { name: 'Models', href: '/models', icon: Brain, description: 'AI models' },
  { name: 'Risk', href: '/risk', icon: Shield, description: 'Risk management' },
  { name: 'Analytics', href: '/analytics', icon: Activity, description: 'Performance analytics' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'System settings' },
]

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [aiNotificationsOpen, setAINotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const location = useLocation()
  const { state, toggleTradingMode, emergencyStop } = useTradingContext()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const unreadAlerts = state.alerts.filter(alert => !alert.read).length
  const unreadAINotifications = state.aiNotifications.filter(not => !not.read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-80 flex-col glass-card">
          <div className="flex h-20 items-center justify-between px-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AlgoTrader Pro</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-Powered Trading</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="mr-4 h-5 w-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
          
          {/* System Status */}
          <div className="p-4 border-t border-white/20">
            <StatusIndicator />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col flex-grow glass-card">
          <div className="flex items-center h-20 px-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AlgoTrader Pro</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">AI-Powered Trading</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="mr-4 h-5 w-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
          
          {/* System Status */}
          <div className="p-4 border-t border-white/20">
            <StatusIndicator />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Top bar */}
        <div className="sticky top-0 z-40 glass-card border-b border-white/20">
          <div className="flex h-20 items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {state.systemStatus === 'online' ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {state.systemStatus}
                </span>
              </div>

              {/* Trading Mode Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mode:</span>
                <button
                  onClick={toggleTradingMode}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    state.tradingMode === 'live'
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  }`}
                >
                  {state.tradingMode.toUpperCase()}
                </button>
              </div>

              {/* Emergency Stop */}
              <button
                onClick={emergencyStop}
                className="btn-danger px-4 py-2 text-sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Stop
              </button>

              {/* Alerts */}
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="relative p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-white/10"
              >
                <Bell className="h-6 w-6" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs flex items-center justify-center font-semibold">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>

              {/* AI Notifications */}
              <button
                onClick={() => setAINotificationsOpen(!aiNotificationsOpen)}
                className="relative p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-white/10"
              >
                <Bot className="h-6 w-6" />
                {unreadAINotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center font-semibold">
                    {unreadAINotifications}
                  </span>
                )}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(dm => !dm)}
                className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors rounded-xl hover:bg-white/10"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="p-6">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Alert Panel */}
      {alertsOpen && (
        <AlertPanel 
          alerts={state.alerts} 
          onClose={() => setAlertsOpen(false)} 
        />
      )}

      {/* AI Notification Panel */}
      {aiNotificationsOpen && (
        <AINotificationPanel 
          notifications={state.aiNotifications} 
          onClose={() => setAINotificationsOpen(false)} 
        />
      )}
    </div>
  )
}