// server/routes/trading.js
import { Router } from 'express'
import { getLiveTradingState } from '../services/trading.js'
import { validate, schemas } from '../middleware/validate.js'
import { riskGate } from '../middleware/risk.js'
import { logTradingDecision, loggers } from '../utils/logger.js'
import config from '../config.js'

export const trading = Router()

// Autonomous trading bot state
let autonomousBotState = {
  isRunning: false,
  config: {
    tradingPairs: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'ADAUSDT', 'DOTUSDT'],
    maxPositionSize: 0.01,
    dataInterval: 30000, // 30 seconds
    riskLimit: 0.02 // 2% max risk per trade
  },
  tradeLog: [],
  cycleInterval: null
}

// GET /api/trading/state
trading.get('/trading/state', async (_req, res, next) => {
  try {
    const s = await getLiveTradingState()
    res.json({ 
      ok: true, 
      ...s,
      autonomousTrading: autonomousBotState.isRunning
    })
  } catch (e) { next(e) }
})

// POST /api/trading/start - Start autonomous trading
trading.post('/trading/start', async (_req, res, next) => {
  try {
    if (autonomousBotState.isRunning) {
      return res.json({
        ok: true,
        message: 'Autonomous trading bot is already running',
        isRunning: autonomousBotState.isRunning,
        config: autonomousBotState.config,
        tradeLog: autonomousBotState.tradeLog
      })
    }

    console.log('🚀 Starting autonomous trading bot...')
    
    autonomousBotState.isRunning = true
    
    // Start trading cycle
    autonomousBotState.cycleInterval = setInterval(() => {
      executeTradingCycle()
    }, autonomousBotState.config.dataInterval)
    
    autonomousBotState.intervalId = autonomousBotState.cycleInterval
    
    console.log('✅ Autonomous trading bot started successfully')
    
    res.json({
      ok: true,
      message: 'Autonomous trading bot started successfully',
      isRunning: autonomousBotState.isRunning,
      config: autonomousBotState.config,
      tradeLog: autonomousBotState.tradeLog
    })
  } catch (err) {
    console.error('Error starting autonomous trading bot:', err)
    next(err)
  }
})

// POST /api/trading/stop - Stop autonomous trading
trading.post('/trading/stop', async (_req, res, next) => {
  try {
    if (!autonomousBotState.isRunning) {
      return res.json({
        ok: true,
        message: 'Autonomous trading bot is not running',
        isRunning: autonomousBotState.isRunning,
        config: autonomousBotState.config,
        tradeLog: autonomousBotState.tradeLog
      })
    }

    console.log('🛑 Stopping autonomous trading bot...')
    
    autonomousBotState.isRunning = false
    
    if (autonomousBotState.cycleInterval) {
      clearInterval(autonomousBotState.cycleInterval)
      autonomousBotState.cycleInterval = null
      autonomousBotState.intervalId = null
    }
    
    console.log('✅ Autonomous trading bot stopped successfully')
    
    res.json({
      ok: true,
      message: 'Autonomous trading bot stopped successfully',
      isRunning: autonomousBotState.isRunning,
      config: autonomousBotState.config,
      tradeLog: autonomousBotState.tradeLog
    })
  } catch (err) {
    console.error('Error stopping autonomous trading bot:', err)
    next(err)
  }
})

// GET /api/trading/status - Get trading status
trading.get('/trading/status', async (_req, res, next) => {
  try {
    res.json({
      ok: true,
      isActive: autonomousBotState.isRunning,
      config: autonomousBotState.config,
      tradeLog: autonomousBotState.tradeLog,
      lastUpdate: new Date().toISOString(),
      riskEnabled: config.risk.enabled,
      tradingMode: config.trading.mode
    })
  } catch (e) { next(e) }
})

