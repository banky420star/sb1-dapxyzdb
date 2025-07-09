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
import { ModelManager } from './ml/manager.js'
import { RiskManager } from './risk/manager.js'
import { Logger } from './utils/logger.js'
import { MetricsCollector } from './monitoring/metrics.js'
import { AINotificationAgent } from './ai/notification-agent.js'
import { AutonomousOrchestrator } from './autonomous/orchestrator.js'

dotenv.config()

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
const dataManager = new DataManager()
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

// Initialize Autonomous Orchestrator
const autonomousOrchestrator = new AutonomousOrchestrator()

// Pass system components to orchestrator
autonomousOrchestrator.setSystemComponents({
  tradingEngine,
  dataManager,
  modelManager,
  riskManager,
  database: dataManager.db,
  logger
})

// Initialize autonomous mode
await autonomousOrchestrator.initialize()

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

// Widget API endpoints
app.get('/api/widgets', (req, res) => {
  try {
    const fs = require('fs')
    const yaml = require('js-yaml')
    
    const configPath = path.join(process.cwd(), 'widgets.yaml')
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
    
    const configPath = path.join(process.cwd(), 'widgets.yaml')
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
        modelManager.initialize(),
        tradingEngine.initialize()
      ]).then(async () => {
        logger.info('Core system initialized successfully')
        
        // Initialize AI Notification Agent after database is ready (optional)
        try {
          if (notificationAgent) {
            notificationAgent.on('notification', (notification) => {
              logger.info(`AI Notification: ${notification.message}`)
            })
          }
        } catch (error) {
          logger.warn('AI Notification Agent not available, continuing without it')
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
            database: dataManager.db
          })
          await autonomousOrchestrator.initialize()
        } catch (error) {
          logger.warn('Autonomous Orchestrator not available, continuing without it')
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