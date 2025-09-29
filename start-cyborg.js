#!/usr/bin/env node

/**
 * AI Trading Cyborg Startup Script
 * Launches the enhanced trading system with all new components
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import our new enhanced components
const { metrics } = require('./server/metrics/prometheus-metrics.js');
const { LoggerFactory } = require('./server/logging/structured-logger.js');
const { chaosEngine } = require('./server/chaos/chaos-testing.js');

// Initialize logger
const logger = LoggerFactory.getSystemLogger();

// Create Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(require('prom-client').register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    mode: process.env.TRADING_MODE || 'paper',
    components: {
      alpha_engine: 'healthy',
      risk_engine: 'healthy',
      oms: 'healthy',
      chaos_testing: chaosEngine.isChaosEnabled() ? 'enabled' : 'disabled'
    }
  });
});

// Trading API endpoints
app.get('/api/trading/pnl', (req, res) => {
  // Mock P&L data for demonstration
  const mockPnL = {
    totalPnL: Math.random() * 1000 - 500,
    dailyPnL: Math.random() * 200 - 100,
    unrealizedPnL: Math.random() * 300 - 150,
    realizedPnL: Math.random() * 500 - 250
  };
  
  logger.info({ pnl: mockPnL }, 'P&L data requested');
  res.json({ data: mockPnL });
});

app.get('/api/trading/pnl/history', (req, res) => {
  // Mock P&L history
  const history = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    history.push({
      timestamp: new Date(now - i * 60000).toISOString(),
      totalPnL: 1000 + Math.random() * 500 - 250,
      dailyPnL: Math.random() * 100 - 50,
      unrealizedPnL: Math.random() * 200 - 100,
      realizedPnL: Math.random() * 300 - 150
    });
  }
  
  res.json({ data: history });
});

app.get('/api/trading/mode', (req, res) => {
  res.json({
    data: {
      mode: process.env.TRADING_MODE || 'paper',
      lastUpdate: new Date().toISOString()
    }
  });
});

// Risk API endpoints
app.get('/api/risk/metrics', (req, res) => {
  const mockRisk = {
    currentDrawdown: Math.random() * 0.05 - 0.025,
    maxDrawdown: Math.random() * 0.1 - 0.05,
    riskUtilization: Math.random() * 100,
    positionCount: Math.floor(Math.random() * 10),
    exposure: Math.random() * 10000,
    volatility: Math.random() * 0.3,
    sharpeRatio: Math.random() * 3 - 1
  };
  
  res.json({ data: mockRisk });
});

app.get('/api/risk/status', (req, res) => {
  const mockStatus = {
    currentDrawdown: Math.random() * 0.05 - 0.025,
    dailyPnL: Math.random() * 200 - 100,
    positionCount: Math.floor(Math.random() * 10),
    totalExposure: Math.random() * 10000,
    riskUtilization: Math.random() * 100,
    volatility: Math.random() * 0.3,
    sharpeRatio: Math.random() * 3 - 1,
    circuitBreakers: {
      dailyDrawdown: Math.random() > 0.9,
      killSwitch: false,
      positionLimit: Math.random() > 0.95,
      exposureLimit: Math.random() > 0.95
    },
    alerts: []
  };
  
  res.json({ data: mockStatus });
});

// Alpha Pod API endpoints
app.get('/api/alpha/pods/status', (req, res) => {
  const mockPods = [
    {
      name: 'Trend Pod',
      type: 'trend',
      weight: 0.25,
      signal: Math.random() * 2 - 1,
      confidence: Math.random() * 0.5 + 0.5,
      volatility: Math.random() * 0.2,
      performance: Math.random() * 0.1 - 0.05,
      attribution: Math.random() * 100 - 50,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 20,
      barsProcessed: 100
    },
    {
      name: 'Mean Revert Pod',
      type: 'mean_revert',
      weight: 0.25,
      signal: Math.random() * 2 - 1,
      confidence: Math.random() * 0.5 + 0.5,
      volatility: Math.random() * 0.2,
      performance: Math.random() * 0.1 - 0.05,
      attribution: Math.random() * 100 - 50,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 15,
      barsProcessed: 100
    },
    {
      name: 'Vol Regime Pod',
      type: 'vol_regime',
      weight: 0.25,
      signal: Math.random() * 2 - 1,
      confidence: Math.random() * 0.5 + 0.5,
      volatility: Math.random() * 0.2,
      performance: Math.random() * 0.1 - 0.05,
      attribution: Math.random() * 100 - 50,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 30,
      barsProcessed: 100
    },
    {
      name: 'XGBoost Pod',
      type: 'xgboost',
      weight: 0.25,
      signal: Math.random() * 2 - 1,
      confidence: Math.random() * 0.5 + 0.5,
      volatility: Math.random() * 0.2,
      performance: Math.random() * 0.1 - 0.05,
      attribution: Math.random() * 100 - 50,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 50,
      barsProcessed: 100
    }
  ];
  
  res.json({ data: mockPods });
});

app.get('/api/alpha/signals/recent', (req, res) => {
  const signals = [];
  const now = Date.now();
  const podNames = ['Trend Pod', 'Mean Revert Pod', 'Vol Regime Pod', 'XGBoost Pod'];
  
  for (let i = 0; i < 20; i++) {
    signals.push({
      timestamp: new Date(now - i * 30000).toISOString(),
      pod: podNames[Math.floor(Math.random() * podNames.length)],
      signal: Math.random() * 2 - 1,
      confidence: Math.random() * 0.5 + 0.5,
      volatility: Math.random() * 0.2
    });
  }
  
  res.json({ data: signals });
});

app.get('/api/alpha/performance', (req, res) => {
  const performance = [
    {
      pod: 'Trend Pod',
      period: '7d',
      returns: Math.random() * 0.2 - 0.1,
      sharpe: Math.random() * 2 - 0.5,
      maxDrawdown: Math.random() * 0.1 - 0.05,
      winRate: Math.random() * 0.3 + 0.4,
      trades: Math.floor(Math.random() * 50)
    },
    {
      pod: 'Mean Revert Pod',
      period: '7d',
      returns: Math.random() * 0.2 - 0.1,
      sharpe: Math.random() * 2 - 0.5,
      maxDrawdown: Math.random() * 0.1 - 0.05,
      winRate: Math.random() * 0.3 + 0.4,
      trades: Math.floor(Math.random() * 50)
    }
  ];
  
  res.json({ data: performance });
});

// Positions API
app.get('/api/positions', (req, res) => {
  const positions = [
    {
      symbol: 'BTCUSDT',
      side: 'long',
      size: 0.001,
      entryPrice: 50000,
      currentPrice: 50100,
      pnl: 0.1,
      risk: 0.02
    }
  ];
  
  res.json({ data: positions });
});

// Chaos testing endpoints
app.post('/api/chaos/enable', (req, res) => {
  chaosEngine.enable();
  logger.warn({}, 'Chaos testing enabled');
  res.json({ message: 'Chaos testing enabled' });
});

app.post('/api/chaos/disable', (req, res) => {
  chaosEngine.disable();
  logger.info({}, 'Chaos testing disabled');
  res.json({ message: 'Chaos testing disabled' });
});

app.post('/api/chaos/run', (req, res) => {
  const { test } = req.body;
  chaosEngine.runChaosTest(test || 'websocket_disconnect')
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: error.message }));
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');
  
  // Send periodic updates
  const updateInterval = setInterval(() => {
    socket.emit('trading_update', {
      timestamp: new Date().toISOString(),
      pnl: Math.random() * 1000 - 500,
      positions: Math.floor(Math.random() * 5),
      signals: Math.floor(Math.random() * 10)
    });
  }, 5000);
  
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
    clearInterval(updateInterval);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info({ port: PORT, mode: process.env.TRADING_MODE || 'paper' }, 
    'AI Trading Cyborg started successfully');
  console.log(`🚀 AI Trading Cyborg running on port ${PORT}`);
  console.log(`📊 Mode: ${process.env.TRADING_MODE || 'paper'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info({}, 'Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info({}, 'Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});