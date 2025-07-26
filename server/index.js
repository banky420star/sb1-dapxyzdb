import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cron from 'node-cron'
import { EnhancedDataManager } from './data/enhanced-data-manager.js'
import { TradingEngine } from './trading/engine.js'
import { ModelManager } from './ml/manager.js'
import { RiskManager } from './risk/manager.js'
import { MetricsCollector } from './monitoring/metrics.js'
import { Logger } from './utils/logger.js'
import { AINotificationAgent } from './ai/notification-agent.js'
import { AutonomousOrchestrator } from './autonomous/orchestrator.js'
import { BybitIntegration } from './data/bybit-integration.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, desktop apps)
      if (!origin) return callback(null, true)
      
      // Define allowed origins based on environment
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:4174', 'http://127.0.0.1:3000']
      
      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      
      // Log suspicious requests
      console.warn(`Blocked CORS request from origin: ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Initialize core components
const logger = new Logger()
const dataManager = new EnhancedDataManager()
const modelManager = new ModelManager()
const riskManager = new RiskManager()
const metricsCollector = new MetricsCollector()
const tradingEngine = new TradingEngine({
  dataManager,
  modelManager,
  riskManager,
  logger,
  io
})

// Initialize AI Notification Agent (will be started after DB initialization)
let notificationAgent = null

// Initialize Bybit Integration for BTCUSD trading
let bybitIntegration = null

// Initialize Autonomous Orchestrator (will be initialized after core components are ready)
const autonomousOrchestrator = new AutonomousOrchestrator()

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(cors())
app.use(express.json())

// Global state
let systemState = {
  isRunning: false,
  tradingMode: 'paper',
  emergencyStop: false,
  lastUpdate: new Date().toISOString()
}

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id)

  // Send initial data
  socket.emit('system_state', systemState)
  socket.emit('positions_update', tradingEngine.getPositions())
  socket.emit('orders_update', tradingEngine.getOrders())
  socket.emit('balance_update', tradingEngine.getBalance())
  socket.emit('models_update', modelManager.getModelStatus())
  socket.emit('metrics_update', metricsCollector.getMetrics())
  socket.emit('notifications_update', notificationAgent ? notificationAgent.getNotificationHistory() : [])
  socket.emit('price_update', dataManager.getCurrentPrices())
  socket.emit('signals_update', dataManager.getTradingSignals())

  // Handle commands
  socket.on('execute_command', async (data) => {
    try {
      logger.info('Executing command:', data.command)
      const result = await executeCommand(data.command)
      
      socket.emit('alert', {
        id: Date.now().toString(),
        type: 'success',
        message: `Command executed: ${data.command}`,
        timestamp: new Date().toISOString(),
        read: false
      })
    } catch (error) {
      logger.error('Command execution failed:', error)
      socket.emit('alert', {
        id: Date.now().toString(),
        type: 'error',
        message: `Command failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        read: false
      })
    }
  })

  // Handle trading mode changes
  socket.on('set_trading_mode', async (data) => {
    try {
      await setTradingMode(data.mode)
      socket.emit('alert', {
        id: Date.now().toString(),
        type: 'warning',
        message: `Trading mode switched to ${data.mode}`,
        timestamp: new Date().toISOString(),
        read: false
      })
    } catch (error) {
      logger.error('Failed to change trading mode:', error)
      socket.emit('alert', {
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to change trading mode: ${error.message}`,
        timestamp: new Date().toISOString(),
        read: false
      })
    }
  })

  // Handle emergency stop
  socket.on('emergency_stop', async () => {
    try {
      await emergencyStop()
      io.emit('alert', {
        id: Date.now().toString(),
        type: 'error',
        message: 'Emergency stop activated - All trading halted',
        timestamp: new Date().toISOString(),
        read: false
      })
    } catch (error) {
      logger.error('Emergency stop failed:', error)
    }
  })

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id)
  })
})

// Real-time data event handlers
dataManager.on('prices', (prices) => {
  io.emit('price_update', prices)
})

dataManager.on('signals', (signals) => {
  io.emit('signals_update', signals)
})

dataManager.on('marketAnalysis', (analysis) => {
  io.emit('market_analysis', analysis)
})

// AI Notification Agent event handlers will be set up after initialization

// Command execution
async function executeCommand(command) {
  const cmd = command.toLowerCase().trim()
  
  if (cmd.includes('start trading')) {
    return await startTrading()
  } else if (cmd.includes('stop trading')) {
    return await stopTrading()
  } else if (cmd.includes('retrain')) {
    return await retrainModels()
  } else if (cmd.includes('backtest')) {
    return await runBacktest()
  } else if (cmd.includes('fetch data')) {
    return await fetchData()
  } else {
    throw new Error('Unknown command')
  }
}

// Trading control functions
async function startTrading() {
  if (systemState.emergencyStop) {
    throw new Error('Cannot start trading - Emergency stop is active')
  }
  
  systemState.isRunning = true
  await tradingEngine.start()
  logger.info('Trading started')
  return 'Trading started successfully'
}

async function stopTrading() {
  systemState.isRunning = false
  await tradingEngine.stop()
  logger.info('Trading stopped')
  return 'Trading stopped successfully'
}

async function setTradingMode(mode) {
  if (!['paper', 'live'].includes(mode)) {
    throw new Error('Invalid trading mode')
  }
  
  systemState.tradingMode = mode
  await tradingEngine.setMode(mode)
  logger.info(`Trading mode set to ${mode}`)
}

async function emergencyStop() {
  systemState.emergencyStop = true
  systemState.isRunning = false
  
  await tradingEngine.emergencyStop()
  logger.warn('Emergency stop activated')
}

async function retrainModels() {
  logger.info('Starting model retraining')
  await modelManager.retrainAll()
  return 'Model retraining completed'
}

async function runBacktest() {
  logger.info('Starting backtest')
  const results = await tradingEngine.backtest()
  return `Backtest completed: ${JSON.stringify(results)}`
}

async function fetchData() {
  logger.info('Fetching market data')
  await dataManager.fetchLatestData()
  return 'Data fetch completed'
}

// AI Analysis function
async function performAIAnalysis(symbol, history, timeframe = '1h') {
  try {
    if (!history || history.length < 20) {
      throw new Error('Insufficient data for analysis')
    }
    
    // Calculate technical indicators
    const prices = history.map(h => h.bid)
    const sma20 = calculateSMA(prices, 20)
    const sma5 = calculateSMA(prices, 5)
    const rsi = calculateRSI(prices, 14)
    const currentPrice = prices[prices.length - 1]
    
    // Generate analysis
    const analysis = {
      symbol,
      timeframe,
      timestamp: Date.now(),
      currentPrice,
      indicators: {
        sma5,
        sma20,
        rsi
      },
      signals: [],
      confidence: 0,
      recommendation: 'HOLD'
    }
    
    // Generate signals based on indicators
    if (rsi < 30 && sma5 > sma20) {
      analysis.signals.push('BUY')
      analysis.confidence = 0.7
      analysis.recommendation = 'BUY'
    } else if (rsi > 70 && sma5 < sma20) {
      analysis.signals.push('SELL')
      analysis.confidence = 0.7
      analysis.recommendation = 'SELL'
    } else if (sma5 > sma20 && currentPrice > sma5) {
      analysis.signals.push('BUY')
      analysis.confidence = 0.6
      analysis.recommendation = 'BUY'
    } else if (sma5 < sma20 && currentPrice < sma5) {
      analysis.signals.push('SELL')
      analysis.confidence = 0.6
      analysis.recommendation = 'SELL'
    }
    
    return analysis
  } catch (error) {
    logger.error('Error performing AI analysis:', error)
    throw error
  }
}

// Helper functions for technical analysis
function calculateSMA(prices, period) {
  if (prices.length < period) return 0
  const recentPrices = prices.slice(-period)
  return recentPrices.reduce((sum, price) => sum + price, 0) / period
}

function calculateRSI(prices, period) {
  if (prices.length < period + 1) return 50
  
  const gains = []
  const losses = []
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i-1]
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

// Scheduled tasks
cron.schedule('*/5 * * * *', async () => {
  if (systemState.isRunning) {
    await dataManager.fetchLatestData()
  }
})

cron.schedule('0 */4 * * *', async () => {
  if (systemState.isRunning) {
    await modelManager.validateModels()
  }
})

// Real-time data updates
setInterval(() => {
  if (systemState.isRunning) {
    io.emit('positions_update', tradingEngine.getPositions())
    io.emit('orders_update', tradingEngine.getOrders())
    io.emit('balance_update', tradingEngine.getBalance())
    io.emit('metrics_update', metricsCollector.getMetrics())
  }
}, 1000)

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    system: systemState
  })
})

app.get('/api/status', (req, res) => {
  res.json({
    system: systemState.isRunning ? 'online' : 'offline',
    mode: systemState.tradingMode,
    models: modelManager.getModelStatus(),
    positions: tradingEngine.getPositions().length,
    orders: tradingEngine.getOrders().length,
    emergencyStop: systemState.emergencyStop,
    autonomous: autonomousOrchestrator.getStatus()
  })
})

app.get('/api/metrics', (req, res) => {
  res.json(metricsCollector.getMetrics())
})

// Analytics API endpoints
app.get('/api/analytics/trades', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const symbol = req.query.symbol || null
    const trades = await dataManager.db.getHistoricalTrades(symbol, limit)
    res.json({ trades })
  } catch (error) {
    logger.error('Error fetching trades:', error)
    res.status(500).json({ error: 'Failed to fetch trades' })
  }
})

app.get('/api/analytics/performance', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24
    const metrics = await dataManager.db.getMetricsHistory(hours)
    const balance = await dataManager.db.getAccountBalance()
    const recentTrades = await dataManager.db.getRecentTrades(50)
    
    // Calculate performance metrics
    const totalTrades = recentTrades.length
    const winningTrades = recentTrades.filter(t => t.pnl > 0).length
    const losingTrades = recentTrades.filter(t => t.pnl < 0).length
    const totalPnL = recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    
    res.json({
      metrics,
      balance,
      performance: {
        totalTrades,
        winningTrades,
        losingTrades,
        totalPnL,
        winRate: winRate.toFixed(2),
        averagePnL: totalTrades > 0 ? (totalPnL / totalTrades).toFixed(2) : 0
      }
    })
  } catch (error) {
    logger.error('Error fetching performance data:', error)
    res.status(500).json({ error: 'Failed to fetch performance data' })
  }
})

app.get('/api/analytics/models', async (req, res) => {
  try {
    const models = await dataManager.db.getModelStatus()
    const modelPerformance = {}
    
    for (const model of models) {
      const performance = await dataManager.db.getModelPerformance(model.name)
      if (performance) {
        modelPerformance[model.name] = performance
      }
    }
    
    res.json({ models, performance: modelPerformance })
  } catch (error) {
    logger.error('Error fetching model data:', error)
    res.status(500).json({ error: 'Failed to fetch model data' })
  }
})

app.get('/api/analytics/risk', async (req, res) => {
  try {
    const config = await dataManager.db.getRiskConfiguration()
    const balance = await dataManager.db.getAccountBalance()
    
    res.json({
      config,
      balance,
      riskMetrics: {
        currentEquity: balance?.equity || 0,
        peakEquity: balance?.peakEquity || 0,
        drawdown: balance ? ((balance.peakEquity - balance.equity) / balance.peakEquity * 100).toFixed(2) : 0,
        marginLevel: balance?.marginLevel || 0
      }
    })
  } catch (error) {
    logger.error('Error fetching risk data:', error)
    res.status(500).json({ error: 'Failed to fetch risk data' })
  }
})

// Real-time data endpoints
app.get('/api/data/prices', async (req, res) => {
  try {
    const prices = dataManager.getCurrentPrices()
    res.json({ prices })
  } catch (error) {
    logger.error('Error fetching prices:', error)
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
})

app.get('/api/data/signals', async (req, res) => {
  try {
    const signals = dataManager.getTradingSignals()
    res.json({ signals })
  } catch (error) {
    logger.error('Error fetching signals:', error)
    res.status(500).json({ error: 'Failed to fetch signals' })
  }
})

app.get('/api/data/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const limit = parseInt(req.query.limit) || 100
    const history = dataManager.getPriceHistory(symbol, limit)
    res.json({ history })
  } catch (error) {
    logger.error('Error fetching price history:', error)
    res.status(500).json({ error: 'Failed to fetch price history' })
  }
})

// AI functionality endpoints
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { symbol, timeframe } = req.body
    
    // Get price history for analysis
    const history = dataManager.getPriceHistory(symbol, 100)
    
    // Perform AI analysis
    const analysis = await performAIAnalysis(symbol, history, timeframe)
    
    res.json({ analysis })
  } catch (error) {
    logger.error('Error performing AI analysis:', error)
    res.status(500).json({ error: 'Failed to perform AI analysis' })
  }
})

app.post('/api/ai/generate-signal', async (req, res) => {
  try {
    const { symbol } = req.body
    
    // Force generate a trading signal
    await dataManager.generateTradingSignals()
    const signals = dataManager.getTradingSignals().filter(s => s.symbol === symbol)
    
    res.json({ signals })
  } catch (error) {
    logger.error('Error generating signal:', error)
    res.status(500).json({ error: 'Failed to generate signal' })
  }
})

app.get('/api/ai/status', async (req, res) => {
  try {
    const status = {
      dataFetcher: dataManager.getConnectionStatus(),
      notificationAgent: notificationAgent ? notificationAgent.getSystemState() : null,
      models: await modelManager.getModelStatus(),
      lastUpdate: new Date().toISOString()
    }
    
    res.json(status)
  } catch (error) {
    logger.error('Error getting AI status:', error)
    res.status(500).json({ error: 'Failed to get AI status' })
  }
})

// Widget API endpoints
app.get('/api/widgets', (req, res) => {
  try {
    const fs = require('fs')
    const yaml = require('js-yaml')
    
    const configPath = join(process.cwd(), 'widgets.yaml')
    if (fs.existsSync(configPath)) {
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'))
      res.json(config)
    } else {
      res.json({ widgets: [], settings: {} })
    }
  } catch (error) {
    logger.error('Error loading widget config:', error)
    res.status(500).json({ error: 'Failed to load widget configuration' })
  }
})

app.get('/api/widgets/:id', (req, res) => {
  try {
    const fs = require('fs')
    const yaml = require('js-yaml')
    
    const configPath = join(process.cwd(), 'widgets.yaml')
    if (fs.existsSync(configPath)) {
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'))
      const widget = config.widgets.find(w => w.id === req.params.id)
      
      if (widget) {
        res.json(widget)
      } else {
        res.status(404).json({ error: 'Widget not found' })
      }
    } else {
      res.status(404).json({ error: 'Widget configuration not found' })
    }
  } catch (error) {
    logger.error('Error loading widget:', error)
    res.status(500).json({ error: 'Failed to load widget' })
  }
})

app.get('/api/widgets/:id/data', async (req, res) => {
  try {
    const widgetId = req.params.id
    
    // Get widget data from database based on type
    if (widgetId === 'econ_cal') {
      const events = await dataManager.db.getEconomicEvents(24) // Last 24 hours
      res.json({ events })
    } else if (widgetId === 'news_feed') {
      const news = await dataManager.db.getNewsEvents(24) // Last 24 hours
      res.json({ news })
    } else {
      res.json({ data: [] })
    }
  } catch (error) {
    logger.error('Error fetching widget data:', error)
    res.status(500).json({ error: 'Failed to fetch widget data' })
  }
})

app.post('/api/command', async (req, res) => {
  try {
    const result = await executeCommand(req.body.command)
    res.json({ success: true, result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// Function to find available port
async function findAvailablePort(startPort = 8000) {
  const net = await import('net')
  
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    
    server.listen(startPort, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Ensure we don't exceed max port number
        const nextPort = parseInt(startPort) + 1
        if (nextPort > 65535) {
          reject(new Error('No available ports found'))
        } else {
          // Use Promise.resolve to handle the recursive call properly
          findAvailablePort(nextPort).then(resolve).catch(reject)
        }
      } else {
        reject(err)
      }
    })
  })
}

// Initialize MT5 ZeroMQ connection if enabled
async function initializeMT5Integration() {
  if (process.env.MT5_INTEGRATION === 'true') {
    try {
      logger.info('Initializing MT5 ZeroMQ integration...')
      
      // Set up ZeroMQ sockets for MT5 communication
      const commandSocket = new zmq.Request()
      const dataSocket = new zmq.Subscriber()
      
      // Connect to MT5 bridge
      await commandSocket.connect(`tcp://localhost:${process.env.ZMQ_COMMAND_PORT}`)
      await dataSocket.connect(`tcp://localhost:${process.env.ZMQ_DATA_PORT}`)
      await dataSocket.subscribe('') // Subscribe to all messages
      
      // Test connection
      await commandSocket.send(JSON.stringify({ action: 'ping' }))
      
      const testResponse = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MT5 connection test timeout'))
        }, 5000)
        
        commandSocket.receive().then(([msg]) => {
          clearTimeout(timeout)
          resolve(JSON.parse(msg.toString()))
        }).catch(reject)
      })
      
      if (testResponse.pong) {
        logger.info('✅ MT5 connection established successfully')
        
        // Listen for market data
        dataSocket.receive().then(([msg]) => {
          try {
            const data = JSON.parse(msg.toString())
            if (data.type === 'tick') {
              // Forward tick data to trading engine
              tradingEngine.handleMT5Tick(data)
            }
          } catch (error) {
            logger.error('Error parsing MT5 data:', error)
          }
        }).catch(error => {
          logger.error('Error receiving MT5 data:', error)
        })
        
        // Store sockets for trading engine
        tradingEngine.setMT5Sockets(commandSocket, dataSocket)
        
      } else {
        logger.warn('⚠️  MT5 connection test failed')
      }
      
    } catch (error) {
      logger.error('❌ MT5 integration failed:', error)
      logger.info('💡 Make sure MT5 is running with ZmqDealerEA')
    }
  }
}

