import ccxt from 'ccxt'
import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class BybitIntegration extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    
    this.options = {
      apiKey: process.env.BYBIT_API_KEY || '3fg29yhr1a9JJ1etm3',
      secret: process.env.BYBIT_SECRET || 'wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14',
      sandbox: process.env.BYBIT_SANDBOX === 'true' || true,
      symbols: ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT'],
      timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
      updateInterval: 1000, // 1 second
      ...options
    }
    
    this.exchange = null
    this.isConnected = false
    this.priceData = new Map()
    this.orderBook = new Map()
    this.trades = new Map()
    this.newsEvents = []
    this.strategies = new Map()
    
    // Strategy configurations
    this.strategyConfigs = {
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
      this.logger.info('Initializing Bybit Integration')
      
      // Initialize database
      await this.db.initialize()
      
      // Setup exchange connection
      await this.setupExchange()
      
      // Load historical data
      await this.loadHistoricalData()
      
      // Initialize strategies
      await this.initializeStrategies()
      
      // Start real-time data feeds
      this.startRealTimeFeeds()
      
      // Start news monitoring
      this.startNewsMonitoring()
      
      // Start autonomous trading
      this.startAutonomousTrading()
      
      this.logger.info('Bybit Integration initialized successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Bybit Integration:', error)
      throw error
    }
  }

  async setupExchange() {
    try {
      this.exchange = new ccxt.bybit({
        apiKey: this.options.apiKey,
        secret: this.options.secret,
        sandbox: this.options.sandbox,
        enableRateLimit: true,
        timeout: 30000,
        options: {
          defaultType: 'spot'
        }
      })
      
      await this.exchange.loadMarkets()
      this.isConnected = true
      this.logger.info('Connected to Bybit exchange')
      
      // Test connection
      const balance = await this.exchange.fetchBalance()
      this.logger.info('Account balance loaded successfully')
      
    } catch (error) {
      this.logger.error('Failed to connect to Bybit:', error)
      throw error
    }
  }

  async loadHistoricalData() {
    try {
      this.logger.info('Loading historical data from Bybit')
      
      for (const symbol of this.options.symbols) {
        for (const timeframe of this.options.timeframes) {
          try {
            // Fetch historical OHLCV data
            const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, 1000)
            
            if (ohlcv && ohlcv.length > 0) {
              // Store in database
              await this.db.saveOHLCVData(symbol, timeframe, ohlcv)
              
              // Store in memory for quick access
              this.priceData.set(`${symbol}_${timeframe}`, ohlcv)
              
              this.logger.info(`Loaded ${ohlcv.length} bars for ${symbol} ${timeframe}`)
            }
          } catch (error) {
            this.logger.warn(`Failed to load historical data for ${symbol} ${timeframe}:`, error.message)
          }
        }
      }
    } catch (error) {
      this.logger.error('Error loading historical data:', error)
    }
  }

  async initializeStrategies() {
    try {
      this.logger.info('Initializing trading strategies')
      
      // Initialize each strategy
      for (const [strategyName, config] of Object.entries(this.strategyConfigs)) {
        if (config.enabled) {
          this.strategies.set(strategyName, {
            config,
            signals: new Map(),
            performance: {
              totalTrades: 0,
              winningTrades: 0,
              totalPnL: 0,
              winRate: 0
            }
          })
          this.logger.info(`Strategy ${strategyName} initialized`)
        }
      }
    } catch (error) {
      this.logger.error('Error initializing strategies:', error)
    }
  }

  startRealTimeFeeds() {
    // Start real-time price updates
    setInterval(async () => {
      await this.updateRealTimePrices()
    }, this.options.updateInterval)
    
    // Start order book updates
    setInterval(async () => {
      await this.updateOrderBooks()
    }, this.options.updateInterval * 2)
    
    // Start recent trades updates
    setInterval(async () => {
      await this.updateRecentTrades()
    }, this.options.updateInterval * 3)
  }

  async updateRealTimePrices() {
    try {
      for (const symbol of this.options.symbols) {
        const ticker = await this.exchange.fetchTicker(symbol)
        
        if (ticker) {
          this.priceData.set(`${symbol}_realtime`, ticker)
          
          // Emit price update event
          this.emit('price_update', {
            symbol,
            price: ticker.last,
            bid: ticker.bid,
            ask: ticker.ask,
            volume: ticker.baseVolume,
            timestamp: ticker.timestamp
          })
          
          // Update strategies with new price
          await this.updateStrategies(symbol, ticker)
        }
      }
    } catch (error) {
      this.logger.error('Error updating real-time prices:', error)
    }
  }

  async updateOrderBooks() {
    try {
      for (const symbol of this.options.symbols) {
        const orderBook = await this.exchange.fetchOrderBook(symbol, 20)
        
        if (orderBook) {
          this.orderBook.set(symbol, orderBook)
          
          // Emit order book update event
          this.emit('orderbook_update', {
            symbol,
            bids: orderBook.bids.slice(0, 10),
            asks: orderBook.asks.slice(0, 10),
            timestamp: orderBook.timestamp
          })
        }
      }
    } catch (error) {
      this.logger.error('Error updating order books:', error)
    }
  }

  async updateRecentTrades() {
    try {
      for (const symbol of this.options.symbols) {
        const trades = await this.exchange.fetchTrades(symbol, undefined, 50)
        
        if (trades && trades.length > 0) {
          this.trades.set(symbol, trades)
          
          // Emit trades update event
          this.emit('trades_update', {
            symbol,
            trades: trades.slice(0, 10),
            timestamp: Date.now()
          })
        }
      }
    } catch (error) {
      this.logger.error('Error updating recent trades:', error)
    }
  }

  async updateStrategies(symbol, ticker) {
    try {
      for (const [strategyName, strategy] of this.strategies) {
        const signal = await this.calculateStrategySignal(strategyName, symbol, ticker)
        
        if (signal) {
          strategy.signals.set(symbol, signal)
          
          // Emit strategy signal
          this.emit('strategy_signal', {
            strategy: strategyName,
            symbol,
            signal,
            timestamp: Date.now()
          })
          
          // Execute autonomous trade if signal is strong
          if (signal.strength > 0.7) {
            await this.executeAutonomousTrade(strategyName, symbol, signal)
          }
        }
      }
    } catch (error) {
      this.logger.error('Error updating strategies:', error)
    }
  }

  async calculateStrategySignal(strategyName, symbol, ticker) {
    try {
      const ohlcv = this.priceData.get(`${symbol}_1h`) || []
      if (ohlcv.length < 50) return null
      
      switch (strategyName) {
        case 'trendFollowing':
          return this.calculateTrendFollowingSignal(symbol, ohlcv, ticker)
        case 'meanReversion':
          return this.calculateMeanReversionSignal(symbol, ohlcv, ticker)
        case 'breakout':
          return this.calculateBreakoutSignal(symbol, ohlcv, ticker)
        default:
          return null
      }
    } catch (error) {
      this.logger.error(`Error calculating ${strategyName} signal:`, error)
      return null
    }
  }

  calculateTrendFollowingSignal(symbol, ohlcv, ticker) {
    try {
      const config = this.strategyConfigs.trendFollowing.params
      const closes = ohlcv.map(candle => candle[4])
      
      // Calculate moving averages
      const shortMA = this.calculateSMA(closes, config.shortPeriod)
      const longMA = this.calculateSMA(closes, config.longPeriod)
      
      // Calculate RSI
      const rsi = this.calculateRSI(closes, config.rsiPeriod)
      
      const currentPrice = ticker.last
      const signal = {
        type: 'neutral',
        strength: 0,
        price: currentPrice,
        indicators: { shortMA, longMA, rsi }
      }
      
      // Generate signal based on MA crossover and RSI
      if (shortMA > longMA && rsi < config.rsiOverbought) {
        signal.type = 'buy'
        signal.strength = Math.min((shortMA - longMA) / longMA * 10, 1)
      } else if (shortMA < longMA && rsi > config.rsiOversold) {
        signal.type = 'sell'
        signal.strength = Math.min((longMA - shortMA) / longMA * 10, 1)
      }
      
      return signal
    } catch (error) {
      this.logger.error('Error calculating trend following signal:', error)
      return null
    }
  }

  calculateMeanReversionSignal(symbol, ohlcv, ticker) {
    try {
      const config = this.strategyConfigs.meanReversion.params
      const closes = ohlcv.map(candle => candle[4])
      
      // Calculate Bollinger Bands
      const bb = this.calculateBollingerBands(closes, config.bbPeriod, config.bbStdDev)
      
      // Calculate RSI
      const rsi = this.calculateRSI(closes, config.rsiPeriod)
      
      const currentPrice = ticker.last
      const signal = {
        type: 'neutral',
        strength: 0,
        price: currentPrice,
        indicators: { bb, rsi }
      }
      
      // Generate signal based on price position relative to BB and RSI
      if (currentPrice < bb.lower && rsi < 30) {
        signal.type = 'buy'
        signal.strength = Math.min((bb.middle - currentPrice) / bb.middle, 1)
      } else if (currentPrice > bb.upper && rsi > 70) {
        signal.type = 'sell'
        signal.strength = Math.min((currentPrice - bb.middle) / bb.middle, 1)
      }
      
      return signal
    } catch (error) {
      this.logger.error('Error calculating mean reversion signal:', error)
      return null
    }
  }

  calculateBreakoutSignal(symbol, ohlcv, ticker) {
    try {
      const config = this.strategyConfigs.breakout.params
      const highs = ohlcv.map(candle => candle[2])
      const lows = ohlcv.map(candle => candle[3])
      
      // Calculate ATR
      const atr = this.calculateATR(ohlcv, config.atrPeriod)
      
      // Calculate support and resistance levels
      const recentHigh = Math.max(...highs.slice(-20))
      const recentLow = Math.min(...lows.slice(-20))
      
      const currentPrice = ticker.last
      const signal = {
        type: 'neutral',
        strength: 0,
        price: currentPrice,
        indicators: { atr, recentHigh, recentLow }
      }
      
      // Generate signal based on breakout levels
      const breakoutThreshold = atr * config.breakoutMultiplier
      
      if (currentPrice > recentHigh + breakoutThreshold) {
        signal.type = 'buy'
        signal.strength = Math.min((currentPrice - recentHigh) / atr, 1)
      } else if (currentPrice < recentLow - breakoutThreshold) {
        signal.type = 'sell'
        signal.strength = Math.min((recentLow - currentPrice) / atr, 1)
      }
      
      return signal
    } catch (error) {
      this.logger.error('Error calculating breakout signal:', error)
      return null
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

  async executeAutonomousTrade(strategyName, symbol, signal) {
    try {
      // Check if we have sufficient balance
      const balance = await this.exchange.fetchBalance()
      const usdtBalance = balance.USDT?.free || 0
      
      if (usdtBalance < 10) {
        this.logger.warn('Insufficient USDT balance for autonomous trading')
        return
      }
      
      // Calculate position size (1% of balance per trade)
      const positionSize = usdtBalance * 0.01
      const quantity = positionSize / signal.price
      
      // Execute trade
      const order = await this.exchange.createOrder(
        symbol,
        'market',
        signal.type,
        quantity,
        undefined,
        {
          strategy: strategyName,
          signal_strength: signal.strength
        }
      )
      
      // Save trade to database
      await this.db.saveTrade({
        id: order.id,
        symbol,
        side: signal.type,
        quantity,
        price: signal.price,
        strategy: strategyName,
        signal_strength: signal.strength,
        timestamp: new Date().toISOString(),
        status: 'filled'
      })
      
      // Update strategy performance
      const strategy = this.strategies.get(strategyName)
      if (strategy) {
        strategy.performance.totalTrades++
        // Performance will be updated when position is closed
      }
      
      this.logger.info(`Autonomous trade executed: ${signal.type} ${quantity} ${symbol} at ${signal.price}`)
      
      // Emit trade event
      this.emit('autonomous_trade', {
        strategy: strategyName,
        symbol,
        signal,
        order,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('Error executing autonomous trade:', error)
    }
  }

  startNewsMonitoring() {
    // Monitor news events that could affect crypto prices
    setInterval(async () => {
      await this.fetchNewsEvents()
    }, 300000) // Every 5 minutes
  }

  async fetchNewsEvents() {
    try {
      // This would integrate with a news API
      // For now, we'll simulate news events
      const mockNewsEvents = [
        {
          id: `news_${Date.now()}`,
          title: 'Bitcoin ETF Approval Expected',
          content: 'Major financial institutions are expecting Bitcoin ETF approval',
          sentiment: 'positive',
          impact: 'high',
          timestamp: new Date().toISOString(),
          symbols: ['BTC/USDT']
        }
      ]
      
      this.newsEvents = mockNewsEvents
      
      // Emit news events
      this.emit('news_update', {
        events: mockNewsEvents,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('Error fetching news events:', error)
    }
  }

  startAutonomousTrading() {
    this.logger.info('Starting autonomous trading system')
    
    // Monitor for strong signals and execute trades
    setInterval(async () => {
      await this.monitorAndExecuteTrades()
    }, 10000) // Every 10 seconds
  }

  async monitorAndExecuteTrades() {
    try {
      for (const [strategyName, strategy] of this.strategies) {
        for (const symbol of this.options.symbols) {
          const signal = strategy.signals.get(symbol)
          
          if (signal && signal.strength > 0.8) {
            await this.executeAutonomousTrade(strategyName, symbol, signal)
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in autonomous trading monitor:', error)
    }
  }

  // Public methods for external access
  getPriceData(symbol, timeframe = 'realtime') {
    return this.priceData.get(`${symbol}_${timeframe}`)
  }

  getOrderBook(symbol) {
    return this.orderBook.get(symbol)
  }

  getRecentTrades(symbol) {
    return this.trades.get(symbol) || []
  }

  getStrategySignals() {
    const signals = {}
    for (const [strategyName, strategy] of this.strategies) {
      signals[strategyName] = Object.fromEntries(strategy.signals)
    }
    return signals
  }

  getNewsEvents() {
    return this.newsEvents
  }

  async getBalance() {
    if (!this.isConnected) return null
    return await this.exchange.fetchBalance()
  }

  async placeOrder(symbol, type, side, amount, price = undefined) {
    if (!this.isConnected) throw new Error('Not connected to exchange')
    
    return await this.exchange.createOrder(symbol, type, side, amount, price)
  }

  async cancelOrder(orderId, symbol) {
    if (!this.isConnected) throw new Error('Not connected to exchange')
    
    return await this.exchange.cancelOrder(orderId, symbol)
  }

  async getOpenOrders(symbol = undefined) {
    if (!this.isConnected) return []
    
    return await this.exchange.fetchOpenOrders(symbol)
  }

  async getPositions() {
    if (!this.isConnected) return []
    
    return await this.exchange.fetchPositions()
  }

  stop() {
    this.logger.info('Stopping Bybit Integration')
    this.isConnected = false
  }
} 