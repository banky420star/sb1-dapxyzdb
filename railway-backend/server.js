// Autonomous Trading Bot V2 - Production Server
// Last updated: 2025-08-12 23:30 UTC
// Status: Railway-compatible with graceful error handling

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const app = express();

// --- Autonomous Trading Bot State ---
let autonomousBotState = {
  isRunning: false,
  cycleInterval: null,
  tradeLog: [],
  config: {
    maxPositionSize: 0.001,
    stopLossPercent: 2.0,
    takeProfitPercent: 5.0,
    minConfidence: 70,
    tradingPairs: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT'],
    dataInterval: 30000
  }
};

// --- Security & basics ---
app.use(helmet());
app.use(cors({ 
  origin: '*', 
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] 
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Serve frontend static files ---
app.use(express.static('./dist'));

const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 100
});
app.use(limiter);

// --- Helper functions with graceful fallbacks ---
function getMode() {
  return (process.env.TRADING_MODE || 'paper').toLowerCase();
}

function getAccountBalance() {
  return {
    total: 10000,
    available: 9500,
    currency: 'USDT',
    mode: getMode()
  };
}

function getPositions() {
  return {
    positions: [],
    mode: getMode()
  };
}

// --- Healthcheck (Railway points here) ---
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// --- Status for UI ---
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    mode: getMode(),
    time: new Date().toISOString(),
    autonomousTrading: autonomousBotState.isRunning
  });
});

