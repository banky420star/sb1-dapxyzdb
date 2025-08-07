import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { BybitIntegration } from '../data/bybit-integration.js'
import { ModelManager } from '../ml/manager.js'
import { RiskManager } from '../risk/manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'

export class CryptoTradingEngine extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.bybit = options.bybit || new BybitIntegration()
    this.modelManager = options.modelManager || new ModelManager()
    this.riskManager = options.riskManager || new RiskManager()
    this.metrics = options.metrics || new MetricsCollector()
    this.io = options.io // Socket.io instance
    
    // Trading state
    this.isRunning = false
    this.tradingMode = 'paper' // 'paper' or 'live'
    this.emergencyStop = false
    this.isInitialized = false
    
    // Crypto-specific configuration
    this.config = {
      symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT'],
      timeframes: ['1', '3', '5', '15', '30', '60', '240', 'D'],
      maxPositions: 10,
      maxRiskPerTrade: 0.02, // 2%
      maxDailyLoss: 0.05,    // 5%
      minOrderSize: {
        BTCUSDT: 0.001,
        ETHUSDT: 0.01,
        ADAUSDT: 1,
        DOTUSDT: 0.1,
        SOLUSDT: 0.1,
        MATICUSDT: 1
      },
      leverage: 1, // No leverage for spot trading
      ...options
    }
    
    // Performance tracking
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      startTime: Date.now(),
      peakBalance: 0
    }
    
    // Signal processing
    this.signalQueue = []
    this.processingSignals = false
    
    // Strategy configurations
    this.strategies = {
      trendFollowing: {
        enabled: true,
        params: {
          shortPeriod: 20,
          longPeriod: 50,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30
        }
      },
      meanReversion: {
        enabled: true,
        params: {
          bbPeriod: 20,
          bbStdDev: 2,
          rsiPeriod: 14
        }
      },
      breakout: {
        enabled: true,
        params: {
          atrPeriod: 14,
          breakoutMultiplier: 2
        }
      }
    }
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Crypto Trading Engine')
      
      // Initialize dependencies
      await this.db.initialize()
      await this.bybit.initialize()
      await this.modelManager.initialize()
      await this.riskManager.initialize()
      await this.metrics.initialize()
      
      // Setup event listeners
      this.setupEventListeners()
      
      // Start signal processing
      this.startSignalProcessing()
      
      // Start performance monitoring
      this.startPerformanceMonitoring()
      
      this.isInitialized = true
      this.logger.info('✅ Crypto Trading Engine initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('❌ Failed to initialize Crypto Trading Engine:', error)
      throw error
    }
  }

  setupEventListeners() {
    // Bybit events
    this.bybit.on('ticker_update', (data) => {
      this.handlePriceUpdate(data)
    })
    
    this.bybit.on('position_update', (data) => {
      this.handlePositionUpdate(data)
    })
    
    this.bybit.on('order_update', (data) => {
      this.handleOrderUpdate(data)
    })
    
    this.bybit.on('wallet_update', (data) => {
      this.handleWalletUpdate(data)
    })
    
    // Model manager events
    this.modelManager.on('prediction', async (prediction) => {
      await this.handleModelPrediction(prediction)
    })
    
    // Risk manager events
    this.riskManager.on('risk_violation', async (violation) => {
      await this.handleRiskViolation(violation)
    })
  }

  startSignalProcessing() {
    setInterval(async () => {
      if (!this.processingSignals && this.signalQueue.length > 0) {
        this.processingSignals = true
        try {
          await this.processSignalQueue()
        } catch (error) {
          this.logger.error('❌ Error processing signal queue:', error)
        } finally {
          this.processingSignals = false
        }
      }
    }, 1000)
  }

  startPerformanceMonitoring() {
    setInterval(async () => {
      await this.updatePerformanceMetrics()
    }, 60000) // Every minute
  }

  async processSignalQueue() {
    while (this.signalQueue.length > 0) {
      const signal = this.signalQueue.shift()
      try {
        await this.executeSignal(signal)
      } catch (error) {
        this.logger.error('❌ Error executing signal:', error)
      }
    }
  }

  async executeSignal(signal) {
    try {
      // Risk check
      const riskCheck = await this.validateRisk(signal)
      if (!riskCheck.approved) {
        this.logger.warn(`⚠️ Signal rejected by risk manager: ${riskCheck.reason}`)
        return
      }
      
      // Execute trade
      const order = await this.placeOrder(signal.symbol, signal.type, signal.side, signal.size, signal.price)
      
      if (order) {
        this.logger.info(`✅ Signal executed: ${signal.side} ${signal.size} ${signal.symbol} at ${signal.price}`)
        
        // Emit trade event
        this.emit('signal_executed', {
          signal,
          order,
          timestamp: Date.now()
        })
        
        // Update metrics
        this.metrics.recordTrade(order)
      }
      
    } catch (error) {
      this.logger.error('❌ Error executing signal:', error)
    }
  }

  async validateRisk(signal) {
    try {
      // Check daily loss limit
      if (this.performance.totalPnL < -(this.performance.peakBalance * this.config.maxDailyLoss)) {
        return { approved: false, reason: 'Daily loss limit exceeded' }
      }
      
      // Check position count
      const positions = this.bybit.getPositions()
      if (positions.length >= this.config.maxPositions) {
        return { approved: false, reason: 'Maximum positions reached' }
      }
      
      // Check position size
      const positionValue = signal.size * signal.price
      const balance = this.bybit.getBalance()
      const accountValue = balance.equity
      
      if (positionValue > accountValue * this.config.maxRiskPerTrade) {
        return { approved: false, reason: 'Position size exceeds risk limit' }
      }
      
      // Check minimum order size
      const minSize = this.config.minOrderSize[signal.symbol]
      if (signal.size < minSize) {
        return { approved: false, reason: `Order size below minimum (${minSize})` }
      }
      
      return { approved: true }
      
    } catch (error) {
      this.logger.error('❌ Error validating risk:', error)
      return { approved: false, reason: 'Risk validation error' }
    }
  }

  async placeOrder(symbol, type, side, size, price = null) {
    try {
      if (this.tradingMode === 'paper') {
        return await this.executePaperOrder(symbol, type, side, size, price)
      } else {
        return await this.bybit.placeOrder(symbol, type, side, size, price)
      }
    } catch (error) {
      this.logger.error('❌ Error placing order:', error)
      return null
    }
  }

  async executePaperOrder(symbol, type, side, size, price) {
    try {
      // Simulate order execution
      const executionPrice = price || this.getCurrentPrice(symbol)
      const slippage = (Math.random() - 0.5) * 0.0001 // 1 pip slippage
      const finalPrice = executionPrice + (side === 'Buy' ? slippage : -slippage)
      
      const order = {
        orderId: `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        orderType: type,
        qty: size.toString(),
        price: finalPrice.toString(),
        status: 'Filled',
        timestamp: Date.now()
      }
      
      // Create position
      const position = {
        symbol,
        side,
        size: parseFloat(size),
        entryPrice: finalPrice,
        currentPrice: finalPrice,
        pnl: 0,
        pnlPercent: 0,
        timestamp: Date.now(),
        status: 'open'
      }
      
      // Store in database
      await this.db.saveTrade({
        id: order.orderId,
        symbol,
        side,
        quantity: size,
        price: finalPrice,
        timestamp: new Date().toISOString(),
        status: 'filled',
        type: 'paper'
      })
      
      this.logger.info(`📝 Paper order executed: ${side} ${size} ${symbol} at ${finalPrice}`)
      
      return order
      
    } catch (error) {
      this.logger.error('❌ Error executing paper order:', error)
      return null
    }
  }

  getCurrentPrice(symbol) {
    const ticker = this.bybit.getPriceData(symbol, 'realtime')
    return ticker ? ticker.last : 0
  }

  async handlePriceUpdate(data) {
    try {
      // Update position P&L
      this.updatePositionPnL(data.symbol, data)
      
      // Check for trading signals
      if (this.isRunning && !this.emergencyStop) {
        await this.checkTradingSignals(data.symbol, data)
      }
      
      // Emit to connected clients
      if (this.io) {
        this.io.emit('crypto_price_update', data)
      }
      
      // Update metrics
      this.metrics.recordPriceUpdate(data)
      
    } catch (error) {
      this.logger.error('❌ Error handling price update:', error)
    }
  }

  async handlePositionUpdate(data) {
    try {
      // Update internal position tracking
      for (const position of data.positions) {
        if (parseFloat(position.size) > 0) {
          this.positions.set(position.symbol, position)
        } else {
          this.positions.delete(position.symbol)
        }
      }
      
      // Emit to connected clients
      if (this.io) {
        this.io.emit('crypto_position_update', data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling position update:', error)
    }
  }

  async handleOrderUpdate(data) {
    try {
      // Update internal order tracking
      for (const order of data.orders) {
        this.orders.set(order.id, order)
      }
      
      // Emit to connected clients
      if (this.io) {
        this.io.emit('crypto_order_update', data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling order update:', error)
    }
  }

  async handleWalletUpdate(data) {
    try {
      // Update balance tracking
      this.balance = data.balance
      
      // Update performance metrics
      if (this.balance.equity > this.performance.peakBalance) {
        this.performance.peakBalance = this.balance.equity
      }
      
      // Emit to connected clients
      if (this.io) {
        this.io.emit('crypto_wallet_update', data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling wallet update:', error)
    }
  }

  async handleModelPrediction(prediction) {
    try {
      if (!this.isRunning || this.emergencyStop) return
      
      // Convert prediction to signal
      const signal = {
        symbol: prediction.symbol,
        action: prediction.direction > 0 ? 'Buy' : 'Sell',
        signal: prediction.direction,
        confidence: prediction.confidence,
        timestamp: Date.now(),
        source: 'model',
        modelType: prediction.modelType,
        predictions: [prediction]
      }
      
      // Add to signal queue
      this.signalQueue.push(signal)
      
      this.metrics.recordPrediction(prediction)
      
    } catch (error) {
      this.logger.error('❌ Error handling model prediction:', error)
    }
  }

  async handleRiskViolation(violation) {
    try {
      this.logger.warn(`⚠️ Risk violation detected: ${violation.type} - ${violation.message}`)
      
      switch (violation.severity) {
        case 'critical':
          await this.emergencyStop()
          break
        case 'high':
          await this.closeAllPositions('risk_violation')
          break
        case 'medium':
          this.isRunning = false
          setTimeout(() => {
            this.isRunning = true
          }, 60000) // Stop for 1 minute
          break
        default:
          // Log only
          break
      }
      
      this.emit('risk_violation', violation)
      this.metrics.recordRiskViolation(violation)
      
    } catch (error) {
      this.logger.error('❌ Error handling risk violation:', error)
    }
  }

  async checkTradingSignals(symbol, priceData) {
    try {
      // Get latest indicators
      const indicators = this.bybit.getIndicators(symbol, '15')
      if (!indicators) return
      
      // Check each strategy
      for (const [strategyName, strategy] of Object.entries(this.strategies)) {
        if (strategy.enabled) {
          const signal = await this.calculateStrategySignal(strategyName, symbol, priceData, indicators)
          
          if (signal && signal.confidence > 0.6) {
            this.signalQueue.push(signal)
          }
        }
      }
      
    } catch (error) {
      this.logger.error(`❌ Error checking trading signals for ${symbol}:`, error)
    }
  }

  async calculateStrategySignal(strategyName, symbol, priceData, indicators) {
    try {
      const currentPrice = priceData.last || priceData.close
      
      switch (strategyName) {
        case 'trendFollowing':
          return this.calculateTrendFollowingSignal(symbol, currentPrice, indicators)
        case 'meanReversion':
          return this.calculateMeanReversionSignal(symbol, currentPrice, indicators)
        case 'breakout':
          return this.calculateBreakoutSignal(symbol, currentPrice, indicators)
        default:
          return null
      }
    } catch (error) {
      this.logger.error(`❌ Error calculating ${strategyName} signal:`, error)
      return null
    }
  }

  calculateTrendFollowingSignal(symbol, price, indicators) {
    try {
      const { sma20, sma50, rsi } = indicators
      if (!sma20 || !sma50 || !rsi) return null
      
      const signal = {
        symbol,
        type: 'Market',
        side: 'Hold',
        size: 0,
        price,
        confidence: 0,
        strategy: 'trendFollowing',
        timestamp: Date.now()
      }
      
      // Generate signal based on MA crossover and RSI
      if (sma20 > sma50 && rsi < 70) {
        signal.side = 'Buy'
        signal.confidence = Math.min((sma20 - sma50) / sma50 * 10, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      } else if (sma20 < sma50 && rsi > 30) {
        signal.side = 'Sell'
        signal.confidence = Math.min((sma50 - sma20) / sma50 * 10, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      }
      
      return signal.confidence > 0.6 ? signal : null
      
    } catch (error) {
      this.logger.error('❌ Error calculating trend following signal:', error)
      return null
    }
  }

  calculateMeanReversionSignal(symbol, price, indicators) {
    try {
      const { bollingerBands, rsi } = indicators
      if (!bollingerBands || !rsi) return null
      
      const signal = {
        symbol,
        type: 'Market',
        side: 'Hold',
        size: 0,
        price,
        confidence: 0,
        strategy: 'meanReversion',
        timestamp: Date.now()
      }
      
      // Generate signal based on price position relative to BB and RSI
      if (price < bollingerBands.lower && rsi < 30) {
        signal.side = 'Buy'
        signal.confidence = Math.min((bollingerBands.middle - price) / bollingerBands.middle, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      } else if (price > bollingerBands.upper && rsi > 70) {
        signal.side = 'Sell'
        signal.confidence = Math.min((price - bollingerBands.middle) / bollingerBands.middle, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      }
      
      return signal.confidence > 0.6 ? signal : null
      
    } catch (error) {
      this.logger.error('❌ Error calculating mean reversion signal:', error)
      return null
    }
  }

  calculateBreakoutSignal(symbol, price, indicators) {
    try {
      const { atr } = indicators
      if (!atr) return null
      
      // Get recent price data for support/resistance calculation
      const priceData = this.bybit.getPriceData(symbol, '15')
      if (!priceData || priceData.length < 20) return null
      
      const recentHigh = Math.max(...priceData.slice(-20).map(candle => candle[2]))
      const recentLow = Math.min(...priceData.slice(-20).map(candle => candle[3]))
      
      const signal = {
        symbol,
        type: 'Market',
        side: 'Hold',
        size: 0,
        price,
        confidence: 0,
        strategy: 'breakout',
        timestamp: Date.now()
      }
      
      // Generate signal based on breakout levels
      const breakoutThreshold = atr * 2
      
      if (price > recentHigh + breakoutThreshold) {
        signal.side = 'Buy'
        signal.confidence = Math.min((price - recentHigh) / atr, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      } else if (price < recentLow - breakoutThreshold) {
        signal.side = 'Sell'
        signal.confidence = Math.min((recentLow - price) / atr, 1)
        signal.size = this.calculatePositionSize(symbol, signal.confidence)
      }
      
      return signal.confidence > 0.6 ? signal : null
      
    } catch (error) {
      this.logger.error('❌ Error calculating breakout signal:', error)
      return null
    }
  }

  calculatePositionSize(symbol, confidence) {
    try {
      const balance = this.bybit.getBalance()
      const accountValue = balance.equity
      const riskAmount = accountValue * this.config.maxRiskPerTrade * confidence
      const currentPrice = this.getCurrentPrice(symbol)
      
      if (currentPrice <= 0) return 0
      
      const positionSize = riskAmount / currentPrice
      const minSize = this.config.minOrderSize[symbol] || 0.001
      
      return Math.max(positionSize, minSize)
      
    } catch (error) {
      this.logger.error('❌ Error calculating position size:', error)
      return 0
    }
  }

  updatePositionPnL(symbol, priceData) {
    try {
      const position = this.bybit.getPositions().find(p => p.symbol === symbol)
      if (!position) return
      
      const currentPrice = priceData.last || priceData.close
      const oldPnL = position.pnl
      
      // Calculate new P&L
      if (position.side === 'Buy') {
        position.pnl = (currentPrice - position.entryPrice) * position.size
      } else {
        position.pnl = (position.entryPrice - currentPrice) * position.size
      }
      
      position.currentPrice = currentPrice
      position.pnlPercent = (position.pnl / (position.entryPrice * position.size)) * 100
      
      // Update performance if P&L changed significantly
      if (Math.abs(position.pnl - oldPnL) > 0.01) {
        this.updatePerformanceMetrics()
      }
      
    } catch (error) {
      this.logger.error('❌ Error updating position P&L:', error)
    }
  }

  async updatePerformanceMetrics() {
    try {
      const positions = this.bybit.getPositions()
      const balance = this.bybit.getBalance()
      
      // Calculate total P&L
      let totalPnL = 0
      for (const position of positions) {
        totalPnL += position.pnl
      }
      
      this.performance.totalPnL = totalPnL
      
      // Calculate drawdown
      if (balance.equity < this.performance.peakBalance) {
        const drawdown = (this.performance.peakBalance - balance.equity) / this.performance.peakBalance
        this.performance.maxDrawdown = Math.max(this.performance.maxDrawdown, drawdown)
      } else {
        this.performance.peakBalance = balance.equity
      }
      
      // Emit performance update
      this.emit('performance_update', this.performance)
      
      // Update metrics
      this.metrics.recordPerformance(this.performance)
      
    } catch (error) {
      this.logger.error('❌ Error updating performance metrics:', error)
    }
  }

  // Control methods
  async start() {
    try {
      if (!this.isInitialized) {
        throw new Error('Crypto Trading Engine not initialized')
      }
      
      this.isRunning = true
      this.emergencyStop = false
      
      this.logger.info('🚀 Crypto Trading Engine started')
      this.emit('engine_started')
      
      return true
    } catch (error) {
      this.logger.error('❌ Error starting Crypto Trading Engine:', error)
      throw error
    }
  }

  async stop() {
    try {
      this.isRunning = false
      
      this.logger.info('⏹️ Crypto Trading Engine stopped')
      this.emit('engine_stopped')
      
      return true
    } catch (error) {
      this.logger.error('❌ Error stopping Crypto Trading Engine:', error)
      throw error
    }
  }

  async emergencyStop() {
    try {
      this.logger.warn('🚨 EMERGENCY STOP ACTIVATED')
      
      this.isRunning = false
      this.emergencyStop = true
      
      // Close all positions immediately
      await this.closeAllPositions('emergency_stop')
      
      // Cancel all pending orders
      await this.cancelAllOrders()
      
      this.emit('emergency_stop')
      
      return true
    } catch (error) {
      this.logger.error('❌ Error during emergency stop:', error)
      throw error
    }
  }

  async closeAllPositions(reason = 'manual') {
    try {
      const positions = this.bybit.getPositions()
      const closePromises = []
      
      for (const position of positions) {
        if (position.status === 'open') {
          const closeSide = position.side === 'Buy' ? 'Sell' : 'Buy'
          closePromises.push(this.bybit.closePosition(position.symbol, closeSide))
        }
      }
      
      await Promise.all(closePromises)
      
      this.logger.info(`✅ Closed ${closePromises.length} positions`)
      return closePromises.length
    } catch (error) {
      this.logger.error('❌ Error closing all positions:', error)
      throw error
    }
  }

  async cancelAllOrders() {
    try {
      const orders = this.bybit.getOrders()
      let cancelledCount = 0
      
      for (const order of orders) {
        if (order.status === 'New' || order.status === 'PartiallyFilled') {
          await this.bybit.cancelOrder(order.id, order.symbol)
          cancelledCount++
        }
      }
      
      this.logger.info(`✅ Cancelled ${cancelledCount} orders`)
      return cancelledCount
    } catch (error) {
      this.logger.error('❌ Error cancelling all orders:', error)
      throw error
    }
  }

  // Data retrieval methods
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      mode: this.tradingMode,
      emergencyStop: this.emergencyStop,
      bybitStatus: this.bybit.getStatus(),
      performance: this.performance,
      timestamp: Date.now()
    }
  }

  getPositions() {
    return this.bybit.getPositions()
  }

  getOrders() {
    return this.bybit.getOrders()
  }

  getBalance() {
    return this.bybit.getBalance()
  }

  getPerformance() {
    return this.performance
  }

  getStrategySignals() {
    return this.bybit.getStrategySignals()
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up Crypto Trading Engine')
      
      await this.stop()
      await this.bybit.cleanup()
      
      this.isInitialized = false
      this.logger.info('✅ Crypto Trading Engine cleaned up')
      
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error)
    }
  }
} 