import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'
import cron from 'node-cron'

export class AINotificationAgent extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = null // Will be set after initialization
    this.metrics = new MetricsCollector()
    
    this.options = {
      checkInterval: options.checkInterval || 30000, // 30 seconds
      notificationThresholds: {
        pnlAlert: options.pnlAlert || -100, // Alert on $100 loss
        winRateAlert: options.winRateAlert || 0.4, // Alert if win rate < 40%
        drawdownAlert: options.drawdownAlert || 0.1, // Alert on 10% drawdown
        modelAccuracyAlert: options.modelAccuracyAlert || 0.5, // Alert if model accuracy < 50%
        systemLoadAlert: options.systemLoadAlert || 0.8, // Alert if system load > 80%
        connectionTimeout: options.connectionTimeout || 60000 // Alert if no data for 1 minute
      },
      ...options
    }
    
    this.isRunning = false
    this.lastDataUpdate = Date.now()
    this.notificationHistory = []
    this.alertLevels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    }
    
    // System state tracking
    this.systemState = {
      tradingActive: false,
      modelsHealthy: true,
      dataStreamActive: true,
      riskLevel: 'low',
      performance: 'good'
    }
  }

  async start() {
    if (this.isRunning) return
    
    this.logger.info('Starting AI Notification Agent')
    
    // Initialize database if not already done
    if (!this.db) {
      this.db = new DatabaseManager()
      await this.db.initialize()
    }
    
    this.isRunning = true
    
    // Start monitoring tasks
    this.startSystemMonitoring()
    this.startTradingMonitoring()
    this.startModelMonitoring()
    this.startDataStreamMonitoring()
    this.startPerformanceMonitoring()
    
    // Schedule daily summary
    cron.schedule('0 9 * * *', () => {
      this.generateDailySummary()
    })
    
    this.logger.info('AI Notification Agent started successfully')
  }

  async stop() {
    if (!this.isRunning) return
    
    this.logger.info('Stopping AI Notification Agent')
    this.isRunning = false
    
    // Clear all intervals
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval)
    }
    if (this.tradingMonitorInterval) {
      clearInterval(this.tradingMonitorInterval)
    }
    if (this.modelMonitorInterval) {
      clearInterval(this.modelMonitorInterval)
    }
    if (this.dataStreamMonitorInterval) {
      clearInterval(this.dataStreamMonitorInterval)
    }
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval)
    }
    
    this.logger.info('AI Notification Agent stopped')
  }

  startSystemMonitoring() {
    this.systemMonitorInterval = setInterval(async () => {
      try {
        await this.checkSystemHealth()
      } catch (error) {
        this.logger.error('Error in system monitoring:', error)
      }
    }, this.options.checkInterval)
  }

  startTradingMonitoring() {
    this.tradingMonitorInterval = setInterval(async () => {
      try {
        await this.checkTradingPerformance()
      } catch (error) {
        this.logger.error('Error in trading monitoring:', error)
      }
    }, this.options.checkInterval)
  }

  startModelMonitoring() {
    this.modelMonitorInterval = setInterval(async () => {
      try {
        await this.checkModelHealth()
      } catch (error) {
        this.logger.error('Error in model monitoring:', error)
      }
    }, this.options.checkInterval * 2) // Check models less frequently
  }

  startDataStreamMonitoring() {
    this.dataStreamMonitorInterval = setInterval(async () => {
      try {
        await this.checkDataStreamHealth()
      } catch (error) {
        this.logger.error('Error in data stream monitoring:', error)
      }
    }, this.options.checkInterval)
  }

  startPerformanceMonitoring() {
    this.performanceMonitorInterval = setInterval(async () => {
      try {
        await this.checkPerformanceMetrics()
      } catch (error) {
        this.logger.error('Error in performance monitoring:', error)
      }
    }, this.options.checkInterval)
  }

  async checkSystemHealth() {
    const metrics = this.metrics.getMetrics()
    const systemLoad = metrics.system?.cpuUsage || 0
    const memoryUsage = metrics.system?.memoryUsage || 0
    
    if (systemLoad > this.options.notificationThresholds.systemLoadAlert) {
      await this.sendNotification({
        level: this.alertLevels.WARNING,
        title: 'High System Load',
        message: `System CPU usage is ${(systemLoad * 100).toFixed(1)}%`,
        category: 'system',
        data: { cpuUsage: systemLoad, memoryUsage }
      })
    }
    
    if (memoryUsage > 0.9) {
      await this.sendNotification({
        level: this.alertLevels.WARNING,
        title: 'High Memory Usage',
        message: `Memory usage is ${(memoryUsage * 100).toFixed(1)}%`,
        category: 'system',
        data: { memoryUsage }
      })
    }
  }

  async checkTradingPerformance() {
    try {
      // Check if database is initialized and method exists
      if (!this.db || !this.db.getRecentTrades) {
        this.logger.warn('Database not ready for trading performance check')
        return
      }
      
      const trades = await this.db.getRecentTrades(100)
      if (!trades || trades.length === 0) return
      
      const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0)
      const winRate = trades.filter(t => t.pnl > 0).length / trades.length
      const maxDrawdown = this.calculateMaxDrawdown(trades)
      
      // Check P&L alerts
      if (totalPnL < this.options.notificationThresholds.pnlAlert) {
        await this.sendNotification({
          level: this.alertLevels.WARNING,
          title: 'Trading Loss Alert',
          message: `Total P&L is $${totalPnL.toFixed(2)}`,
          category: 'trading',
          data: { totalPnL, winRate, maxDrawdown }
        })
      }
      
      // Check win rate alerts
      if (winRate < this.options.notificationThresholds.winRateAlert) {
        await this.sendNotification({
          level: this.alertLevels.WARNING,
          title: 'Low Win Rate Alert',
          message: `Win rate is ${(winRate * 100).toFixed(1)}%`,
          category: 'trading',
          data: { winRate, totalPnL }
        })
      }
      
      // Check drawdown alerts
      if (maxDrawdown > this.options.notificationThresholds.drawdownAlert) {
        await this.sendNotification({
          level: this.alertLevels.ERROR,
          title: 'High Drawdown Alert',
          message: `Maximum drawdown is ${(maxDrawdown * 100).toFixed(1)}%`,
          category: 'trading',
          data: { maxDrawdown, totalPnL }
        })
      }
      
    } catch (error) {
      this.logger.error('Error checking trading performance:', error)
    }
  }

  async checkModelHealth() {
    try {
      // Check if database is initialized and method exists
      if (!this.db || !this.db.getModelStatus) {
        this.logger.warn('Database not ready for model health check')
        return
      }
      
      const models = await this.db.getModelStatus()
      
      for (const model of models) {
        if (model.accuracy < this.options.notificationThresholds.modelAccuracyAlert) {
          await this.sendNotification({
            level: this.alertLevels.WARNING,
            title: 'Model Performance Alert',
            message: `${model.name} accuracy is ${(model.accuracy * 100).toFixed(1)}%`,
            category: 'models',
            data: { model: model.name, accuracy: model.accuracy }
          })
        }
        
        if (model.status === 'offline') {
          await this.sendNotification({
            level: this.alertLevels.ERROR,
            title: 'Model Offline',
            message: `${model.name} is currently offline`,
            category: 'models',
            data: { model: model.name, status: model.status }
          })
        }
      }
    } catch (error) {
      this.logger.error('Error checking model health:', error)
    }
  }

  async checkDataStreamHealth() {
    const timeSinceLastUpdate = Date.now() - this.lastDataUpdate
    
    if (timeSinceLastUpdate > this.options.notificationThresholds.connectionTimeout) {
      await this.sendNotification({
        level: this.alertLevels.ERROR,
        title: 'Data Stream Interrupted',
        message: `No data updates for ${Math.floor(timeSinceLastUpdate / 1000)} seconds`,
        category: 'data',
        data: { timeSinceLastUpdate }
      })
      
      this.systemState.dataStreamActive = false
    } else {
      this.systemState.dataStreamActive = true
    }
  }

  async checkPerformanceMetrics() {
    const metrics = this.metrics.getMetrics()
    
    // Check API response times
    if (metrics.api?.averageResponseTime > 1000) {
      await this.sendNotification({
        level: this.alertLevels.WARNING,
        title: 'Slow API Response',
        message: `Average API response time is ${metrics.api.averageResponseTime}ms`,
        category: 'performance',
        data: { responseTime: metrics.api.averageResponseTime }
      })
    }
    
    // Check error rates
    if (metrics.errors?.rate > 0.05) {
      await this.sendNotification({
        level: this.alertLevels.ERROR,
        title: 'High Error Rate',
        message: `Error rate is ${(metrics.errors.rate * 100).toFixed(1)}%`,
        category: 'performance',
        data: { errorRate: metrics.errors.rate }
      })
    }
  }

  calculateMaxDrawdown(trades) {
    let peak = 0
    let maxDrawdown = 0
    let runningPnL = 0
    
    for (const trade of trades) {
      runningPnL += trade.pnl
      
      if (runningPnL > peak) {
        peak = runningPnL
      }
      
      const drawdown = (peak - runningPnL) / Math.max(peak, 1)
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }
    
    return maxDrawdown
  }

  async sendNotification(notification) {
    const enrichedNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    }
    
    // Store notification
    this.notificationHistory.unshift(enrichedNotification)
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100)
    }
    
    // Save to database
    try {
      if (this.db && this.db.saveNotification) {
        await this.db.saveNotification(enrichedNotification)
      }
    } catch (error) {
      this.logger.error('Error saving notification to database:', error)
    }
    
    // Emit event for real-time updates
    this.emit('notification', enrichedNotification)
    
    // Log notification
    this.logger.info(`AI Notification [${enrichedNotification.level.toUpperCase()}]: ${enrichedNotification.title} - ${enrichedNotification.message}`)
    
    return enrichedNotification
  }

  async generateDailySummary() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const trades = await this.db.getTradesByDate(today)
      const models = await this.db.getModelStatus()
      const metrics = this.metrics.getMetrics()
      
      const summary = {
        date: today.toISOString().split('T')[0],
        totalTrades: trades.length,
        totalPnL: trades.reduce((sum, t) => sum + t.pnl, 0),
        winRate: trades.length > 0 ? trades.filter(t => t.pnl > 0).length / trades.length : 0,
        activeModels: models.filter(m => m.status === 'active').length,
        systemUptime: metrics.system?.uptime || 0,
        averageResponseTime: metrics.api?.averageResponseTime || 0
      }
      
      await this.sendNotification({
        level: this.alertLevels.INFO,
        title: 'Daily Trading Summary',
        message: `Trades: ${summary.totalTrades}, P&L: $${summary.totalPnL.toFixed(2)}, Win Rate: ${(summary.winRate * 100).toFixed(1)}%`,
        category: 'summary',
        data: summary
      })
      
    } catch (error) {
      this.logger.error('Error generating daily summary:', error)
    }
  }

  getNotificationHistory(limit = 50) {
    return this.notificationHistory.slice(0, limit)
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notificationHistory.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  updateDataTimestamp() {
    this.lastDataUpdate = Date.now()
  }

  getSystemState() {
    return { ...this.systemState }
  }
} 