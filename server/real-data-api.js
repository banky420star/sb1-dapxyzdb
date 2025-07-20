import express from 'express'
import { UnirateClient } from 'unirate-api'
import cors from 'cors'

const app = express()
const PORT = 8001

app.use(cors())
app.use(express.json())

// Initialize UniRateAPI client
const unirateClient = new UnirateClient('UOaBj21hy46nIf54j0ykaP0KGLkXvDJflgjqiiwAanzrVQPXcL0tA9aNPJ9sik5R')

// Forex pairs
const forexPairs = [
  { symbol: 'EURUSD', from: 'EUR', to: 'USD' },
  { symbol: 'GBPUSD', from: 'GBP', to: 'USD' },
  { symbol: 'USDJPY', from: 'USD', to: 'JPY' },
  { symbol: 'AUDUSD', from: 'AUD', to: 'USD' },
  { symbol: 'USDCAD', from: 'USD', to: 'CAD' },
  { symbol: 'USDCHF', from: 'USD', to: 'CHF' },
  { symbol: 'NZDUSD', from: 'NZD', to: 'USD' }
]

// Get real-time forex prices
app.get('/api/forex/prices', async (req, res) => {
  try {
    const prices = {}
    
    for (const pair of forexPairs) {
      try {
        const rate = await unirateClient.getRate(pair.from, pair.to)
        prices[pair.symbol] = {
          symbol: pair.symbol,
          bid: rate * 0.9999,
          ask: rate * 1.0001,
          last: rate,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: Date.now()
        }
      } catch (error) {
        console.error(`Error fetching ${pair.symbol}:`, error.message)
        prices[pair.symbol] = {
          symbol: pair.symbol,
          error: error.message,
          timestamp: Date.now()
        }
      }
    }
    
    res.json({ success: true, data: prices })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get specific forex pair
app.get('/api/forex/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const pair = forexPairs.find(p => p.symbol === symbol.toUpperCase())
    
    if (!pair) {
      return res.status(404).json({ success: false, error: 'Symbol not found' })
    }
    
    const rate = await unirateClient.getRate(pair.from, pair.to)
    const priceData = {
      symbol: pair.symbol,
      bid: rate * 0.9999,
      ask: rate * 1.0001,
      last: rate,
      change: 0,
      changePercent: 0,
      volume: 0,
      timestamp: Date.now()
    }
    
    res.json({ success: true, data: priceData })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Stock data temporarily unavailable
app.get('/api/stocks/:symbol', async (req, res) => {
  res.status(503).json({ 
    success: false, 
    error: 'Stock data temporarily unavailable - Finnhub integration removed' 
  })
})

// Get all available data
app.get('/api/all', async (req, res) => {
  try {
    const allData = {
      forex: {},
      stocks: {},
      timestamp: Date.now()
    }
    
    // Get forex data
    for (const pair of forexPairs) {
      try {
        const rate = await unirateClient.getRate(pair.from, pair.to)
        allData.forex[pair.symbol] = {
          symbol: pair.symbol,
          bid: rate * 0.9999,
          ask: rate * 1.0001,
          last: rate,
          timestamp: Date.now()
        }
      } catch (error) {
        allData.forex[pair.symbol] = { symbol: pair.symbol, error: error.message }
      }
    }
    
    // Stock data temporarily unavailable
    allData.stocks = { message: 'Stock data temporarily unavailable - Finnhub integration removed' }
    
    res.json({ success: true, data: allData })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Real Data API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      forex: '/api/forex/prices',
      specificForex: '/api/forex/:symbol',
      stocks: '/api/stocks/:symbol',
      all: '/api/all'
    }
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Real Data API running on port ${PORT}`)
  console.log(`📊 Forex data: http://localhost:${PORT}/api/forex/prices`)
  console.log(`📈 Stock data: http://localhost:${PORT}/api/stocks/AAPL`)
  console.log(`🌐 All data: http://localhost:${PORT}/api/all`)
}) 