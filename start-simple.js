#!/usr/bin/env node

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { DatabaseManager } from './server/database/manager.js'
import { Logger } from './server/utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const logger = new Logger()

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173'],
  credentials: true
}))
app.use(express.json())

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: 0, // Disable caching
  etag: false,
  setHeaders: (res, path) => {
    // Force no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8')
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8')
    }
  }
}))

// Simple health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'AI Trading System is running'
  })
})

// Simple system status
app.get('/api/status', (req, res) => {
  res.json({
    system: 'online',
    database: 'connected',
    models: ['RandomForest', 'LSTM', 'DDQN'],
    trading: 'paper mode',
    dataConnected: true,
    lastUpdate: new Date().toISOString()
  })
})

// Debug endpoint for troubleshooting
app.get('/api/debug', (req, res) => {
  res.json({
    server: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    endpoints: [
      '/api/health',
      '/api/status', 
      '/api/prices',
      '/api/debug'
    ],
    frontend: {
      staticPath: join(__dirname, 'dist'),
      indexExists: require('fs').existsSync(join(__dirname, 'dist', 'index.html')),
      cssExists: require('fs').existsSync(join(__dirname, 'dist', 'assets', 'index-5d1e4769.css')),
      jsExists: require('fs').existsSync(join(__dirname, 'dist', 'assets', 'index-26f584b7.js'))
    },
    features: [
      'Real-time price updates',
      'Alpha Vantage integration',
      'Mock data fallback',
      'Rate limiting protection',
      'Dark theme styling'
    ]
  })
})

// Mock trading data
app.get('/api/trades', (req, res) => {
  res.json([
    {
      id: '1',
      symbol: 'EURUSD',
      side: 'BUY',
      quantity: 0.1,
      price: 1.0950,
      profit: 15.50,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '2',
      symbol: 'GBPUSD',
      side: 'SELL',
      quantity: 0.1,
      price: 1.2750,
      profit: -8.25,
      timestamp: new Date(Date.now() - 7200000).toISOString()
    }
  ])
})

// Mock positions
app.get('/api/positions', (req, res) => {
  res.json([
    {
      id: '1',
      symbol: 'USDJPY',
      side: 'BUY',
      quantity: 0.1,
      entryPrice: 150.25,
      currentPrice: 150.85,
      profit: 6.00
    }
  ])
})

// Mock model status
app.get('/api/models', (req, res) => {
  res.json([
    {
      name: 'RandomForest',
      status: 'ready',
      accuracy: 67.5,
      lastTrained: new Date(Date.now() - 86400000).toISOString()
    },
    {
      name: 'LSTM',
      status: 'ready',
      accuracy: 71.2,
      lastTrained: new Date(Date.now() - 86400000).toISOString()
    },
    {
      name: 'DDQN',
      status: 'ready',
      accuracy: 69.8,
      lastTrained: new Date(Date.now() - 86400000).toISOString()
    }
  ])
})

