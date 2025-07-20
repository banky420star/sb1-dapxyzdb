import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RiskManager } from '../../server/risk/manager.js'

describe('Risk Manager Unit Tests', () => {
  let riskManager

  beforeEach(async () => {
    riskManager = new RiskManager()
    await riskManager.initialize()
  })

  afterEach(async () => {
    await riskManager.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(riskManager.isInitialized).toBe(true)
      expect(riskManager.config.maxPositions).toBe(10)
      expect(riskManager.config.maxRiskPerTrade).toBe(0.02)
      expect(riskManager.config.maxDailyLoss).toBe(0.05)
    })

    it('should load risk configuration', () => {
      const config = riskManager.getRiskConfiguration()
      expect(config).toBeDefined()
      expect(config.maxPositions).toBeGreaterThan(0)
      expect(config.maxRiskPerTrade).toBeGreaterThan(0)
      expect(config.maxDailyLoss).toBeGreaterThan(0)
    })
  })

  describe('Signal Validation', () => {
    it('should approve valid signals', async () => {
      const validSignal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.8,
        timestamp: Date.now()
      }

      const result = await riskManager.validateSignal(validSignal)
      expect(result.approved).toBe(true)
      expect(result.reason).toBe('Signal approved')
    })

    it('should reject signals with low confidence', async () => {
      const lowConfidenceSignal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.3,
        timestamp: Date.now()
      }

      const result = await riskManager.validateSignal(lowConfidenceSignal)
      expect(result.approved).toBe(false)
      expect(result.reason).toContain('confidence')
    })

    it('should reject signals during weekend', async () => {
      // Mock weekend check
      const originalIsWeekend = riskManager.isWeekend
      riskManager.isWeekend = () => true

      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.8,
        timestamp: Date.now()
      }

      const result = await riskManager.validateSignal(signal)
      expect(result.approved).toBe(false)
      expect(result.reason).toContain('weekend')

      // Restore original method
      riskManager.isWeekend = originalIsWeekend
    })
  })

  describe('Position Sizing', () => {
    it('should calculate position size using Kelly criterion', async () => {
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.8,
        timestamp: Date.now()
      }

      const positionSize = await riskManager.calculatePositionSize(signal)
      
      expect(positionSize).toBeGreaterThan(0)
      expect(positionSize).toBeLessThanOrEqual(1) // Reasonable upper limit
    })

    it('should scale position size by confidence', async () => {
      const highConfidenceSignal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.9,
        timestamp: Date.now()
      }

      const lowConfidenceSignal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.6,
        timestamp: Date.now()
      }

      const highSize = await riskManager.calculatePositionSize(highConfidenceSignal)
      const lowSize = await riskManager.calculatePositionSize(lowConfidenceSignal)

      expect(highSize).toBeGreaterThan(lowSize)
    })

    it('should respect maximum position size limits', async () => {
      const signal = {
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 1.0, // Maximum confidence
        timestamp: Date.now()
      }

      const positionSize = await riskManager.calculatePositionSize(signal)
      const maxAllowed = riskManager.config.maxKellySize * 10000 // Assuming 10k balance

      expect(positionSize).toBeLessThanOrEqual(maxAllowed)
    })
  })

  describe('Position Monitoring', () => {
    it('should check position against risk rules', async () => {
      const position = {
        id: 'test-position',
        symbol: 'EURUSD',
        side: 'buy',
        size: 0.1,
        entryPrice: 1.1000,
        currentPrice: 1.0950, // 50 pips loss
        stopLoss: 1.0980,
        takeProfit: 1.1050,
        timestamp: Date.now() - 60000 // 1 minute ago
      }

      const result = await riskManager.checkPosition(position)
      
      expect(result).toBeDefined()
      expect(result.shouldClose).toBe(true)
      expect(result.reason).toBe('stop_loss')
    })

    it('should trigger take profit', async () => {
      const position = {
        id: 'test-position',
        symbol: 'EURUSD',
        side: 'buy',
        size: 0.1,
        entryPrice: 1.1000,
        currentPrice: 1.1060, // 60 pips profit
        stopLoss: 1.0980,
        takeProfit: 1.1050,
        timestamp: Date.now() - 60000
      }

      const result = await riskManager.checkPosition(position)
      
      expect(result.shouldClose).toBe(true)
      expect(result.reason).toBe('take_profit')
    })

    it('should enforce maximum holding period', async () => {
      const position = {
        id: 'test-position',
        symbol: 'EURUSD',
        side: 'buy',
        size: 0.1,
        entryPrice: 1.1000,
        currentPrice: 1.1010,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      }

      const result = await riskManager.checkPosition(position)
      
      expect(result.shouldClose).toBe(true)
      expect(result.reason).toBe('max_holding_period')
    })
  })

  describe('Correlation Analysis', () => {
    it('should calculate correlation between currency pairs', () => {
      // Add some mock price history
      const eurusdData = Array.from({ length: 100 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000 + Math.sin(i * 0.1) * 0.01,
        1.1000 + Math.sin(i * 0.1) * 0.01 + 0.0005,
        1.1000 + Math.sin(i * 0.1) * 0.01 - 0.0005,
        1.1000 + Math.sin(i * 0.1) * 0.01,
        1000
      ])

      const gbpusdData = Array.from({ length: 100 }, (_, i) => [
        Date.now() - i * 60000,
        1.2500 + Math.sin(i * 0.1 + 0.5) * 0.01,
        1.2500 + Math.sin(i * 0.1 + 0.5) * 0.01 + 0.0005,
        1.2500 + Math.sin(i * 0.1 + 0.5) * 0.01 - 0.0005,
        1.2500 + Math.sin(i * 0.1 + 0.5) * 0.01,
        1000
      ])

      riskManager.priceHistory.set('EURUSD', eurusdData)
      riskManager.priceHistory.set('GBPUSD', gbpusdData)

      const correlation = riskManager.calculateCorrelation('EURUSD', 'GBPUSD')
      
      expect(correlation).toBeGreaterThanOrEqual(-1)
      expect(correlation).toBeLessThanOrEqual(1)
    })

    it('should detect high correlation violations', () => {
      const positions = [
        {
          symbol: 'EURUSD',
          side: 'buy',
          size: 0.1
        },
        {
          symbol: 'GBPUSD',
          side: 'buy',
          size: 0.1
        }
      ]

      // Mock high correlation
      riskManager.correlationMatrix.set('EURUSD_GBPUSD', 0.8)

      const violations = riskManager.checkCorrelationLimits(positions)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0].type).toBe('high_correlation')
    })
  })

  describe('Volatility Analysis', () => {
    it('should calculate volatility from price data', () => {
      const priceData = Array.from({ length: 100 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000,
        1.1000 + Math.random() * 0.01,
        1.1000 - Math.random() * 0.01,
        1.1000 + (Math.random() - 0.5) * 0.01,
        1000
      ])

      const volatility = riskManager.calculateVolatility(priceData)
      
      expect(volatility).toBeGreaterThan(0)
      expect(volatility).toBeLessThan(1) // Should be reasonable
    })

    it('should detect high volatility violations', () => {
      const positions = [
        {
          symbol: 'EURUSD',
          side: 'buy',
          size: 0.1
        }
      ]

      // Mock high volatility
      riskManager.volatilityData.set('EURUSD', 0.1) // 10% volatility

      const violations = riskManager.checkVolatilityLimits(positions)
      
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0].type).toBe('high_volatility')
    })
  })

  describe('News Event Handling', () => {
    it('should create blackout periods for high impact news', () => {
      const newsEvent = {
        id: 'test-news',
        title: 'ECB Rate Decision',
        impact: 'high',
        currencies: ['EUR'],
        timestamp: new Date().toISOString()
      }

      riskManager.addNewsEvent(newsEvent)
      
      expect(riskManager.blackoutPeriods.length).toBeGreaterThan(0)
      expect(riskManager.blackoutPeriods[0].event).toBe(newsEvent.title)
    })

    it('should prevent trading during blackout periods', () => {
      // Add a current blackout period
      riskManager.blackoutPeriods.push({
        event: 'Test Event',
        start: Date.now() - 60000,
        end: Date.now() + 60000,
        currencies: ['EUR']
      })

      const tradingAllowed = riskManager.isTradingAllowed()
      expect(tradingAllowed).toBe(false)
    })
  })

  describe('Risk Configuration', () => {
    it('should update risk configuration', async () => {
      const newConfig = {
        maxPositions: 15,
        maxRiskPerTrade: 0.03
      }

      await riskManager.updateRiskConfiguration(newConfig)
      
      expect(riskManager.config.maxPositions).toBe(15)
      expect(riskManager.config.maxRiskPerTrade).toBe(0.03)
    })

    it('should provide current risk state', () => {
      const riskState = riskManager.getCurrentRiskState()
      
      expect(riskState).toBeDefined()
      expect(riskState.totalExposure).toBeGreaterThanOrEqual(0)
      expect(riskState.dailyPnL).toBeDefined()
      expect(riskState.drawdown).toBeGreaterThanOrEqual(0)
      expect(riskState.openPositions).toBeGreaterThanOrEqual(0)
    })

    it('should provide risk metrics', () => {
      const metrics = riskManager.getRiskMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.totalExposure).toBeGreaterThanOrEqual(0)
      expect(metrics.tradingAllowed).toBeDefined()
      expect(metrics.violations).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Weekend Detection', () => {
    it('should correctly identify weekends', () => {
      // Mock different days
      const originalDate = Date
      
      // Friday 23:00 UTC (weekend)
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super(2024, 0, 5, 23, 0, 0) // Friday
          } else {
            super(...args)
          }
        }
        
        getUTCDay() { return 5 } // Friday
        getUTCHours() { return 23 }
      }
      
      expect(riskManager.isWeekend()).toBe(true)
      
      // Monday 10:00 UTC (not weekend)
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super(2024, 0, 8, 10, 0, 0) // Monday
          } else {
            super(...args)
          }
        }
        
        getUTCDay() { return 1 } // Monday
        getUTCHours() { return 10 }
      }
      
      expect(riskManager.isWeekend()).toBe(false)
      
      // Restore original Date
      global.Date = originalDate
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid position data gracefully', async () => {
      const invalidPosition = {
        // Missing required fields
        id: 'invalid'
      }

      const result = await riskManager.checkPosition(invalidPosition)
      expect(result.shouldClose).toBe(false)
      expect(result.reason).toBe('')
    })

    it('should handle missing price data gracefully', () => {
      const correlation = riskManager.calculateCorrelation('INVALID1', 'INVALID2')
      expect(correlation).toBe(0)
    })

    it('should handle empty volatility data gracefully', () => {
      const volatility = riskManager.calculateVolatility([])
      expect(volatility).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now()
      
      // Generate large price dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => [
        Date.now() - i * 60000,
        1.1000,
        1.1000 + Math.random() * 0.01,
        1.1000 - Math.random() * 0.01,
        1.1000 + (Math.random() - 0.5) * 0.01,
        1000
      ])

      const volatility = riskManager.calculateVolatility(largeDataset)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(volatility).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})