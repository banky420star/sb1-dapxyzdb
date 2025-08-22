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
    res.json(data)
  } catch (e) { next(e) }
})
