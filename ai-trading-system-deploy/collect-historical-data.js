#!/usr/bin/env node

import { DataManager } from './server/data/manager.js'
import { DatabaseManager } from './server/database/manager.js'
import { Logger } from './server/utils/logger.js'

const logger = new Logger()

async function collectHistoricalData() {
  try {
    logger.info('Starting historical data collection for model training')
    
    // Initialize database
    const db = new DatabaseManager()
    await db.initialize()
    
    // Initialize data manager
    const dataManager = new DataManager()
    await dataManager.initialize()
    
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD']
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
    
    // Collect data for each symbol and timeframe
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          logger.info(`Collecting data for ${symbol} ${timeframe}`)
          
          // Fetch historical data
          const historicalData = await dataManager.fetchHistoricalData(symbol, timeframe, 5000)
          
          if (historicalData && historicalData.length > 0) {
            // Save to database
            await db.saveOHLCVData(symbol, timeframe, historicalData)
            
            logger.info(`Collected ${historicalData.length} bars for ${symbol} ${timeframe}`)
            
            // Check data period
            const oldestTimestamp = historicalData[0][0]
            const newestTimestamp = historicalData[historicalData.length - 1][0]
            const dataPeriod = newestTimestamp - oldestTimestamp
            const dataPeriodDays = dataPeriod / (24 * 60 * 60 * 1000)
            
            logger.info(`Data period for ${symbol} ${timeframe}: ${dataPeriodDays.toFixed(1)} days`)
          } else {
            logger.warn(`No data collected for ${symbol} ${timeframe}`)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          logger.error(`Error collecting data for ${symbol} ${timeframe}:`, error.message)
        }
      }
    }
    
    // Verify data collection
    await verifyDataCollection(db, symbols, timeframes)
    
    logger.info('Historical data collection completed')
    
  } catch (error) {
    logger.error('Error in historical data collection:', error)
    process.exit(1)
  }
}

async function verifyDataCollection(db, symbols, timeframes) {
  logger.info('Verifying data collection...')
  
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
  logger.info('Data Collection Summary:')
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
    logger.warn('⚠️ Insufficient data for model training. Consider collecting more data.')
  }
}

// Run the collection
collectHistoricalData().then(() => {
  logger.info('Data collection script completed')
  process.exit(0)
}).catch((error) => {
  logger.error('Data collection script failed:', error)
  process.exit(1)
}) 