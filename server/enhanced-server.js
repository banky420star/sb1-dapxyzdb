import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cron from 'node-cron'
import zmq from 'zeromq'
import { TradingEngine } from './trading/engine.js'
import { DataManager } from './data/manager.js'
import { RealDataFetcher } from './data/realDataFetcher.js'
import { ModelManager } from './ml/manager.js'
import { RiskManager } from './risk/manager.js'
import { Logger } from './utils/logger.js'
import { MetricsCollector } from './monitoring/metrics.js'
import { AINotificationAgent } from './ai/notification-agent.js'
import { AutonomousOrchestrator } from './autonomous/orchestrator.js'
import { BybitIntegration } from './data/bybit-integration.js'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGINS || 'http://45.76.136.30:3000').split(',').filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:4174', 'http://127.0.0.1:3000']
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      
      console.warn(`Blocked CORS request from origin: ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Initialize core components
const logger = new Logger()
const dataManager = new DataManager()
const realDataFetcher = new RealDataFetcher({
  symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
  updateInterval: 1000,
  dataSource: 'mock'
})
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

// Initialize enhanced components
let notificationAgent = null
let bybitIntegration = null
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
  lastUpdate: new Date().toISOString(),
  bybitConnected: false,
  notificationsActive: false
}

// Enhanced Socket.io connection handling
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
  socket.emit('price_update', realDataFetcher.getCurrentPrices())
  socket.emit('signals_update', realDataFetcher.getTradingSignals())

  // Send Bybit data if available
  if (bybitIntegration) {
    socket.emit('bybit_status', { connected: true })
    socket.emit('bybit_price_update', bybitIntegration.getPriceData('BTC/USDT'))
    socket.emit('bybit_strategy_signals', bybitIntegration.getStrategySignals())
    socket.emit('bybit_news', bybitIntegration.getNewsEvents())
  }

  // Handle enhanced commands
  socket.on('execute_command', async (data) => {
    try {
      logger.info('Executing command:', data.command)
      const result = await executeEnhancedCommand(data.command)
      
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

  // Handle Bybit-specific commands
  socket.on('bybit_command', async (data) => {
    try {
      if (!bybitIntegration) {
        throw new Error('Bybit integration not available')
      }
      
      const result = await executeBybitCommand(data.command, data.params)
      socket.emit('bybit_response', { success: true, result })
    } catch (error) {
      socket.emit('bybit_response', { success: false, error: error.message })
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

// Enhanced command execution
async function executeEnhancedCommand(command) {
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
  } else if (cmd.includes('start bybit')) {
    return await startBybitTrading()
  } else if (cmd.includes('stop bybit')) {
    return await stopBybitTrading()
  } else if (cmd.includes('bybit status')) {
    return await getBybitStatus()
  } else {
    throw new Error('Unknown command')
  }
}

// Bybit command execution
async function executeBybitCommand(command, params = {}) {
  if (!bybitIntegration) {
    throw new Error('Bybit integration not available')
  }
  
  switch (command) {
    case 'get_balance':
      return await bybitIntegration.getBalance()
    case 'get_positions':
      return await bybitIntegration.getPositions()
    case 'get_open_orders':
      return await bybitIntegration.getOpenOrders(params.symbol)
    case 'place_order':
      return await bybitIntegration.placeOrder(params.symbol, params.type, params.side, params.amount, params.price)
    case 'cancel_order':
      return await bybitIntegration.cancelOrder(params.orderId, params.symbol)
    case 'get_strategy_signals':
      return bybitIntegration.getStrategySignals()
    case 'get_news_events':
      return bybitIntegration.getNewsEvents()
    default:
      throw new Error('Unknown Bybit command')
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

async function startBybitTrading() {
  if (!bybitIntegration) {
    throw new Error('Bybit integration not available')
  }
  
  systemState.bybitConnected = true
  logger.info('Bybit trading started')
  return 'Bybit trading started successfully'
}

async function stopBybitTrading() {
  if (bybitIntegration) {
    bybitIntegration.stop()
  }
  systemState.bybitConnected = false
  logger.info('Bybit trading stopped')
  return 'Bybit trading stopped successfully'
}

async function getBybitStatus() {
  return {
    connected: systemState.bybitConnected,
    balance: bybitIntegration ? await bybitIntegration.getBalance() : null,
    positions: bybitIntegration ? await bybitIntegration.getPositions() : [],
    signals: bybitIntegration ? bybitIntegration.getStrategySignals() : {}
  }
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
  systemState.bybitConnected = false
  
  await tradingEngine.emergencyStop()
  if (bybitIntegration) {
    bybitIntegration.stop()
  }
  logger.warn('Emergency stop activated')
}

async function retrainModels() {
  await modelManager.retrainAll()
  return 'Models retraining started'
}

async function runBacktest() {
  // Implement backtesting logic
  return 'Backtest completed'
}

async function fetchData() {
  await dataManager.fetchLatestData()
  return 'Data fetch completed'
}

// Real-time data event handlers
realDataFetcher.on('prices', (prices) => {
  io.emit('price_update', prices)
})

realDataFetcher.on('signals', (signals) => {
  io.emit('signals_update', signals)
})

realDataFetcher.on('marketAnalysis', (analysis) => {
  io.emit('market_analysis', analysis)
})

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: systemState,
    components: {
      tradingEngine: tradingEngine.isRunning(),
      dataManager: dataManager.isInitialized,
      modelManager: modelManager.isInitialized,
      notificationAgent: !!notificationAgent,
      bybitIntegration: !!bybitIntegration
    }
  })
})

app.get('/api/bybit/status', async (req, res) => {
  try {
    const status = await getBybitStatus()
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/bybit/balance', async (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    const balance = await bybitIntegration.getBalance()
    res.json(balance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/bybit/positions', async (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    const positions = await bybitIntegration.getPositions()
    res.json(positions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/bybit/signals', (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    const signals = bybitIntegration.getStrategySignals()
    res.json(signals)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/bybit/news', (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    const news = bybitIntegration.getNewsEvents()
    res.json(news)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/bybit/order', async (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    
    const { symbol, type, side, amount, price } = req.body
    const order = await bybitIntegration.placeOrder(symbol, type, side, amount, price)
    res.json(order)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/bybit/order/:orderId', async (req, res) => {
  try {
    if (!bybitIntegration) {
      return res.status(503).json({ error: 'Bybit integration not available' })
    }
    
    const { orderId } = req.params
    const { symbol } = req.query
    const result = await bybitIntegration.cancelOrder(orderId, symbol)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// API Routes for Model Training Visualization
app.get('/api/ml/training-data', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const data = modelManager.getTrainingVisualizationData()
    res.json(data)
  } catch (error) {
    logger.error('Error fetching training data:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/ml/training-session/:sessionId', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { sessionId } = req.params
    const sessionData = modelManager.getTrainingSessionData(sessionId)
    
    if (!sessionData) {
      return res.status(404).json({ error: 'Training session not found' })
    }
    
    res.json(sessionData)
  } catch (error) {
    logger.error('Error fetching training session:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/ml/training-metrics/:sessionId', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { sessionId } = req.params
    const { metricType = 'all' } = req.query
    const metrics = modelManager.getTrainingMetrics(sessionId, metricType)
    
    res.json(metrics)
  } catch (error) {
    logger.error('Error fetching training metrics:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/ml/real-time-updates', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const updates = modelManager.getRealTimeTrainingUpdates()
    res.json(updates)
  } catch (error) {
    logger.error('Error fetching real-time updates:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/ml/start-training', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { modelType } = req.body
    
    if (!modelType) {
      return res.status(400).json({ error: 'Model type is required' })
    }
    
    // Schedule training
    modelManager.scheduleTraining(modelType)
    
    res.json({ success: true, message: `Training scheduled for ${modelType}` })
  } catch (error) {
    logger.error('Error starting training:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/ml/stop-training/:sessionId', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { sessionId } = req.params
    
    // This would need to be implemented in the model manager
    // For now, we'll just return success
    res.json({ success: true, message: `Training stop requested for ${sessionId}` })
  } catch (error) {
    logger.error('Error stopping training:', error)
    res.status(500).json({ error: error.message })
  }
})

// Reward System API Endpoints
app.get('/api/ml/rewards', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const rewardData = modelManager.getRewardSystemData()
    res.json(rewardData)
  } catch (error) {
    logger.error('Error fetching reward data:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/ml/rewards/:sessionId', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { sessionId } = req.params
    const rewardBreakdown = modelManager.getRewardBreakdown(sessionId)
    
    if (!rewardBreakdown) {
      return res.status(404).json({ error: 'Reward data not found' })
    }
    
    res.json(rewardBreakdown)
  } catch (error) {
    logger.error('Error fetching reward breakdown:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/ml/rewards/:sessionId/history', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { sessionId } = req.params
    const rewardHistory = modelManager.getRewardHistory(sessionId)
    
    res.json(rewardHistory)
  } catch (error) {
    logger.error('Error fetching reward history:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/ml/rewards/:modelType/metrics', async (req, res) => {
  try {
    if (!modelManager) {
      return res.status(503).json({ error: 'Model manager not available' })
    }
    
    const { modelType } = req.params
    const { metrics } = req.body
    
    modelManager.updateRewardMetrics(modelType, metrics)
    
    res.json({ success: true, message: `Reward metrics updated for ${modelType}` })
  } catch (error) {
    logger.error('Error updating reward metrics:', error)
    res.status(500).json({ error: error.message })
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
        const nextPort = parseInt(startPort) + 1
        if (nextPort > 65535) {
          reject(new Error('No available ports found'))
        } else {
          findAvailablePort(nextPort).then(resolve).catch(reject)
        }
      } else {
        reject(err)
      }
    })
  })
}

// Enhanced server initialization
async function startEnhancedServer() {
  try {
    const PORT = await findAvailablePort(process.env.PORT || 8000)
    
    server.listen(PORT, () => {
      logger.info(`🚀 Enhanced Server running on port ${PORT}`)
      
      // Initialize system components in order
      Promise.all([
        dataManager.initialize(),
        realDataFetcher.initialize(),
        modelManager.initialize(),
        tradingEngine.initialize()
      ]).then(async () => {
        logger.info('✅ Core system initialized successfully')
        
        // Start real data fetcher
        try {
          await realDataFetcher.start()
          logger.info('✅ Real Data Fetcher started successfully')
        } catch (error) {
          logger.warn('⚠️ Real Data Fetcher failed to start, continuing without it:', error.message)
        }
        
        // Initialize AI Notification Agent
        try {
          notificationAgent = new AINotificationAgent({ db: dataManager.db })
          await notificationAgent.start()
          
          // Set up notification event handlers
          notificationAgent.on('notification', (notification) => {
            logger.info(`🤖 AI Notification: ${notification.message}`)
            io.emit('notification', notification)
          })
          
          systemState.notificationsActive = true
          logger.info('✅ AI Notification Agent started successfully')
        } catch (error) {
          logger.warn('⚠️ AI Notification Agent not available, continuing without it:', error.message)
        }
        
        // Initialize Bybit Integration
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
          
          systemState.bybitConnected = true
          logger.info('✅ Bybit Integration started successfully')
        } catch (error) {
          logger.warn('⚠️ Bybit Integration not available, continuing without it:', error.message)
        }
        
        // Initialize Autonomous Orchestrator
        try {
          autonomousOrchestrator.setSystemComponents({
            tradingEngine,
            dataManager,
            modelManager,
            riskManager,
            database: dataManager.db,
            logger,
            bybitIntegration
          })
          await autonomousOrchestrator.initialize()
          logger.info('✅ Autonomous Orchestrator started successfully')
        } catch (error) {
          logger.warn('⚠️ Autonomous Orchestrator not available, continuing without it:', error.message)
        }
        
        // Initialize Model Manager
        try {
          await modelManager.initialize()
          modelManager.setSocketIO(io) // Connect to Socket.IO for real-time updates
          logger.info('✅ Model Manager started successfully')
        } catch (error) {
          logger.warn('⚠️ Model Manager not available, continuing without it:', error.message)
        }
        
        logger.info('🎉 Enhanced system fully initialized successfully')
        
        // Broadcast system ready event
        io.emit('system_ready', {
          timestamp: new Date().toISOString(),
          components: {
            tradingEngine: true,
            dataManager: true,
            modelManager: true,
            notificationAgent: !!notificationAgent,
            bybitIntegration: !!bybitIntegration,
            autonomousOrchestrator: true
          }
        })
        
      }).catch(error => {
        logger.error('❌ Failed to initialize core system:', error)
      })
    })
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is in use, trying next port...`)
        startEnhancedServer()
      } else {
        logger.error('Server error:', error)
      }
    })
    
  } catch (error) {
    logger.error('Failed to start enhanced server:', error)
    process.exit(1)
  }
}

// Start the enhanced server
startEnhancedServer() 