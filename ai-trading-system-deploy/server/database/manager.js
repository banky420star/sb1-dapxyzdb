import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'
import { Logger } from '../utils/logger.js'

export class DatabaseManager {
  constructor(options = {}) {
    this.logger = new Logger()
    this.options = {
      filename: options.filename || 'trading.db',
      dbPath: options.dbPath || 'data',
      enableWAL: options.enableWAL !== false,
      busyTimeout: options.busyTimeout || 30000,
      cacheSize: options.cacheSize || 10000,
      ...options
    }
    
    this.db = null
    this.isInitialized = false
    this.connectionPool = []
    this.maxConnections = 5
  }

  async initialize() {
    try {
      this.logger.info('Initializing Database Manager')
      
      // Ensure database directory exists
      this.ensureDbDirectory()
      
      // Open database connection
      await this.openDatabase()
      
      // Configure database
      await this.configureDatabase()
      
      // Create tables
      await this.createTables()
      
      // Create indexes
      await this.createIndexes()
      
      this.isInitialized = true
      this.logger.info('Database Manager initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Database Manager:', error)
      throw error
    }
  }

  ensureDbDirectory() {
    if (!fs.existsSync(this.options.dbPath)) {
      fs.mkdirSync(this.options.dbPath, { recursive: true })
    }
  }

  async openDatabase() {
    const dbFile = path.join(this.options.dbPath, this.options.filename)
    
    this.db = await open({
      filename: dbFile,
      driver: sqlite3.Database
    })
    
    this.logger.info(`Database opened: ${dbFile}`)
  }

  async configureDatabase() {
    // Enable WAL mode for better concurrency
    if (this.options.enableWAL) {
      await this.db.exec('PRAGMA journal_mode = WAL')
    }
    
    // Set busy timeout
    await this.db.exec(`PRAGMA busy_timeout = ${this.options.busyTimeout}`)
    
    // Set cache size
    await this.db.exec(`PRAGMA cache_size = ${this.options.cacheSize}`)
    
    // Enable foreign keys
    await this.db.exec('PRAGMA foreign_keys = ON')
    
    // Set synchronous mode
    await this.db.exec('PRAGMA synchronous = NORMAL')
    
    this.logger.info('Database configured')
  }

