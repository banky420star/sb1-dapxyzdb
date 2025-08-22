// server/routes/models.js
import { Router } from 'express'
import { listModels, getTrainingStatus, startTraining, stopTraining } from '../services/models.js'

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
models.post('/training/start', async (req, res, next) => {
  try {
    const { model } = req.body
    if (!model) {
      return res.status(400).json({ ok: false, error: 'Model type required' })
    }
    
    const result = await startTraining(model)
    res.json({ ok: true, message: `Training started for ${model}`, ...result })
  } catch (e) { 
    res.status(400).json({ ok: false, error: e.message })
  }
})

// POST /api/training/stop
models.post('/training/stop', async (_req, res, next) => {
  try {
    const result = await stopTraining()
    res.json({ ok: true, message: 'Training stopped', ...result })
  } catch (e) { 
    res.status(400).json({ ok: false, error: e.message })
  }
})

// GET /api/training/metrics
models.get('/training/metrics', async (_req, res, next) => {
  try {
    const metrics = continuousTrainingService.getTrainingMetrics()
    res.json({ ok: true, metrics })
  } catch (e) { next(e) }
})
