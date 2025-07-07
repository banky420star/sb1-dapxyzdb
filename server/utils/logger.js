import winston from 'winston'
import path from 'path'
import fs from 'fs'

export class Logger {
  constructor(options = {}) {
    this.options = {
      level: process.env.LOG_LEVEL || 'info',
      format: options.format || 'json',
      maxFiles: options.maxFiles || 5,
      maxSize: options.maxSize || '20m',
      logDir: options.logDir || 'logs',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      enableMetrics: options.enableMetrics !== false,
      ...options
    }
    
    // Ensure log directory exists
    this.ensureLogDirectory()
    
    // Create Winston logger
    this.logger = this.createLogger()
    
    // Performance tracking
    this.metrics = {
      logCounts: new Map(),
      errorCounts: new Map(),
      performanceTimers: new Map(),
      startTime: Date.now()
    }
    
    // Error tracking
    this.errorHistory = []
    this.maxErrorHistory = 1000
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true })
    }
  }

  createLogger() {
    const transports = []
    
    // Console transport
    if (this.options.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.options.level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            return `${timestamp} [${level}]: ${message} ${metaStr}`
          })
        )
      }))
    }
    
    // File transports
    if (this.options.enableFile) {
      // Combined log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDir, 'combined.log'),
        level: this.options.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: this.options.maxSize,
        maxFiles: this.options.maxFiles
      }))
      
      // Error log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: this.options.maxSize,
        maxFiles: this.options.maxFiles
      }))
      
      // Trading log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDir, 'trading.log'),
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.category === 'trading' ? info : false
          })()
        ),
        maxsize: this.options.maxSize,
        maxFiles: this.options.maxFiles
      }))
      
      // Performance log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDir, 'performance.log'),
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
          winston.format((info) => {
            return info.category === 'performance' ? info : false
          })()
        ),
        maxsize: this.options.maxSize,
        maxFiles: this.options.maxFiles
      }))
    }
    
    return winston.createLogger({
      level: this.options.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    })
  }

  // Core logging methods
  debug(message, meta = {}) {
    this.log('debug', message, meta)
  }

  info(message, meta = {}) {
    this.log('info', message, meta)
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta)
  }

  error(message, meta = {}) {
    this.log('error', message, meta)
    this.trackError(message, meta)
  }

  log(level, message, meta = {}) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      hostname: require('os').hostname(),
      ...meta
    }
    
    // Add stack trace for errors
    if (level === 'error' && meta instanceof Error) {
      logEntry.stack = meta.stack
      logEntry.error = {
        name: meta.name,
        message: meta.message,
        code: meta.code
      }
    }
    
    this.logger.log(level, message, logEntry)
    
    // Update metrics
    if (this.options.enableMetrics) {
      this.updateMetrics(level)
    }
  }

  // Specialized logging methods
  trading(message, data = {}) {
    this.log('info', message, {
      category: 'trading',
      ...data
    })
  }

  performance(message, data = {}) {
    this.log('debug', message, {
      category: 'performance',
      ...data
    })
  }

  security(message, data = {}) {
    this.log('warn', message, {
      category: 'security',
      ...data
    })
  }

  audit(action, data = {}) {
    this.log('info', `Audit: ${action}`, {
      category: 'audit',
      action,
      ...data
    })
  }

  // Performance tracking
  startTimer(name) {
    const startTime = process.hrtime.bigint()
    this.metrics.performanceTimers.set(name, startTime)
    return startTime
  }

  endTimer(name) {
    const startTime = this.metrics.performanceTimers.get(name)
    if (!startTime) {
      this.warn(`Timer '${name}' was not started`)
      return 0
    }
    
    const endTime = process.hrtime.bigint()
    const duration = Number(endTime - startTime) / 1000000 // Convert to milliseconds
    
    this.performance(`Timer '${name}' completed`, {
      timer: name,
      duration,
      unit: 'ms'
    })
    
    this.metrics.performanceTimers.delete(name)
    return duration
  }

  measureAsync(name, asyncFunction) {
    return async (...args) => {
      this.startTimer(name)
      try {
        const result = await asyncFunction(...args)
        this.endTimer(name)
        return result
      } catch (error) {
        this.endTimer(name)
        this.error(`Error in measured function '${name}':`, error)
        throw error
      }
    }
  }

  measure(name, syncFunction) {
    return (...args) => {
      this.startTimer(name)
      try {
        const result = syncFunction(...args)
        this.endTimer(name)
        return result
      } catch (error) {
        this.endTimer(name)
        this.error(`Error in measured function '${name}':`, error)
        throw error
      }
    }
  }

  // Metrics and monitoring
  updateMetrics(level) {
    const current = this.metrics.logCounts.get(level) || 0
    this.metrics.logCounts.set(level, current + 1)
    
    if (level === 'error') {
      const errorCount = this.metrics.errorCounts.get('total') || 0
      this.metrics.errorCounts.set('total', errorCount + 1)
    }
  }

  trackError(message, meta) {
    const errorEntry = {
      message,
      meta,
      timestamp: new Date().toISOString(),
      stack: meta instanceof Error ? meta.stack : new Error().stack
    }
    
    this.errorHistory.push(errorEntry)
    
    // Keep only recent errors
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift()
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime
    
    return {
      uptime,
      logCounts: Object.fromEntries(this.metrics.logCounts),
      errorCounts: Object.fromEntries(this.metrics.errorCounts),
      activeTimers: this.metrics.performanceTimers.size,
      errorHistory: this.errorHistory.slice(-10), // Last 10 errors
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  }

  getErrorHistory(limit = 50) {
    return this.errorHistory.slice(-limit)
  }

  // Log analysis
  analyzeErrors(timeWindow = 60 * 60 * 1000) { // 1 hour default
    const cutoff = Date.now() - timeWindow
    const recentErrors = this.errorHistory.filter(error => 
      new Date(error.timestamp).getTime() > cutoff
    )
    
    // Group by error type
    const errorTypes = new Map()
    for (const error of recentErrors) {
      const type = error.meta?.name || 'Unknown'
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1)
    }
    
    return {
      totalErrors: recentErrors.length,
      errorTypes: Object.fromEntries(errorTypes),
      timeWindow,
      errorRate: recentErrors.length / (timeWindow / 1000) // errors per second
    }
  }

  // Configuration methods
  setLevel(level) {
    this.options.level = level
    this.logger.level = level
    this.info(`Log level changed to ${level}`)
  }

  getLevel() {
    return this.options.level
  }

  // Health check
  healthCheck() {
    const metrics = this.getMetrics()
    const errorAnalysis = this.analyzeErrors()
    
    const health = {
      status: 'healthy',
      uptime: metrics.uptime,
      logCounts: metrics.logCounts,
      errorRate: errorAnalysis.errorRate,
      memoryUsage: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
      issues: []
    }
    
    // Check for issues
    if (errorAnalysis.errorRate > 1) { // More than 1 error per second
      health.status = 'warning'
      health.issues.push('High error rate')
    }
    
    if (health.memoryUsage > 0.9) { // More than 90% memory usage
      health.status = 'warning'
      health.issues.push('High memory usage')
    }
    
    if (errorAnalysis.totalErrors > 100) { // More than 100 errors in time window
      health.status = 'critical'
      health.issues.push('Too many errors')
    }
    
    return health
  }

  // Structured logging helpers
  logTrade(trade) {
    this.trading('Trade executed', {
      tradeId: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      size: trade.size,
      price: trade.price,
      pnl: trade.pnl,
      timestamp: trade.timestamp
    })
  }

  logPosition(action, position) {
    this.trading(`Position ${action}`, {
      positionId: position.id,
      symbol: position.symbol,
      side: position.side,
      size: position.size,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      pnl: position.pnl,
      timestamp: position.timestamp
    })
  }

  logModelPrediction(prediction) {
    this.info('Model prediction', {
      category: 'ml',
      modelType: prediction.modelType,
      symbol: prediction.symbol,
      direction: prediction.direction,
      confidence: prediction.confidence,
      timestamp: prediction.timestamp
    })
  }

  logRiskViolation(violation) {
    this.warn('Risk violation detected', {
      category: 'risk',
      type: violation.type,
      severity: violation.severity,
      message: violation.message,
      value: violation.value,
      limit: violation.limit,
      timestamp: new Date().toISOString()
    })
  }

  logSystemEvent(event, data = {}) {
    this.info(`System event: ${event}`, {
      category: 'system',
      event,
      ...data
    })
  }

  // Log rotation and cleanup
  rotateLogs() {
    try {
      const logFiles = fs.readdirSync(this.options.logDir)
      const now = Date.now()
      const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
      
      for (const file of logFiles) {
        const filePath = path.join(this.options.logDir, file)
        const stats = fs.statSync(filePath)
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath)
          this.info(`Deleted old log file: ${file}`)
        }
      }
    } catch (error) {
      this.error('Error rotating logs:', error)
    }
  }

  // Export logs
  exportLogs(startDate, endDate, format = 'json') {
    try {
      const logs = []
      const logFile = path.join(this.options.logDir, 'combined.log')
      
      if (!fs.existsSync(logFile)) {
        return []
      }
      
      const content = fs.readFileSync(logFile, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line)
          const logDate = new Date(logEntry.timestamp)
          
          if (logDate >= startDate && logDate <= endDate) {
            logs.push(logEntry)
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      }
      
      if (format === 'csv') {
        return this.convertLogsToCSV(logs)
      }
      
      return logs
    } catch (error) {
      this.error('Error exporting logs:', error)
      return []
    }
  }

  convertLogsToCSV(logs) {
    if (logs.length === 0) return ''
    
    const headers = ['timestamp', 'level', 'message', 'category', 'meta']
    const rows = [headers.join(',')]
    
    for (const log of logs) {
      const row = [
        log.timestamp,
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.category || '',
        `"${JSON.stringify(log.meta || {}).replace(/"/g, '""')}"`
      ]
      rows.push(row.join(','))
    }
    
    return rows.join('\n')
  }

  // Cleanup
  async cleanup() {
    try {
      this.info('Logger cleanup started')
      
      // Finish any pending timers
      for (const [name] of this.metrics.performanceTimers) {
        this.endTimer(name)
      }
      
      // Rotate logs
      this.rotateLogs()
      
      // Close Winston logger
      if (this.logger) {
        await new Promise((resolve) => {
          this.logger.on('finish', resolve)
          this.logger.end()
        })
      }
      
      console.log('Logger cleanup completed')
    } catch (error) {
      console.error('Error during logger cleanup:', error)
    }
  }
}