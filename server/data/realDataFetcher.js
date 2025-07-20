import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class RealDataFetcher extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = null
    this.isRunning = false
    this.connected = false
    
    this.options = {
      symbols: options.symbols || ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
      updateInterval: options.updateInterval || 1000, // 1 second
      dataSource: options.dataSource || 'mock', // 'mock', 'alpha_vantage', 'mt5'
      ...options
    }
    
    this.currentPrices = {}
    this.priceHistory = {}
    this.tradingSignals = []
    this.lastUpdate = Date.now()
    
    // Initialize price history for each symbol
    this.options.symbols.forEach(symbol => {
      this.currentPrices[symbol] = {
        bid: 0,
        ask: 0,
        spread: 0,
        timestamp: Date.now()
      }
      this.priceHistory[symbol] = []
    })
  }

  async initialize() {
    this.logger.info('Initializing Real Data Fetcher')
    
    if (!this.db) {
      this.db = new DatabaseManager()
      await this.db.initialize()
    }
    
    // Generate initial mock data
    await this.generateMockData()
    
    this.logger.info('Real Data Fetcher initialized')
  }

  async start() {
    if (this.isRunning) return
    
    this.logger.info('Starting Real Data Fetcher')
    this.isRunning = true
    this.connected = true
    
    // Start real-time data updates
    this.startDataUpdates()
    
    // Start signal generation
    this.startSignalGeneration()
    
    // Start market analysis
    this.startMarketAnalysis()
    
    this.logger.info('Real Data Fetcher started successfully')
  }

  async stop() {
    if (!this.isRunning) return
    
    this.logger.info('Stopping Real Data Fetcher')
    this.isRunning = false
    this.connected = false
    
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval)
    }
    if (this.signalInterval) {
      clearInterval(this.signalInterval)
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
    }
    
    this.logger.info('Real Data Fetcher stopped')
  }

  startDataUpdates() {
    this.dataUpdateInterval = setInterval(async () => {
      try {
        await this.updatePrices()
        this.lastUpdate = Date.now()
        this.emit('priceUpdate', this.currentPrices)
      } catch (error) {
        this.logger.error('Error updating prices:', error)
      }
    }, this.options.updateInterval)
  }

  startSignalGeneration() {
    this.signalInterval = setInterval(async () => {
      try {
        await this.generateTradingSignals()
      } catch (error) {
        this.logger.error('Error generating signals:', error)
      }
    }, 5000) // Generate signals every 5 seconds
  }

  startMarketAnalysis() {
    this.analysisInterval = setInterval(async () => {
      try {
        await this.analyzeMarketConditions()
      } catch (error) {
        this.logger.error('Error analyzing market:', error)
      }
    }, 10000) // Analyze market every 10 seconds
  }

  async updatePrices() {
    const timestamp = Date.now()
    
    for (const symbol of this.options.symbols) {
      // Generate realistic price movements
      const currentPrice = this.currentPrices[symbol]
      const basePrice = this.getBasePrice(symbol)
      
      // Add random walk with mean reversion
      const volatility = this.getVolatility(symbol)
      const randomWalk = (Math.random() - 0.5) * volatility
      const meanReversion = (basePrice - currentPrice.bid) * 0.001
      
      const newBid = currentPrice.bid + randomWalk + meanReversion
      const spread = this.getSpread(symbol)
      const newAsk = newBid + spread
      
      // Update current prices
      this.currentPrices[symbol] = {
        bid: newBid,
        ask: newAsk,
        spread: spread,
        timestamp: timestamp
      }
      
      // Add to price history (keep last 1000 points)
      this.priceHistory[symbol].push({
        bid: newBid,
        ask: newAsk,
        timestamp: timestamp
      })
      
      if (this.priceHistory[symbol].length > 1000) {
        this.priceHistory[symbol].shift()
      }
    }
    
    // Emit price update event
    this.emit('prices', this.currentPrices)
  }

  async generateTradingSignals() {
    const signals = []
    
    for (const symbol of this.options.symbols) {
      const prices = this.priceHistory[symbol]
      if (prices.length < 20) continue
      
      // Calculate technical indicators
      const sma20 = this.calculateSMA(prices, 20)
      const sma5 = this.calculateSMA(prices, 5)
      const rsi = this.calculateRSI(prices, 14)
      const currentPrice = prices[prices.length - 1].bid
      
      // Generate signals based on indicators
      let signal = null
      let confidence = 0
      
      // RSI oversold/overbought
      if (rsi < 30) {
        signal = 'BUY'
        confidence = 0.7
      } else if (rsi > 70) {
        signal = 'SELL'
        confidence = 0.7
      }
      
      // Moving average crossover
      if (sma5 > sma20 && currentPrice > sma5) {
        if (!signal || signal === 'BUY') {
          signal = 'BUY'
          confidence = Math.max(confidence, 0.6)
        }
      } else if (sma5 < sma20 && currentPrice < sma5) {
        if (!signal || signal === 'SELL') {
          signal = 'SELL'
          confidence = Math.max(confidence, 0.6)
        }
      }
      
      if (signal && confidence > 0.5) {
        signals.push({
          symbol: symbol,
          signal: signal,
          confidence: confidence,
          price: currentPrice,
          timestamp: Date.now(),
          indicators: {
            rsi: rsi,
            sma5: sma5,
            sma20: sma20
          }
        })
      }
    }
    
    if (signals.length > 0) {
      this.tradingSignals = signals
      this.emit('signals', signals)
      
      // Save signals to database
      if (this.db) {
        for (const signal of signals) {
          await this.db.addTradingSignal(signal)
        }
      }
    }
  }

  async analyzeMarketConditions() {
    const analysis = {
      timestamp: Date.now(),
      overallTrend: 'neutral',
      volatility: 'low',
      opportunities: [],
      risks: []
    }
    
    // Analyze overall market conditions
    let bullishCount = 0
    let bearishCount = 0
    let totalVolatility = 0
    
    for (const symbol of this.options.symbols) {
      const prices = this.priceHistory[symbol]
      if (prices.length < 10) continue
      
      // Calculate trend
      const recentPrices = prices.slice(-10)
      const trend = recentPrices[recentPrices.length - 1].bid - recentPrices[0].bid
      
      if (trend > 0) bullishCount++
      else if (trend < 0) bearishCount++
      
      // Calculate volatility
      const returns = []
      for (let i = 1; i < recentPrices.length; i++) {
        returns.push(Math.abs(recentPrices[i].bid - recentPrices[i-1].bid))
      }
      const avgVolatility = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      totalVolatility += avgVolatility
    }
    
    // Determine overall trend
    if (bullishCount > bearishCount + 1) {
      analysis.overallTrend = 'bullish'
    } else if (bearishCount > bullishCount + 1) {
      analysis.overallTrend = 'bearish'
    }
    
    // Determine volatility level
    const avgVolatility = totalVolatility / this.options.symbols.length
    if (avgVolatility > 0.001) {
      analysis.volatility = 'high'
    } else if (avgVolatility > 0.0005) {
      analysis.volatility = 'medium'
    }
    
    // Find opportunities
    for (const signal of this.tradingSignals) {
      if (signal.confidence > 0.7) {
        analysis.opportunities.push({
          symbol: signal.symbol,
          signal: signal.signal,
          confidence: signal.confidence,
          reason: `Strong ${signal.signal} signal with ${(signal.confidence * 100).toFixed(0)}% confidence`
        })
      }
    }
    
    // Identify risks
    if (analysis.volatility === 'high') {
      analysis.risks.push('High market volatility - consider reducing position sizes')
    }
    
    if (analysis.overallTrend === 'bearish') {
      analysis.risks.push('Bearish market conditions - exercise caution with long positions')
    }
    
    this.emit('marketAnalysis', analysis)
  }

  // Helper methods
  getBasePrice(symbol) {
    const basePrices = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 148.50,
      'AUDUSD': 0.6650,
      'USDCAD': 1.3550
    }
    return basePrices[symbol] || 1.0000
  }

  getVolatility(symbol) {
    const volatilities = {
      'EURUSD': 0.0002,
      'GBPUSD': 0.0003,
      'USDJPY': 0.02,
      'AUDUSD': 0.0004,
      'USDCAD': 0.0003
    }
    return volatilities[symbol] || 0.0001
  }

  getSpread(symbol) {
    const spreads = {
      'EURUSD': 0.0001,
      'GBPUSD': 0.0002,
      'USDJPY': 0.01,
      'AUDUSD': 0.0002,
      'USDCAD': 0.0002
    }
    return spreads[symbol] || 0.0001
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return 0
    const recentPrices = prices.slice(-period)
    const sum = recentPrices.reduce((acc, price) => acc + price.bid, 0)
    return sum / period
  }

  calculateRSI(prices, period) {
    if (prices.length < period + 1) return 50
    
    const gains = []
    const losses = []
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].bid - prices[i-1].bid
      if (change > 0) {
        gains.push(change)
        losses.push(0)
      } else {
        gains.push(0)
        losses.push(Math.abs(change))
      }
    }
    
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  async generateMockData() {
    // Generate initial mock data for each symbol
    for (const symbol of this.options.symbols) {
      const basePrice = this.getBasePrice(symbol)
      
      // Generate 100 historical price points
      for (let i = 0; i < 100; i++) {
        const timestamp = Date.now() - (100 - i) * 1000
        const volatility = this.getVolatility(symbol)
        const randomWalk = (Math.random() - 0.5) * volatility * 10
        
        const bid = basePrice + randomWalk
        const spread = this.getSpread(symbol)
        const ask = bid + spread
        
        this.priceHistory[symbol].push({
          bid: bid,
          ask: ask,
          timestamp: timestamp
        })
      }
      
      // Set current price
      const lastPrice = this.priceHistory[symbol][this.priceHistory[symbol].length - 1]
      this.currentPrices[symbol] = {
        bid: lastPrice.bid,
        ask: lastPrice.ask,
        spread: lastPrice.ask - lastPrice.bid,
        timestamp: lastPrice.timestamp
      }
    }
  }

  // Public methods
  getCurrentPrices() {
    return this.currentPrices
  }

  getPriceHistory(symbol, limit = 100) {
    if (!symbol) return this.priceHistory
    return this.priceHistory[symbol]?.slice(-limit) || []
  }

  getTradingSignals() {
    return this.tradingSignals
  }

  getConnectionStatus() {
    return {
      connected: this.connected,
      lastUpdate: this.lastUpdate,
      symbols: this.options.symbols,
      isRunning: this.isRunning
    }
  }

  // Database integration
  async savePriceData() {
    if (!this.db) return
    
    try {
      for (const [symbol, price] of Object.entries(this.currentPrices)) {
        await this.db.addPriceData({
          symbol: symbol,
          bid: price.bid,
          ask: price.ask,
          spread: price.spread,
          timestamp: price.timestamp
        })
      }
    } catch (error) {
      this.logger.error('Error saving price data:', error)
    }
  }
}