  async createTables() {
    // OHLCV data table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ohlcv_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, timeframe, timestamp)
      )
    `)
    
    // Positions table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        size REAL NOT NULL,
        entry_price REAL NOT NULL,
        current_price REAL,
        pnl REAL DEFAULT 0,
        pnl_percent REAL DEFAULT 0,
        stop_loss REAL,
        take_profit REAL,
        timestamp INTEGER NOT NULL,
        close_time INTEGER,
        close_price REAL,
        close_pnl REAL,
        close_reason TEXT,
        status TEXT DEFAULT 'open',
        mt5_ticket INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Orders table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        side TEXT NOT NULL,
        size REAL NOT NULL,
        price REAL,
        execution_price REAL,
        status TEXT DEFAULT 'pending',
        position_id TEXT,
        rejection_reason TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions (id)
      )
    `)
    
    // Trades table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        size REAL NOT NULL,
        entry_price REAL NOT NULL,
        close_price REAL NOT NULL,
        pnl REAL NOT NULL,
        duration INTEGER,
        timestamp INTEGER NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions (id)
      )
    `)
    
    // Account balance table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS account_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equity REAL NOT NULL,
        balance REAL NOT NULL,
        margin REAL DEFAULT 0,
        free_margin REAL NOT NULL,
        margin_level REAL DEFAULT 0,
        peak_equity REAL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Model states table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_type TEXT NOT NULL,
        version TEXT NOT NULL,
        state_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(model_type, version)
      )
    `)
    
    // Model performance table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS model_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_type TEXT NOT NULL,
        accuracy REAL NOT NULL,
        precision_score REAL,
        recall_score REAL,
        f1_score REAL,
        training_time INTEGER,
        training_date DATETIME,
        data_size INTEGER,
        version TEXT,
        status TEXT DEFAULT 'offline',
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Risk violations table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS risk_violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        value REAL,
        limit_value REAL,
        symbol TEXT,
        position_id TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Risk configuration table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS risk_configuration (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Metrics table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metrics_data TEXT NOT NULL,
        counters_data TEXT,
        gauges_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // News events table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS news_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        impact TEXT,
        currency TEXT,
        source TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Economic events table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS economic_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        currency TEXT,
        impact TEXT,
        actual TEXT,
        forecast TEXT,
        previous TEXT,
        event_time DATETIME,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Notifications table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        read INTEGER DEFAULT 0,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    this.logger.info('Database tables created')
  }

  async createIndexes() {
    // OHLCV indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timeframe ON ohlcv_data(symbol, timeframe)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp ON ohlcv_data(timestamp)')
    
    // Position indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_positions_timestamp ON positions(timestamp)')
    
    // Order indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp)')
    
    // Trade indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)')
    
    // Account balance indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_balance_timestamp ON account_balance(timestamp)')
    
    // Model performance indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_model_perf_type ON model_performance(model_type)')
    
    // Risk violation indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_risk_violations_type ON risk_violations(type)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_risk_violations_timestamp ON risk_violations(timestamp)')
    
    // Metrics indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)')
    
    // News events indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_news_timestamp ON news_events(timestamp)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_news_currency ON news_events(currency)')

    // Notifications indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp)')
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)')
    
    this.logger.info('Database indexes created')
  }

  // OHLCV data methods
  async saveOHLCVData(symbol, timeframe, ohlcvData) {
    try {
      const stmt = await this.db.prepare(`
        INSERT OR REPLACE INTO ohlcv_data 
        (symbol, timeframe, timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const bar of ohlcvData) {
        await stmt.run(symbol, timeframe, bar[0], bar[1], bar[2], bar[3], bar[4], bar[5])
      }
      
      await stmt.finalize()
      return true
    } catch (error) {
      this.logger.error('Error saving OHLCV data:', error)
      throw error
    }
  }

  async getOHLCVData(symbol, timeframe, limit = 1000) {
    try {
      const rows = await this.db.all(`
        SELECT timestamp, open, high, low, close, volume
        FROM ohlcv_data
        WHERE symbol = ? AND timeframe = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `, [symbol, timeframe, limit])
      
      return rows.map(row => [
        row.timestamp,
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume
      ]).reverse()
    } catch (error) {
      this.logger.error('Error getting OHLCV data:', error)
      throw error
    }
  }

  // Position methods
  async savePosition(position) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO positions
        (id, order_id, symbol, side, size, entry_price, current_price, pnl, pnl_percent,
         stop_loss, take_profit, timestamp, status, mt5_ticket, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        position.id,
        position.orderId,
        position.symbol,
        position.side,
        position.size,
        position.entryPrice,
        position.currentPrice,
        position.pnl,
        position.pnlPercent,
        position.stopLoss,
        position.takeProfit,
        position.timestamp,
        position.status,
        position.mt5Ticket
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving position:', error)
      throw error
    }
  }

  async updatePosition(position) {
    try {
      await this.db.run(`
        UPDATE positions SET
        current_price = ?, pnl = ?, pnl_percent = ?, close_time = ?,
        close_price = ?, close_pnl = ?, close_reason = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        position.currentPrice,
        position.pnl,
        position.pnlPercent,
        position.closeTime,
        position.closePrice,
        position.closePnL,
        position.closeReason,
        position.status,
        position.id
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error updating position:', error)
      throw error
    }
  }

  async getActivePositions() {
    try {
      const rows = await this.db.all(`
        SELECT * FROM positions WHERE status = 'open'
        ORDER BY timestamp DESC
      `)
      
      return rows.map(this.mapPositionRow)
    } catch (error) {
      this.logger.error('Error getting active positions:', error)
      throw error
    }
  }

  async getPositionHistory(limit = 100) {
    try {
      const rows = await this.db.all(`
        SELECT * FROM positions
        ORDER BY timestamp DESC
        LIMIT ?
      `, [limit])
      
      return rows.map(this.mapPositionRow)
    } catch (error) {
      this.logger.error('Error getting position history:', error)
      throw error
    }
  }

  mapPositionRow(row) {
    return {
      id: row.id,
      orderId: row.order_id,
      symbol: row.symbol,
      side: row.side,
      size: row.size,
      entryPrice: row.entry_price,
      currentPrice: row.current_price,
      pnl: row.pnl,
      pnlPercent: row.pnl_percent,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      timestamp: row.timestamp,
      closeTime: row.close_time,
      closePrice: row.close_price,
      closePnL: row.close_pnl,
      closeReason: row.close_reason,
      status: row.status,
      mt5Ticket: row.mt5_ticket
    }
  }

  // Order methods
  async saveOrder(order) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO orders
        (id, symbol, type, side, size, price, execution_price, status,
         position_id, rejection_reason, timestamp, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        order.id,
        order.symbol,
        order.type,
        order.side,
        order.size,
        order.price,
        order.executionPrice,
        order.status,
        order.positionId,
        order.rejectionReason,
        order.timestamp
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving order:', error)
      throw error
    }
  }

  async updateOrder(order) {
    try {
      await this.db.run(`
        UPDATE orders SET
        execution_price = ?, status = ?, position_id = ?,
        rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        order.executionPrice,
        order.status,
        order.positionId,
        order.rejectionReason,
        order.id
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error updating order:', error)
      throw error
    }
  }

  async getPendingOrders() {
    try {
      const rows = await this.db.all(`
        SELECT * FROM orders WHERE status = 'pending'
        ORDER BY timestamp DESC
      `)
      
      return rows.map(this.mapOrderRow)
    } catch (error) {
      this.logger.error('Error getting pending orders:', error)
      throw error
    }
  }

  mapOrderRow(row) {
    return {
      id: row.id,
      symbol: row.symbol,
      type: row.type,
      side: row.side,
      size: row.size,
      price: row.price,
      executionPrice: row.execution_price,
      status: row.status,
      positionId: row.position_id,
      rejectionReason: row.rejection_reason,
      timestamp: row.timestamp
    }
  }

  // Trade methods
  async saveTrade(trade) {
    try {
      await this.db.run(`
        INSERT INTO trades
        (id, position_id, symbol, side, size, entry_price, close_price,
         pnl, duration, timestamp, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trade.id,
        trade.positionId,
        trade.symbol,
        trade.side,
        trade.size,
        trade.entryPrice,
        trade.closePrice,
        trade.pnl,
        trade.duration,
        trade.timestamp,
        trade.reason
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving trade:', error)
      throw error
    }
  }

  async getTradeHistory(limit = 100) {
    try {
      const rows = await this.db.all(`
        SELECT * FROM trades 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [limit])
      
      return rows.map(row => ({
        id: row.id,
        positionId: row.position_id,
        symbol: row.symbol,
        side: row.side,
        size: row.size,
        entryPrice: row.entry_price,
        closePrice: row.close_price,
        pnl: row.pnl,
        duration: row.duration,
        timestamp: row.timestamp,
        reason: row.reason,
        createdAt: row.created_at
      }))
    } catch (error) {
      this.logger.error('Error getting trade history:', error)
      return []
    }
  }

  async getRecentTrades(limit = 100) {
    try {
      const rows = await this.db.all(`
        SELECT * FROM trades 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [limit])
      
      return rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        side: row.side,
        size: row.size,
        entryPrice: row.entry_price,
        closePrice: row.close_price,
        pnl: row.pnl,
        timestamp: row.timestamp
      }))
    } catch (error) {
      this.logger.error('Error getting recent trades:', error)
      return []
    }
  }

  async getModelStatus() {
    try {
      if (!this.db) {
        this.logger.warn('Database not initialized for getModelStatus')
        return []
      }
      
      // Get model performance data
      const rows = await this.db.all(`
        SELECT model_type, accuracy, created_at as last_update, status, version
        FROM model_performance 
        ORDER BY created_at DESC
      `)
      
      return rows.map(row => ({
        name: row.model_type,
        type: row.model_type.toLowerCase().replace(' ', ''),
        status: row.status || 'offline',
        accuracy: row.accuracy || 0,
        lastUpdate: row.last_update,
        version: row.version || '1.0.0'
      }))
    } catch (error) {
      this.logger.error('Error getting model status:', error)
      return []
    }
  }

  async saveNotification(notification) {
    try {
      await this.db.run(`
        INSERT INTO notifications (
          id, level, title, message, category, timestamp, read, data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notification.id,
        notification.level,
        notification.title,
        notification.message,
        notification.category,
        notification.timestamp,
        notification.read ? 1 : 0,
        JSON.stringify(notification.data || {})
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving notification:', error)
      return false
    }
  }

  async getNotifications(limit = 50) {
    try {
      const rows = await this.db.all(`
        SELECT * FROM notifications 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [limit])
      
      return rows.map(row => ({
        id: row.id,
        level: row.level,
        title: row.title,
        message: row.message,
        category: row.category,
        timestamp: row.timestamp,
        read: Boolean(row.read),
        data: row.data ? JSON.parse(row.data) : {}
      }))
    } catch (error) {
      this.logger.error('Error getting notifications:', error)
      return []
    }
  }

  async getHistoricalTrades(symbol = null, limit = 100) {
    try {
      let query = `
        SELECT * FROM trades
      `
      let params = []
      
      if (symbol) {
        query += ` WHERE symbol = ?`
        params.push(symbol)
      }
      
      query += ` ORDER BY timestamp DESC LIMIT ?`
      params.push(limit)
      
      const rows = await this.db.all(query, params)
      
      return rows.map(row => ({
        id: row.id,
        positionId: row.position_id,
        symbol: row.symbol,
        side: row.side,
        size: row.size,
        entryPrice: row.entry_price,
        closePrice: row.close_price,
        pnl: row.pnl,
        duration: row.duration,
        timestamp: row.timestamp,
        reason: row.reason
      }))
    } catch (error) {
      this.logger.error('Error getting historical trades:', error)
      throw error
    }
  }

  // Account balance methods
  async saveAccountBalance(balance) {
    try {
      await this.db.run(`
        INSERT INTO account_balance
        (equity, balance, margin, free_margin, margin_level, peak_equity, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        balance.equity,
        balance.balance,
        balance.margin,
        balance.freeMargin,
        balance.marginLevel,
        balance.peakEquity || balance.equity,
        Date.now()
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving account balance:', error)
      throw error
    }
  }

  async getAccountBalance() {
    try {
      const row = await this.db.get(`
        SELECT * FROM account_balance
        ORDER BY timestamp DESC
        LIMIT 1
      `)
      
      if (!row) return null
      
      return {
        equity: row.equity,
        balance: row.balance,
        margin: row.margin,
        freeMargin: row.free_margin,
        marginLevel: row.margin_level,
        peakEquity: row.peak_equity
      }
    } catch (error) {
      this.logger.error('Error getting account balance:', error)
      throw error
    }
  }

  // Model state methods
  async saveModelState(modelType, state) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO model_states
        (model_type, version, state_data)
        VALUES (?, ?, ?)
      `, [
        modelType,
        state.version || '1.0.0',
        JSON.stringify(state)
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving model state:', error)
      throw error
    }
  }

  async getModelState(modelType) {
    try {
      const row = await this.db.get(`
        SELECT state_data FROM model_states
        WHERE model_type = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [modelType])
      
      return row ? JSON.parse(row.state_data) : null
    } catch (error) {
      this.logger.error('Error getting model state:', error)
      throw error
    }
  }

  async saveModelPerformance(modelType, performance) {
    try {
      await this.db.run(`
        INSERT INTO model_performance
        (model_type, accuracy, precision_score, recall_score, f1_score,
         training_time, training_date, data_size, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        modelType,
        performance.accuracy,
        performance.precision,
        performance.recall,
        performance.f1Score,
        performance.trainingTime,
        performance.trainingDate,
        performance.dataSize,
        performance.version
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving model performance:', error)
      throw error
    }
  }

  async getModelPerformance(modelType) {
    try {
      const row = await this.db.get(`
        SELECT * FROM model_performance
        WHERE model_type = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [modelType])
      
      if (!row) return null
      
      return {
        modelType: row.model_type,
        accuracy: row.accuracy,
        precision: row.precision_score,
        recall: row.recall_score,
        f1Score: row.f1_score,
        trainingTime: row.training_time,
        trainingDate: row.training_date,
        dataSize: row.data_size,
        version: row.version
      }
    } catch (error) {
      this.logger.error('Error getting model performance:', error)
      throw error
    }
  }

  // Risk management methods
  async saveRiskViolation(violation) {
    try {
      await this.db.run(`
        INSERT INTO risk_violations
        (type, severity, message, value, limit_value, symbol, position_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        violation.type,
        violation.severity,
        violation.message,
        violation.value,
        violation.limit,
        violation.symbol,
        violation.positionId,
        violation.timestamp || Date.now()
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving risk violation:', error)
      throw error
    }
  }

  async saveRiskConfiguration(config) {
    try {
      await this.db.run(`
        INSERT INTO risk_configuration (config_data)
        VALUES (?)
      `, [JSON.stringify(config)])
      
      return true
    } catch (error) {
      this.logger.error('Error saving risk configuration:', error)
      throw error
    }
  }

  async getRiskConfiguration() {
    try {
      const row = await this.db.get(`
        SELECT config_data FROM risk_configuration
        ORDER BY created_at DESC
        LIMIT 1
      `)
      
      return row ? JSON.parse(row.config_data) : null
    } catch (error) {
      this.logger.error('Error getting risk configuration:', error)
      throw error
    }
  }

  async saveRiskState(riskState) {
    try {
      // Save as metrics for now
      await this.saveMetrics({
        timestamp: Date.now(),
        metrics: { risk: riskState }
      })
      
      return true
    } catch (error) {
      this.logger.error('Error saving risk state:', error)
      throw error
    }
  }

  // Metrics methods
  async saveMetrics(metricsData) {
    try {
      await this.db.run(`
        INSERT INTO metrics
        (timestamp, metrics_data, counters_data, gauges_data)
        VALUES (?, ?, ?, ?)
      `, [
        metricsData.timestamp,
        JSON.stringify(metricsData.metrics || {}),
        JSON.stringify(metricsData.counters || {}),
        JSON.stringify(metricsData.gauges || {})
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving metrics:', error)
      throw error
    }
  }

  async getMetricsHistory(hours = 24) {
    try {
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      
      const rows = await this.db.all(`
        SELECT * FROM metrics
        WHERE timestamp > ?
        ORDER BY timestamp DESC
      `, [cutoff])
      
      return rows.map(row => ({
        timestamp: row.timestamp,
        metrics: JSON.parse(row.metrics_data),
        counters: JSON.parse(row.counters_data || '{}'),
        gauges: JSON.parse(row.gauges_data || '{}')
      }))
    } catch (error) {
      this.logger.error('Error getting metrics history:', error)
      throw error
    }
  }

  // News events methods
  async saveNewsEvent(newsEvent) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO news_events
        (id, title, content, impact, currency, source, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        newsEvent.id,
        newsEvent.title,
        newsEvent.content,
        newsEvent.impact,
        newsEvent.currency,
        newsEvent.source,
        newsEvent.timestamp
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving news event:', error)
      throw error
    }
  }

  async getNewsEvents(hours = 24) {
    try {
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      
      const rows = await this.db.all(`
        SELECT * FROM news_events
        WHERE timestamp > ?
        ORDER BY timestamp DESC
      `, [cutoff])
      
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        impact: row.impact,
        currency: row.currency,
        source: row.source,
        timestamp: row.timestamp
      }))
    } catch (error) {
      this.logger.error('Error getting news events:', error)
      throw error
    }
  }

  async saveEconomicEvent(economicEvent) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO economic_events
        (id, title, currency, impact, actual, forecast, previous, event_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        economicEvent.id,
        economicEvent.title,
        economicEvent.currency,
        economicEvent.impact,
        economicEvent.actual,
        economicEvent.forecast,
        economicEvent.previous,
        economicEvent.eventTime,
        economicEvent.timestamp
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving economic event:', error)
      throw error
    }
  }

  async getEconomicEvents(hours = 24) {
    try {
      const cutoff = Date.now() - hours * 60 * 60 * 1000
      
      const rows = await this.db.all(`
        SELECT * FROM economic_events
        WHERE timestamp > ?
        ORDER BY event_time DESC
      `, [cutoff])
      
      return rows.map(row => ({
        id: row.event_id,
        country: row.country,
        title: row.title,
        actual: row.actual,
        previous: row.previous,
        forecast: row.forecast,
        impact: row.impact,
        timestamp: row.timestamp,
        event_time: row.event_time
      }))
    } catch (error) {
      this.logger.error('Error getting economic events:', error)
      return []
    }
  }

  // Database maintenance
  async vacuum() {
    try {
      await this.db.exec('VACUUM')
      this.logger.info('Database vacuumed')
      return true
    } catch (error) {
      this.logger.error('Error vacuuming database:', error)
      throw error
    }
  }

  async analyze() {
    try {
      await this.db.exec('ANALYZE')
      this.logger.info('Database analyzed')
      return true
    } catch (error) {
      this.logger.error('Error analyzing database:', error)
      throw error
    }
  }

  async getStats() {
    try {
      const stats = {}
      
      // Table row counts
      const tables = [
        'ohlcv_data', 'positions', 'orders', 'trades',
        'account_balance', 'model_states', 'model_performance',
        'risk_violations', 'metrics', 'news_events'
      ]
      
      for (const table of tables) {
        const result = await this.db.get(`SELECT COUNT(*) as count FROM ${table}`)
        stats[table] = result.count
      }
      
      // Database size
      const sizeResult = await this.db.get(`
        SELECT page_count * page_size as size 
        FROM pragma_page_count(), pragma_page_size()
      `)
      stats.database_size = sizeResult.size
      
      return stats
    } catch (error) {
      this.logger.error('Error getting database stats:', error)
      throw error
    }
  }

  // Cleanup old data
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
      
      // Clean up old OHLCV data (keep more for analysis)
      await this.db.run(`
        DELETE FROM ohlcv_data 
        WHERE timestamp < ? AND timeframe IN ('1m', '5m')
      `, [cutoff])
      
      // Clean up old metrics
      await this.db.run(`
        DELETE FROM metrics WHERE timestamp < ?
      `, [cutoff])
      
      // Clean up old news events
      await this.db.run(`
        DELETE FROM news_events WHERE timestamp < ?
      `, [cutoff])
      
      // Clean up old risk violations
      await this.db.run(`
        DELETE FROM risk_violations WHERE timestamp < ?
      `, [cutoff])
      
      this.logger.info(`Cleaned up data older than ${daysToKeep} days`)
      return true
    } catch (error) {
      this.logger.error('Error cleaning up old data:', error)
      throw error
    }
  }

  // Backup and restore
  async backup(backupPath) {
    try {
      const backupFile = path.join(backupPath, `trading_backup_${Date.now()}.db`)
      await this.db.backup(backupFile)
      
      this.logger.info(`Database backed up to: ${backupFile}`)
      return backupFile
    } catch (error) {
      this.logger.error('Error backing up database:', error)
      throw error
    }
  }

  // Health check
  async healthCheck() {
    try {
      // Test basic query
      await this.db.get('SELECT 1')
      
      // Check database integrity
      const integrityResult = await this.db.get('PRAGMA integrity_check')
      const isHealthy = integrityResult.integrity_check === 'ok'
      
      const stats = await this.getStats()
      
      return {
        status: isHealthy ? 'healthy' : 'error',
        integrity: integrityResult.integrity_check,
        stats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Database health check failed:', error)
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('Cleaning up Database Manager')
      
      // Perform final maintenance
      await this.analyze()
      
      // Close database connection
      if (this.db) {
        await this.db.close()
      }
      
      this.isInitialized = false
      this.logger.info('Database Manager cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during database cleanup:', error)
    }
  }
}