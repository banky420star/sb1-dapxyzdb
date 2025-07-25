import { EventEmitter } from 'events'
import ccxt from 'ccxt'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import pkg from 'technicalindicators'
const { TechnicalIndicators } = pkg

export class DataManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.isInitialized = false

    // Only use Bybit for crypto
    this.cryptoSymbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT']
    this.activeSymbols = [...this.cryptoSymbols]
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
      // Setup Bybit for crypto only
      try {
        const bybit = new ccxt.bybit({
          apiKey: process.env.BYBIT_API_KEY || '',
          secret: process.env.BYBIT_SECRET || '',
          enableRateLimit: true,
          timeout: 30000
        })
        await bybit.loadMarkets()
        this.exchanges = new Map()
        this.exchanges.set('bybit', bybit)
        this.logger.info('Connected to Bybit for crypto data')
      } catch (error) {
        this.logger.error('Failed to connect to Bybit:', error.message)
        throw error
      }
    } catch (error) {
      this.logger.error('Error setting up exchanges:', error)
      throw error
    }
  }

  async loadHistoricalData() {
    try {
      this.logger.info('Loading historical data')

      for (const symbol of this.activeSymbols) {
        for (const timeframe of this.timeframes) {
          try {
            // Try to load from database first
            const dbData = await this.db.getOHLCVData(symbol, timeframe, 5000) // Increased from 1000

            if (dbData && dbData.length > 100) { // Minimum 100 bars required
              this.storeOHLCVData(symbol, timeframe, dbData)
              this.logger.debug(`Loaded ${dbData.length} bars for ${symbol} ${timeframe} from database`)
            } else {
              // Fetch historical data if not enough in database
              this.logger.info(`Fetching historical data for ${symbol} ${timeframe}`)
              const historicalData = await this.fetchHistoricalData(symbol, timeframe, 5000)

              if (historicalData && historicalData.length > 0) {
                // Save to database
                await this.db.saveOHLCVData(symbol, timeframe, historicalData)

                // Store in memory
                this.storeOHLCVData(symbol, timeframe, historicalData)

                this.logger.info(`Fetched and stored ${historicalData.length} bars for ${symbol} ${timeframe}`)
              } else {
                this.logger.warn(`No historical data available for ${symbol} ${timeframe}`)
              }
            }
          } catch (error) {
            this.logger.error(`Error loading data for ${symbol} ${timeframe}:`, error.message)
          }
        }
      }

      // Ensure we have enough data for training
      await this.ensureMinimumDataForTraining()

      this.logger.info('Historical data loading completed')
    } catch (error) {
      this.logger.error('Error loading historical data:', error)
      throw error
    }
  }

  async ensureMinimumDataForTraining() {
    try {
      this.logger.info('Ensuring minimum data for training')

      const requiredSymbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT']
      const requiredTimeframes = ['1m', '5m', '15m', '1h']
      const minBars = 2000 // Minimum bars needed for training

      for (const symbol of requiredSymbols) {
        for (const timeframe of requiredTimeframes) {
          const data = await this.db.getOHLCVData(symbol, timeframe, minBars)

          if (!data || data.length < minBars) {
            this.logger.info(`Insufficient data for ${symbol} ${timeframe}, fetching more...`)

            // Calculate how much more data we need
            const currentBars = data ? data.length : 0
            const neededBars = minBars - currentBars

            if (neededBars > 0) {
              const additionalData = await this.fetchHistoricalData(symbol, timeframe, neededBars)

              if (additionalData && additionalData.length > 0) {
                await this.db.saveOHLCVData(symbol, timeframe, additionalData)
                this.logger.info(`Added ${additionalData.length} bars for ${symbol} ${timeframe}`)
              }
            }
          }
        }
      }

      this.logger.info('Minimum data requirements checked')
    } catch (error) {
      this.logger.error('Error ensuring minimum data:', error)
    }
  }

  async fetchHistoricalData(symbol, timeframe, limit = 1000) {
    try {
      if (this.cryptoSymbols.includes(symbol)) {
        return await this.fetchBybitData(symbol, timeframe, limit)
      }
      // If not supported, skip
      this.logger.warn(`Symbol ${symbol} not supported by Bybit. Skipping.`)
      return []
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${symbol} ${timeframe}:`, error)
      return []
    }
  }

  async fetchBybitData(symbol, timeframe, limit = 1000) {
    try {
      const exchange = this.exchanges.get('bybit')
      if (!exchange) {
        throw new Error('Bybit exchange not available')
      }
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
      return ohlcv
    } catch (error) {
      this.logger.error(`Error fetching Bybit data for ${symbol}:`, error)
      return []
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
    const ohlcvInterval = setInterval(async () => {
      await this.updateOHLCVData()
    }, 60 * 1000) // Every minute

    this.updateIntervals.set('ohlcv_update', ohlcvInterval)
  }

  async updateRealTimePrice(symbol) {
    try {
      let ticker = null
      if (this.cryptoSymbols.includes(symbol)) {
        ticker = await this.fetchBybitTicker(symbol)
      } else {
        this.logger.warn(`Symbol ${symbol} not supported by Bybit. Skipping.`)
        return
      }
      if (ticker) {
        this.updateLatestPrice(symbol, ticker)
        this.emit('price_update', { symbol, ticker })
      }
    } catch (error) {
      this.logger.debug(`Error updating real-time price for ${symbol}:`, error.message)
    }
  }

  async fetchBybitTicker(symbol) {
    try {
      const exchange = this.exchanges.get('bybit')
      if (!exchange) {
        throw new Error('Bybit exchange not available')
      }
      const ticker = await exchange.fetchTicker(symbol)
      return ticker
    } catch (error) {
      this.logger.error(`Error fetching Bybit ticker for ${symbol}:`, error)
      return null
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
        lastBar[4] = ticker.last // Close price
        lastBar[2] = Math.max(lastBar[2], ticker.last) // High
        lastBar[3] = Math.min(lastBar[3], ticker.last) // Low
      } else {
        const newBar = [
          barTime,
          ticker.last, // Open
          ticker.last, // High
          ticker.last, // Low
          ticker.last, // Close
          0 // Volume
        ]
        data.push(newBar)
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
    const indicatorInterval = setInterval(() => {
      this.calculateAllIndicators()
    }, 30 * 1000)

    this.updateIntervals.set('indicator_calc', indicatorInterval)

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

  // Cleanup and shutdown - FIXED MEMORY LEAK
  async cleanup() {
    try {
      this.logger.info('Cleaning up Data Manager')

      // Stop all update intervals (Fixed: Proper interval clearing)
      for (const [key, interval] of this.updateIntervals) {
        if (interval) {
          clearInterval(interval)
          this.logger.debug(`Cleared interval: ${key}`)
        }
      }
      this.updateIntervals.clear()

      // Close exchange connections gracefully
      for (const [exchangeId, exchange] of this.exchanges) {
        try {
          if (exchange && exchange.close) {
            await exchange.close()
          }
          this.logger.debug(`Closed exchange: ${exchangeId}`)
        } catch (error) {
          this.logger.warn(`Error closing exchange ${exchangeId}:`, error.message)
        }
      }
      this.exchanges.clear()

      // Clear data storage and prevent memory leaks
      this.priceData.clear()
      this.indicators.clear()
      this.newsData.length = 0 // Proper array cleanup
      this.lastUpdate.clear()

      // Remove all event listeners to prevent memory leaks
      this.removeAllListeners()

      // Cleanup database
      if (this.db) {
        await this.db.cleanup()
        this.db = null
      }

      // Force garbage collection hint
      if (global.gc) {
        global.gc()
      }

      this.isInitialized = false
      this.logger.info('Data Manager cleaned up successfully - Memory leak fixed')
    } catch (error) {
      this.logger.error('Error during Data Manager cleanup:', error)
      throw error
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

  async reconnect() {
    this.logger.info('Reconnecting data manager...')
    try {
      await this.initialize()
      this.logger.info('Data manager reconnected successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to reconnect data manager:', error)
      return false
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