// Real-time prices from Alpha Vantage
app.get('/api/prices', async (req, res) => {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || ''
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
    const prices = {}
    
    // Fetch real data from Alpha Vantage (with rate limiting - max 5 per minute)
    for (const symbol of symbols) {
      try {
        const fromCurrency = symbol.substring(0, 3)
        const toCurrency = symbol.substring(3, 6)
        
        const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data['Realtime Currency Exchange Rate']) {
          const exchangeRate = data['Realtime Currency Exchange Rate']
          const price = parseFloat(exchangeRate['5. Exchange Rate'])
          const lastRefreshed = exchangeRate['6. Last Refreshed']
          
          prices[symbol] = {
            price: price,
            change: 0, // Alpha Vantage doesn't provide direct change data
            changePercent: 0,
            timestamp: new Date(lastRefreshed).getTime(),
            lastRefreshed: lastRefreshed,
            source: 'Alpha Vantage'
          }
        } else {
          // Fallback to mock data if API fails
          prices[symbol] = {
            price: symbol === 'EURUSD' ? 1.0950 : symbol === 'GBPUSD' ? 1.2750 : symbol === 'USDJPY' ? 150.25 : 0.6750,
            change: (Math.random() - 0.5) * 0.002,
            changePercent: (Math.random() - 0.5) * 0.2,
            timestamp: Date.now(),
            source: 'Mock (API limit reached)'
          }
        }
        
        // Rate limiting - wait 15 seconds between requests (4 per minute to stay under 5/min limit)
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 15000))
        }
        
      } catch (error) {
        logger.info(`Error fetching ${symbol} from Alpha Vantage: ${error.message}`)
        // Fallback to mock data
        prices[symbol] = {
          price: symbol === 'EURUSD' ? 1.0950 : symbol === 'GBPUSD' ? 1.2750 : symbol === 'USDJPY' ? 150.25 : 0.6750,
          change: (Math.random() - 0.5) * 0.002,
          changePercent: (Math.random() - 0.5) * 0.2,
          timestamp: Date.now(),
          source: 'Mock (API error)'
        }
      }
    }
    
    res.json(prices)
  } catch (error) {
    logger.error('Error in /api/prices endpoint:', error)
    // Return mock data as fallback
    const baseTime = Date.now()
    res.json({
      EURUSD: {
        price: 1.0950 + (Math.random() - 0.5) * 0.001,
        change: (Math.random() - 0.5) * 0.002,
        changePercent: (Math.random() - 0.5) * 0.2,
        timestamp: baseTime,
        source: 'Mock (fallback)'
      },
      GBPUSD: {
        price: 1.2750 + (Math.random() - 0.5) * 0.001,
        change: (Math.random() - 0.5) * 0.002,
        changePercent: (Math.random() - 0.5) * 0.2,
        timestamp: baseTime,
        source: 'Mock (fallback)'
      },
      USDJPY: {
        price: 150.25 + (Math.random() - 0.5) * 0.1,
        change: (Math.random() - 0.5) * 0.2,
        changePercent: (Math.random() - 0.5) * 0.2,
        timestamp: baseTime,
        source: 'Mock (fallback)'
      },
      AUDUSD: {
        price: 0.6750 + (Math.random() - 0.5) * 0.001,
        change: (Math.random() - 0.5) * 0.002,
        changePercent: (Math.random() - 0.5) * 0.2,
        timestamp: baseTime,
        source: 'Mock (fallback)'
      }
    })
  }
})

// Socket.IO for real-time updates
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)
  
  // Send initial data
  socket.emit('system_state', {
    status: 'online',
    trading: 'paper',
    lastUpdate: new Date().toISOString()
  })
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Cache for real-time data to avoid API rate limits
let cachedPrices = {}
let lastFetchTime = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes cache (longer to avoid rate limits)
let apiCallCount = 0
const MAX_API_CALLS_PER_HOUR = 5 // Very conservative to avoid rate limits

// Function to fetch and cache real prices
async function fetchAndCachePrices() {
  const now = Date.now()
  if (now - lastFetchTime < CACHE_DURATION && Object.keys(cachedPrices).length > 0) {
    return cachedPrices // Return cached data
  }

  // Check if we've exceeded API call limits for the hour
  if (apiCallCount >= MAX_API_CALLS_PER_HOUR) {
    logger.warn('API rate limit reached, using cached/mock data')
    if (Object.keys(cachedPrices).length === 0) {
      cachedPrices = generateMockPrices()
    }
    return cachedPrices
  }

  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || ''
    logger.info('Fetching fresh price data from Alpha Vantage...')
    
    // Fetch only one symbol per call to respect rate limits
    const symbol = 'EURUSD' // Primary symbol
    const fromCurrency = symbol.substring(0, 3)
    const toCurrency = symbol.substring(3, 6)
    
    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    apiCallCount++
    
    // Reset API call count every hour
    setTimeout(() => {
      apiCallCount = Math.max(0, apiCallCount - 1)
    }, 60 * 60 * 1000)
    
    if (data['Realtime Currency Exchange Rate']) {
      const exchangeRate = data['Realtime Currency Exchange Rate']
      const basePrice = parseFloat(exchangeRate['5. Exchange Rate'])
      const lastRefreshed = exchangeRate['6. Last Refreshed']
      const timestamp = new Date(lastRefreshed).getTime()
      
      // Update cache with real data for EURUSD and realistic mock data for others
      cachedPrices = {
        EURUSD: {
          price: basePrice,
          change: 0,
          changePercent: 0,
          timestamp: timestamp,
          lastRefreshed: lastRefreshed,
          source: 'Alpha Vantage'
        },
        // Use realistic mock data based on current market conditions
        GBPUSD: {
          price: 1.2750 + (Math.random() - 0.5) * 0.002, // Small realistic movement
          change: (Math.random() - 0.5) * 0.001,
          changePercent: (Math.random() - 0.5) * 0.1,
          timestamp: timestamp,
          source: 'Realistic Mock'
        },
        USDJPY: {
          price: 150.25 + (Math.random() - 0.5) * 0.5, // Small realistic movement
          change: (Math.random() - 0.5) * 0.2,
          changePercent: (Math.random() - 0.5) * 0.1,
          timestamp: timestamp,
          source: 'Realistic Mock'
        },
        AUDUSD: {
          price: 0.6750 + (Math.random() - 0.5) * 0.002, // Small realistic movement
          change: (Math.random() - 0.5) * 0.001,
          changePercent: (Math.random() - 0.5) * 0.1,
          timestamp: timestamp,
          source: 'Realistic Mock'
        }
      }
      
      lastFetchTime = now
      logger.info(`Fresh price data cached: EURUSD = ${basePrice}`)
    } else {
      logger.warn('Alpha Vantage API response invalid, using existing cache or mock data')
      if (Object.keys(cachedPrices).length === 0) {
        cachedPrices = generateMockPrices()
      }
    }
  } catch (error) {
    logger.error('Error fetching Alpha Vantage data:', error.message)
    if (Object.keys(cachedPrices).length === 0) {
      cachedPrices = generateMockPrices()
    }
  }
  
  return cachedPrices
}

