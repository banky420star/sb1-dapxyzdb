// server/index.js
// Express API entry for Railway. API-only (frontend is on Netlify).

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'

// --- Routes (added below) ---
import { health } from './routes/health.js'
import { account } from './routes/account.js'
import { trading } from './routes/trading.js'
import { models } from './routes/models.js'
import riskRoutes from './routes/risk.js'
import monitoringRoutes from './routes/monitoring.js'
import { monitoringMiddleware } from './services/monitoring.js'

const app = express()

// Trust Railway/Proxy so X-Forwarded-For works (needed by rate limiter)
app.set('trust proxy', 1)

// JSON body parsing
app.use(express.json())

// Security hardening
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// CORS: allow only your sites
const ALLOWED = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED.includes(origin)),
  credentials: true,
}))

// Rate limiting (tune max/window as needed)
app.use(rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Logs (structured-ish)
app.use(morgan('combined'))

// Monitoring middleware (track API performance)
app.use(monitoringMiddleware)

// --- API routes ---
app.use('/api', health)
app.use('/api', account)
app.use('/api', trading)
app.use('/api', models)
app.use('/api/risk', riskRoutes)
app.use('/api/monitoring', monitoringRoutes)

// Front-page hint (we're API-only on Railway)
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'api',
    mode: process.env.TRADING_MODE || 'paper',
    hint: 'Frontend is deployed on Netlify',
    features: ['trading', 'risk-management', 'monitoring', 'models']
  })
})

// Error handler
// (Agents: keep as last middleware)
app.use((err, _req, res, _next) => {
  const code = err.status || 500
  res.status(code).json({ ok: false, error: err.message || 'Internal Error' })
})

// Start server
const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT} | mode=${process.env.TRADING_MODE || 'paper'}`)
  console.log(`[api] features: trading, risk-management, monitoring, models`)
})