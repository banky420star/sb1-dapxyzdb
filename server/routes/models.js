// server/routes/models.js
import { Router } from 'express'
import { listModels, getTrainingStatus } from '../services/models.js'
import { continuousTrainingService } from '../services/continuous-training.js'

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

// POST /api/training/start
models.post('/training/start', async (_req, res, next) => {
  try {
    continuousTrainingService.start()
    res.json({ 
      ok: true, 
      message: 'Continuous training started',
      status: continuousTrainingService.getStatus()
    })
  } catch (e) { next(e) }
})

// POST /api/training/stop
models.post('/training/stop', async (_req, res, next) => {
  try {
    continuousTrainingService.stop()
    res.json({ 
      ok: true, 
      message: 'Continuous training stopped',
      status: continuousTrainingService.getStatus()
    })
  } catch (e) { next(e) }
})

// GET /api/training/metrics
models.get('/training/metrics', async (_req, res, next) => {
  try {
    const metrics = continuousTrainingService.getTrainingMetrics()
    res.json({ ok: true, metrics })
  } catch (e) { next(e) }
})
