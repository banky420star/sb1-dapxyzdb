import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'
import { BybitWebSocketV3 } from './bybit-websocket-v3.js'

// Import bybit-api for official Bybit API integration
let BybitAPI
try {
  BybitAPI = await import('bybit-api')
} catch (error) {
  console.warn('bybit-api not available, using fallback implementation')
}

export class BybitIntegrationEnhanced extends EventEmitter {
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
      useWebSocketV3: true,
      ...options
    }
    
    // Bybit API connections
    this.session = null
    this.wsV3 = null
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
    this.isProcessingSignals = false
    
    this.logger.info('🚀 Enhanced Bybit Integration initialized')
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Enhanced Bybit Crypto Trading Platform')
      
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
      this.logger.info('✅ Enhanced Bybit Crypto Trading Platform initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('❌ Failed to initialize Enhanced Bybit Integration:', error)
      throw error
    }
  }

  async setupBybitConnection() {
    try {
      this.logger.info('🔗 Setting up Enhanced Bybit API connection...')
      
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
      
      // Initialize WebSocket V3 connection
      if (this.config.useWebSocketV3) {
        await this.setupWebSocketV3()
      } else {
        await this.setupLegacyWebSocket()
      }

      if (!this.config.apiKey || !this.config.secret) {
        this.logger.warn('BYBIT credentials not set; private account streams and authenticated calls will be disabled.')
      }
      
      this.isConnected = true
      this.logger.info('✅ Enhanced Bybit connection established successfully')
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to Bybit:', error)
      throw error
    }
  }

  async setupWebSocketV3() {
    try {
      this.logger.info('🔗 Setting up WebSocket V3 connection...')
      
      // Initialize WebSocket V3 client
      this.wsV3 = new BybitWebSocketV3({
        apiKey: this.config.apiKey,
        secret: this.config.secret,
        testnet: this.config.testnet,
        symbols: this.config.symbols,
        heartbeatInterval: 20000,
        reconnectAttempts: 5,
        reconnectDelay: 5000
      })
      
      // Set up event handlers
      this.setupWebSocketV3EventHandlers()
      
      // Connect to WebSocket
      await this.wsV3.connect()
      
      this.logger.info('✅ WebSocket V3 streams connected')
      
    } catch (error) {
      this.logger.error('❌ Failed to setup WebSocket V3:', error)
      throw error
    }
  }

  setupWebSocketV3EventHandlers() {
    // Market data events
    this.wsV3.on('orderbook_update', (data) => {
      this.handleOrderBookUpdate(data.symbol, data.data)
    })
    
    this.wsV3.on('trade_update', (data) => {
      this.handleTradeUpdate(data.symbol, data.data)
    })
    
    this.wsV3.on('ticker_update', (data) => {
      this.handleTickerUpdate(data.symbol, data.data)
    })
    
    // Account events
    this.wsV3.on('position_update', (data) => {
      this.handlePositionUpdate(data.positions)
    })
    
    this.wsV3.on('order_update', (data) => {
      this.handleOrderUpdate(data.orders)
    })
    
    this.wsV3.on('wallet_update', (data) => {
      this.handleWalletUpdate(data.wallet)
    })
    
    this.wsV3.on('execution_update', (data) => {
      this.handleExecutionUpdate(data.executions)
    })
    
    // Connection events
    this.wsV3.on('error', (error) => {
      this.logger.error('❌ WebSocket V3 error:', error)
      this.emit('websocket_error', error)
    })
    
    this.wsV3.on('max_reconnect_attempts_reached', () => {
      this.logger.error('❌ WebSocket V3 max reconnection attempts reached')
      this.emit('websocket_max_reconnect_attempts')
    })
  }

  async setupLegacyWebSocket() {
    try {
      this.logger.info('🔗 Setting up legacy WebSocket connection...')
      
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
      
      this.logger.info('✅ Legacy WebSocket streams connected')
      
    } catch (error) {
      this.logger.error('❌ Failed to setup legacy WebSocket:', error)
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
      
      this.logger.info('✅ Account data loaded successfully')
      
    } catch (error) {
      this.logger.error('❌ Failed to load account data:', error)
      throw error
    }
  }

  async loadHistoricalData() {
    try {
      this.logger.info('📊 Loading historical data...')
      
      for (const symbol of this.config.symbols) {
        for (const interval of this.config.timeframes) {
          try {
            const klineData = await this.session.getKline({
              category: 'linear',
              symbol: symbol,
              interval: interval,
              limit: 200
            })
            
            if (klineData.retCode === 0 && klineData.result && klineData.result.list) {
              const ohlcv = klineData.result.list.map(candle => ({
                timestamp: parseInt(candle[0]),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
              }))
              
              this.priceData.set(`${symbol}_${interval}`, ohlcv)
              
              // Calculate indicators
              this.calculateIndicators(symbol, interval, ohlcv)
            }
          } catch (error) {
            this.logger.warn(`⚠️ Failed to load historical data for ${symbol} ${interval}:`, error.message)
          }
        }
      }
      
      this.logger.info('✅ Historical data loaded successfully')
      
    } catch (error) {
      this.logger.error('❌ Failed to load historical data:', error)
      throw error
    }
  }

  calculateIndicators(symbol, interval, ohlcv) {
    try {
      const closePrices = ohlcv.map(candle => candle.close)
      const highPrices = ohlcv.map(candle => candle.high)
      const lowPrices = ohlcv.map(candle => candle.low)
      const volumes = ohlcv.map(candle => candle.volume)
      
      const indicators = {
        sma20: this.calculateSMA(closePrices, 20),
        sma50: this.calculateSMA(closePrices, 50),
        rsi: this.calculateRSI(closePrices, 14),
        bb: this.calculateBollingerBands(closePrices, 20, 2),
        macd: this.calculateMACD(closePrices),
        ema12: this.calculateEMA(closePrices, 12),
        ema26: this.calculateEMA(closePrices, 26),
        atr: this.calculateATR(ohlcv, 14),
        volume: volumes[volumes.length - 1]
      }
      
      this.indicators.set(`${symbol}_${interval}`, indicators)
      
    } catch (error) {
      this.logger.error(`❌ Error calculating indicators for ${symbol} ${interval}:`, error)
    }
  }

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
      const difference = data[data.length - i] - data[data.length - i - 1]
      if (difference > 0) {
        gains += difference
      } else {
        losses -= difference
      }
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  calculateBollingerBands(data, period, stdDev) {
    if (data.length < period) return null
    
    const sma = this.calculateSMA(data, period)
    const slice = data.slice(-period)
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
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
    
    return {
      macd: ema12 - ema26,
      signal: this.calculateEMA(data.slice(-9), 9), // Simplified signal line
      histogram: (ema12 - ema26) - this.calculateEMA(data.slice(-9), 9)
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
      const high = ohlcv[i].high
      const low = ohlcv[i].low
      const prevClose = ohlcv[i - 1].close
      
      const tr1 = high - low
      const tr2 = Math.abs(high - prevClose)
      const tr3 = Math.abs(low - prevClose)
      
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    return this.calculateSMA(trueRanges, period)
  }

  async initializeStrategies() {
    try {
      this.logger.info('🎯 Initializing trading strategies...')
      
      // Trend Following Strategy
      this.strategies.set('trend_following', {
        name: 'Trend Following',
        description: 'Moving Average Crossover with RSI Filter',
        enabled: true,
        parameters: {
          shortPeriod: 20,
          longPeriod: 50,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30,
          confidenceThreshold: 0.6
        },
        signals: []
      })
      
      // Mean Reversion Strategy
      this.strategies.set('mean_reversion', {
        name: 'Mean Reversion',
        description: 'Bollinger Bands with RSI',
        enabled: true,
        parameters: {
          bbPeriod: 20,
          bbStdDev: 2,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30,
          confidenceThreshold: 0.5
        },
        signals: []
      })
      
      // Momentum Strategy
      this.strategies.set('momentum', {
        name: 'Momentum',
        description: 'MACD with Volume Confirmation',
        enabled: true,
        parameters: {
          macdFast: 12,
          macdSlow: 26,
          macdSignal: 9,
          volumeThreshold: 1.5,
          confidenceThreshold: 0.55
        },
        signals: []
      })
      
      this.logger.info('✅ Trading strategies initialized')
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize strategies:', error)
      throw error
    }
  }

  async startRealTimeFeeds() {
    try {
      this.logger.info('📡 Starting real-time data feeds...')
      
      // Start periodic data updates
      setInterval(async () => {
        try {
          await this.updateMarketData()
        } catch (error) {
          this.logger.error('❌ Error updating market data:', error)
        }
      }, this.config.updateInterval)
      
      this.logger.info('✅ Real-time data feeds started')
      
    } catch (error) {
      this.logger.error('❌ Failed to start real-time feeds:', error)
      throw error
    }
  }

  async updateMarketData() {
    try {
      for (const symbol of this.config.symbols) {
        // Get latest ticker
        const ticker = await this.session.getTickers({
          category: 'linear',
          symbol: symbol
        })
        
        if (ticker.retCode === 0 && ticker.result && ticker.result.list) {
          const tickerData = ticker.result.list[0]
          this.priceData.set(`${symbol}_realtime`, {
            symbol: tickerData.symbol,
            price: parseFloat(tickerData.lastPrice),
            change: parseFloat(tickerData.price24hPcnt),
            volume: parseFloat(tickerData.volume24h),
            high: parseFloat(tickerData.highPrice24h),
            low: parseFloat(tickerData.lowPrice24h),
            timestamp: Date.now()
          })
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Error updating market data:', error)
    }
  }

  startSignalProcessing() {
    this.logger.info('🎯 Starting signal processing...')
    
    setInterval(async () => {
      if (!this.isProcessingSignals && this.signalQueue.length > 0) {
        await this.processSignalQueue()
      }
    }, 1000)
  }

  async processSignalQueue() {
    this.isProcessingSignals = true
    
    while (this.signalQueue.length > 0) {
      const signal = this.signalQueue.shift()
      try {
        await this.executeSignal(signal)
      } catch (error) {
        this.logger.error('❌ Error executing signal:', error)
      }
    }
    
    this.isProcessingSignals = false
  }

  async executeSignal(signal) {
    try {
      this.logger.info(`🚀 Executing signal: ${signal.type} ${signal.symbol} ${signal.side}`)
      
      // Validate risk
      if (!await this.validateRisk(signal)) {
        this.logger.warn('⚠️ Signal rejected due to risk limits')
        return
      }
      
      // Place order
      const order = await this.placeOrder(
        signal.symbol,
        signal.type,
        signal.side,
        signal.size,
        signal.price
      )
      
      this.emit('autonomous_trade', {
        signal,
        order,
        timestamp: Date.now()
      })
      
      this.logger.info(`✅ Signal executed successfully: ${order.orderId}`)
      
    } catch (error) {
      this.logger.error('❌ Error executing signal:', error)
      throw error
    }
  }

  async validateRisk(signal) {
    try {
      // Check position limits
      if (this.positions.size >= this.config.maxPositions) {
        this.logger.warn('⚠️ Maximum positions reached')
        return false
      }
      
      // Check risk per trade
      const positionValue = signal.size * signal.price
      const accountValue = this.balance.equity
      const riskRatio = positionValue / accountValue
      
      if (riskRatio > this.config.maxRiskPerTrade) {
        this.logger.warn(`⚠️ Risk per trade exceeded: ${(riskRatio * 100).toFixed(2)}%`)
        return false
      }
      
      // Check daily loss limit
      const dailyPnL = this.performance.totalPnL
      const dailyLossRatio = Math.abs(dailyPnL) / accountValue
      
      if (dailyPnL < 0 && dailyLossRatio > this.config.maxDailyLoss) {
        this.logger.warn(`⚠️ Daily loss limit exceeded: ${(dailyLossRatio * 100).toFixed(2)}%`)
        return false
      }
      
      return true
      
    } catch (error) {
      this.logger.error('❌ Error validating risk:', error)
      return false
    }
  }

  // WebSocket event handlers (compatible with both V3 and legacy)
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
      this.balance = {
        equity: parseFloat(data.totalEquity),
        balance: parseFloat(data.totalWalletBalance),
        margin: parseFloat(data.totalInitialMargin),
        freeMargin: parseFloat(data.totalAvailableBalance),
        marginLevel: parseFloat(data.totalMarginRatio) * 100
      }
      
      this.emit('wallet_update', {
        balance: this.balance,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling wallet update:', error)
    }
  }

  handleExecutionUpdate(data) {
    try {
      this.emit('execution_update', {
        executions: data,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling execution update:', error)
    }
  }

  updatePositionPnL(symbol, tickerData) {
    try {
      const position = this.positions.get(symbol)
      if (position) {
        const currentPrice = parseFloat(tickerData.lastPrice || tickerData.price)
        const priceChange = position.side === 'Buy' ? 
          (currentPrice - position.entryPrice) : 
          (position.entryPrice - currentPrice)
        
        position.currentPrice = currentPrice
        position.pnl = priceChange * position.size
        position.pnlPercent = (priceChange / position.entryPrice) * 100
        
        this.positions.set(symbol, position)
      }
    } catch (error) {
      this.logger.error(`❌ Error updating position P&L for ${symbol}:`, error)
    }
  }

  checkTradingSignals(symbol, tickerData) {
    try {
      // Get indicators for 1-minute timeframe
      const indicators = this.indicators.get(`${symbol}_1`)
      if (!indicators) return
      
      // Check trend following strategy
      if (this.strategies.get('trend_following').enabled) {
        this.checkTrendFollowingSignal(symbol, tickerData, indicators)
      }
      
      // Check mean reversion strategy
      if (this.strategies.get('mean_reversion').enabled) {
        this.checkMeanReversionSignal(symbol, tickerData, indicators)
      }
      
      // Check momentum strategy
      if (this.strategies.get('momentum').enabled) {
        this.checkMomentumSignal(symbol, tickerData, indicators)
      }
      
    } catch (error) {
      this.logger.error(`❌ Error checking trading signals for ${symbol}:`, error)
    }
  }

  checkTrendFollowingSignal(symbol, tickerData, indicators) {
    try {
      const strategy = this.strategies.get('trend_following')
      const { shortPeriod, longPeriod, rsiPeriod, rsiOverbought, rsiOversold, confidenceThreshold } = strategy.parameters
      
      const sma20 = indicators.sma20
      const sma50 = indicators.sma50
      const rsi = indicators.rsi
      
      if (!sma20 || !sma50 || !rsi) return
      
      const currentPrice = parseFloat(tickerData.lastPrice || tickerData.price)
      const trend = sma20 > sma50
      const rsiValid = rsi > rsiOversold && rsi < rsiOverbought
      
      let signal = null
      let confidence = 0
      
      if (trend && rsiValid && currentPrice > sma20) {
        // Bullish signal
        signal = {
          type: 'MARKET',
          side: 'Buy',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'trend_following',
          confidence: 0.7,
          timestamp: Date.now()
        }
        confidence = 0.7
      } else if (!trend && rsiValid && currentPrice < sma20) {
        // Bearish signal
        signal = {
          type: 'MARKET',
          side: 'Sell',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'trend_following',
          confidence: 0.7,
          timestamp: Date.now()
        }
        confidence = 0.7
      }
      
      if (signal && confidence >= confidenceThreshold) {
        this.signalQueue.push(signal)
        this.emit('strategy_signal', signal)
      }
      
    } catch (error) {
      this.logger.error(`❌ Error checking trend following signal for ${symbol}:`, error)
    }
  }

  checkMeanReversionSignal(symbol, tickerData, indicators) {
    try {
      const strategy = this.strategies.get('mean_reversion')
      const { bbPeriod, bbStdDev, rsiPeriod, rsiOverbought, rsiOversold, confidenceThreshold } = strategy.parameters
      
      const bb = indicators.bb
      const rsi = indicators.rsi
      
      if (!bb || !rsi) return
      
      const currentPrice = parseFloat(tickerData.lastPrice || tickerData.price)
      
      let signal = null
      let confidence = 0
      
      if (currentPrice <= bb.lower && rsi < rsiOversold) {
        // Oversold - buy signal
        signal = {
          type: 'MARKET',
          side: 'Buy',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'mean_reversion',
          confidence: 0.6,
          timestamp: Date.now()
        }
        confidence = 0.6
      } else if (currentPrice >= bb.upper && rsi > rsiOverbought) {
        // Overbought - sell signal
        signal = {
          type: 'MARKET',
          side: 'Sell',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'mean_reversion',
          confidence: 0.6,
          timestamp: Date.now()
        }
        confidence = 0.6
      }
      
      if (signal && confidence >= confidenceThreshold) {
        this.signalQueue.push(signal)
        this.emit('strategy_signal', signal)
      }
      
    } catch (error) {
      this.logger.error(`❌ Error checking mean reversion signal for ${symbol}:`, error)
    }
  }

  checkMomentumSignal(symbol, tickerData, indicators) {
    try {
      const strategy = this.strategies.get('momentum')
      const { macdFast, macdSlow, macdSignal, volumeThreshold, confidenceThreshold } = strategy.parameters
      
      const macd = indicators.macd
      const volume = indicators.volume
      
      if (!macd || !volume) return
      
      const currentPrice = parseFloat(tickerData.lastPrice || tickerData.price)
      const avgVolume = this.calculateAverageVolume(symbol)
      const volumeSpike = volume > (avgVolume * volumeThreshold)
      
      let signal = null
      let confidence = 0
      
      if (macd.macd > macd.signal && volumeSpike) {
        // Bullish momentum
        signal = {
          type: 'MARKET',
          side: 'Buy',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'momentum',
          confidence: 0.65,
          timestamp: Date.now()
        }
        confidence = 0.65
      } else if (macd.macd < macd.signal && volumeSpike) {
        // Bearish momentum
        signal = {
          type: 'MARKET',
          side: 'Sell',
          symbol: symbol,
          size: this.calculatePositionSize(symbol, currentPrice),
          price: currentPrice,
          strategy: 'momentum',
          confidence: 0.65,
          timestamp: Date.now()
        }
        confidence = 0.65
      }
      
      if (signal && confidence >= confidenceThreshold) {
        this.signalQueue.push(signal)
        this.emit('strategy_signal', signal)
      }
      
    } catch (error) {
      this.logger.error(`❌ Error checking momentum signal for ${symbol}:`, error)
    }
  }

  calculatePositionSize(symbol, price) {
    try {
      const accountValue = this.balance.equity
      const riskAmount = accountValue * this.config.maxRiskPerTrade
      const positionSize = riskAmount / price
      
      // Round to appropriate decimal places
      return Math.floor(positionSize * 1000) / 1000
      
    } catch (error) {
      this.logger.error(`❌ Error calculating position size for ${symbol}:`, error)
      return 0.001 // Minimum position size
    }
  }

  calculateAverageVolume(symbol) {
    try {
      const historicalData = this.priceData.get(`${symbol}_1`)
      if (!historicalData || historicalData.length < 20) return 0
      
      const volumes = historicalData.slice(-20).map(candle => candle.volume)
      return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
      
    } catch (error) {
      this.logger.error(`❌ Error calculating average volume for ${symbol}:`, error)
      return 0
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
      
      if (price && type !== 'MARKET') {
        orderParams.price = price.toString()
      }
      
      const response = await this.session.placeOrder(orderParams)
      
      if (response.retCode === 0 && response.result) {
        const order = response.result
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
        
        this.logger.info(`✅ Order placed: ${order.orderId} ${side} ${size} ${symbol}`)
        return order
      } else {
        throw new Error(`Order placement failed: ${response.retMsg}`)
      }
      
    } catch (error) {
      this.logger.error('❌ Error placing order:', error)
      throw error
    }
  }

  async cancelOrder(orderId, symbol) {
    try {
      const response = await this.session.cancelOrder({
        category: 'linear',
        symbol: symbol,
        orderId: orderId
      })
      
      if (response.retCode === 0) {
        this.orders.delete(orderId)
        this.logger.info(`✅ Order cancelled: ${orderId}`)
        return response.result
      } else {
        throw new Error(`Order cancellation failed: ${response.retMsg}`)
      }
      
    } catch (error) {
      this.logger.error('❌ Error cancelling order:', error)
      throw error
    }
  }

  async closePosition(symbol, side) {
    try {
      const position = this.positions.get(symbol)
      if (!position) {
        throw new Error(`No position found for ${symbol}`)
      }
      
      const closeSide = side === 'Buy' ? 'Sell' : 'Buy'
      const order = await this.placeOrder(symbol, 'MARKET', closeSide, position.size)
      
      this.positions.delete(symbol)
      this.logger.info(`✅ Position closed: ${symbol} ${position.size}`)
      
      return order
      
    } catch (error) {
      this.logger.error('❌ Error closing position:', error)
      throw error
    }
  }

  // Status and data retrieval methods
  getStatus() {
    return {
      connected: this.isConnected,
      initialized: this.isInitialized,
      positions: this.positions.size,
      orders: this.orders.size,
      balance: this.balance,
      performance: this.performance,
      websocketV3: this.wsV3 ? this.wsV3.getStatus() : null
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
    return this.priceData.get(`${symbol}_${interval}`) || null
  }

  getOrderBook(symbol) {
    return this.orderBook.get(symbol) || null
  }

  getRecentTrades(symbol) {
    return this.recentTrades.get(symbol) || null
  }

  getIndicators(symbol, interval = '1') {
    return this.indicators.get(`${symbol}_${interval}`) || null
  }

  getStrategySignals() {
    const signals = []
    for (const [name, strategy] of this.strategies) {
      signals.push({
        name: strategy.name,
        description: strategy.description,
        enabled: strategy.enabled,
        signals: strategy.signals.slice(-10) // Last 10 signals
      })
    }
    return signals
  }

  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up Enhanced Bybit Integration...')
      
      // Disconnect WebSocket V3
      if (this.wsV3) {
        await this.wsV3.disconnect()
      }
      
      // Clear timers and data
      this.positions.clear()
      this.orders.clear()
      this.priceData.clear()
      this.orderBook.clear()
      this.recentTrades.clear()
      this.indicators.clear()
      this.strategies.clear()
      this.signalQueue = []
      
      this.isConnected = false
      this.isInitialized = false
      
      this.logger.info('✅ Enhanced Bybit Integration cleaned up')
      
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error)
      throw error
    }
  }
} 