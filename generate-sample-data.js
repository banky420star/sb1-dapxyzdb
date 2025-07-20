import { DatabaseManager } from './server/database/manager.js'
import { Logger } from './server/utils/logger.js'

const logger = new Logger()
const db = new DatabaseManager()

async function generateSampleData() {
  try {
    await db.initialize()
    logger.info('Generating sample data...')

    // Generate sample positions first
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD']
    const sides = ['buy', 'sell']
    
    for (let i = 0; i < 50; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const side = sides[Math.floor(Math.random() * sides.length)]
      const size = Math.random() * 2 + 0.1
      const entryPrice = Math.random() * 100 + 1
      const timestamp = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 // Random time in last 7 days
      
      // Create position first
      await db.savePosition({
        id: `pos_${i}`,
        orderId: `order_${i}`,
        symbol,
        side,
        size,
        entryPrice,
        currentPrice: entryPrice,
        pnl: 0,
        pnlPercent: 0,
        stopLoss: entryPrice * 0.95,
        takeProfit: entryPrice * 1.05,
        timestamp,
        status: 'closed'
      })
    }

    // Generate sample trades
    for (let i = 0; i < 50; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const side = sides[Math.floor(Math.random() * sides.length)]
      const size = Math.random() * 2 + 0.1
      const entryPrice = Math.random() * 100 + 1
      const closePrice = entryPrice + (Math.random() - 0.5) * 10
      const pnl = side === 'buy' ? (closePrice - entryPrice) * size : (entryPrice - closePrice) * size
      const timestamp = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 // Random time in last 7 days
      
      await db.saveTrade({
        id: `trade_${i}`,
        positionId: `pos_${i}`,
        symbol,
        side,
        size,
        entryPrice,
        closePrice,
        pnl,
        duration: Math.random() * 3600 + 300, // 5 minutes to 1 hour
        timestamp,
        reason: 'manual'
      })
    }

    // Generate sample model performance data
    const models = ['RandomForest', 'LSTM', 'DDQN']
    
    for (const model of models) {
      await db.saveModelPerformance(model, {
        accuracy: Math.random() * 0.3 + 0.6, // 60-90% accuracy
        precisionScore: Math.random() * 0.3 + 0.6,
        recallScore: Math.random() * 0.3 + 0.6,
        f1Score: Math.random() * 0.3 + 0.6,
        trainingTime: Math.random() * 300 + 60, // 1-6 minutes
        trainingDate: new Date().toISOString(),
        dataSize: Math.floor(Math.random() * 5000) + 1000,
        version: '1.0.0'
      })
    }

    // Generate sample account balance
    await db.saveAccountBalance({
      equity: 10500,
      balance: 10000,
      margin: 500,
      freeMargin: 9500,
      marginLevel: 2100,
      peakEquity: 11000
    })

    // Generate sample metrics
    for (let i = 0; i < 24; i++) {
      const timestamp = Date.now() - i * 60 * 60 * 1000 // Last 24 hours
      await db.saveMetrics({
        timestamp,
        metrics: {
          totalTrades: Math.floor(Math.random() * 10) + 1,
          winRate: Math.random() * 40 + 50, // 50-90%
          totalPnL: (Math.random() - 0.5) * 1000, // -500 to +500
          activePositions: Math.floor(Math.random() * 5)
        },
        counters: {
          tradesExecuted: Math.floor(Math.random() * 100) + 10,
          ordersPlaced: Math.floor(Math.random() * 50) + 5
        },
        gauges: {
          systemLoad: Math.random() * 100,
          memoryUsage: Math.random() * 80 + 20
        }
      })
    }

    // Generate sample news events
    const newsEvents = [
      { title: 'Fed Announces Rate Decision', impact: 'high', currency: 'USD' },
      { title: 'ECB Policy Meeting Results', impact: 'high', currency: 'EUR' },
      { title: 'UK Inflation Data Released', impact: 'medium', currency: 'GBP' },
      { title: 'Japan Trade Balance Report', impact: 'medium', currency: 'JPY' },
      { title: 'Australia Employment Data', impact: 'medium', currency: 'AUD' }
    ]

    for (const event of newsEvents) {
      await db.saveNewsEvent({
        id: `news_${Date.now()}_${Math.random()}`,
        title: event.title,
        content: `Latest ${event.title.toLowerCase()} shows significant market impact.`,
        impact: event.impact,
        currency: event.currency,
        source: 'Reuters',
        timestamp: Date.now() - Math.random() * 24 * 60 * 60 * 1000
      })
    }

    // Generate sample economic events
    const economicEvents = [
      { title: 'Non-Farm Payrolls', currency: 'USD', impact: 'high' },
      { title: 'GDP Growth Rate', currency: 'EUR', impact: 'high' },
      { title: 'Interest Rate Decision', currency: 'GBP', impact: 'high' },
      { title: 'CPI Inflation', currency: 'JPY', impact: 'medium' },
      { title: 'Retail Sales', currency: 'AUD', impact: 'medium' }
    ]

    for (const event of economicEvents) {
      await db.saveEconomicEvent({
        id: `econ_${Date.now()}_${Math.random()}`,
        title: event.title,
        currency: event.currency,
        impact: event.impact,
        actual: (Math.random() * 10).toFixed(2),
        forecast: (Math.random() * 10).toFixed(2),
        previous: (Math.random() * 10).toFixed(2),
        eventTime: new Date().toISOString(),
        timestamp: Date.now() - Math.random() * 24 * 60 * 60 * 1000
      })
    }

    logger.info('Sample data generated successfully!')
    logger.info('Generated:')
    logger.info('- 50 sample trades')
    logger.info('- 3 model performance records')
    logger.info('- 1 account balance record')
    logger.info('- 24 metrics records')
    logger.info('- 5 news events')
    logger.info('- 5 economic events')

  } catch (error) {
    logger.error('Error generating sample data:', error)
  } finally {
    await db.cleanup()
  }
}

// Add missing method to DatabaseManager
if (!db.saveEconomicEvent) {
  db.saveEconomicEvent = async function(economicEvent) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO economic_events
        (id, title, currency, impact, actual, forecast, previous, event_time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        economicEvent.id,
        economicEvent.title,
        economicEvent.currency,
        economicEvent.impact,
        economicEvent.actual,
        economicEvent.forecast,
        economicEvent.previous,
        economicEvent.eventTime,
        economicEvent.timestamp
      ])
      
      return true
    } catch (error) {
      this.logger.error('Error saving economic event:', error)
      throw error
    }
  }
}

generateSampleData() 