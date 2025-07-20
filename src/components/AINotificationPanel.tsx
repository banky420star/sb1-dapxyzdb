import React, { useState, useEffect } from 'react'
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle, Filter, Settings } from 'lucide-react'
import { useTradingContext } from '../contexts/TradingContext'
import { formatDistanceToNow } from 'date-fns'

interface AINotification {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  category: string
  timestamp: string
  read: boolean
  data?: any
}

interface AINotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AINotificationPanel({ isOpen, onClose }: AINotificationPanelProps) {
  const { socket } = useTradingContext()
  const [notifications, setNotifications] = useState<AINotification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Listen for new notifications
    socket.on('notification', (notification: AINotification) => {
      setNotifications(prev => [notification, ...prev])
    })

    // Listen for notifications update
    socket.on('notifications_update', (notificationsList: AINotification[]) => {
      setNotifications(notificationsList)
    })

    return () => {
      socket.off('notification')
      socket.off('notifications_update')
    }
  }, [socket])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'border-l-blue-500 bg-blue-50'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'error':
        return 'border-l-red-500 bg-red-50'
      case 'critical':
        return 'border-l-red-600 bg-red-100'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'critical':
        return notification.level === 'critical'
      case 'warning':
        return notification.level === 'warning' || notification.level === 'error'
      default:
        return true
    }
  })

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trading':
        return '📈'
      case 'models':
        return '🤖'
      case 'system':
        return '⚙️'
      case 'data':
        return '📊'
      case 'performance':
        return '🚀'
      case 'summary':
        return '📋'
      default:
        return '📌'
    }
  }

  // Apple-style notification panel polish
  const panelStyle = {
    background: 'rgba(255,255,255,0.7)',
    borderRadius: '18px',
    boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '1.5rem',
    maxWidth: '400px',
    margin: '1rem auto',
  }

  if (!isOpen) return null

  return (
    <div style={panelStyle} className="notification-panel">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Notifications</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">Trading alerts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">System alerts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked />
                <span className="text-sm text-gray-700">Model alerts</span>
              </label>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
            </div>
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
          </div>
          
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
              { key: 'warning', label: 'Warnings', count: notifications.filter(n => n.level === 'warning' || n.level === 'error').length },
              { key: 'critical', label: 'Critical', count: notifications.filter(n => n.level === 'critical').length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === key
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getLevelColor(notification.level)} ${
                    !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {getLevelIcon(notification.level)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getCategoryIcon(notification.category)}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                          
                          {notification.data && (
                            <button
                              onClick={() => {
                                // TODO: Implement notification data viewer modal
                                alert(JSON.stringify(notification.data, null, 2))
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              View details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>AI-powered monitoring</span>
            <span>{filteredNotifications.length} notifications</span>
          </div>
        </div>
      </div>
    </div>
  )
} 