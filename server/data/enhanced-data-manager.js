import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { UnirateClient } from 'unirate-api'
import ccxt from 'ccxt'

export class EnhancedDataManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.isInitialized = false
    
    // API configurations - REAL DATA ONLY
    this.unirateClient = new UnirateClient(process.env.UNIRATE_API_KEY || 'UOaBj21hy46nIf54j0ykaP0KGLkXvDJflgjqiiwAanzrVQPXcL0tA9aNPJ9sik5R')
    
    // Bybit for crypto
    this.bybitExchange = null
    
    // Supported symbols - ONLY symbols with real data
    this.forexSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
    this.cryptoSymbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT']
    this.metalSymbols = ['XAUUSD', 'XAGUSD']
    
    this.activeSymbols = [...this.forexSymbols, ...this.cryptoSymbols, ...this.metalSymbols]
    this.timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
    
    // Data storage
    this.priceData = new Map()
    this.indicators = new Map()
    this.newsData = []
    
    // Update intervals
    this.updateIntervals = new Map()
    this.lastUpdate = new Map()
    
    // Configuration - OPTIMIZED FOR RATE LIMITS
    this.config = {
      maxHistoryBars: 1000,
      updateFrequency: 60000, // 1 minute (reduced from 5 seconds)
      batchUpdateFrequency: 300000, // 5 minutes for batch updates
      trainingDataUpdateFrequency: 3600000, // 1 hour for training data
      indicatorPeriods: {
        sma: [20, 50, 200],
        ema: [12, 26],
        rsi: [14],
        macd: [12, 26, 9],
        bb: [20, 2],
        atr: [14]
      },
      // Staged training configuration
      stagedTraining: {
        enabled: true,
        dailyTrainingTime: '02:00', // Train at 2 AM daily
        maxTrainingDuration: 30 * 60 * 1000, // 30 minutes max
        dataUpdateInterval: 24 * 60 * 60 * 1000 // Update training data daily
      }
    }
  }

  async initialize() {
    try {
      this.logger.info('Initializing Enhanced Data Manager (REAL DATA ONLY)...')
      
      // Initialize database
      await this.db.initialize()
      
      // Setup Bybit for crypto
      await this.setupBybit()
      
      // Test API connections
      await this.testAPIConnections()
      
      // Initialize price data
      for (const symbol of this.activeSymbols) {
        this.priceData.set(symbol, {
          bid: 0,
          ask: 0,
          last: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: Date.now()
        })
      }
      
      // Start real-time feeds
      this.startRealTimeFeeds()
      
      this.isInitialized = true
      this.logger.info('Enhanced Data Manager initialized successfully (REAL DATA ONLY)')
      this.emit('initialized')
      
    } catch (error) {
      this.logger.error('Error initializing Enhanced Data Manager:', error)
      throw error
    }
  }

  async setupBybit() {
    try {
      this.bybitExchange = new ccxt.bybit({
        apiKey: process.env.BYBIT_API_KEY || '',
        secret: process.env.BYBIT_SECRET || '',
        enableRateLimit: true,
        timeout: 30000
      })
      await this.bybitExchange.loadMarkets()
      this.logger.info('✅ Bybit connected for crypto data')
    } catch (error) {
      this.logger.warn('❌ Bybit connection failed:', error.message)
      this.bybitExchange = null
    }
  }

  async testAPIConnections() {
    this.logger.info('Testing API connections (REAL DATA ONLY)...')
    
    // Test UniRateAPI
    try {
      const rate = await this.unirateClient.getRate('USD', 'EUR')
      this.logger.info(`✅ UniRateAPI connected - USD/EUR: ${rate}`)
    } catch (error) {
      this.logger.warn('❌ UniRateAPI connection failed:', error.message)
    }
    

  }

  async fetchRealTimePrice(symbol) {
    try {
      let priceData = null
      
      // Crypto symbols - use Bybit
      if (this.cryptoSymbols.includes(symbol)) {
        if (!this.bybitExchange) {
          this.logger.warn(`Bybit not available for ${symbol}`)
          return null
        }
        
        const ticker = await this.bybitExchange.fetchTicker(symbol)
        priceData = {
          symbol,
          bid: ticker.bid,
          ask: ticker.ask,
          last: ticker.last,
          change: ticker.change,
          changePercent: ticker.percentage,
          volume: ticker.baseVolume,
          timestamp: ticker.timestamp
        }
      }
      // Forex symbols - use UniRateAPI
      else if (this.forexSymbols.includes(symbol)) {
        const fromCurrency = symbol.slice(0, 3)
        const toCurrency = symbol.slice(3, 6)
        const rate = await this.unirateClient.getRate(fromCurrency, toCurrency)
        
        priceData = {
          symbol,
          bid: rate * 0.9999, // Estimate spread
          ask: rate * 1.0001,
          last: rate,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: Date.now()
        }
      }

      // Metal symbols - use UniRateAPI with conversion
      else if (this.metalSymbols.includes(symbol)) {
        if (symbol === 'XAUUSD') {
          const rate = await this.unirateClient.getRate('XAU', 'USD')
          priceData = {
            symbol,
            bid: rate * 0.9999,
            ask: rate * 1.0001,
            last: rate,
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: Date.now()
          }
        }
      }
      
      if (priceData) {
        this.updateLatestPrice(symbol, priceData)
        this.emit('price_update', { symbol, priceData })
        return priceData
      }
      
    } catch (error) {
      this.logger.error(`Error fetching real-time price for ${symbol}:`, error)
      return null
    }
  }

  async fetchHistoricalData(symbol, timeframe, limit = 1000) {
    try {
      // Crypto symbols - use Bybit
      if (this.cryptoSymbols.includes(symbol)) {
        if (!this.bybitExchange) {
          this.logger.warn(`Bybit not available for ${symbol}`)
          return []
        }
        
        const ohlcv = await this.bybitExchange.fetchOHLCV(symbol, timeframe, undefined, limit)
        return ohlcv
      }
      // For other symbols, we'll need to implement historical data fetching
      // from Finnhub and UniRate APIs
      else {
        this.logger.warn(`Historical data not yet implemented for ${symbol}`)
        return []
      }
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${symbol}:`, error)
      return []
    }
  }

  updateLatestPrice(symbol, priceData) {
    this.priceData.set(symbol, priceData)
    this.lastUpdate.set(symbol, Date.now())
  }

  getCurrentPrices() {
    const prices = {}
    for (const [symbol, data] of this.priceData) {
      prices[symbol] = data
    }
    return prices
  }

  getPriceHistory(symbol, limit = 100) {
    // Return empty array - no mock data
    // Historical data should be fetched via fetchHistoricalData method
    return []
  }

  getTradingSignals() {
    // Generate trading signals based on current real data
    const signals = []
    
    for (const symbol of this.activeSymbols) {
      const priceData = this.priceData.get(symbol)
      if (priceData && priceData.changePercent !== 0) {
        const signal = {
          symbol,
          type: priceData.changePercent > 0 ? 'BUY' : 'SELL',
          strength: Math.abs(priceData.changePercent) / 10,
          price: priceData.last,
          timestamp: Date.now()
        }
        signals.push(signal)
      }
    }
    
    return signals
  }

  startRealTimeFeeds() {
    this.logger.info('Starting real-time data feeds (REAL DATA ONLY)...')
    
    for (const symbol of this.activeSymbols) {
      const interval = setInterval(async () => {
        try {
          await this.fetchRealTimePrice(symbol)
        } catch (error) {
          this.logger.error(`Error updating real-time price for ${symbol}:`, error)
        }
      }, this.config.updateFrequency)
      
      this.updateIntervals.set(symbol, interval)
    }
  }

  async start() {
    this.logger.info('Starting Enhanced Data Manager...')
    if (!this.isInitialized) {
      await this.initialize()
    }
    this.startRealTimeFeeds()
    this.logger.info('Enhanced Data Manager started successfully')
  }

  async cleanup() {
    this.logger.info('Cleaning up Enhanced Data Manager...')
    
    // Clear all intervals
    for (const [symbol, interval] of this.updateIntervals) {
      clearInterval(interval)
    }
    this.updateIntervals.clear()
    
    // Clear data structures
    this.priceData.clear()
    this.indicators.clear()
    this.newsData = []
    this.lastUpdate.clear()
    
    // Remove event listeners
    this.removeAllListeners()
    
    this.isInitialized = false
    this.logger.info('Enhanced Data Manager cleaned up')
  }

  getConnectionStatus() {
    return {
      bybit: this.bybitExchange ? 'connected' : 'disconnected',
      unirate: this.unirateClient ? 'connected' : 'disconnected',
      initialized: this.isInitialized,
      activeSymbols: this.activeSymbols.length,
      lastUpdate: this.lastUpdate.size
    }
  }
} 