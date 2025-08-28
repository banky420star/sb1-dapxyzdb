// middleware/risk.js
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// Risk state management
let riskState = {
  dailyPnL: 0,
  maxDrawdown: 0,
  currentDrawdown: 0,
  symbolExposures: new Map(),
  idempotencyKeys: new Set(),
  lastReset: new Date().toDateString()
};

// Volatility targets by symbol (in basis points)
const VOL_TARGETS = {
  'BTCUSDT': 50,   // 0.5% daily vol target
  'ETHUSDT': 75,   // 0.75% daily vol target
  'XRPUSDT': 100,  // 1% daily vol target
  'ADAUSDT': 120,  // 1.2% daily vol target
  'DOTUSDT': 90    // 0.9% daily vol target
};

// Per-symbol position caps
const SYMBOL_CAPS = {
  'BTCUSDT': 0.1,  // 10% of account
  'ETHUSDT': 0.15, // 15% of account
  'XRPUSDT': 0.2,  // 20% of account
  'ADAUSDT': 0.2,  // 20% of account
  'DOTUSDT': 0.15  // 15% of account
};

// Risk configuration
const RISK_CONFIG = {
  maxDailyLoss: 0.05,    // 5% max daily loss
  maxDrawdown: 0.15,     // 15% max drawdown
  maxTotalExposure: 0.8, // 80% max total exposure
  volTargetMultiplier: 0.25, // Conservative vol targeting
  idempotencyWindow: 24 * 60 * 60 * 1000 // 24 hours
};

export function riskGate(req, res, next) {
  try {
    const { symbol, qty, side } = req.body;
    
    // Reset daily metrics if it's a new day
    const today = new Date().toDateString();
    if (today !== riskState.lastReset) {
      riskState.dailyPnL = 0;
      riskState.lastReset = today;
      riskState.idempotencyKeys.clear();
    }

    // Check drawdown brakes
    if (isDrawdownBreached()) {
      return res.status(423).json({
        error: "risk_locked",
        message: "Maximum drawdown breached - trading suspended",
        currentDrawdown: riskState.currentDrawdown,
        maxDrawdown: RISK_CONFIG.maxDrawdown
      });
    }

    // Check daily loss limit
    if (riskState.dailyPnL < -RISK_CONFIG.maxDailyLoss) {
      return res.status(423).json({
        error: "daily_loss_limit",
        message: "Daily loss limit exceeded",
        dailyPnL: riskState.dailyPnL,
        limit: -RISK_CONFIG.maxDailyLoss
      });
    }

    // Check per-symbol caps
    if (!withinSymbolCaps(symbol, qty)) {
      return res.status(409).json({
        error: "exceeds_caps",
        message: `Position size exceeds cap for ${symbol}`,
        symbol,
        requestedQty: qty,
        maxAllowed: SYMBOL_CAPS[symbol] || 0.1
      });
    }

    // Apply vol-targeting to position size
    const volAdjustedQty = sizeByVolTarget(qty, symbol);
    req.body.qty = volAdjustedQty;

    // Generate or validate idempotency key
    const idempotencyKey = req.headers['idempotency-key'] || 
                          req.body.idempotencyKey || 
                          generateIdempotencyKey(req.body);
    
    if (riskState.idempotencyKeys.has(idempotencyKey)) {
      return res.status(409).json({
        error: "duplicate_request",
        message: "Request with this idempotency key already processed",
        idempotencyKey
      });
    }

    // Add idempotency key to headers
    req.headers['idempotency-key'] = idempotencyKey;
    riskState.idempotencyKeys.add(idempotencyKey);

    // Update symbol exposure tracking
    updateSymbolExposure(symbol, volAdjustedQty, side);

    // Add risk metadata to request
    req.riskMetadata = {
      idempotencyKey,
      volAdjustedQty,
      originalQty: qty,
      symbolExposure: riskState.symbolExposures.get(symbol) || 0,
      currentDrawdown: riskState.currentDrawdown,
      dailyPnL: riskState.dailyPnL
    };

    next();
  } catch (error) {
    console.error('Risk gate error:', error);
    return res.status(500).json({
      error: "risk_gate_error",
      message: "Risk validation failed"
    });
  }
}

function isDrawdownBreached() {
  return riskState.currentDrawdown >= RISK_CONFIG.maxDrawdown;
}

function withinSymbolCaps(symbol, qty) {
  const cap = SYMBOL_CAPS[symbol] || 0.1; // Default 10% cap
  const currentExposure = riskState.symbolExposures.get(symbol) || 0;
  return (currentExposure + qty) <= cap;
}

function sizeByVolTarget(qty, symbol) {
  const volTarget = VOL_TARGETS[symbol] || 100; // Default 1% vol target
  const multiplier = RISK_CONFIG.volTargetMultiplier;
  
  // Simple vol targeting: reduce size based on volatility
  // In production, you'd use actual realized volatility
  const volAdjustment = Math.min(1, multiplier * (100 / volTarget));
  
  return Math.min(qty, qty * volAdjustment);
}

function generateIdempotencyKey(data) {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data) + Date.now() + uuidv4());
  return hash.digest('hex');
}

function updateSymbolExposure(symbol, qty, side) {
  const current = riskState.symbolExposures.get(symbol) || 0;
  const adjustment = side === 'buy' ? qty : -qty;
  riskState.symbolExposures.set(symbol, Math.max(0, current + adjustment));
}

// Function to update PnL (called after trade execution)
export function updatePnL(pnl) {
  riskState.dailyPnL += pnl;
  
  // Update drawdown calculation
  if (pnl < 0) {
    riskState.currentDrawdown = Math.max(riskState.currentDrawdown, Math.abs(pnl));
  } else {
    // Reset drawdown if we're profitable
    riskState.currentDrawdown = Math.max(0, riskState.currentDrawdown - pnl);
  }
}

// Function to get current risk state
export function getRiskState() {
  return {
    ...riskState,
    symbolExposures: Object.fromEntries(riskState.symbolExposures),
    idempotencyKeyCount: riskState.idempotencyKeys.size
  };
}

// Function to reset risk state (for testing/admin)
export function resetRiskState() {
  riskState = {
    dailyPnL: 0,
    maxDrawdown: 0,
    currentDrawdown: 0,
    symbolExposures: new Map(),
    idempotencyKeys: new Set(),
    lastReset: new Date().toDateString()
  };
}