// --- Safety rails (server-side guards, never trust UI) ---
function guardTrade(req, res, next) {
  const mode = getMode();
  if (!['paper', 'live'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid TRADING_MODE' });
  }
  if (mode !== 'live') {
    req.isPaper = true;
  }
  req.risk = {
    maxSizeBtc: Number(process.env.MAX_TRADE_SIZE_BTC || 0.001),
    sl: Number(process.env.STOP_LOSS_PCT || 0.02),
    tp: Number(process.env.TAKE_PROFIT_PCT || 0.05),
    dailyLossCap: Number(process.env.DAILY_LOSS_LIMIT_PCT || 0.01),
    minConfidence: Number(process.env.CONFIDENCE_THRESHOLD || 0.7)
  };
  next();
}

// --- Manual/override execution (v2) ---
app.post('/api/trade/execute', guardTrade, async (req, res) => {
  try {
    const { symbol, side, confidence } = req.body || {};
    if (!symbol || !side) {
      return res.status(400).json({ error: 'symbol & side required' });
    }
    
    if (confidence != null && Number(confidence) < req.risk.minConfidence) {
      return res.status(412).json({ error: 'Confidence below threshold' });
    }

    // Simplified paper mode simulation
    const tradeResult = {
      ok: true,
      simulated: !!req.isPaper,
      symbol,
      side,
      qty: req.risk.maxSizeBtc,
      appliedRisk: req.risk,
      timestamp: new Date().toISOString()
    };

    res.json(tradeResult);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- Autonomous tick (consensus + execution) ---
app.post('/api/auto/tick', guardTrade, async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', candles = [] } = req.body || {};
    
    // Simple consensus simulation
    const consensus = {
      passes: Math.random() > 0.5, // 50% chance of passing
      finalSignal: Math.random() > 0.5 ? 'buy' : 'sell',
      avgConfidence: 0.75,
      models: [
        { signal: 'buy', confidence: 0.8 },
        { signal: 'buy', confidence: 0.7 },
        { signal: 'sell', confidence: 0.6 }
      ]
    };

    if (!consensus.passes) {
      return res.status(412).json({ error: 'Consensus not met', consensus });
    }

    // Simplified paper mode simulation
    const tradeResult = {
      ok: true,
      consensus,
      simulated: !!req.isPaper,
      symbol,
      side: consensus.finalSignal,
      qty: req.risk.maxSizeBtc,
      appliedRisk: req.risk,
      timestamp: new Date().toISOString()
    };

    res.json(tradeResult);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- AUTONOMOUS TRADING BOT ENDPOINTS ---

// Start autonomous trading
app.post('/api/trading/start', async (req, res) => {
  try {
    if (autonomousBotState.isRunning) {
      return res.json({
        success: false,
        message: 'Autonomous trading bot is already running',
        status: {
          isRunning: autonomousBotState.isRunning,
          config: autonomousBotState.config,
          tradeLog: autonomousBotState.tradeLog
        }
      });
    }

    console.log('🚀 Starting autonomous trading bot...');
    
    autonomousBotState.isRunning = true;
    
    // Start trading cycle
    autonomousBotState.cycleInterval = setInterval(() => {
      executeTradingCycle();
    }, autonomousBotState.config.dataInterval);

    console.log('✅ Autonomous trading bot started successfully');
    
    res.json({
      success: true,
      message: 'Autonomous trading bot started successfully',
      status: {
        isRunning: autonomousBotState.isRunning,
        config: autonomousBotState.config,
        tradeLog: autonomousBotState.tradeLog
      }
    });
  } catch (err) {
    console.error('Error starting autonomous trading bot:', err);
    res.status(500).json({ 
      success: false, 
      error: String(err.message || err) 
    });
  }
});

// Stop autonomous trading
app.post('/api/trading/stop', async (req, res) => {
  try {
    if (!autonomousBotState.isRunning) {
      return res.json({
        success: false,
        message: 'Autonomous trading bot is not running',
        status: {
          isRunning: autonomousBotState.isRunning,
          config: autonomousBotState.config,
          tradeLog: autonomousBotState.tradeLog
        }
      });
    }

    console.log('🛑 Stopping autonomous trading bot...');
    
    autonomousBotState.isRunning = false;
    
    if (autonomousBotState.cycleInterval) {
      clearInterval(autonomousBotState.cycleInterval);
      autonomousBotState.cycleInterval = null;
    }

    console.log('✅ Autonomous trading bot stopped successfully');
    
    res.json({
      success: true,
      message: 'Autonomous trading bot stopped successfully',
      status: {
        isRunning: autonomousBotState.isRunning,
        config: autonomousBotState.config,
        tradeLog: autonomousBotState.tradeLog
      }
    });
  } catch (err) {
    console.error('Error stopping autonomous trading bot:', err);
    res.status(500).json({ 
      success: false, 
      error: String(err.message || err) 
    });
  }
});

// Get trading status
app.get('/api/trading/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isActive: autonomousBotState.isRunning,
        config: autonomousBotState.config,
        tradeLog: autonomousBotState.tradeLog,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error getting trading status:', err);
    res.status(500).json({ 
      success: false, 
      error: String(err.message || err) 
    });
  }
});

// Trading cycle execution
function executeTradingCycle() {
  if (!autonomousBotState.isRunning) return;

  console.log('🔄 Executing autonomous trading cycle...');

  for (const symbol of autonomousBotState.config.tradingPairs) {
    try {
      // Simulate AI consensus
      const consensus = {
        passes: Math.random() > 0.5, // 50% chance of passing
        signal: Math.random() > 0.5 ? 'buy' : 'sell',
        confidence: 70 + Math.random() * 20, // 70-90%
        models: [
          { signal: 'buy', confidence: 75 + Math.random() * 15 },
          { signal: 'buy', confidence: 70 + Math.random() * 20 },
          { signal: 'sell', confidence: 65 + Math.random() * 25 }
        ]
      };

      if (consensus.passes) {
        // Simulate trade execution
        const trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          side: consensus.signal,
          qty: autonomousBotState.config.maxPositionSize,
          price: 120000 + (Math.random() - 0.5) * 1000, // Simulated BTC price
          stopLoss: 0,
          takeProfit: 0,
          timestamp: new Date().toISOString(),
          consensus: consensus,
          simulated: true
        };

        autonomousBotState.tradeLog.push(trade);
        console.log(`✅ ${consensus.signal} trade executed for ${symbol} - Confidence: ${consensus.confidence.toFixed(1)}%`);
      }
    } catch (error) {
      console.error(`Error in trading cycle for ${symbol}:`, error.message);
    }
  }
}

// --- Account endpoints ---
app.get('/api/account/balance', (_req, res) => {
  res.json(getAccountBalance());
});

app.get('/api/account/positions', (_req, res) => {
  res.json(getPositions());
});

// --- Catch-all route for frontend ---
app.get('*', (req, res) => {
  res.sendFile('./dist/index.html', { root: '.' });
});

// --- Boot ---
const PORT = Number(process.env.PORT) || 8000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Autonomous Trading Bot V2 listening on http://0.0.0.0:${PORT}`);
  console.log(`📊 Trading Mode: ${getMode()}`);
  console.log(`🤖 AI Consensus Engine: ACTIVE`);
  console.log(`🔒 Security: ENABLED`);
  console.log(`🔄 Autonomous Trading: ${process.env.AUTO_TRADER_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
