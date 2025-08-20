// server/routes/health.js
import { Router } from 'express'
export const health = Router()

health.get('/health', (_req, res) => {
  res.json({ status: 'healthy', ts: new Date().toISOString() })
})

health.get('/version', (_req, res) => {
  res.json({
    app: 'AlgoTrader Pro',
    version: process.env.APP_VERSION || '1.0.0',
    mode: process.env.TRADING_MODE || 'paper',
  })
})
