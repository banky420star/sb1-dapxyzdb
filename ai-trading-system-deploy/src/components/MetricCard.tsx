import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'indigo' | 'gray'
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  purple: 'from-purple-500 to-purple-600',
  yellow: 'from-yellow-500 to-yellow-600',
  indigo: 'from-indigo-500 to-indigo-600',
  gray: 'from-gray-500 to-gray-600'
}

const bgColorClasses = {
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  green: 'bg-green-50 dark:bg-green-900/20',
  red: 'bg-red-50 dark:bg-red-900/20',
  purple: 'bg-purple-50 dark:bg-purple-900/20',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
  gray: 'bg-gray-50 dark:bg-gray-900/20'
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  color,
  trend,
  description
}: MetricCardProps) {
  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {trend && trend !== 'neutral' && (
              <div className={`p-1 rounded-full ${
                trend === 'up' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                )}
              </div>
            )}
          </div>
          
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
          
          {change !== undefined && changeType !== 'neutral' && (
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-semibold ${
                changeType === 'positive' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {changeType === 'positive' && change > 0 && '+'}
                {typeof change === 'number' && change !== 0 && `${change.toFixed(2)}%`}
              </span>
              {trend && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs last period
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Subtle background accent */}
      <div className={`absolute inset-0 rounded-2xl ${bgColorClasses[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`} />
    </div>
  )
}