// server/routes/account.js
import { Router } from 'express'
import { getLiveBalance } from '../services/account.js'

export const account = Router()

// GET /api/balance
account.get('/balance', async (_req, res, next) => {
  try {
    const data = await getLiveBalance()
    res.json({ ok: true, ...data })
  } catch (e) { next(e) }
})

// GET /api/account/balance (for frontend compatibility)
account.get('/account/balance', async (_req, res, next) => {
  try {
    const data = await getLiveBalance()
    console.log('Account balance endpoint returning:', data)
    res.json(data)
  } catch (e) { next(e) }
})

// GET /api/account/debug (for debugging)
account.get('/account/debug', async (_req, res, next) => {
  try {
    const { getRealDataCache } = await import('../services/real-trading-data.js')
    const realData = getRealDataCache()
    const balance = await getLiveBalance()
    res.json({
      realDataCache: realData,
      balance: balance,
      tradingMode: process.env.TRADING_MODE
    })
  } catch (e) { next(e) }
})
