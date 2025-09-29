#!/usr/bin/env node

/**
 * Simple AI Trading Cyborg - Working Demo
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    mode: process.env.TRADING_MODE || 'paper',
    message: 'AI Trading Cyborg is running!',
    components: {
      alpha_engine: 'healthy',
      risk_engine: 'healthy',
      oms: 'healthy'
    }
  });
});

// Trading API endpoints
app.get('/api/trading/pnl', (req, res) => {
  const mockPnL = {
    totalPnL: 1250.75,
    dailyPnL: 45.20,
    unrealizedPnL: 125.50,
    realizedPnL: 1125.25
  };
  
  console.log('📊 P&L data requested:', mockPnL);
  res.json({ data: mockPnL });
});

app.get('/api/trading/pnl/history', (req, res) => {
  const history = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    history.push({
      timestamp: new Date(now - i * 60000).toISOString(),
      totalPnL: 1000 + Math.sin(i * 0.1) * 500 + Math.random() * 100,
      dailyPnL: Math.sin(i * 0.2) * 50 + Math.random() * 20,
      unrealizedPnL: Math.sin(i * 0.15) * 100 + Math.random() * 50,
      realizedPnL: 800 + Math.sin(i * 0.1) * 400 + Math.random() * 100
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
    currentDrawdown: -0.015,
    maxDrawdown: -0.032,
    riskUtilization: 65.5,
    positionCount: 3,
    exposure: 7500,
    volatility: 0.18,
    sharpeRatio: 1.85
  };
  
  res.json({ data: mockRisk });
});

app.get('/api/risk/status', (req, res) => {
  const mockStatus = {
    currentDrawdown: -0.015,
    dailyPnL: 45.20,
    positionCount: 3,
    totalExposure: 7500,
    riskUtilization: 65.5,
    volatility: 0.18,
    sharpeRatio: 1.85,
    circuitBreakers: {
      dailyDrawdown: false,
      killSwitch: false,
      positionLimit: false,
      exposureLimit: false
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
      weight: 0.28,
      signal: 0.65,
      confidence: 0.82,
      volatility: 0.15,
      performance: 0.045,
      attribution: 125.50,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 20,
      barsProcessed: 150
    },
    {
      name: 'Mean Revert Pod',
      type: 'mean_revert',
      weight: 0.25,
      signal: -0.32,
      confidence: 0.74,
      volatility: 0.12,
      performance: 0.028,
      attribution: 78.25,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 15,
      barsProcessed: 150
    },
    {
      name: 'Vol Regime Pod',
      type: 'vol_regime',
      weight: 0.22,
      signal: 0.18,
      confidence: 0.69,
      volatility: 0.20,
      performance: 0.032,
      attribution: 89.75,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 30,
      barsProcessed: 150
    },
    {
      name: 'XGBoost Pod',
      type: 'xgboost',
      weight: 0.25,
      signal: 0.45,
      confidence: 0.78,
      volatility: 0.16,
      performance: 0.038,
      attribution: 95.60,
      lastUpdate: new Date().toISOString(),
      status: 'active',
      warmupBars: 50,
      barsProcessed: 150
    }
  ];
  
  res.json({ data: mockPods });
});

app.get('/api/alpha/signals/recent', (req, res) => {
  const signals = [];
  const now = Date.now();
  const podNames = ['Trend Pod', 'Mean Revert Pod', 'Vol Regime Pod', 'XGBoost Pod'];
  
  for (let i = 0; i < 20; i++) {
    const podName = podNames[i % 4];
    signals.push({
      timestamp: new Date(now - i * 30000).toISOString(),
      pod: podName,
      signal: Math.sin(i * 0.3) * 0.8 + Math.random() * 0.4 - 0.2,
      confidence: 0.6 + Math.random() * 0.3,
      volatility: 0.1 + Math.random() * 0.2
    });
  }
  
  res.json({ data: signals });
});

app.get('/api/alpha/performance', (req, res) => {
  const performance = [
    {
      pod: 'Trend Pod',
      period: '7d',
      returns: 0.045,
      sharpe: 1.85,
      maxDrawdown: -0.032,
      winRate: 0.68,
      trades: 23
    },
    {
      pod: 'Mean Revert Pod',
      period: '7d',
      returns: 0.028,
      sharpe: 1.42,
      maxDrawdown: -0.025,
      winRate: 0.61,
      trades: 31
    },
    {
      pod: 'Vol Regime Pod',
      period: '7d',
      returns: 0.032,
      sharpe: 1.58,
      maxDrawdown: -0.028,
      winRate: 0.64,
      trades: 19
    },
    {
      pod: 'XGBoost Pod',
      period: '7d',
      returns: 0.038,
      sharpe: 1.72,
      maxDrawdown: -0.030,
      winRate: 0.66,
      trades: 27
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
      currentPrice: 50125,
      pnl: 0.125,
      risk: 0.025
    },
    {
      symbol: 'ETHUSDT',
      side: 'short',
      size: 0.01,
      entryPrice: 3200,
      currentPrice: 3185,
      pnl: 0.15,
      risk: 0.018
    }
  ];
  
  res.json({ data: positions });
});

// Serve static files (for frontend)
app.use(express.static('dist'));

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 AI Trading Cyborg running on port ${PORT}`);
  console.log(`📊 Mode: ${process.env.TRADING_MODE || 'paper'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📈 Trading API: http://localhost:${PORT}/api/trading/pnl`);
  console.log(`🛡️ Risk API: http://localhost:${PORT}/api/risk/metrics`);
  console.log(`🧠 Alpha API: http://localhost:${PORT}/api/alpha/pods/status`);
  console.log(`\n🎯 Profit-Hunting Cyborg is ready!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});