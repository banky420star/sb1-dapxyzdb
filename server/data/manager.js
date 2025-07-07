import { EventEmitter } from 'events'
import ccxt from 'ccxt'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { TechnicalIndicators } from 'technicalindicators'

export class DataManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.isInitialized = false
    
    // Exchange connections
    this.exchanges = new Map()
    this.activeSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
    this.timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
    
    // Data storage
    this.priceData = new Map()
    this.indicators = new Map()
    this.newsData = []
    
    // Update intervals
    this.updateIntervals = new Map()
    this.lastUpdate = new Map()
    
    // Configuration
    this.config = {
      maxHistoryBars: 1000,
      updateFrequency: 1000, // 1 second
      indicatorPeriods: {
        sma: [20, 50, 200],
        ema: [12, 26],
        rsi: [14],
        macd: [12, 26, 9],
        bb: [20, 2],
        atr: [14]
      }
    }
  }

  async initialize() {
    try {
      this.logger.info('Initializing Data Manager')
      
      // Initialize database
      await this.db.initialize()
      
      // Setup exchanges
      await this.setupExchanges()
      
      // Load historical data
      await this.loadHistoricalData()
      
      // Start real-time data feeds
      this.startRealTimeFeeds()
      
      // Start indicator calculations
      this.startIndicatorCalculations()
      
      this.isInitialized = true
      this.logger.info('Data Manager initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Data Manager:', error)
      throw error
    }
  }

  async setupExchanges() {
    try {
      // Setup demo/sandbox exchanges for data feeds
      const exchangeConfigs = [
        { id: 'binance', sandbox: true },
        { id: 'oanda', sandbox: true }
      ]
      
      for (const config of exchangeConfigs) {
        try {
          const ExchangeClass = ccxt[config.id]
          if (ExchangeClass) {
            const exchange = new ExchangeClass({
              sandbox: config.sandbox,
              enableRateLimit: true,
              timeout: 30000
            })
            
            await exchange.loadMarkets()
            this.exchanges.set(config.id, exchange)
            this.logger.info(`Connected to ${config.id} exchange`)
          }
        } catch (error) {
          this.logger.warn(`Failed to connect to ${config.id}:`, error.message)
        }
      }
      
      if (this.exchanges.size === 0) {
        this.logger.warn('No exchanges connected, using mock data')
        this.setupMockDataProvider()
      }
    } catch (error) {
      this.logger.error('Error setting up exchanges:', error)
      this.setupMockDataProvider()
    }
  }

  setupMockDataProvider() {
    // Create mock exchange for development
    const mockExchange = {
      id: 'mock',
      fetchOHLCV: async (symbol, timeframe, since, limit) => {
        return this.generateMockOHLCV(symbol, timeframe, limit || 100)
      },
      fetchTicker: async (symbol) => {
        return this.generateMockTicker(symbol)
      }
    }
    
    this.exchanges.set('mock', mockExchange)
    this.logger.info('Mock data provider initialized')
  }

  generateMockOHLCV(symbol, timeframe, limit) {
    const data = []
    const now = Date.now()
    const interval = this.getTimeframeMs(timeframe)
    
    let basePrice = 1.1000 // Default for EURUSD
    if (symbol.includes('JPY')) basePrice = 149.50
    if (symbol.includes('GBP')) basePrice = 1.2650
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * interval)
      const volatility = 0.001 // 0.1% volatility
      
      const open = basePrice + (Math.random() - 0.5) * volatility * basePrice
      const high = open + Math.random() * volatility * basePrice
      const low = open - Math.random() * volatility * basePrice
      const close = low + Math.random() * (high - low)
      const volume = Math.random() * 1000000
      
      data.push([timestamp, open, high, low, close, volume])
      basePrice = close // Use close as next base price
    }
    
    return data
  }

  generateMockTicker(symbol) {
    const basePrice = symbol.includes('JPY') ? 149.50 : 1.1000
    const spread = basePrice * 0.0001 // 1 pip spread
    
    return {
      symbol,
      bid: basePrice - spread / 2,
      ask: basePrice + spread / 2,
      last: basePrice,
      change: (Math.random() - 0.5) * 0.01,
      percentage: (Math.random() - 0.5) * 1,
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    }
  }

  getTimeframeMs(timeframe) {
    const timeframes = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }
    return timeframes[timeframe] || 60 * 1000
  }

  async loadHistoricalData() {
    try {
      this.logger.info('Loading historical data')
      
      for (const symbol of this.activeSymbols) {
        for (const timeframe of this.timeframes) {
          try {
            // Try to load from database first
            const dbData = await this.db.getOHLCVData(symbol, timeframe, 1000)
            
            if (dbData && dbData.length > 0) {
              this.storeOHLCVData(symbol, timeframe, dbData)
              this.logger.debug(`Loaded ${dbData.length} bars for ${symbol} ${timeframe} from database`)
            } else {
              // Fetch from exchange
              await this.fetchHistoricalData(symbol, timeframe)
            }
          } catch (error) {
            this.logger.warn(`Error loading historical data for ${symbol} ${timeframe}:`, error.message)
          }
        }
      }
      
      this.logger.info('Historical data loading completed')
    } catch (error) {
      this.logger.error('Error loading historical data:', error)
    }
  }

  async fetchHistoricalData(symbol, timeframe, limit = 1000) {
    try {
      const exchange = this.exchanges.values().next().value
      if (!exchange) {
        throw new Error('No exchange available')
      }
      
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
      
      if (ohlcv && ohlcv.length > 0) {
        this.storeOHLCVData(symbol, timeframe, ohlcv)
        
        // Save to database
        await this.db.saveOHLCVData(symbol, timeframe, ohlcv)
        
        this.logger.debug(`Fetched ${ohlcv.length} bars for ${symbol} ${timeframe}`)
        return ohlcv
      }
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${symbol} ${timeframe}:`, error)
      throw error
    }
  }

  storeOHLCVData(symbol, timeframe, ohlcv) {
    const key = `${symbol}_${timeframe}`
    
    if (!this.priceData.has(key)) {
      this.priceData.set(key, [])
    }
    
    const existing = this.priceData.get(key)
    
    // Merge and sort data
    const combined = [...existing, ...ohlcv]
    const unique = combined.filter((bar, index, arr) => 
      arr.findIndex(b => b[0] === bar[0]) === index
    )
    
    unique.sort((a, b) => a[0] - b[0])
    
    // Keep only recent data
    if (unique.length > this.config.maxHistoryBars) {
      unique.splice(0, unique.length - this.config.maxHistoryBars)
    }
    
    this.priceData.set(key, unique)
    this.lastUpdate.set(key, Date.now())
  }

  startRealTimeFeeds() {
    this.logger.info('Starting real-time data feeds')
    
    for (const symbol of this.activeSymbols) {
      // Start price updates for each symbol
      const interval = setInterval(async () => {
        try {
          await this.updateRealTimePrice(symbol)
        } catch (error) {
          this.logger.error(`Error updating real-time price for ${symbol}:`, error)
        }
      }, this.config.updateFrequency)
      
      this.updateIntervals.set(symbol, interval)
    }
    
    // Start OHLCV updates for longer timeframes
    setInterval(async () => {
      await this.updateOHLCVData()
    }, 60 * 1000) // Every minute
  }

  async updateRealTimePrice(symbol) {
    try {
      const exchange = this.exchanges.values().next().value
      if (!exchange) return
      
      const ticker = await exchange.fetchTicker(symbol)
      
      if (ticker) {
        // Emit price update
        this.emit('price_update', {
          symbol,
          bid: ticker.bid,
          ask: ticker.ask,
          last: ticker.last,
          change: ticker.change,
          percentage: ticker.percentage,
          timestamp: ticker.timestamp || Date.now()
        })
        
        // Update latest price in storage
        this.updateLatestPrice(symbol, ticker)
      }
    } catch (error) {
      this.logger.debug(`Error updating real-time price for ${symbol}:`, error.message)
    }
  }

  updateLatestPrice(symbol, ticker) {
    // Update the latest bar for 1m timeframe
    const key = `${symbol}_1m`
    const data = this.priceData.get(key)
    
    if (data && data.length > 0) {
      const lastBar = data[data.length - 1]
      const currentTime = Date.now()
      const barTime = Math.floor(currentTime / 60000) * 60000 // Round to minute
      
      if (lastBar[0] === barTime) {
        // Update existing bar
        lastBar[4] = ticker.last // Close price
        lastBar[2] = Math.max(lastBar[2], ticker.last) // High
        lastBar[3] = Math.min(lastBar[3], ticker.last) // Low
      } else {
        // Create new bar
        const newBar = [
          barTime,
          ticker.last, // Open
          ticker.last, // High
          ticker.last, // Low
          ticker.last, // Close
          0 // Volume
        ]
        data.push(newBar)
        
        // Keep only recent data
        if (data.length > this.config.maxHistoryBars) {
          data.shift()
        }
      }
    }
  }

  async updateOHLCVData() {
    for (const symbol of this.activeSymbols) {
      for (const timeframe of this.timeframes.slice(1)) { // Skip 1m as it's updated in real-time
        try {
          const lastUpdate = this.lastUpdate.get(`${symbol}_${timeframe}`) || 0
          const now = Date.now()
          const interval = this.getTimeframeMs(timeframe)
          
          // Update if enough time has passed
          if (now - lastUpdate > interval) {
            await this.fetchLatestBars(symbol, timeframe, 10)
          }
        } catch (error) {
          this.logger.debug(`Error updating OHLCV for ${symbol} ${timeframe}:`, error.message)
        }
      }
    }
  }

  async fetchLatestBars(symbol, timeframe, limit = 10) {
    try {
      const exchange = this.exchanges.values().next().value
      if (!exchange) return
      
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
      
      if (ohlcv && ohlcv.length > 0) {
        this.storeOHLCVData(symbol, timeframe, ohlcv)
        
        // Save to database
        await this.db.saveOHLCVData(symbol, timeframe, ohlcv)
        
        // Emit update event
        this.emit('ohlcv_update', {
          symbol,
          timeframe,
          data: ohlcv
        })
      }
    } catch (error) {
      this.logger.debug(`Error fetching latest bars for ${symbol} ${timeframe}:`, error.message)
    }
  }

  startIndicatorCalculations() {
    this.logger.info('Starting indicator calculations')
    
    // Calculate indicators every 30 seconds
    setInterval(() => {
      this.calculateAllIndicators()
    }, 30 * 1000)
    
    // Initial calculation
    this.calculateAllIndicators()
  }

  calculateAllIndicators() {
    for (const symbol of this.activeSymbols) {
      for (const timeframe of this.timeframes) {
        try {
          this.calculateIndicators(symbol, timeframe)
        } catch (error) {
          this.logger.debug(`Error calculating indicators for ${symbol} ${timeframe}:`, error.message)
        }
      }
    }
  }

  calculateIndicators(symbol, timeframe) {
    const key = `${symbol}_${timeframe}`
    const ohlcv = this.priceData.get(key)
    
    if (!ohlcv || ohlcv.length < 50) return
    
    const closes = ohlcv.map(bar => bar[4])
    const highs = ohlcv.map(bar => bar[2])
    const lows = ohlcv.map(bar => bar[3])
    const volumes = ohlcv.map(bar => bar[5])
    
    const indicators = {}
    
    try {
      // Simple Moving Averages
      for (const period of this.config.indicatorPeriods.sma) {
        if (closes.length >= period) {
          indicators[`sma_${period}`] = TechnicalIndicators.SMA.calculate({
            period,
            values: closes
          })
        }
      }
      
      // Exponential Moving Averages
      for (const period of this.config.indicatorPeriods.ema) {
        if (closes.length >= period) {
          indicators[`ema_${period}`] = TechnicalIndicators.EMA.calculate({
            period,
            values: closes
          })
        }
      }
      
      // RSI
      for (const period of this.config.indicatorPeriods.rsi) {
        if (closes.length >= period + 1) {
          indicators[`rsi_${period}`] = TechnicalIndicators.RSI.calculate({
            period,
            values: closes
          })
        }
      }
      
      // MACD
      if (closes.length >= 26) {
        const macdConfig = this.config.indicatorPeriods.macd
        indicators.macd = TechnicalIndicators.MACD.calculate({
          fastPeriod: macdConfig[0],
          slowPeriod: macdConfig[1],
          signalPeriod: macdConfig[2],
          values: closes,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        })
      }
      
      // Bollinger Bands
      if (closes.length >= 20) {
        const bbConfig = this.config.indicatorPeriods.bb
        indicators.bb = TechnicalIndicators.BollingerBands.calculate({
          period: bbConfig[0],
          stdDev: bbConfig[1],
          values: closes
        })
      }
      
      // ATR
      if (ohlcv.length >= 14) {
        indicators.atr = TechnicalIndicators.ATR.calculate({
          period: 14,
          high: highs,
          low: lows,
          close: closes
        })
      }
      
      // Store indicators
      this.indicators.set(key, {
        timestamp: Date.now(),
        indicators
      })
      
      // Emit indicator update
      this.emit('indicators_update', {
        symbol,
        timeframe,
        indicators
      })
      
    } catch (error) {
      this.logger.debug(`Error calculating specific indicators for ${symbol} ${timeframe}:`, error.message)
    }
  }

  // Data retrieval methods
  getOHLCVData(symbol, timeframe, limit) {
    const key = `${symbol}_${timeframe}`
    const data = this.priceData.get(key) || []
    
    if (limit) {
      return data.slice(-limit)
    }
    return data
  }

  getLatestPrice(symbol) {
    const key = `${symbol}_1m`
    const data = this.priceData.get(key)
    
    if (data && data.length > 0) {
      const latest = data[data.length - 1]
      return {
        symbol,
        timestamp: latest[0],
        open: latest[1],
        high: latest[2],
        low: latest[3],
        close: latest[4],
        volume: latest[5]
      }
    }
    return null
  }

  getIndicators(symbol, timeframe) {
    const key = `${symbol}_${timeframe}`
    const indicatorData = this.indicators.get(key)
    return indicatorData ? indicatorData.indicators : {}
  }

  getLatestIndicators(symbol, timeframe) {
    const indicators = this.getIndicators(symbol, timeframe)
    const latest = {}
    
    for (const [name, values] of Object.entries(indicators)) {
      if (Array.isArray(values) && values.length > 0) {
        latest[name] = values[values.length - 1]
      } else {
        latest[name] = values
      }
    }
    
    return latest
  }

  // Feature engineering for ML models
  generateFeatures(symbol, timeframe, lookback = 100) {
    const ohlcv = this.getOHLCVData(symbol, timeframe, lookback)
    const indicators = this.getIndicators(symbol, timeframe)
    
    if (ohlcv.length < lookback) {
      return null
    }
    
    const features = []
    
    for (let i = lookback - 1; i < ohlcv.length; i++) {
      const feature = {
        timestamp: ohlcv[i][0],
        // Price features
        open: ohlcv[i][1],
        high: ohlcv[i][2],
        low: ohlcv[i][3],
        close: ohlcv[i][4],
        volume: ohlcv[i][5],
        
        // Price ratios
        hl_ratio: (ohlcv[i][2] - ohlcv[i][3]) / ohlcv[i][4],
        oc_ratio: (ohlcv[i][4] - ohlcv[i][1]) / ohlcv[i][1],
        
        // Returns
        return_1: i > 0 ? (ohlcv[i][4] - ohlcv[i-1][4]) / ohlcv[i-1][4] : 0,
        return_5: i >= 5 ? (ohlcv[i][4] - ohlcv[i-5][4]) / ohlcv[i-5][4] : 0,
        return_20: i >= 20 ? (ohlcv[i][4] - ohlcv[i-20][4]) / ohlcv[i-20][4] : 0,
        
        // Volatility
        volatility_5: this.calculateVolatility(ohlcv.slice(Math.max(0, i-4), i+1)),
        volatility_20: this.calculateVolatility(ohlcv.slice(Math.max(0, i-19), i+1))
      }
      
      // Add indicator features
      for (const [name, values] of Object.entries(indicators)) {
        if (Array.isArray(values) && values.length > i - lookback + 1) {
          const idx = i - lookback + 1
          if (idx < values.length) {
            if (typeof values[idx] === 'object' && values[idx] !== null) {
              // Handle complex indicators like MACD, Bollinger Bands
              for (const [subName, subValue] of Object.entries(values[idx])) {
                feature[`${name}_${subName}`] = subValue
              }
            } else {
              feature[name] = values[idx]
            }
          }
        }
      }
      
      features.push(feature)
    }
    
    return features
  }

  calculateVolatility(ohlcv) {
    if (ohlcv.length < 2) return 0
    
    const returns = []
    for (let i = 1; i < ohlcv.length; i++) {
      returns.push((ohlcv[i][4] - ohlcv[i-1][4]) / ohlcv[i-1][4])
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }

  // News and events
  async fetchNewsData() {
    try {
      // Mock news data for development
      const mockNews = [
        {
          id: Date.now().toString(),
          title: 'ECB Interest Rate Decision',
          content: 'European Central Bank maintains rates at current levels',
          impact: 'high',
          currency: 'EUR',
          timestamp: new Date().toISOString(),
          source: 'ECB'
        },
        {
          id: (Date.now() + 1).toString(),
          title: 'US Employment Data',
          content: 'Non-farm payrolls exceed expectations',
          impact: 'medium',
          currency: 'USD',
          timestamp: new Date().toISOString(),
          source: 'BLS'
        }
      ]
      
      this.newsData = mockNews
      this.emit('news_update', mockNews)
      
      return mockNews
    } catch (error) {
      this.logger.error('Error fetching news data:', error)
      return []
    }
  }

  getNewsData(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.newsData.filter(news => 
      new Date(news.timestamp) > cutoff
    )
  }

  // Data export methods
  exportData(symbol, timeframe, format = 'json') {
    const data = this.getOHLCVData(symbol, timeframe)
    const indicators = this.getIndicators(symbol, timeframe)
    
    const exportData = {
      symbol,
      timeframe,
      data,
      indicators,
      timestamp: new Date().toISOString()
    }
    
    if (format === 'csv') {
      return this.convertToCSV(exportData)
    }
    
    return exportData
  }

  convertToCSV(data) {
    const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
    const rows = [headers.join(',')]
    
    for (const bar of data.data) {
      rows.push(bar.join(','))
    }
    
    return rows.join('\n')
  }

  // Cleanup and shutdown
  async cleanup() {
    try {
      this.logger.info('Cleaning up Data Manager')
      
      // Clear intervals
      for (const interval of this.updateIntervals.values()) {
        clearInterval(interval)
      }
      this.updateIntervals.clear()
      
      // Close exchange connections
      for (const exchange of this.exchanges.values()) {
        if (exchange.close) {
          await exchange.close()
        }
      }
      this.exchanges.clear()
      
      // Cleanup database
      if (this.db) {
        await this.db.cleanup()
      }
      
      this.isInitialized = false
      this.logger.info('Data Manager cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during Data Manager cleanup:', error)
    }
  }

  // Status and health checks
  getStatus() {
    return {
      initialized: this.isInitialized,
      exchanges: Array.from(this.exchanges.keys()),
      activeSymbols: this.activeSymbols,
      dataPoints: this.priceData.size,
      indicators: this.indicators.size,
      lastUpdate: Math.max(...Array.from(this.lastUpdate.values()))
    }
  }

  async fetchLatestData() {
    try {
      this.logger.info('Fetching latest market data')
      
      // Update all symbols and timeframes
      for (const symbol of this.activeSymbols) {
        for (const timeframe of this.timeframes) {
          await this.fetchLatestBars(symbol, timeframe, 5)
        }
      }
      
      // Fetch news data
      await this.fetchNewsData()
      
      // Recalculate indicators
      this.calculateAllIndicators()
      
      this.logger.info('Latest data fetch completed')
      return true
    } catch (error) {
      this.logger.error('Error fetching latest data:', error)
      throw error
    }
  }
}