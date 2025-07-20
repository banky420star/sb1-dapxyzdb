#!/usr/bin/env node

import { DatabaseManager } from './server/database/manager.js'
import { Logger } from './server/utils/logger.js'

const logger = new Logger()

async function generateMockData() {
  try {
    logger.info('Generating mock historical data for model training')
    
    // Initialize database
    const db = new DatabaseManager()
    await db.initialize()
    
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
    
    // Generate 30 days of data for each symbol and timeframe
    const daysToGenerate = 30
    const now = Date.now()
    
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          logger.info(`Generating data for ${symbol} ${timeframe}`)
          
          const ohlcvData = generateMockOHLCV(symbol, timeframe, daysToGenerate, now)
          
          if (ohlcvData && ohlcvData.length > 0) {
            // Save to database
            await db.saveOHLCVData(symbol, timeframe, ohlcvData)
            
            logger.info(`Generated ${ohlcvData.length} bars for ${symbol} ${timeframe}`)
          }
          
        } catch (error) {
          logger.error(`Error generating data for ${symbol} ${timeframe}:`, error.message)
        }
      }
    }
    
    // Verify data generation
    await verifyDataGeneration(db, symbols, timeframes)
    
    logger.info('Mock data generation completed')
    
  } catch (error) {
    logger.error('Error in mock data generation:', error)
    process.exit(1)
  }
}

function generateMockOHLCV(symbol, timeframe, days, endTime) {
  const data = []
  const timeframeMs = getTimeframeMs(timeframe)
  const barsPerDay = 24 * 60 * 60 * 1000 / timeframeMs
  const totalBars = Math.floor(days * barsPerDay)
  
  // Base prices for different symbols
  const basePrices = {
    'EURUSD': 1.1000,
    'GBPUSD': 1.2650,
    'USDJPY': 149.50,
    'AUDUSD': 0.6600,
    'USDCAD': 1.3500,
    'USDCHF': 0.8900,
    'NZDUSD': 0.6100
  }
  
  let basePrice = basePrices[symbol] || 1.1000
  let currentTime = endTime - (totalBars * timeframeMs)
  
  for (let i = 0; i < totalBars; i++) {
    // Add some realistic price movement
    const volatility = 0.001 // 0.1% volatility
    const trend = Math.sin(i / 100) * 0.0005 // Gentle trend
    
    const priceChange = (Math.random() - 0.5) * volatility + trend
    basePrice = basePrice * (1 + priceChange)
    
    // Generate OHLCV
    const open = basePrice
    const high = open * (1 + Math.random() * volatility * 0.5)
    const low = open * (1 - Math.random() * volatility * 0.5)
    const close = low + Math.random() * (high - low)
    const volume = Math.random() * 1000000 + 100000
    
    data.push([
      currentTime,
      open,
      high,
      low,
      close,
      volume
    ])
    
    currentTime += timeframeMs
    basePrice = close // Use close as next base price
  }
  
  return data
}

function getTimeframeMs(timeframe) {
  const timeframes = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }
  return timeframes[timeframe] || 60 * 1000
}

async function verifyDataGeneration(db, symbols, timeframes) {
  logger.info('Verifying data generation...')
  
  const summary = {}
  
  for (const symbol of symbols) {
    summary[symbol] = {}
    
    for (const timeframe of timeframes) {
      try {
        const data = await db.getOHLCVData(symbol, timeframe, 100)
        
        if (data && data.length > 0) {
          const oldestTimestamp = data[0][0]
          const newestTimestamp = data[data.length - 1][0]
          const dataPeriod = newestTimestamp - oldestTimestamp
          const dataPeriodDays = dataPeriod / (24 * 60 * 60 * 1000)
          
          summary[symbol][timeframe] = {
            bars: data.length,
            periodDays: dataPeriodDays.toFixed(1),
            oldest: new Date(oldestTimestamp).toISOString().split('T')[0],
            newest: new Date(newestTimestamp).toISOString().split('T')[0]
          }
        } else {
          summary[symbol][timeframe] = { bars: 0, error: 'No data' }
        }
      } catch (error) {
        summary[symbol][timeframe] = { bars: 0, error: error.message }
      }
    }
  }
  
  // Print summary
  logger.info('Data Generation Summary:')
  console.table(summary)
  
  // Check if we have sufficient data for training
  const trainingSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
  const trainingTimeframes = ['1m', '5m', '15m', '1h']
  
  let totalSamples = 0
  for (const symbol of trainingSymbols) {
    for (const timeframe of trainingTimeframes) {
      const data = await db.getOHLCVData(symbol, timeframe, 3000)
      if (data && data.length > 25) {
        totalSamples += Math.max(0, data.length - 25) // Account for lookback period
      }
    }
  }
  
  logger.info(`Total available training samples: ${totalSamples}`)
  
  if (totalSamples >= 1000) {
    logger.info('✅ Sufficient data available for model training')
  } else {
    logger.warn('⚠️ Insufficient data for model training. Consider generating more data.')
  }
}

// Run the generation
generateMockData().then(() => {
  logger.info('Mock data generation script completed')
  process.exit(0)
}).catch((error) => {
  logger.error('Mock data generation script failed:', error)
  process.exit(1)
}) 