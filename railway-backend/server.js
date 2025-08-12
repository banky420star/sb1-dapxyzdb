// Autonomous Trading Bot V2 - Production Server
// Last updated: 2025-08-11 18:00 UTC
// Status: Bybit v5 integration with AI consensus engine

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { placeMarketOrder, getAccountBalance, getPositions, getMode } from './lib/bybitClient.js';
import { getConsensus } from './lib/consensusEngine.js';
import { buildFeatures, generateMockCandles } from './lib/featureBuilder.js';

const app = express();

// --- Security & basics ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: ['https://delightful-crumble-983869.netlify.app', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 100
});
app.use(limiter);

// --- Healthcheck (Railway points here) ---
app.get('/health', (_req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    tradingMode: getMode(),
    version: '2.0.0'
  };
  
  res.json(health);
});

// --- Status for UI ---
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    mode: getMode(),
    time: new Date().toISOString(),
    features: {
      aiConsensus: true,
      bybitIntegration: true,
      riskManagement: true,
      autonomousTrading: true
    }
  });
});

// --- Safety rails (server-side guards, never trust UI) ---
function guardTrade(req, res, next) {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase();
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
    if (!symbol || !side) return res.status(400).json({ error: 'symbol & side required' });
    if (confidence != null && Number(confidence) < req.risk.minConfidence) {
      return res.status(412).json({ error: 'Confidence below threshold' });
    }
    const qty = req.risk.maxSizeBtc;
    const out = await placeMarketOrder({ symbol, side, qty });
    res.json({ ok: true, simulated: !!req.isPaper, appliedRisk: req.risk, out });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- Autonomous tick (consensus + execution) (v2) ---
app.post('/api/auto/tick', guardTrade, async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', candles = [] } = req.body || {};
    const features = buildFeatures({ candles });
    const consensus = await getConsensus(features);
    if (!consensus.passes) return res.status(412).json({ error: 'Consensus not met', consensus });

    const qty = req.risk.maxSizeBtc;
    const out = await placeMarketOrder({ symbol, side: consensus.finalSignal, qty });
    res.json({ ok: true, consensus, appliedRisk: req.risk, out });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- Account Information Endpoints ---
app.get('/api/account/balance', async (_req, res) => {
  try {
    const balance = await getAccountBalance();
    res.json(balance);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balance', message: error.message });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const { symbol } = req.query;
    const positions = await getPositions(symbol);
    res.json(positions);
  } catch (error) {
    console.error('Positions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch positions', message: error.message });
  }
});

// --- AI Consensus Analysis Endpoint ---
app.post('/api/ai/consensus', async (req, res) => {
  try {
    const { features } = req.body || {};
    const consensus = await getConsensus(features);
    res.json(consensus);
  } catch (error) {
    console.error('Consensus analysis error:', error);
    res.status(500).json({ error: 'Consensus analysis failed', message: error.message });
  }
});

// --- Autonomous Trading Control ---
let autonomousTrading = false;
let tradingInterval = null;

app.post('/api/trading/start', guardTrade, async (req, res) => {
  try {
    if (autonomousTrading) {
      return res.status(400).json({ error: 'Autonomous trading already running' });
    }

    autonomousTrading = true;
    
    // Start autonomous trading loop
    tradingInterval = setInterval(async () => {
      try {
        if (!autonomousTrading) return;
        
        // Generate market features
        const features = buildFeatures({ candles: generateMockCandles() });
        
        // Get consensus
        const consensus = await getConsensus(features);
        
        if (consensus.passes) {
          // Execute trade
          await placeMarketOrder({
            symbol: 'BTCUSDT',
            side: consensus.finalSignal,
            qty: req.risk.maxSizeBtc
          });
          
          console.log('Autonomous trade executed:', consensus);
        }
      } catch (error) {
        console.error('Autonomous trading error:', error);
      }
    }, 60000); // Check every minute

    res.json({ 
      ok: true, 
      message: 'Autonomous trading started',
      mode: getMode()
    });
    
  } catch (error) {
    console.error('Start autonomous trading error:', error);
    res.status(500).json({ error: 'Failed to start autonomous trading', message: error.message });
  }
});

app.post('/api/trading/stop', (_req, res) => {
  try {
    autonomousTrading = false;
    if (tradingInterval) {
      clearInterval(tradingInterval);
      tradingInterval = null;
    }
    
    res.json({ 
      ok: true, 
      message: 'Autonomous trading stopped' 
    });
    
  } catch (error) {
    console.error('Stop autonomous trading error:', error);
    res.status(500).json({ error: 'Failed to stop autonomous trading', message: error.message });
  }
});

app.get('/api/trading/status', (_req, res) => {
  res.json({
    autonomousTrading,
    mode: getMode(),
    timestamp: new Date().toISOString()
  });
});

// --- Boot ---
const PORT = Number(process.env.PORT) || 8000;  // Railway injects PORT
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
  autonomousTrading = false;
  if (tradingInterval) {
    clearInterval(tradingInterval);
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  autonomousTrading = false;
  if (tradingInterval) {
    clearInterval(tradingInterval);
  }
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
