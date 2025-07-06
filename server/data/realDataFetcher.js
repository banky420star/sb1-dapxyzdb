import fetch from 'node-fetch'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'

export class RealDataFetcher {
  constructor() {
    this.logger = new Logger()
    this.db = new DatabaseManager()
    
    // API configurations
    this.apis = {
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        key: process.env.ALPHA_VANTAGE_API_KEY,
        rateLimit: 5, // 5 requests per minute
        lastRequest: 0
      },
      iexCloud: {
        baseUrl: 'https://cloud.iexapis.com/stable',
        key: process.env.IEX_CLOUD_API_KEY,
        rateLimit: 100, // 100 requests per second
        lastRequest: 0
      },
      polygon: {
        baseUrl: 'https://api.polygon.io',
        key: process.env.POLYGON_API_KEY,
        rateLimit: 10, // 10 requests per second
        lastRequest: 0
      }
    }
    
    // Forex pairs mapping
    this.forexPairs = {
      'EURUSD': { symbol: 'EUR/USD', alphaSymbol: 'EURUSD', source: 'alphaVantage' },
      'GBPUSD': { symbol: 'GBP/USD', alphaSymbol: 'GBPUSD', source: 'alphaVantage' },
      'USDJPY': { symbol: 'USD/JPY', alphaSymbol: 'USDJPY', source: 'alphaVantage' },
      'AUDUSD': { symbol: 'AUD/USD', alphaSymbol: 'AUDUSD', source: 'alphaVantage' },
      'USDCAD': { symbol: 'USD/CAD', alphaSymbol: 'USDCAD', source: 'alphaVantage' },
      'USDCHF': { symbol: 'USD/CHF', alphaSymbol: 'USDCHF', source: 'alphaVantage' },
      'NZDUSD': { symbol: 'NZD/USD', alphaSymbol: 'NZDUSD', source: 'alphaVantage' }
    }
    
