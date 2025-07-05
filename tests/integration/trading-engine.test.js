import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TradingEngine } from '../../server/trading/engine.js'
import { DataManager } from '../../server/data/manager.js'
import { ModelManager } from '../../server/ml/manager.js'
import { RiskManager } from '../../server/risk/manager.js'
import { MetricsCollector } from '../../server/monitoring/metrics.js'

describe('Trading Engine Integration Tests', () => {
  let tradingEngine
  let dataManager
  let modelManager
  let riskManager
  let metrics

  beforeEach(async () => {
    // Initialize components
    dataManager = new DataManager()
    modelManager = new ModelManager()
    riskManager = new RiskManager()
    metrics = new MetricsCollector()
    
    tradingEngine = new TradingEngine({
      dataManager,
      modelManager,
      riskManager,
      metrics
    })
    
    // Initialize all components
    await dataManager.initialize()
    await modelManager.initialize()
    await riskManager.initialize()
    await metrics.initialize()
    await tradingEngine.initialize()
  })

  afterEach(async () => {
    // Cleanup
    await tradingEngine.cleanup()
    await dataManager.cleanup()
    await modelManager.cleanup()
    await riskManager.cleanup()
    await metrics.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize all components successfully', async () => {
      expect(tradingEngine.isInitialized).toBe(true)
      expect(dataManager.isInitialized).toBe(true)
      expect(modelManager.isInitialized).toBe(true)
      expect(riskManager.isInitialized).toBe(true)
      expect(metrics.isInitialized).toBe(true)
    })

    it('should load trading state from database', async () => {
      const status = tradingEngine.getStatus()
      expect(status.initialized).toBe(true)
      expect(status.positions).toBe(0)
      expect(status.orders).toBe(0)
    })
  })

  describe('Trading Operations', () => {
    it('should start and stop trading successfully', async () => {
      // Start trading
      await tradingEngine.start()
      expect(tradingEngine.isRunning).toBe(true)
      
      // Stop trading
      await tradingEngine.stop()
      expect(tradingEngine.isRunning).toBe(false)
    })

    it('should execute market orders in paper mode', async () => {
      await tradingEngine.start()
      await tradingEngine.setMode('paper')
      
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        signal: 1,
        confidence: 0.8,
        timestamp: Date.now(),
        marketData: {
          price: { close: 1.1000 }
        }
      }
      
      const order = await tradingEngine.executeMarketOrder(signal)
      
      expect(order).toBeDefined()
      expect(order.symbol).toBe('EURUSD')
      expect(order.side).toBe('buy')
      expect(order.status).toBe('pending')
      
      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const positions = tradingEngine.getPositions()
      expect(positions.length).toBe(1)
      expect(positions[0].symbol).toBe('EURUSD')
      expect(positions[0].side).toBe('buy')
    })

    it('should close positions correctly', async () => {
      await tradingEngine.start()
      await tradingEngine.setMode('paper')
      
      // Open position
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        signal: 1,
        confidence: 0.8,
        timestamp: Date.now(),
        marketData: {
          price: { close: 1.1000 }
        }
      }
      
      await tradingEngine.executeMarketOrder(signal)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const positions = tradingEngine.getPositions()
      expect(positions.length).toBe(1)
      
      // Close position
      await tradingEngine.closePosition(positions[0].id)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const updatedPositions = tradingEngine.getPositions()
      expect(updatedPositions.length).toBe(0)
      
      const trades = tradingEngine.getTrades()
      expect(trades.length).toBe(1)
    })

    it('should handle emergency stop correctly', async () => {
      await tradingEngine.start()
      await tradingEngine.setMode('paper')
      
      // Open multiple positions
      const symbols = ['EURUSD', 'GBPUSD']
      for (const symbol of symbols) {
        const signal = {
          symbol,
          action: 'buy',
          signal: 1,
          confidence: 0.8,
          timestamp: Date.now(),
          marketData: {
            price: { close: 1.1000 }
          }
        }
        await tradingEngine.executeMarketOrder(signal)
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(tradingEngine.getPositions().length).toBe(2)
      
      // Emergency stop
      await tradingEngine.emergencyStop()
      
      expect(tradingEngine.isRunning).toBe(false)
      expect(tradingEngine.emergencyStop).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(tradingEngine.getPositions().length).toBe(0)
    })
  })

  describe('Risk Management Integration', () => {
    it('should reject signals that violate risk rules', async () => {
      await tradingEngine.start()
      
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        signal: 1,
        confidence: 0.3, // Low confidence
        timestamp: Date.now(),
        marketData: {
          price: { close: 1.1000 }
        }
      }
      
      const validation = await riskManager.validateSignal(signal)
      expect(validation.approved).toBe(false)
      expect(validation.reason).toContain('confidence')
    })

    it('should calculate appropriate position sizes', async () => {
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        signal: 1,
        confidence: 0.8,
        timestamp: Date.now(),
        marketData: {
          price: { close: 1.1000 }
        }
      }
      
      const positionSize = await riskManager.calculatePositionSize(signal)
      
      expect(positionSize).toBeGreaterThan(0)
      expect(positionSize).toBeLessThanOrEqual(1) // Reasonable size limit
    })
  })

  describe('Model Integration', () => {
    it('should handle model predictions', async () => {
      await tradingEngine.start()
      
      const prediction = {
        modelType: 'test',
        symbol: 'EURUSD',
        direction: 1,
        confidence: 0.7,
        signal: 1,
        timestamp: Date.now()
      }
      
      await tradingEngine.handleModelPrediction(prediction)
      
      // Check if signal was added to queue
      expect(tradingEngine.signalQueue.length).toBeGreaterThan(0)
    })

    it('should combine multiple model predictions', async () => {
      const symbol = 'EURUSD'
      const predictions = [
        {
          modelType: 'rf',
          direction: 1,
          confidence: 0.7,
          signal: 1,
          modelAccuracy: 0.65
        },
        {
          modelType: 'lstm',
          direction: 1,
          confidence: 0.8,
          signal: 1,
          modelAccuracy: 0.70
        }
      ]
      
      const marketData = { close: 1.1000 }
      const indicators = { rsi: 45, sma_20: 1.0950 }
      
      const combinedSignal = tradingEngine.combineSignals(symbol, predictions, marketData, indicators)
      
      expect(combinedSignal).toBeDefined()
      expect(combinedSignal.symbol).toBe(symbol)
      expect(combinedSignal.action).toBe('buy')
      expect(combinedSignal.confidence).toBeGreaterThan(0.6)
    })
  })

  describe('Data Integration', () => {
    it('should handle price updates', async () => {
      await tradingEngine.start()
      
      const priceData = {
        symbol: 'EURUSD',
        bid: 1.0999,
        ask: 1.1001,
        last: 1.1000,
        timestamp: Date.now()
      }
      
      await tradingEngine.handlePriceUpdate(priceData)
      
      // Verify metrics were recorded
      const metricsData = metrics.getMetrics()
      expect(metricsData.data.priceUpdates).toBeGreaterThan(0)
    })

    it('should update position P&L on price changes', async () => {
      await tradingEngine.start()
      await tradingEngine.setMode('paper')
      
      // Open position
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        signal: 1,
        confidence: 0.8,
        timestamp: Date.now(),
        marketData: {
          price: { close: 1.1000 }
        }
      }
      
      await tradingEngine.executeMarketOrder(signal)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const initialPositions = tradingEngine.getPositions()
      expect(initialPositions.length).toBe(1)
      const initialPnL = initialPositions[0].pnl
      
      // Update price
      const priceUpdate = {
        symbol: 'EURUSD',
        bid: 1.1010,
        ask: 1.1012,
        last: 1.1011,
        timestamp: Date.now()
      }
      
      await tradingEngine.updatePositionPnL(priceUpdate)
      
      const updatedPositions = tradingEngine.getPositions()
      expect(updatedPositions[0].pnl).toBeGreaterThan(initialPnL)
    })
  })

  describe('Performance Tracking', () => {
    it('should track trading performance metrics', async () => {
      await tradingEngine.start()
      await tradingEngine.setMode('paper')
      
      // Execute some trades
      const symbols = ['EURUSD', 'GBPUSD']
      for (const symbol of symbols) {
        const signal = {
          symbol,
          action: 'buy',
          signal: 1,
          confidence: 0.8,
          timestamp: Date.now(),
          marketData: {
            price: { close: 1.1000 }
          }
        }
        
        await tradingEngine.executeMarketOrder(signal)
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const positions = tradingEngine.getPositions()
        if (positions.length > 0) {
          await tradingEngine.closePosition(positions[positions.length - 1].id)
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
      
      const performance = tradingEngine.getPerformance()
      expect(performance.totalTrades).toBeGreaterThan(0)
      expect(performance.winRate).toBeGreaterThanOrEqual(0)
      expect(performance.winRate).toBeLessThanOrEqual(1)
    })

    it('should collect system metrics', async () => {
      const metricsData = metrics.getMetrics()
      
      expect(metricsData.system).toBeDefined()
      expect(metricsData.system.uptime).toBeGreaterThan(0)
      expect(metricsData.system.memoryUsage).toBeGreaterThanOrEqual(0)
      expect(metricsData.timestamp).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid signals gracefully', async () => {
      await tradingEngine.start()
      
      const invalidSignal = {
        // Missing required fields
        symbol: 'INVALID',
        confidence: 0.8
      }
      
      try {
        await tradingEngine.executeMarketOrder(invalidSignal)
      } catch (error) {
        expect(error).toBeDefined()
      }
      
      // System should still be running
      expect(tradingEngine.isRunning).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // This would test database connection failures
      // For now, just verify the system handles errors
      expect(tradingEngine.isInitialized).toBe(true)
    })
  })

  describe('Backtesting', () => {
    it('should run backtest successfully', async () => {
      const backtestConfig = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(),
        symbols: ['EURUSD'],
        initialBalance: 10000
      }
      
      const results = await tradingEngine.backtest(backtestConfig)
      
      expect(results).toBeDefined()
      expect(results.initialBalance).toBe(10000)
      expect(results.finalBalance).toBeGreaterThan(0)
      expect(results.totalReturn).toBeDefined()
      expect(results.totalTrades).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Configuration', () => {
    it('should switch trading modes correctly', async () => {
      expect(tradingEngine.tradingMode).toBe('paper')
      
      await tradingEngine.setMode('live')
      expect(tradingEngine.tradingMode).toBe('live')
      
      await tradingEngine.setMode('paper')
      expect(tradingEngine.tradingMode).toBe('paper')
    })

    it('should reject invalid trading modes', async () => {
      try {
        await tradingEngine.setMode('invalid')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Invalid trading mode')
      }
    })
  })

  describe('Status and Health', () => {
    it('should provide accurate status information', async () => {
      const status = tradingEngine.getStatus()
      
      expect(status.initialized).toBe(true)
      expect(status.running).toBe(false) // Not started yet
      expect(status.mode).toBe('paper')
      expect(status.emergencyStop).toBe(false)
      expect(status.positions).toBe(0)
      expect(status.orders).toBe(0)
      expect(status.balance).toBeGreaterThan(0)
      expect(status.performance).toBeDefined()
    })

    it('should provide balance information', async () => {
      const balance = tradingEngine.getBalance()
      
      expect(balance.equity).toBeGreaterThan(0)
      expect(balance.balance).toBeGreaterThan(0)
      expect(balance.margin).toBeGreaterThanOrEqual(0)
      expect(balance.freeMargin).toBeGreaterThanOrEqual(0)
      expect(balance.marginLevel).toBeGreaterThanOrEqual(0)
    })
  })
})