// Find available port and start server
async function startServer() {
  try {
    const PORT = await findAvailablePort(process.env.PORT || 8000)
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      
      // Initialize system components in order
      Promise.all([
        dataManager.initialize(),
        tradingEngine.initialize()
      ]).then(async () => {
        logger.info('Core system initialized successfully')
        
        // Connect ModelManager to Socket.IO for real-time updates
        modelManager.setSocketIO(io)
        
        // Start real data fetcher
        try {
          await dataManager.start()
          logger.info('Real Data Fetcher started successfully')
        } catch (error) {
          logger.warn('Real Data Fetcher failed to start, continuing without it:', error.message)
        }
        
        // Initialize AI Notification Agent after database is ready
        try {
          notificationAgent = new AINotificationAgent({ db: dataManager.db })
          await notificationAgent.start()
          
          // Set up notification event handlers
          notificationAgent.on('notification', (notification) => {
            logger.info(`AI Notification: ${notification.message}`)
            // Broadcast notification to all connected clients
            io.emit('notification', notification)
          })
          
          logger.info('✅ AI Notification Agent started successfully')
        } catch (error) {
          logger.warn('⚠️ AI Notification Agent not available, continuing without it:', error.message)
        }
        
        // Initialize Bybit Integration for BTCUSD trading
        try {
          bybitIntegration = new BybitIntegration()
          await bybitIntegration.initialize()
          
          // Set up Bybit event handlers
          bybitIntegration.on('price_update', (data) => {
            io.emit('bybit_price_update', data)
          })
          
          bybitIntegration.on('strategy_signal', (data) => {
            io.emit('bybit_strategy_signal', data)
          })
          
          bybitIntegration.on('autonomous_trade', (data) => {
            io.emit('bybit_autonomous_trade', data)
            logger.info(`🤖 Autonomous trade executed: ${data.signal.type} ${data.symbol}`)
          })
          
          bybitIntegration.on('news_update', (data) => {
            io.emit('bybit_news_update', data)
          })
          
          logger.info('✅ Bybit Integration started successfully')
        } catch (error) {
          logger.warn('⚠️ Bybit Integration not available, continuing without it:', error.message)
        }
        
        // Initialize MT5 integration (optional)
        try {
          await initializeMT5Integration()
        } catch (error) {
          logger.warn('MT5 integration not available, continuing without it')
        }
        
        // Initialize Autonomous Orchestrator (optional)
        try {
          // Pass system components to orchestrator
          autonomousOrchestrator.setSystemComponents({
            tradingEngine,
            dataManager,
            modelManager,
            riskManager,
            database: dataManager.db,
            logger
          })
          await autonomousOrchestrator.initialize()
        } catch (error) {
          logger.warn('Autonomous Orchestrator not available, continuing without it:', error.message)
        }
        
        logger.info('System fully initialized successfully')
      }).catch(error => {
        logger.error('Failed to initialize core system:', error)
      })
    })
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is in use, trying next port...`)
        startServer()
      } else {
        logger.error('Server error:', error)
      }
    })
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()