    this.requestQueue = []
    this.isProcessingQueue = false
  }

  async initialize() {
    try {
      this.logger.info('Initializing Real Data Fetcher')
      
      // Test API connections
      await this.testConnections()
      
      // Start queue processor
      this.startQueueProcessor()
      
      this.logger.info('Real Data Fetcher initialized successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Real Data Fetcher:', error)
      throw error
    }
  }

  async testConnections() {
    const results = {}
    
    // Test Alpha Vantage
    if (this.apis.alphaVantage.key && this.apis.alphaVantage.key !== 'your_alpha_vantage_key_here') {
      try {
        const response = await this.fetchFromAlphaVantage('EURUSD', '1min', 'compact')
        results.alphaVantage = response ? 'Connected' : 'Failed'
      } catch (error) {
        results.alphaVantage = `Error: ${error.message}`
      }
    } else {
      results.alphaVantage = 'API key not configured'
    }
    
    this.logger.info('API Connection Test Results:', results)
    return results
  }

  async fetchHistoricalData(symbol, timeframe = '1h', limit = 1000) {
    try {
      const pair = this.forexPairs[symbol]
      if (!pair) {
        throw new Error(`Unsupported symbol: ${symbol}`)
      }

      let data = []
      
      switch (pair.source) {
        case 'alphaVantage':
          data = await this.fetchFromAlphaVantage(symbol, timeframe, 'full')
          break
        case 'iexCloud':
          data = await this.fetchFromIEX(symbol, timeframe)
          break
        default:
          throw new Error(`Unsupported data source: ${pair.source}`)
      }

      if (data && data.length > 0) {
        // Save to database
        await this.db.saveOHLCVData(symbol, timeframe, data.slice(-limit))
        this.logger.info(`Fetched ${data.length} bars for ${symbol} ${timeframe}`)
      }

      return data.slice(-limit)
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${symbol}:`, error)
      throw error
    }
  }

  async fetchFromAlphaVantage(symbol, timeframe, outputsize = 'compact') {
    try {
      // Rate limiting
      await this.respectRateLimit('alphaVantage')
      
      // Map timeframes
      const intervalMap = {
        '1m': '1min',
        '5m': '5min', 
        '15m': '15min',
        '30m': '30min',
        '1h': '60min',
        '1d': 'daily'
      }
      
      const interval = intervalMap[timeframe] || '60min'
      const func = interval === 'daily' ? 'FX_DAILY' : 'FX_INTRADAY'
      
      let url = `${this.apis.alphaVantage.baseUrl}?function=${func}&from_symbol=${symbol.slice(0,3)}&to_symbol=${symbol.slice(3,6)}&apikey=${this.apis.alphaVantage.key}&outputsize=${outputsize}`
      
      if (func === 'FX_INTRADAY') {
        url += `&interval=${interval}`
      }

      const response = await fetch(url)
      const data = await response.json()
      
      if (data['Error Message']) {
        throw new Error(data['Error Message'])
      }
      
      if (data['Note']) {
        throw new Error('API rate limit exceeded')
      }

      // Parse response
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'))
      if (!timeSeriesKey) {
        throw new Error('Invalid response format')
      }

      const timeSeries = data[timeSeriesKey]
      const ohlcvData = []
      
      for (const [timestamp, values] of Object.entries(timeSeries)) {
        ohlcvData.push([
          new Date(timestamp).getTime(),
          parseFloat(values['1. open']),
          parseFloat(values['2. high']),
          parseFloat(values['3. low']),
          parseFloat(values['4. close']),
          parseFloat(values['5. volume'] || 0)
        ])
      }
      
      return ohlcvData.sort((a, b) => a[0] - b[0])
    } catch (error) {
      this.logger.error(`Alpha Vantage API error for ${symbol}:`, error)
      throw error
    }
  }

  async fetchFromIEX(symbol, timeframe) {
    try {
      await this.respectRateLimit('iexCloud')
      
      // IEX Cloud doesn't support forex directly, using ETFs as proxy
      const forexETFs = {
        'EURUSD': 'FXE',
        'GBPUSD': 'FXB',
        'USDJPY': 'FXY',
        'AUDUSD': 'FXA'
      }
      
      const etfSymbol = forexETFs[symbol]
      if (!etfSymbol) {
        throw new Error(`No ETF proxy available for ${symbol}`)
      }
      
      const range = timeframe === '1d' ? '1y' : '1m'
      const url = `${this.apis.iexCloud.baseUrl}/stock/${etfSymbol}/chart/${range}?token=${this.apis.iexCloud.key}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      return data.map(bar => [
        new Date(bar.date).getTime(),
        bar.open,
        bar.high,
        bar.low,
        bar.close,
        bar.volume
      ])
    } catch (error) {
      this.logger.error(`IEX Cloud API error for ${symbol}:`, error)
      throw error
    }
  }

  async fetchRealTimePrice(symbol) {
    try {
      const pair = this.forexPairs[symbol]
      if (!pair) {
        throw new Error(`Unsupported symbol: ${symbol}`)
      }

      // Use Alpha Vantage real-time endpoint
      await this.respectRateLimit('alphaVantage')
      
      const url = `${this.apis.alphaVantage.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol.slice(0,3)}&to_currency=${symbol.slice(3,6)}&apikey=${this.apis.alphaVantage.key}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data['Error Message']) {
        throw new Error(data['Error Message'])
      }
      
      const exchangeRate = data['Realtime Currency Exchange Rate']
      if (!exchangeRate) {
        throw new Error('Invalid real-time response')
      }
      
      const price = parseFloat(exchangeRate['5. Exchange Rate'])
      const timestamp = new Date(exchangeRate['6. Last Refreshed']).getTime()
      
      return {
        symbol,
        bid: price - 0.0001, // Estimated spread
        ask: price + 0.0001,
        last: price,
        timestamp,
        change: 0, // Would need previous price to calculate
        percentage: 0,
        datetime: new Date(timestamp).toISOString()
      }
    } catch (error) {
      this.logger.error(`Error fetching real-time price for ${symbol}:`, error)
      throw error
    }
  }

  async respectRateLimit(apiName) {
    const api = this.apis[apiName]
    const now = Date.now()
    const timeSinceLastRequest = now - api.lastRequest
    const minInterval = 60000 / api.rateLimit // Convert to milliseconds
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest
      this.logger.debug(`Rate limiting ${apiName}: waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    api.lastRequest = Date.now()
  }

  async fetchNewsData() {
    try {
      if (!this.apis.alphaVantage.key || this.apis.alphaVantage.key === 'your_alpha_vantage_key_here') {
        return []
      }

      await this.respectRateLimit('alphaVantage')
      
      const url = `${this.apis.alphaVantage.baseUrl}?function=NEWS_SENTIMENT&topics=forex&apikey=${this.apis.alphaVantage.key}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.feed) {
        return data.feed.slice(0, 10).map(article => ({
          id: article.url,
          title: article.title,
          content: article.summary,
          impact: this.calculateNewsImpact(article.overall_sentiment_score),
          currency: this.extractCurrency(article.title + ' ' + article.summary),
          source: article.source,
          timestamp: new Date(article.time_published).getTime()
        }))
      }
      
      return []
    } catch (error) {
      this.logger.error('Error fetching news data:', error)
      return []
    }
  }

  calculateNewsImpact(sentimentScore) {
    const score = Math.abs(parseFloat(sentimentScore) || 0)
    if (score > 0.3) return 'high'
    if (score > 0.1) return 'medium'
    return 'low'
  }

  extractCurrency(text) {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']
    for (const currency of currencies) {
      if (text.toUpperCase().includes(currency)) {
        return currency
      }
    }
    return 'USD'
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.isProcessingQueue = true
        const request = this.requestQueue.shift()
        
        try {
          await request.execute()
        } catch (error) {
          this.logger.error('Error processing queued request:', error)
        } finally {
          this.isProcessingQueue = false
        }
      }
    }, 1000)
  }

  queueRequest(executeFunction) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: async () => {
          try {
            const result = await executeFunction()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }
      })
    })
  }

  async collectHistoricalDataSet(symbols = null, timeframes = null, months = 6) {
    try {
      const targetSymbols = symbols || Object.keys(this.forexPairs)
      const targetTimeframes = timeframes || ['1h', '4h', '1d']
      
      this.logger.info(`Starting historical data collection for ${targetSymbols.length} symbols`)
      
      const results = {}
      
      for (const symbol of targetSymbols) {
        results[symbol] = {}
        
        for (const timeframe of targetTimeframes) {
          try {
            this.logger.info(`Collecting ${symbol} ${timeframe} data...`)
            const data = await this.fetchHistoricalData(symbol, timeframe, months * 30 * 24) // Rough estimate
            results[symbol][timeframe] = data.length
            
            // Wait between requests to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (error) {
            this.logger.error(`Failed to collect ${symbol} ${timeframe}:`, error.message)
            results[symbol][timeframe] = `Error: ${error.message}`
          }
        }
      }
      
      this.logger.info('Historical data collection completed:', results)
      return results
    } catch (error) {
      this.logger.error('Error in historical data collection:', error)
      throw error
    }
  }

  getStatus() {
    return {
      initialized: true,
      apis: Object.keys(this.apis).map(name => ({
        name,
        configured: this.apis[name].key && this.apis[name].key !== `your_${name.toLowerCase()}_key_here`,
        rateLimit: this.apis[name].rateLimit,
        lastRequest: this.apis[name].lastRequest
      })),
      supportedPairs: Object.keys(this.forexPairs),
      queueLength: this.requestQueue.length
    }
  }

  async cleanup() {
    try {
      this.logger.info('Cleaning up Real Data Fetcher')
      this.requestQueue = []
      this.isProcessingQueue = false
      this.logger.info('Real Data Fetcher cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}