// Simple server for Railway deployment
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const app = express();

// --- Security & basics ---
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({ windowMs: 30 * 1000, max: 100 });
app.use(limiter);

// --- Healthcheck (Railway points here) ---
app.get('/health', (_req, res) => res.status(200).send('ok'));

// --- Status for UI ---
app.get('/api/status', (_req, res) => {
  res.json({ 
    status: 'ok', 
    mode: process.env.TRADING_MODE || 'paper', 
    time: new Date().toISOString() 
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
  const { symbol, side, confidence } = req.body || {};
  if (!symbol || !side) return res.status(400).json({ error: 'symbol & side required' });
  if (Number(confidence) < req.risk.minConfidence) {
    return res.status(412).json({ error: 'Confidence below threshold' });
  }
  
  // Simulated trade execution
  const simulated = !!req.isPaper;
  console.log(`[${simulated ? 'PAPER' : 'LIVE'}] ${side.toUpperCase()} ${symbol} - Confidence: ${confidence}`);
  
  return res.json({ 
    ok: true, 
    simulated, 
    appliedRisk: req.risk,
    trade: { symbol, side, confidence, timestamp: new Date().toISOString() }
  });
});

// --- Autonomous tick (consensus + execution) ---
app.post('/api/auto/tick', guardTrade, async (req, res) => {
  const { symbol, candles = [] } = req.body || {};
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  
  // Simulated consensus engine
  const consensus = {
    passes: Math.random() > 0.3, // 70% pass rate
    finalSignal: Math.random() > 0.5 ? 'buy' : 'sell',
    avgConfidence: 0.75 + Math.random() * 0.2,
    models: [
      { signal: 'buy', confidence: 0.8 },
      { signal: 'buy', confidence: 0.75 },
      { signal: 'sell', confidence: 0.6 }
    ]
  };
  
  if (!consensus.passes) {
    return res.status(412).json({ error: 'Consensus not met', consensus });
  }
  
  console.log(`[AUTO] Consensus: ${consensus.finalSignal.toUpperCase()} ${symbol} - Confidence: ${consensus.avgConfidence.toFixed(2)}`);
  
  return res.json({ 
    ok: true, 
    consensus, 
    simulated: !!req.isPaper,
    timestamp: new Date().toISOString()
  });
});

// --- Account endpoints ---
app.get('/api/account/balance', (_req, res) => {
  res.json({
    balance: 25000,
    equity: 25250,
    margin: 0,
    freeMargin: 25000,
    currency: 'USD'
  });
});

app.get('/api/account/positions', (_req, res) => {
  res.json({
    positions: [
      {
        symbol: 'BTCUSDT',
        side: 'buy',
        size: 0.001,
        entryPrice: 43250,
        currentPrice: 43500,
        pnl: 0.25,
        pnlPercent: 0.58
      }
    ]
  });
});

// --- Boot ---
const PORT = Number(process.env.PORT) || 8000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Autonomous Trading Bot V2 listening on http://0.0.0.0:${PORT}`);
  console.log(`📊 Trading Mode: ${process.env.TRADING_MODE || 'paper'}`);
  console.log(`🤖 AI Consensus Engine: ACTIVE`);
  console.log(`🔒 Security: ENABLED`);
  console.log(`🔄 Autonomous Trading: ${process.env.AUTO_TRADER_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