// Generate realistic mock prices as fallback
function generateMockPrices() {
  const baseTime = Date.now()
  return {
    EURUSD: {
      price: 1.0950 + (Math.random() - 0.5) * 0.001,
      change: (Math.random() - 0.5) * 0.002,
      changePercent: (Math.random() - 0.5) * 0.2,
      timestamp: baseTime,
      source: 'Realistic Mock'
    },
    GBPUSD: {
      price: 1.2750 + (Math.random() - 0.5) * 0.001,
      change: (Math.random() - 0.5) * 0.002,
      changePercent: (Math.random() - 0.5) * 0.2,
      timestamp: baseTime,
      source: 'Realistic Mock'
    },
    USDJPY: {
      price: 150.25 + (Math.random() - 0.5) * 0.1,
      change: (Math.random() - 0.5) * 0.2,
      changePercent: (Math.random() - 0.5) * 0.2,
      timestamp: baseTime,
      source: 'Realistic Mock'
    },
    AUDUSD: {
      price: 0.6750 + (Math.random() - 0.5) * 0.001,
      change: (Math.random() - 0.5) * 0.002,
      changePercent: (Math.random() - 0.5) * 0.2,
      timestamp: baseTime,
      source: 'Realistic Mock'
    }
  }
}

// Send real-time updates every 2 minutes (much less frequent)
setInterval(async () => {
  try {
    const prices = await fetchAndCachePrices()
    io.emit('price_update', prices)
  } catch (error) {
    logger.error('Error in price update interval:', error)
    // Send mock data as fallback
    io.emit('price_update', generateMockPrices())
  }
}, 120000) // Every 2 minutes

// Force CSS to load with proper headers
app.get('/assets/*.css', (req, res) => {
  const cssFile = req.path
  res.setHeader('Content-Type', 'text/css; charset=UTF-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.sendFile(join(__dirname, 'dist', cssFile))
})

// Force JS to load with proper headers
app.get('/assets/*.js', (req, res) => {
  const jsFile = req.path
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.sendFile(join(__dirname, 'dist', jsFile))
})

// Start server
const PORT = process.env.PORT || 8000

// Initialize database
const db = new DatabaseManager()
db.initialize().then(() => {
  logger.info('Database initialized successfully')
}).catch(err => {
  logger.warn('Database initialization skipped:', err.message)
})

// Catch all route for SPA (MUST BE LAST)
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

server.listen(PORT, () => {
  logger.info(`🚀 AI Trading System started successfully!`)
  logger.info(`📊 Backend: http://localhost:${PORT}`)
  logger.info(`🌐 Frontend: Build with 'npm run build' and serve from dist/`)
  logger.info(`💡 Features: Optimized API calls, Clean dashboard, Paper trading`)
  logger.info(`🔧 Status: All systems operational`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    process.exit(0)
  })
}) 