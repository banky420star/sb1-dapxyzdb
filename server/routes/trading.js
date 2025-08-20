// server/routes/trading.js
import { Router } from 'express'
import { getLiveTradingState } from '../services/trading.js'

export const trading = Router()

// GET /api/trading/state
trading.get('/trading/state', async (_req, res, next) => {
  try {
    const s = await getLiveTradingState()
    res.json({ ok: true, ...s })
  } catch (e) { next(e) }
})