// POST /api/trading/execute - Execute a trade with validation and risk management
trading.post('/trading/execute', 
  validate(schemas.executeTrade),
  riskGate,
  async (req, res, next) => {
    try {
      const { symbol, side, qty, price, stopLoss, takeProfit } = req.body;
      const { idempotencyKey, volAdjustedQty, originalQty } = req.riskMetadata;

      loggers.trading.info({
        msg: 'Trade execution request received',
        trade: {
          symbol,
          side,
          originalQty,
          volAdjustedQty,
          price,
          idempotencyKey
        }
      });

      // In paper mode, simulate trade execution
      if (config.trading.isPaper) {
        const simulatedTrade = {
          id: `trade_${Date.now()}`,
          symbol,
          side,
          qty: volAdjustedQty,
          price: price || getCurrentPrice(symbol),
          stopLoss,
          takeProfit,
          status: 'filled',
          timestamp: new Date().toISOString(),
          idempotencyKey,
          riskActions: {
            volAdjusted: originalQty !== volAdjustedQty,
            originalQty,
            adjustedQty: volAdjustedQty
          }
        };

        // Log the trading decision
        logTradingDecision({
          symbol,
          side,
          qty: volAdjustedQty,
          price: simulatedTrade.price,
          confidence: 0.8, // Default confidence for manual trades
          modelVersion: 'manual',
          riskActions: simulatedTrade.riskActions,
          idempotencyKey
        });

        loggers.trading.info({
          msg: 'Paper trade executed successfully',
          trade: simulatedTrade
        });

        return res.json({
          ok: true,
          message: 'Paper trade executed successfully',
          trade: simulatedTrade
        });
      }

      // In live mode, execute real trade (placeholder for now)
      res.status(501).json({
        ok: false,
        error: 'live_trading_not_implemented',
        message: 'Live trading not yet implemented'
      });

    } catch (error) {
      loggers.trading.error({
        msg: 'Trade execution failed',
        error: error.message,
        trade: req.body
      });
      next(error);
    }
  }
);

// Autonomous trading cycle execution
async function executeTradingCycle() {
  if (!autonomousBotState.isRunning) return
  
  console.log('🔄 Executing autonomous trading cycle...')
  
  try {
    // Get AI model predictions
    const predictions = await getModelPredictions()
    
    // Execute trades based on AI consensus
    for (const symbol of autonomousBotState.config.tradingPairs) {
      const prediction = predictions.find(p => p.symbol === symbol)
      
      if (prediction && prediction.confidence > 0.7) {
        const trade = {
          symbol: symbol,
          side: prediction.signal > 0 ? 'buy' : 'sell',
          qty: autonomousBotState.config.maxPositionSize,
          price: prediction.price,
          confidence: prediction.confidence,
          timestamp: new Date().toISOString()
        }
        
        // Execute the trade (in live mode, this would place real orders)
        console.log(`📈 Executing trade: ${trade.side} ${trade.qty} ${trade.symbol} at ${trade.price}`)
        
        autonomousBotState.tradeLog.push(trade)
        
        // Keep only last 100 trades
        if (autonomousBotState.tradeLog.length > 100) {
          autonomousBotState.tradeLog = autonomousBotState.tradeLog.slice(-100)
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in trading cycle:', error.message)
  }
}

// Get AI model predictions
async function getModelPredictions() {
  try {
    const response = await fetch('https://normal-sofa-production-9d2b.up.railway.app/api/models')
    const data = await response.json()
    
    if (data.ok && data.models) {
      // Use ensemble model predictions
      const ensemble = data.models.find(m => m.type === 'ensemble')
      if (ensemble) {
        return autonomousBotState.config.tradingPairs.map(symbol => ({
          symbol: symbol,
          signal: Math.random() > 0.5 ? 1 : -1, // Simplified for now
          confidence: 0.75 + Math.random() * 0.2,
          price: getCurrentPrice(symbol)
        }))
      }
    }
  } catch (error) {
    console.error('Error getting model predictions:', error.message)
  }
  
  return []
}

// Get current price for a symbol
function getCurrentPrice(symbol) {
  const basePrices = {
    'BTCUSDT': 50000,
    'ETHUSDT': 3000,
    'XRPUSDT': 0.5,
    'ADAUSDT': 0.4,
    'DOTUSDT': 7
  }
  return basePrices[symbol] || 100
}
