import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'

// Import bybit-api for official Bybit API integration
let BybitAPI
try {
  BybitAPI = await import('bybit-api')
} catch (error) {
  console.warn('bybit-api not available, using fallback implementation')
}

export class BybitIntegration extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.metrics = new MetricsCollector()
    
    // Configuration with your provided API credentials
    this.config = {
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_SECRET || '',
      testnet: process.env.BYBIT_TESTNET === 'true' || false,
      symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT'],
      timeframes: ['1', '3', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
      updateInterval: 1000,
      maxPositions: 10,
      maxRiskPerTrade: 0.02,
      maxDailyLoss: 0.05,
      ...options
    }
    
    // Bybit API connections
    this.session = null
    this.ws = null
    this.isConnected = false
    this.isInitialized = false
    
    // Trading state
    this.positions = new Map()
    this.orders = new Map()
    this.trades = []
    this.balance = {
      equity: 0,
      balance: 0,
      margin: 0,
      freeMargin: 0,
      marginLevel: 0
    }
    
    // Market data
    this.priceData = new Map()
    this.orderBook = new Map()
    this.recentTrades = new Map()
    this.indicators = new Map()
    
    // Performance tracking
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      startTime: Date.now()
    }
    
    // Strategy signals
    this.strategies = new Map()
    this.signalQueue = []
    this.processingSignals = false
    
    // Rate limiting
    this.requestCount = 0
    this.lastRequestTime = Date.now()
    this.rateLimit = 120 // requests per minute
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Bybit Crypto Trading Platform')
      
      // Initialize dependencies
      await this.db.initialize()
      await this.metrics.initialize()
      
      // Setup Bybit API connection
      await this.setupBybitConnection()
      
      // Load account data
      await this.loadAccountData()
      
      // Load historical data
      await this.loadHistoricalData()
      
      // Initialize trading strategies
      await this.initializeStrategies()
      
      // Start real-time data feeds
      await this.startRealTimeFeeds()
      
      // Start signal processing
      this.startSignalProcessing()
      
      this.isInitialized = true
      this.logger.info('✅ Bybit Crypto Trading Platform initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('❌ Failed to initialize Bybit Integration:', error)
      throw error
    }
  }

  async setupBybitConnection() {
    try {
      this.logger.info('🔗 Setting up Bybit API connection...')
      
      if (!BybitAPI) {
        throw new Error('bybit-api library not available')
      }
      
      // Initialize REST API session
      this.session = new BybitAPI({
        key: this.config.apiKey,
        secret: this.config.secret,
        testnet: this.config.testnet,
        recv_window: 5000
      })
      
      // Test connection
      const serverTime = await this.session.getServerTime()
      this.logger.info(`✅ Bybit server time: ${new Date(serverTime.timeNano / 1000000)}`)
      
      // Initialize WebSocket connection
      await this.setupWebSocket()

      if (!this.config.apiKey || !this.config.secret) {
        this.logger.warn('BYBIT credentials not set; authenticated API calls and private streams are disabled.')
      }
      
      this.isConnected = true
      this.logger.info('✅ Bybit connection established successfully')
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to Bybit:', error)
      throw error
    }
  }

  async setupWebSocket() {
    try {
      // Initialize WebSocket connection
      this.ws = new BybitAPI({
        key: this.config.apiKey,
        secret: this.config.secret,
        testnet: this.config.testnet,
        recv_window: 5000
      })
      
      // Subscribe to market data streams
      for (const symbol of this.config.symbols) {
        // Subscribe to orderbook
        this.ws.subscribe(['orderbook.50.' + symbol], (data) => {
          this.handleOrderBookUpdate(symbol, data)
        })
        
        // Subscribe to trades
        this.ws.subscribe(['publicTrade.' + symbol], (data) => {
          this.handleTradeUpdate(symbol, data)
        })
        
        // Subscribe to ticker
        this.ws.subscribe(['tickers.' + symbol], (data) => {
          this.handleTickerUpdate(symbol, data)
        })
      }
      
      // Subscribe to account updates (private streams)
      this.ws.subscribe(['position'], (data) => {
        this.handlePositionUpdate(data)
      })
      
      this.ws.subscribe(['order'], (data) => {
        this.handleOrderUpdate(data)
      })
      
      this.ws.subscribe(['wallet'], (data) => {
        this.handleWalletUpdate(data)
      })
      
      this.logger.info('✅ WebSocket streams connected')
      
    } catch (error) {
      this.logger.error('❌ Failed to setup WebSocket:', error)
      throw error
    }
  }

  async loadAccountData() {
    try {
      this.logger.info('💰 Loading account data...')
      
      // Get wallet balance
      const wallet = await this.session.getWalletBalance({
        accountType: 'UNIFIED'
      })
      
      if (wallet.retCode === 0 && wallet.result && wallet.result.list) {
        const account = wallet.result.list[0]
        this.balance = {
          equity: parseFloat(account.totalEquity),
          balance: parseFloat(account.totalWalletBalance),
          margin: parseFloat(account.totalInitialMargin),
          freeMargin: parseFloat(account.totalAvailableBalance),
          marginLevel: parseFloat(account.totalMarginRatio) * 100
        }
      }
      
      // Get open positions
      const positions = await this.session.getPositions({
        category: 'linear'
      })
      
      if (positions.retCode === 0 && positions.result && positions.result.list) {
        for (const pos of positions.result.list) {
          if (parseFloat(pos.size) > 0) {
            this.positions.set(pos.symbol, {
              symbol: pos.symbol,
              side: pos.side,
              size: parseFloat(pos.size),
              entryPrice: parseFloat(pos.avgPrice),
              currentPrice: parseFloat(pos.markPrice),
              pnl: parseFloat(pos.unrealisedPnl),
              pnlPercent: parseFloat(pos.unrealisedPnlPercent),
              timestamp: Date.now(),
              status: 'open'
            })
          }
        }
      }
      
      // Get open orders
      const orders = await this.session.getOpenOrders({
        category: 'linear'
      })
      
      if (orders.retCode === 0 && orders.result && orders.result.list) {
        for (const order of orders.result.list) {
          this.orders.set(order.orderId, {
            id: order.orderId,
            symbol: order.symbol,
            type: order.orderType,
            side: order.side,
            size: parseFloat(order.qty),
            price: parseFloat(order.price),
            status: order.orderStatus,
            timestamp: Date.now()
          })
        }
      }
      
      this.logger.info(`✅ Loaded ${this.positions.size} positions and ${this.orders.size} orders`)
      
    } catch (error) {
      this.logger.error('❌ Error loading account data:', error)
      throw error
    }
  }

  async loadHistoricalData() {
    try {
      this.logger.info('📊 Loading historical data...')
      
      for (const symbol of this.config.symbols) {
        for (const interval of this.config.timeframes.slice(0, 5)) { // Load first 5 timeframes
          try {
            const klines = await this.session.getKline({
              category: 'linear',
              symbol: symbol,
              interval: interval,
              limit: 1000
            })
            
            if (klines.retCode === 0 && klines.result && klines.result.list) {
              const ohlcv = klines.result.list.map(k => [
                parseInt(k[0]), // timestamp
                parseFloat(k[1]), // open
                parseFloat(k[2]), // high
                parseFloat(k[3]), // low
                parseFloat(k[4]), // close
                parseFloat(k[5])  // volume
              ])
              
              this.priceData.set(`${symbol}_${interval}`, ohlcv)
              
              // Calculate indicators
              this.calculateIndicators(symbol, interval, ohlcv)
              
              this.logger.info(`📈 Loaded ${ohlcv.length} bars for ${symbol} ${interval}`)
            }
          } catch (error) {
            this.logger.warn(`⚠️ Failed to load ${symbol} ${interval}:`, error.message)
          }
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Error loading historical data:', error)
    }
  }

  calculateIndicators(symbol, interval, ohlcv) {
    try {
      const closes = ohlcv.map(candle => candle[4])
      const highs = ohlcv.map(candle => candle[2])
      const lows = ohlcv.map(candle => candle[3])
      const volumes = ohlcv.map(candle => candle[5])
      
      // Calculate SMA
      const sma20 = this.calculateSMA(closes, 20)
      const sma50 = this.calculateSMA(closes, 50)
      
      // Calculate RSI
      const rsi = this.calculateRSI(closes, 14)
      
      // Calculate Bollinger Bands
      const bb = this.calculateBollingerBands(closes, 20, 2)
      
      // Calculate MACD
      const macd = this.calculateMACD(closes)
      
      // Calculate ATR
      const atr = this.calculateATR(ohlcv, 14)
      
      this.indicators.set(`${symbol}_${interval}`, {
        sma20,
        sma50,
        rsi,
        bollingerBands: bb,
        macd,
        atr,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error(`❌ Error calculating indicators for ${symbol} ${interval}:`, error)
    }
  }

  // Technical indicator calculations
  calculateSMA(data, period) {
    if (data.length < period) return null
    const sum = data.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  calculateRSI(data, period) {
    if (data.length < period + 1) return null
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  calculateBollingerBands(data, period, stdDev) {
    const sma = this.calculateSMA(data, period)
    if (!sma) return null
    
    const variance = data.slice(-period).reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2)
    }, 0) / period
    
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }

  calculateMACD(data) {
    if (data.length < 26) return null
    
    const ema12 = this.calculateEMA(data, 12)
    const ema26 = this.calculateEMA(data, 26)
    
    if (!ema12 || !ema26) return null
    
    const macd = ema12 - ema26
    const signal = this.calculateEMA([...Array(data.length - 26).fill(0), macd], 9)
    
    return {
      macd,
      signal: signal || 0,
      histogram: macd - (signal || 0)
    }
  }

  calculateEMA(data, period) {
    if (data.length < period) return null
    
    const multiplier = 2 / (period + 1)
    let ema = data[0]
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  calculateATR(ohlcv, period) {
    if (ohlcv.length < period + 1) return null
    
    const trueRanges = []
    for (let i = 1; i < ohlcv.length; i++) {
      const high = ohlcv[i][2]
      const low = ohlcv[i][3]
      const prevClose = ohlcv[i - 1][4]
      
      const tr1 = high - low
      const tr2 = Math.abs(high - prevClose)
      const tr3 = Math.abs(low - prevClose)
      
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    const sum = trueRanges.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  async initializeStrategies() {
    try {
      this.logger.info('🤖 Initializing trading strategies...')
      
      // Trend Following Strategy
      this.strategies.set('trendFollowing', {
        name: 'Trend Following',
        enabled: true,
        params: {
          shortPeriod: 20,
          longPeriod: 50,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30
        },
        signals: new Map(),
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          totalPnL: 0,
          winRate: 0
        }
      })
      
      // Mean Reversion Strategy
      this.strategies.set('meanReversion', {
        name: 'Mean Reversion',
        enabled: true,
        params: {
          bbPeriod: 20,
          bbStdDev: 2,
          rsiPeriod: 14
        },
        signals: new Map(),
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          totalPnL: 0,
          winRate: 0
        }
      })
      
      // Breakout Strategy
      this.strategies.set('breakout', {
        name: 'Breakout',
        enabled: true,
        params: {
          atrPeriod: 14,
          breakoutMultiplier: 2
        },
        signals: new Map(),
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          totalPnL: 0,
          winRate: 0
        }
      })
      
      this.logger.info(`✅ Initialized ${this.strategies.size} trading strategies`)
      
    } catch (error) {
      this.logger.error('❌ Error initializing strategies:', error)
    }
  }

  async startRealTimeFeeds() {
    try {
      this.logger.info('📡 Starting real-time data feeds...')
      
      // Update account data every 30 seconds
      setInterval(async () => {
        await this.updateAccountData()
      }, 30000)
      
      // Update performance metrics every minute
      setInterval(async () => {
        await this.updatePerformanceMetrics()
      }, 60000)
      
      this.logger.info('✅ Real-time feeds started')
      
    } catch (error) {
      this.logger.error('❌ Error starting real-time feeds:', error)
    }
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
      }
      
    } catch (error) {
      this.logger.error('❌ Error executing signal:', error)
    }
  }

  async validateRisk(signal) {
    try {
      // Check daily loss limit
      if (this.performance.totalPnL < -(this.balance.equity * this.config.maxDailyLoss)) {
        return { approved: false, reason: 'Daily loss limit exceeded' }
      }
      
      // Check position count
      if (this.positions.size >= this.config.maxPositions) {
        return { approved: false, reason: 'Maximum positions reached' }
      }
      
      // Check position size
      const positionValue = signal.size * signal.price
      const accountValue = this.balance.equity
      
      if (positionValue > accountValue * this.config.maxRiskPerTrade) {
        return { approved: false, reason: 'Position size exceeds risk limit' }
      }
      
      return { approved: true }
      
    } catch (error) {
      this.logger.error('❌ Error validating risk:', error)
      return { approved: false, reason: 'Risk validation error' }
    }
  }

  // WebSocket event handlers
  handleOrderBookUpdate(symbol, data) {
    try {
      this.orderBook.set(symbol, data)
      
      this.emit('orderbook_update', {
        symbol,
        data,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error(`❌ Error handling orderbook update for ${symbol}:`, error)
    }
  }

  handleTradeUpdate(symbol, data) {
    try {
      this.recentTrades.set(symbol, data)
      
      this.emit('trade_update', {
        symbol,
        data,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error(`❌ Error handling trade update for ${symbol}:`, error)
    }
  }

  handleTickerUpdate(symbol, data) {
    try {
      // Update price data
      this.priceData.set(`${symbol}_realtime`, data)
      
      // Update position P&L
      this.updatePositionPnL(symbol, data)
      
      // Check for trading signals
      this.checkTradingSignals(symbol, data)
      
      this.emit('ticker_update', {
        symbol,
        data,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error(`❌ Error handling ticker update for ${symbol}:`, error)
    }
  }

  handlePositionUpdate(data) {
    try {
      for (const position of data) {
        if (parseFloat(position.size) > 0) {
          this.positions.set(position.symbol, {
            symbol: position.symbol,
            side: position.side,
            size: parseFloat(position.size),
            entryPrice: parseFloat(position.avgPrice),
            currentPrice: parseFloat(position.markPrice),
            pnl: parseFloat(position.unrealisedPnl),
            pnlPercent: parseFloat(position.unrealisedPnlPercent),
            timestamp: Date.now(),
            status: 'open'
          })
        } else {
          this.positions.delete(position.symbol)
        }
      }
      
      this.emit('position_update', {
        positions: Array.from(this.positions.values()),
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling position update:', error)
    }
  }

  handleOrderUpdate(data) {
    try {
      for (const order of data) {
        this.orders.set(order.orderId, {
          id: order.orderId,
          symbol: order.symbol,
          type: order.orderType,
          side: order.side,
          size: parseFloat(order.qty),
          price: parseFloat(order.price),
          status: order.orderStatus,
          timestamp: Date.now()
        })
      }
      
      this.emit('order_update', {
        orders: Array.from(this.orders.values()),
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling order update:', error)
    }
  }

  handleWalletUpdate(data) {
    try {
      for (const wallet of data) {
        this.balance = {
          equity: parseFloat(wallet.totalEquity),
          balance: parseFloat(wallet.totalWalletBalance),
          margin: parseFloat(wallet.totalInitialMargin),
          freeMargin: parseFloat(wallet.totalAvailableBalance),
          marginLevel: parseFloat(wallet.totalMarginRatio) * 100
        }
      }
      
      this.emit('wallet_update', {
        balance: this.balance,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling wallet update:', error)
    }
  }

  // Trading methods
  async placeOrder(symbol, type, side, size, price = null) {
    try {
      const orderParams = {
        category: 'linear',
        symbol: symbol,
        side: side,
        orderType: type,
        qty: size.toString(),
        timeInForce: 'GTC'
      }
      
      if (price && type !== 'Market') {
        orderParams.price = price.toString()
      }
      
      const order = await this.session.placeOrder(orderParams)
      
      if (order.retCode === 0) {
        this.logger.info(`✅ Order placed: ${side} ${size} ${symbol} at ${price || 'market'}`)
        return order.result
      } else {
        this.logger.error(`❌ Order failed: ${order.retMsg}`)
        return null
      }
      
    } catch (error) {
      this.logger.error('❌ Error placing order:', error)
      return null
    }
  }

  async cancelOrder(orderId, symbol) {
    try {
      const result = await this.session.cancelOrder({
        category: 'linear',
        symbol: symbol,
        orderId: orderId
      })
      
      if (result.retCode === 0) {
        this.logger.info(`✅ Order cancelled: ${orderId}`)
        return result.result
      } else {
        this.logger.error(`❌ Cancel failed: ${result.retMsg}`)
        return null
      }
      
    } catch (error) {
      this.logger.error('❌ Error cancelling order:', error)
      return null
    }
  }

  async closePosition(symbol, side) {
    try {
      const position = this.positions.get(symbol)
      if (!position) {
        this.logger.warn(`⚠️ No position found for ${symbol}`)
        return null
      }
      
      const closeSide = side === 'Buy' ? 'Sell' : 'Buy'
      const order = await this.placeOrder(symbol, 'Market', closeSide, position.size)
      
      if (order) {
        this.logger.info(`✅ Position closed: ${symbol}`)
        this.positions.delete(symbol)
      }
      
      return order
      
    } catch (error) {
      this.logger.error('❌ Error closing position:', error)
      return null
    }
  }

  // Public API methods
  getStatus() {
    return {
      connected: this.isConnected,
      initialized: this.isInitialized,
      positions: this.positions.size,
      orders: this.orders.size,
      balance: this.balance,
      performance: this.performance,
      timestamp: Date.now()
    }
  }

  getBalance() {
    return this.balance
  }

  getPositions() {
    return Array.from(this.positions.values())
  }

  getOrders() {
    return Array.from(this.orders.values())
  }

  getPriceData(symbol, interval = '1') {
    return this.priceData.get(`${symbol}_${interval}`)
  }

  getOrderBook(symbol) {
    return this.orderBook.get(symbol)
  }

  getRecentTrades(symbol) {
    return this.recentTrades.get(symbol)
  }

  getIndicators(symbol, interval = '1') {
    return this.indicators.get(`${symbol}_${interval}`)
  }

  getStrategySignals() {
    const signals = {}
    for (const [name, strategy] of this.strategies) {
      signals[name] = {
        name: strategy.name,
        enabled: strategy.enabled,
        signals: Object.fromEntries(strategy.signals),
        performance: strategy.performance
      }
    }
    return signals
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up Bybit Integration')
      
      if (this.ws) {
        this.ws.stop()
      }
      
      this.isConnected = false
      this.isInitialized = false
      
      this.logger.info('✅ Bybit Integration cleaned up')
      
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error)
    }
  }
} 