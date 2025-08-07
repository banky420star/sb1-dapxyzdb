import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTradingContext } from '../contexts/TradingContext'
import { 
  Menu, 
  X, 
  Bell, 
  Settings, 
  User,
  BarChart3,
  TrendingUp,
  Bot,
  Shield,
  Activity,
  Zap,
  ChevronDown,
  Bitcoin
} from 'lucide-react'
import Logo from './Logo'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3, description: 'Overview and analytics' },
  { name: 'Trading', href: '/trading', icon: TrendingUp, description: 'Live trading interface' },
  { name: 'Crypto', href: '/crypto', icon: Bitcoin, description: 'Cryptocurrency trading' },
  { name: 'Models', href: '/models', icon: Bot, description: 'AI model management' },
  { name: 'Risk', href: '/risk', icon: Shield, description: 'Risk management tools' },
  { name: 'Analytics', href: '/analytics', icon: Activity, description: 'Performance analysis' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'System configuration' }
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const alerts: any[] = [] // Simple notifications for now

  const currentPath = location.pathname
  const currentNav = navigation.find(nav => nav.href === currentPath)

  return (
    <div className="min-h-screen bg-bg-deep">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-80 flex-col bg-surface border-r border-gray-700">
          <div className="flex h-20 items-center justify-between px-6 border-b border-gray-700">
            <Logo size="md" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const isActive = currentPath === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item group ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col flex-grow bg-surface border-r border-gray-700">
          <div className="flex items-center h-20 px-6 border-b border-gray-700">
            <Logo size="md" />
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const isActive = currentPath === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item group ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-surface border-b border-gray-700">
          <div className="flex h-20 items-center justify-between px-4 md:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              {currentNav && (
                <div>
                  <h1 className="text-xl font-semibold text-white">{currentNav.name}</h1>
                  <p className="text-sm text-gray-400">{currentNav.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-bg-deep rounded-lg border border-gray-700">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">System Online</span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {alerts.filter((alert: {read: boolean}) => !alert.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-critical rounded-full"></span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-surface border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-sm font-medium text-white">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {alerts.length > 0 ? (
                        alerts.map((alert: any, index: number) => (
                          <div key={index} className="p-4 border-b border-gray-700 last:border-b-0">
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                              <div className="flex-1">
                                <p className="text-sm text-white">{alert.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block text-sm font-medium">Admin</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}