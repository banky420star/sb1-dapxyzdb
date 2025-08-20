// server/routes/models.js
import { Router } from 'express'
import { listModels, getTrainingStatus } from '../services/models.js'

export const models = Router()

// GET /api/models
models.get('/models', async (_req, res, next) => {
  try {
    const models = await listModels()
    res.json({ ok: true, models })
  } catch (e) { next(e) }
})

// GET /api/training/status
models.get('/training/status', async (_req, res, next) => {
  try {
    const s = await getTrainingStatus()
    res.json({ ok: true, ...s })
  } catch (e) { next(e) }
})
