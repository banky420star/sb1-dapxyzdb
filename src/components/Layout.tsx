import React, { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTrading } from '../contexts/TradingContext'
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
  Zap,
  Home,
  BarChart,
  AlertCircle
} from 'lucide-react'
import StatusIndicator from './StatusIndicator'
import AlertPanel from './AlertPanel'
import AINotificationPanel from './AINotificationPanel'
import Logo from './Logo'

interface LayoutProps {
  children?: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, description: 'System overview & metrics' },
  { name: 'Trading', href: '/trading', icon: Zap, description: 'Live trading & signals' },
  { name: 'Models', href: '/models', icon: Brain, description: 'AI training & visualization' },
  { name: 'Risk', href: '/risk', icon: Shield, description: 'Risk management & limits' },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp, description: 'Performance analytics' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'System configuration' },
]

// Mobile navigation with fewer items
const mobileNavigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Trading', href: '/trading', icon: Zap },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [aiNotificationsOpen, setAINotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true) // Default to dark mode
  const location = useLocation()
  const { activity, isConnected } = useTrading()
  const [trainingActive, setTrainingActive] = useState(false)

  // Calculate global training progress
  const getGlobalProgress = () => {
    const activeModels = Object.values(activity || {}).filter(a => a?.status === 'training')
    if (activeModels.length === 0) return 0
    
    const totalProgress = activeModels.reduce((sum, model) => {
      return sum + (model.epoch / model.epochs)
    }, 0)
    
    return totalProgress / activeModels.length
  }

  const globalProgress = getGlobalProgress()
  const hasActiveTraining = Object.values(activity || {}).some(a => a?.status === 'training')

  // Mock state for alerts since we don't have it in TradingContext yet
  const state = {
    alerts: [] as Array<{read: boolean}>,
    aiNotifications: [] as Array<{read: boolean}>
  }

  useEffect(() => {
    // Force dark mode initialization
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
    
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (!isConnected) return
    const handleTraining = (sessions) => {
      setTrainingActive(Array.isArray(sessions) && sessions.length > 0)
    }
    // The original code had socket listeners here, but socket is removed from useTrading.
    // Assuming these listeners are no longer relevant or will be re-added elsewhere.
    // For now, removing the socket-specific listeners.
    return () => {
      // socket.off('training_started')
      // socket.off('training_completed')
      // socket.off('training_failed')
      // socket.off('models_update')
    }
  }, [isConnected])

  const unreadAlerts = state.alerts.filter(alert => !alert.read).length
  const unreadAINotifications = state.aiNotifications.filter(not => !not.read).length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Global Training Progress Bar */}
      {hasActiveTraining && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${globalProgress * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </motion.div>
      )}
      
      {trainingActive && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Model training in progress. <a href="/models" className="underline font-semibold">View Training Visualization</a></span>
          </div>
        </div>
      )}
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-80 flex-col glass-card">
          <div className="flex h-20 items-center justify-between px-6 border-b border-white/20">
            <Logo size="md" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="touch-target text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
            <Logo size="md" />
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
          <div className="flex h-20 items-center justify-between px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="touch-target text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Connection Status - Hidden on mobile */}
              <div className="hidden md:flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Trading Mode Toggle - Responsive */}
              <div className="flex items-center space-x-2">
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">Mode:</span>
                {/* This button is removed from useTrading, so it's no longer available */}
                {/* <button
                  onClick={toggleTradingMode}
                  className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 touch-target ${
                    state.tradingMode === 'live'
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  }`}
                >
                  {state.tradingMode.toUpperCase()}
                </button> */}
              </div>

              {/* Emergency Stop - Responsive */}
              {/* This button is removed from useTrading, so it's no longer available */}
              {/* <button
                onClick={emergencyStop}
                className="btn-danger px-3 md:px-4 py-2 text-xs md:text-sm touch-target"
              >
                <Power className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Emergency Stop</span>
                <span className="sm:hidden">STOP</span>
              </button> */}

              {/* Alerts */}
              <button
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="relative touch-target p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-white/10"
              >
                <Bell className="h-5 w-5 md:h-6 md:w-6" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs flex items-center justify-center font-semibold">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </button>

              {/* AI Notifications */}
              <button
                onClick={() => setAINotificationsOpen(!aiNotificationsOpen)}
                className="relative touch-target p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-xl hover:bg-white/10"
              >
                <Bot className="h-5 w-5 md:h-6 md:w-6" />
                {unreadAINotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs flex items-center justify-center font-semibold">
                    {unreadAINotifications}
                  </span>
                )}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(dm => !dm)}
                className="touch-target p-3 text-gray-400 hover:text-gray-600 dark:hover:text-yellow-400 transition-colors rounded-xl hover:bg-white/10"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="p-4 md:p-6 pb-20 lg:pb-6">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden mobile-nav">
        <div className="grid grid-cols-4 gap-1 p-2">
          {mobileNavigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Alert Panel */}
      <AlertPanel 
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
      />

      {/* AI Notification Panel */}
      <AINotificationPanel 
        isOpen={aiNotificationsOpen}
        onClose={() => setAINotificationsOpen(false)}
      />
    </div>
  )
}