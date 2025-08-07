#!/usr/bin/env node

/**
 * Dashboard Server - Simple WebSocket and API server for the trading dashboard
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Redis from 'ioredis';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API endpoints for dashboard data
app.get('/api/system-metrics', async (req, res) => {
  try {
    // Get system metrics from Redis
    const [totalTrades, activeModels, dataSources, portfolioValue, dailyPnL, sharpeRatio, maxDrawdown] = await Promise.all([
      redis.get('metrics:total_trades') || '0',
      redis.get('metrics:active_models') || '0',
      redis.get('metrics:data_sources') || '0',
      redis.get('metrics:portfolio_value') || '0',
      redis.get('metrics:daily_pnl') || '0',
      redis.get('metrics:sharpe_ratio') || '0',
      redis.get('metrics:max_drawdown') || '0'
    ]);

    res.json({
      totalTrades: parseInt(totalTrades),
      activeModels: parseInt(activeModels),
      dataSources: parseInt(dataSources),
      portfolioValue: parseFloat(portfolioValue),
      dailyPnL: parseFloat(dailyPnL),
      sharpeRatio: parseFloat(sharpeRatio),
      maxDrawdown: parseFloat(maxDrawdown)
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

app.get('/api/trades', async (req, res) => {
  try {
    const trades = await redis.lrange('trades', 0, 49); // Get last 50 trades
    const parsedTrades = trades.map(trade => JSON.parse(trade));
    res.json(parsedTrades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

app.get('/api/training-status', async (req, res) => {
  try {
    const trainingRuns = await redis.lrange('training_runs', 0, 9); // Get last 10 training runs
    const parsedRuns = trainingRuns.map(run => JSON.parse(run));
    res.json(parsedRuns);
  } catch (error) {
    console.error('Error fetching training status:', error);
    res.status(500).json({ error: 'Failed to fetch training status' });
  }
});

app.get('/api/pipeline-status', async (req, res) => {
  try {
    const [sourceLag, missingCandles, cacheHitRate, pairDiscoveryLog] = await Promise.all([
      redis.get('pipeline:source_lag') || '0',
      redis.get('pipeline:missing_candles') || '0',
      redis.get('pipeline:cache_hit_rate') || '0',
      redis.get('pipeline:discovery_log') || '[]'
    ]);

    res.json({
      sourceLag: parseInt(sourceLag),
      missingCandles: parseInt(missingCandles),
      cacheHitRate: parseFloat(cacheHitRate),
      pairDiscoveryLog: JSON.parse(pairDiscoveryLog)
    });
  } catch (error) {
    console.error('Error fetching pipeline status:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline status' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('connected', { 
    message: 'Connected to trading dashboard',
    timestamp: new Date().toISOString()
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle client requests
  socket.on('get_system_metrics', async () => {
    try {
      const [totalTrades, activeModels, dataSources, portfolioValue, dailyPnL, sharpeRatio, maxDrawdown] = await Promise.all([
        redis.get('metrics:total_trades') || '0',
        redis.get('metrics:active_models') || '0',
        redis.get('metrics:data_sources') || '0',
        redis.get('metrics:portfolio_value') || '0',
        redis.get('metrics:daily_pnl') || '0',
        redis.get('metrics:sharpe_ratio') || '0',
        redis.get('metrics:max_drawdown') || '0'
      ]);

      socket.emit('system_metrics', {
        totalTrades: parseInt(totalTrades),
        activeModels: parseInt(activeModels),
        dataSources: parseInt(dataSources),
        portfolioValue: parseFloat(portfolioValue),
        dailyPnL: parseFloat(dailyPnL),
        sharpeRatio: parseFloat(sharpeRatio),
        maxDrawdown: parseFloat(maxDrawdown)
      });
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  });

  socket.on('get_trades', async () => {
    try {
      const trades = await redis.lrange('trades', 0, 49);
      const parsedTrades = trades.map(trade => JSON.parse(trade));
      socket.emit('trades', parsedTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  });

  socket.on('get_training_status', async () => {
    try {
      const trainingRuns = await redis.lrange('training_runs', 0, 9);
      const parsedRuns = trainingRuns.map(run => JSON.parse(run));
      socket.emit('training_status', parsedRuns);
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
  });
});

// Simulate real-time data updates
setInterval(async () => {
  try {
    // Simulate trade updates
    const mockTrade = {
      id: Date.now(),
      symbol: 'BTCUSDT',
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      qty: (Math.random() * 0.1).toFixed(4),
      price: (40000 + Math.random() * 2000).toFixed(2),
      pnl: (Math.random() * 100 - 50).toFixed(2),
      ts: new Date().toISOString()
    };

    // Store trade in Redis
    await redis.lpush('trades', JSON.stringify(mockTrade));
    await redis.ltrim('trades', 0, 99); // Keep only last 100 trades

    // Emit to all connected clients
    io.emit('trade', mockTrade);

    // Update system metrics
    const currentPortfolioValue = parseFloat(await redis.get('metrics:portfolio_value') || '100000');
    const newPortfolioValue = currentPortfolioValue + parseFloat(mockTrade.pnl);
    await redis.set('metrics:portfolio_value', newPortfolioValue.toString());

    const currentTotalTrades = parseInt(await redis.get('metrics:total_trades') || '0');
    await redis.set('metrics:total_trades', (currentTotalTrades + 1).toString());

  } catch (error) {
    console.error('Error in data simulation:', error);
  }
}, 5000); // Update every 5 seconds

// Initialize default metrics
async function initializeMetrics() {
  try {
    await Promise.all([
      redis.set('metrics:total_trades', '0'),
      redis.set('metrics:active_models', '3'),
      redis.set('metrics:data_sources', '2'),
      redis.set('metrics:portfolio_value', '100000'),
      redis.set('metrics:daily_pnl', '0'),
      redis.set('metrics:sharpe_ratio', '1.2'),
      redis.set('metrics:max_drawdown', '0.05'),
      redis.set('pipeline:source_lag', '0'),
      redis.set('pipeline:missing_candles', '0'),
      redis.set('pipeline:cache_hit_rate', '0.95'),
      redis.set('pipeline:discovery_log', JSON.stringify([]))
    ]);
    console.log('✅ Default metrics initialized');
  } catch (error) {
    console.error('❌ Failed to initialize metrics:', error);
  }
}

// Start server
const PORT = process.env.PORT || 8000;

server.listen(PORT, async () => {
  console.log(`🚀 Dashboard server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  
  await initializeMetrics();
  console.log('✅ Dashboard server ready!');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down dashboard server...');
  await redis.quit();
  server.close(() => {
    console.log('✅ Dashboard server stopped');
    process.exit(0);
  });
}); 