// Live Data Feed Service for AI Model Training
// Continuously feeds real-time market data to train models

import crypto from 'crypto'
import { EventEmitter } from 'events'

const BYBIT_API_KEY = process.env.BYBIT_API_KEY
const BYBIT_SECRET = process.env.BYBIT_SECRET
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY

class LiveDataFeed extends EventEmitter {
  constructor() {
    super()
    this.isRunning = false
    this.dataCache = new Map()
    this.trainingData = []
    this.lastUpdate = null
    this.updateInterval = null
    this.websocketConnections = new Map()
    
    // Trading pairs for data collection
    this.tradingPairs = [
      'BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT',
      'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'EOSUSDT', 'TRXUSDT'
    ]
    
    // Forex pairs
    this.forexPairs = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
      'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
    ]
  }

  // Start the live data feed
  async start() {
    if (this.isRunning) {
      console.log('Live data feed already running')
      return
    }

    console.log('🚀 Starting Live Data Feed for AI Model Training...')
    this.isRunning = true

    // Initialize data collection
    await this.initializeDataCollection()
    
    // Start continuous data updates
    this.startContinuousUpdates()
    
    // Start WebSocket connections for real-time data
    this.startWebSocketConnections()
    
    // Start synthetic data generation for training
    this.startSyntheticDataGeneration()
    
    console.log('✅ Live Data Feed Started Successfully')
    this.emit('feed_started')
  }

  // Stop the live data feed
  stop() {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping Live Data Feed...')
    this.isRunning = false

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    // Close WebSocket connections
    this.websocketConnections.forEach(ws => {
      if (ws && ws.readyState === 1) {
        ws.close()
      }
    })
    this.websocketConnections.clear()

    console.log('✅ Live Data Feed Stopped')
    this.emit('feed_stopped')
  }

  // Initialize data collection from multiple sources
  async initializeDataCollection() {
    console.log('📊 Initializing data collection from multiple sources...')
    
    try {
      // Collect initial data from all sources
      await Promise.all([
        this.collectBybitData(),
        this.collectAlphaVantageData(),
        this.collectSyntheticData()
      ])
      
      console.log('✅ Initial data collection completed')
    } catch (error) {
      console.error('❌ Error in initial data collection:', error.message)
    }
  }

  // Start continuous data updates
  startContinuousUpdates() {
    // Update every 5 seconds for real-time training
    this.updateInterval = setInterval(async () => {
      if (!this.isRunning) return

      try {
        await this.updateAllDataSources()
        this.processDataForTraining()
        this.emit('data_updated', this.getLatestData())
      } catch (error) {
        console.error('❌ Error in continuous updates:', error.message)
      }
    }, 5000) // 5-second intervals for real-time training
  }

  // Update all data sources
  async updateAllDataSources() {
    const updatePromises = []

    // Update Bybit data (crypto)
    if (BYBIT_API_KEY && BYBIT_SECRET) {
      updatePromises.push(this.collectBybitData())
    }

    // Update Alpha Vantage data (forex)
    if (ALPHA_VANTAGE_KEY) {
      updatePromises.push(this.collectAlphaVantageData())
    }

    // Always generate synthetic data
    updatePromises.push(this.collectSyntheticData())

    await Promise.allSettled(updatePromises)
  }

  // Collect Bybit market data
  async collectBybitData() {
    try {
      for (const pair of this.tradingPairs) {
        const data = await this.fetchBybitKlineData(pair)
        if (data) {
          this.dataCache.set(`bybit_${pair}`, {
            source: 'bybit',
            symbol: pair,
            data: data,
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('❌ Error collecting Bybit data:', error.message)
    }
  }

  // Fetch Bybit kline data
  async fetchBybitKlineData(symbol, interval = '1', limit = 100) {
    try {
      const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.retCode === 0 && result.result.list) {
        return result.result.list.map(candle => ({
          timestamp: parseInt(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }))
      }
    } catch (error) {
      console.error(`❌ Error fetching Bybit data for ${symbol}:`, error.message)
    }
    return null
  }

  // Collect Alpha Vantage data
  async collectAlphaVantageData() {
    try {
      for (const pair of this.forexPairs) {
        const data = await this.fetchAlphaVantageData(pair)
        if (data) {
          this.dataCache.set(`alphavantage_${pair.replace('/', '')}`, {
            source: 'alphavantage',
            symbol: pair,
            data: data,
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('❌ Error collecting Alpha Vantage data:', error.message)
    }
  }

  // Fetch Alpha Vantage data
  async fetchAlphaVantageData(symbol) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${ALPHA_VANTAGE_KEY}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data['Time Series (1min)']) {
        const timeSeries = data['Time Series (1min)']
        const timestamps = Object.keys(timeSeries).slice(0, 100) // Last 100 data points
        
        return timestamps.map(timestamp => {
          const point = timeSeries[timestamp]
          return {
            timestamp: new Date(timestamp).getTime(),
            open: parseFloat(point['1. open']),
            high: parseFloat(point['2. high']),
            low: parseFloat(point['3. low']),
            close: parseFloat(point['4. close']),
            volume: parseFloat(point['5. volume'])
          }
        })
      }
    } catch (error) {
      console.error(`❌ Error fetching Alpha Vantage data for ${symbol}:`, error.message)
    }
    return null
  }

  // Generate synthetic data for training
  async collectSyntheticData() {
    try {
      const syntheticPairs = ['SYNTH_BTC', 'SYNTH_ETH', 'SYNTH_FOREX']
      
      for (const pair of syntheticPairs) {
        const data = this.generateSyntheticMarketData(pair)
        this.dataCache.set(`synthetic_${pair}`, {
          source: 'synthetic',
          symbol: pair,
          data: data,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('❌ Error generating synthetic data:', error.message)
    }
  }

  // Generate synthetic market data
  generateSyntheticMarketData(symbol) {
    const data = []
    let basePrice = 50000 // Base price for synthetic data
    let currentPrice = basePrice
    
    // Generate 100 data points
    for (let i = 0; i < 100; i++) {
      // Random price movement
      const change = (Math.random() - 0.5) * 0.02 // ±1% change
      currentPrice *= (1 + change)
      
      // Generate OHLCV data
      const open = currentPrice
      const high = open * (1 + Math.random() * 0.01)
      const low = open * (1 - Math.random() * 0.01)
      const close = low + Math.random() * (high - low)
      const volume = Math.random() * 1000000 + 100000
      
      data.push({
        timestamp: Date.now() - (100 - i) * 60000, // 1-minute intervals
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume
      })
    }
    
    return data
  }

  // Process data for AI model training
  processDataForTraining() {
    const processedData = []
    
    this.dataCache.forEach((cacheEntry, key) => {
      if (cacheEntry.data && Array.isArray(cacheEntry.data)) {
        const features = this.extractFeatures(cacheEntry.data)
        if (features) {
          processedData.push({
            symbol: cacheEntry.symbol,
            source: cacheEntry.source,
            features: features,
            timestamp: cacheEntry.timestamp
          })
        }
      }
    })
    
    // Add to training data
    this.trainingData.push(...processedData)
    
    // Keep only last 1000 data points to prevent memory issues
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000)
    }
    
    this.lastUpdate = new Date().toISOString()
    this.emit('training_data_ready', processedData)
  }

  // Extract features from market data
  extractFeatures(data) {
    if (!data || data.length < 20) return null
    
    const closes = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    // Calculate technical indicators
    const rsi = this.calculateRSI(closes, 14)
    const macd = this.calculateMACD(closes)
    const ema20 = this.calculateEMA(closes, 20)
    const ema50 = this.calculateEMA(closes, 50)
    const bb = this.calculateBollingerBands(closes, 20, 2)
    const atr = this.calculateATR(data, 14)
    
    // Volume indicators
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    const currentVolume = volumes[volumes.length - 1]
    const volumeRatio = currentVolume / avgVolume
    
    return {
      rsi: rsi,
      macd: macd,
      ema20: ema20,
      ema50: ema50,
      bb_upper: bb.upper,
      bb_lower: bb.lower,
      bb_middle: bb.middle,
      atr: atr,
      volume_ratio: volumeRatio,
      price_change: (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2],
      volatility: this.calculateVolatility(closes, 20)
    }
  }

  // Calculate RSI
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        gains += change
      } else {
        losses -= change
      }
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  // Calculate MACD
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return { macd: 0, signal: 0, histogram: 0 }
    
    const ema12 = this.calculateEMA(prices, fastPeriod)
    const ema26 = this.calculateEMA(prices, slowPeriod)
    const macd = ema12 - ema26
    
    // Calculate signal line (EMA of MACD)
    const macdValues = []
    for (let i = slowPeriod; i < prices.length; i++) {
      const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod)
      const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod)
      macdValues.push(fastEMA - slowEMA)
    }
    
    const signal = this.calculateEMA(macdValues, signalPeriod)
    const histogram = macd - signal
    
    return { macd, signal, histogram }
  }

  // Calculate EMA
  calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1]
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }

  // Calculate Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      const lastPrice = prices[prices.length - 1]
      return { upper: lastPrice, middle: lastPrice, lower: lastPrice }
    }
    
    const recentPrices = prices.slice(-period)
    const sma = recentPrices.reduce((a, b) => a + b, 0) / period
    
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2)
    }, 0) / period
    
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }

  // Calculate ATR
  calculateATR(data, period = 14) {
    if (data.length < period + 1) return 0
    
    const trueRanges = []
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high
      const low = data[i].low
      const prevClose = data[i - 1].close
      
      const tr1 = high - low
      const tr2 = Math.abs(high - prevClose)
      const tr3 = Math.abs(low - prevClose)
      
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    const recentTR = trueRanges.slice(-period)
    return recentTR.reduce((a, b) => a + b, 0) / period
  }

  // Calculate volatility
  calculateVolatility(prices, period = 20) {
    if (prices.length < period) return 0
    
    const recentPrices = prices.slice(-period)
    const returns = []
    
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1])
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => {
      return sum + Math.pow(ret - mean, 2)
    }, 0) / returns.length
    
    return Math.sqrt(variance)
  }

  // Start WebSocket connections for real-time data
  startWebSocketConnections() {
    console.log('🔌 Starting WebSocket connections for real-time data...')
    
    // Note: In a production environment, you would implement actual WebSocket connections
    // to exchanges like Bybit, Binance, etc. for real-time data streaming
    
    // For now, we'll simulate WebSocket data with intervals
    setInterval(() => {
      if (!this.isRunning) return
      
      // Simulate real-time price updates
      this.tradingPairs.forEach(pair => {
        const simulatedPrice = this.generateSimulatedPrice(pair)
        this.emit('realtime_price', {
          symbol: pair,
          price: simulatedPrice,
          timestamp: new Date().toISOString()
        })
      })
    }, 1000) // 1-second updates
  }

  // Generate simulated price for WebSocket
  generateSimulatedPrice(symbol) {
    const basePrices = {
      'BTCUSDT': 50000,
      'ETHUSDT': 3000,
      'XRPUSDT': 0.5,
      'ADAUSDT': 0.4,
      'DOTUSDT': 7
    }
    
    const basePrice = basePrices[symbol] || 100
    const change = (Math.random() - 0.5) * 0.001 // ±0.1% change
    return basePrice * (1 + change)
  }

  // Start synthetic data generation
  startSyntheticDataGeneration() {
    console.log('🎲 Starting synthetic data generation...')
    
    setInterval(() => {
      if (!this.isRunning) return
      
      // Generate synthetic market events
      const events = this.generateSyntheticEvents()
      this.emit('synthetic_events', events)
    }, 30000) // 30-second intervals
  }

  // Generate synthetic market events
  generateSyntheticEvents() {
    const eventTypes = ['price_spike', 'volume_surge', 'trend_reversal', 'breakout']
    const symbols = this.tradingPairs.concat(this.forexPairs)
    
    return {
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      timestamp: new Date().toISOString(),
      intensity: Math.random()
    }
  }

  // Get latest data for models
  getLatestData() {
    return {
      cache: Object.fromEntries(this.dataCache),
      trainingData: this.trainingData.slice(-100), // Last 100 data points
      lastUpdate: this.lastUpdate,
      isRunning: this.isRunning
    }
  }

  // Get training data for specific model
  getTrainingDataForModel(modelType) {
    const modelData = {
      lstm: this.trainingData.filter(d => d.source === 'bybit' || d.source === 'alphavantage'),
      randomforest: this.trainingData.filter(d => d.source === 'bybit'),
      ddqn: this.trainingData.filter(d => d.source === 'synthetic' || d.source === 'bybit'),
      ensemble: this.trainingData // All data for ensemble
    }
    
    return modelData[modelType] || this.trainingData
  }

  // Get data statistics
  getDataStatistics() {
    const stats = {
      totalDataPoints: this.trainingData.length,
      sources: {},
      symbols: {},
      lastUpdate: this.lastUpdate,
      isRunning: this.isRunning
    }
    
    // Count by source
    this.trainingData.forEach(data => {
      stats.sources[data.source] = (stats.sources[data.source] || 0) + 1
      stats.symbols[data.symbol] = (stats.symbols[data.symbol] || 0) + 1
    })
    
    return stats
  }
}

// Create singleton instance
const liveDataFeed = new LiveDataFeed()

export default liveDataFeed
export { LiveDataFeed }
