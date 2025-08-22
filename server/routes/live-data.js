// server/routes/live-data.js
// Live data feed API endpoints

import { Router } from 'express'
import liveDataFeed from '../services/live-data-feed.js'

export const liveData = Router()

// GET /api/live-data/status
liveData.get('/live-data/status', async (_req, res, next) => {
  try {
    const stats = liveDataFeed.getDataStatistics()
    res.json({ 
      ok: true, 
      ...stats,
      isRunning: liveDataFeed.isRunning
    })
  } catch (e) {
    next(e)
  }
})

// GET /api/live-data/latest
liveData.get('/live-data/latest', async (_req, res, next) => {
  try {
    const data = liveDataFeed.getLatestData()
    res.json({ 
      ok: true, 
      ...data
    })
  } catch (e) {
    next(e)
  }
})

// POST /api/live-data/start
liveData.post('/live-data/start', async (_req, res, next) => {
  try {
    await liveDataFeed.start()
    res.json({ 
      ok: true, 
      message: 'Live data feed started successfully',
      isRunning: liveDataFeed.isRunning
    })
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// POST /api/live-data/stop
liveData.post('/live-data/stop', async (_req, res, next) => {
  try {
    liveDataFeed.stop()
    res.json({ 
      ok: true, 
      message: 'Live data feed stopped successfully',
      isRunning: liveDataFeed.isRunning
    })
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// GET /api/live-data/training-data/:modelType
liveData.get('/live-data/training-data/:modelType', async (req, res, next) => {
  try {
    const { modelType } = req.params
    const trainingData = liveDataFeed.getTrainingDataForModel(modelType)
    res.json({ 
      ok: true, 
      modelType,
      data: trainingData,
      count: trainingData.length
    })
  } catch (e) {
    next(e)
  }
})

// GET /api/live-data/sources
liveData.get('/live-data/sources', async (_req, res, next) => {
  try {
    const sources = {
      bybit: {
        status: 'active',
        pairs: liveDataFeed.tradingPairs,
        description: 'Cryptocurrency market data'
      },
      alphavantage: {
        status: 'active',
        pairs: liveDataFeed.forexPairs,
        description: 'Forex market data'
      },
      synthetic: {
        status: 'active',
        pairs: ['SYNTH_BTC', 'SYNTH_ETH', 'SYNTH_FOREX'],
        description: 'Synthetic training data'
      }
    }
    
    res.json({ 
      ok: true, 
      sources
    })
  } catch (e) {
    next(e)
  }
})

// GET /api/live-data/features/:symbol
liveData.get('/live-data/features/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params
    const cacheKey = `bybit_${symbol}` || `alphavantage_${symbol}` || `synthetic_${symbol}`
    const data = liveDataFeed.dataCache.get(cacheKey)
    
    if (!data || !data.data) {
      return res.status(404).json({ ok: false, error: 'Symbol data not found' })
    }
    
    // Extract features from the data
    const features = liveDataFeed.extractFeatures(data.data)
    
    res.json({ 
      ok: true, 
      symbol,
      features,
      timestamp: data.timestamp
    })
  } catch (e) {
    next(e)
  }
})
