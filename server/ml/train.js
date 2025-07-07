#!/usr/bin/env node

import { MLTrainer } from './trainer.js'
import { RealDataFetcher } from '../data/realDataFetcher.js'
import { Logger } from '../utils/logger.js'
import dotenv from 'dotenv'

dotenv.config()

const logger = new Logger()

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  
  logger.info('🤖 AlgoTrader ML Training System')
  logger.info('=====================================')
  
  switch (command) {
    case 'help':
      showHelp()
      break
    case 'setup':
      await setupEnvironment()
      break
    case 'collect':
      await collectData(args.slice(1))
      break
    case 'train':
      await trainModels(args.slice(1))
      break
    case 'status':
      await showStatus()
      break
    case 'api-test':
      await testAPIs()
      break
    default:
      logger.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

function showHelp() {
  console.log(`
🚀 AlgoTrader ML Training Commands:

  setup         - Set up environment and check configuration
  api-test      - Test API connections
  collect       - Collect historical data
                  Options: [symbols] [timeframes] [months]
                  Example: collect EURUSD,GBPUSD 1h,4h 6
  train         - Train ML models
                  Options: [symbols] [timeframes]
                  Example: train EURUSD,GBPUSD 1h,4h
  status        - Show training status and history
  help          - Show this help message

📋 Getting Started:
  1. npm run train setup
  2. npm run train api-test
  3. npm run train collect
  4. npm run train train

⚙️  Environment Variables Required:
  - ALPHA_VANTAGE_API_KEY (get from: https://www.alphavantage.co/support/#api-key)
  - Optional: IEX_CLOUD_API_KEY, POLYGON_API_KEY
`)
}

async function setupEnvironment() {
  try {
    logger.info('🔧 Setting up environment...')
    
    // Check environment variables
    const requiredEnv = ['ALPHA_VANTAGE_API_KEY']
    const missingEnv = []
    
    for (const env of requiredEnv) {
      if (!process.env[env] || process.env[env] === `your_${env.toLowerCase()}_here`) {
        missingEnv.push(env)
      }
    }
    
    if (missingEnv.length > 0) {
      logger.error('❌ Missing required environment variables:')
      for (const env of missingEnv) {
        logger.error(`   - ${env}`)
      }
      logger.info('📝 Please update your .env file with valid API keys')
      logger.info('🔗 Get Alpha Vantage API key: https://www.alphavantage.co/support/#api-key')
      process.exit(1)
    }
    
    // Check directories
    const fs = await import('fs')
    const dirs = ['data', 'logs']
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        logger.info(`📁 Created directory: ${dir}`)
      }
    }
    
    logger.info('✅ Environment setup complete!')
    logger.info('➡️  Next step: npm run train api-test')
    
  } catch (error) {
    logger.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

async function testAPIs() {
  try {
    logger.info('🔌 Testing API connections...')
    
    const dataFetcher = new RealDataFetcher()
    await dataFetcher.initialize()
    
    const status = dataFetcher.getStatus()
    
    logger.info('📊 API Status:')
    for (const api of status.apis) {
      const status = api.configured ? '✅ Configured' : '❌ Not configured'
      logger.info(`   ${api.name}: ${status} (Rate limit: ${api.rateLimit}/min)`)
    }
    
    if (status.apis.some(api => api.configured)) {
      logger.info('✅ At least one API is configured - ready for data collection!')
      logger.info('➡️  Next step: npm run train collect')
    } else {
      logger.error('❌ No APIs configured - please check your .env file')
      process.exit(1)
    }
    
  } catch (error) {
    logger.error('❌ API test failed:', error)
    process.exit(1)
  }
}

async function collectData(args) {
  try {
    const symbols = args[0] ? args[0].split(',') : ['EURUSD', 'GBPUSD', 'USDJPY']
    const timeframes = args[1] ? args[1].split(',') : ['1h', '4h', '1d']
    const months = args[2] ? parseInt(args[2]) : 6
    
    logger.info('📥 Starting historical data collection...')
    logger.info(`   Symbols: ${symbols.join(', ')}`)
    logger.info(`   Timeframes: ${timeframes.join(', ')}`)
    logger.info(`   Duration: ${months} months`)
    
    const dataFetcher = new RealDataFetcher()
    await dataFetcher.initialize()
    
    const results = await dataFetcher.collectHistoricalDataSet(symbols, timeframes, months)
    
    logger.info('📊 Collection Results:')
    let totalBars = 0
    for (const [symbol, timeframeData] of Object.entries(results)) {
      logger.info(`   ${symbol}:`)
      for (const [timeframe, count] of Object.entries(timeframeData)) {
        if (typeof count === 'number') {
          logger.info(`     ${timeframe}: ${count} bars`)
          totalBars += count
        } else {
          logger.error(`     ${timeframe}: ${count}`)
        }
      }
    }
    
    logger.info(`✅ Total collected: ${totalBars} bars`)
    
    if (totalBars > 1000) {
      logger.info('🎯 Sufficient data collected for training!')
      logger.info('➡️  Next step: npm run train train')
    } else {
      logger.warn('⚠️  Limited data collected - consider adjusting time range or checking API limits')
    }
    
  } catch (error) {
    logger.error('❌ Data collection failed:', error)
    process.exit(1)
  }
}

async function trainModels(args) {
  try {
    const symbols = args[0] ? args[0].split(',') : null
    const timeframes = args[1] ? args[1].split(',') : null
    
    logger.info('🤖 Starting ML model training...')
    if (symbols) logger.info(`   Symbols: ${symbols.join(', ')}`)
    if (timeframes) logger.info(`   Timeframes: ${timeframes.join(', ')}`)
    
    const trainer = new MLTrainer()
    await trainer.initialize()
    
    // Show progress updates
    const progressInterval = setInterval(() => {
      const progress = trainer.getTrainingProgress()
      if (progress && progress.status) {
        logger.info(`📈 ${progress.status}: ${progress.progress}% - ${progress.currentTask}`)
      }
    }, 5000)
    
    const results = await trainer.trainAllModels(symbols, timeframes)
    
    clearInterval(progressInterval)
    
    logger.info('🎯 Training Results:')
    logger.info(`   Duration: ${(results.duration / 1000 / 60).toFixed(1)} minutes`)
    logger.info(`   Data Points: ${results.dataPoints}`)
    
    logger.info('🧠 Model Performance:')
    for (const [modelType, result] of Object.entries(results.models)) {
      if (result.success) {
        const accuracy = (result.evaluation.accuracy * 100).toFixed(1)
        logger.info(`   ${modelType}: ${accuracy}% accuracy`)
      } else {
        logger.error(`   ${modelType}: Failed - ${result.error}`)
      }
    }
    
    if (results.ensemble && results.ensemble.accuracy > 0) {
      const ensembleAccuracy = (results.ensemble.accuracy * 100).toFixed(1)
      logger.info(`🎯 Ensemble: ${ensembleAccuracy}% accuracy (${results.ensemble.activeModels} models)`)
    }
    
    if (results.ensemble && results.ensemble.accuracy > 0.6) {
      logger.info('🎉 Training successful! Models are ready for autonomous trading.')
      logger.info('📋 Next steps:')
      logger.info('   1. Run extended paper trading validation')
      logger.info('   2. Set TRADING_MODE=live in .env when ready')
      logger.info('   3. Start with small position sizes')
    } else {
      logger.warn('⚠️  Model accuracy below target (60%). Consider:')
      logger.warn('   - Collecting more historical data')
      logger.warn('   - Adjusting model parameters')
      logger.warn('   - Adding more features')
    }
    
  } catch (error) {
    logger.error('❌ Training failed:', error)
    process.exit(1)
  }
}

async function showStatus() {
  try {
    logger.info('📊 Training System Status')
    
    const trainer = new MLTrainer()
    await trainer.initialize()
    
    const history = trainer.getTrainingHistory()
    const progress = trainer.getTrainingProgress()
    
    if (progress && progress.status) {
      logger.info(`🔄 Current Training: ${progress.status} (${progress.progress}%)`)
      logger.info(`   Task: ${progress.currentTask}`)
    } else {
      logger.info('💤 No training in progress')
    }
    
    logger.info(`📈 Training History (${history.length} sessions):`)
    
    for (const session of history.slice(-5)) {
      const date = new Date(session.timestamp).toLocaleString()
      if (session.success) {
        const duration = (session.duration / 1000 / 60).toFixed(1)
        const accuracy = session.ensemble ? (session.ensemble.accuracy * 100).toFixed(1) : 'N/A'
        logger.info(`   ✅ ${date}: ${duration}min, ${accuracy}% accuracy`)
      } else {
        logger.info(`   ❌ ${date}: Failed - ${session.error}`)
      }
    }
    
  } catch (error) {
    logger.error('❌ Status check failed:', error)
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run main function
main().catch(error => {
  logger.error('Training script failed:', error)
  process.exit(1)
})