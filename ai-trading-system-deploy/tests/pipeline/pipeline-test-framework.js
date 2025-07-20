import { EventEmitter } from 'events'
import { Logger } from '../../server/utils/logger.js'
import { performance } from 'perf_hooks'

export class PipelineTestFramework extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.testResults = new Map()
    this.performanceMetrics = new Map()
    this.currentTest = null
    this.testStartTime = null
    this.healthChecks = new Map()
    
    // Test configurations
    this.testConfigs = {
      data: {
        maxLatency: 100,
        maxMemoryUsage: 100, // MB
        minThroughput: 10,   // updates per second
        mockDataSize: 1000
      },
      ml: {
        maxTrainingTime: 30000, // 30 seconds
        minAccuracy: 0.5,
        maxPredictionLatency: 50,
        testDataSize: 100
      },
      trading: {
        maxOrderLatency: 100,
        maxPositionUpdateLatency: 50,
        minRiskCheckSpeed: 10,
        testOrderCount: 50
      },
      risk: {
        maxValidationTime: 10,
        minRiskAccuracy: 0.95,
        testSignalCount: 100
      },
      database: {
        maxQueryTime: 100,
        maxWriteTime: 50,
        testRecordCount: 1000
      },
      monitoring: {
        maxMetricLatency: 10,
        testMetricCount: 100
      }
    }
  }

  async runAllTests() {
    try {
      this.logger.info('🧪 Starting comprehensive pipeline tests')
      
      const startTime = performance.now()
      const testSuite = [
        { name: 'Database Pipeline', test: this.testDatabasePipeline.bind(this) },
        { name: 'Data Pipeline', test: this.testDataPipeline.bind(this) },
        { name: 'ML Pipeline', test: this.testMLPipeline.bind(this) },
        { name: 'Risk Pipeline', test: this.testRiskPipeline.bind(this) },
        { name: 'Trading Pipeline', test: this.testTradingPipeline.bind(this) },
        { name: 'Monitoring Pipeline', test: this.testMonitoringPipeline.bind(this) },
        { name: 'Integration Tests', test: this.testIntegration.bind(this) }
      ]
      
      const results = []
      
      for (const testCase of testSuite) {
        this.logger.info(`🔍 Testing ${testCase.name}...`)
        
        try {
          const result = await this.runTest(testCase.name, testCase.test)
          results.push(result)
          
          if (result.passed) {
            this.logger.info(`✅ ${testCase.name} PASSED`)
          } else {
            this.logger.error(`❌ ${testCase.name} FAILED: ${result.error}`)
          }
        } catch (error) {
          this.logger.error(`💥 ${testCase.name} CRASHED: ${error.message}`)
          results.push({
            name: testCase.name,
            passed: false,
            error: error.message,
            performance: null
          })
        }
      }
      
      const totalTime = performance.now() - startTime
      const summary = this.generateTestSummary(results, totalTime)
      
      this.logger.info('📊 Test Summary:')
      this.logger.info(summary)
      
      return {
        summary,
        results,
        totalTime,
        passed: results.every(r => r.passed)
      }
    } catch (error) {
      this.logger.error('Error running pipeline tests:', error)
      throw error
    }
  }

  async runTest(testName, testFunction) {
    this.currentTest = testName
    this.testStartTime = performance.now()
    
    const memoryBefore = process.memoryUsage()
    
    try {
      await testFunction()
      
      const endTime = performance.now()
      const duration = endTime - this.testStartTime
      const memoryAfter = process.memoryUsage()
      
      const performance = {
        duration,
        memoryUsed: (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024, // MB
        memoryPeak: memoryAfter.heapUsed / 1024 / 1024 // MB
      }
      
      this.performanceMetrics.set(testName, performance)
      
      return {
        name: testName,
        passed: true,
        performance,
        error: null
      }
    } catch (error) {
      return {
        name: testName,
        passed: false,
        error: error.message,
        performance: null
      }
    }
  }

  async testDatabasePipeline() {
    const { DatabaseManager } = await import('../../server/database/manager.js')
    const db = new DatabaseManager({ filename: 'test.db' })
    
    await db.initialize()
    
    // Test write performance
    const writeStart = performance.now()
    const testData = this.generateTestOHLCVData(this.testConfigs.database.testRecordCount)
    
    await db.saveOHLCVData('EURUSD', '1m', testData)
    const writeTime = performance.now() - writeStart
    
    this.assert(writeTime < this.testConfigs.database.maxWriteTime, 
      `Write time ${writeTime}ms exceeds limit ${this.testConfigs.database.maxWriteTime}ms`)
    
    // Test read performance
    const readStart = performance.now()
    const readData = await db.getOHLCVData('EURUSD', '1m', this.testConfigs.database.testRecordCount)
    const readTime = performance.now() - readStart
    
    this.assert(readTime < this.testConfigs.database.maxQueryTime,
      `Read time ${readTime}ms exceeds limit ${this.testConfigs.database.maxQueryTime}ms`)
    
    this.assert(readData.length === testData.length, 'Data integrity check failed')
    
    // Test concurrent operations
    const concurrentOps = Array.from({ length: 10 }, (_, i) => 
      db.getOHLCVData('EURUSD', '1m', 100)
    )
    
    await Promise.all(concurrentOps)
    
    // Test health check
    const health = await db.healthCheck()
    this.assert(health.status === 'healthy', 'Database health check failed')
    
    await db.cleanup()
  }

  async testDataPipeline() {
    const { DataManager } = await import('../../server/data/manager.js')
    const dataManager = new DataManager()
    
    await dataManager.initialize()
    
    // Test data fetching
    const fetchStart = performance.now()
    await dataManager.fetchHistoricalData('EURUSD', '1m', 100)
    const fetchTime = performance.now() - fetchStart
    
    this.assert(fetchTime < this.testConfigs.data.maxLatency,
      `Data fetch time ${fetchTime}ms exceeds limit`)
    
    // Test real-time updates
    let updateCount = 0
    const updatePromise = new Promise((resolve) => {
      dataManager.on('price_update', () => {
        updateCount++
        if (updateCount >= 10) resolve()
      })
    })
    
    dataManager.startRealTimeFeeds()
    await Promise.race([updatePromise, new Promise(resolve => setTimeout(resolve, 5000))])
    
    this.assert(updateCount >= 5, 'Insufficient real-time updates')
    
    // Test indicator calculations
    const indicators = dataManager.getIndicators('EURUSD', '1m')
    this.assert(indicators && indicators.indicators, 'Indicators not calculated')
    
    // Test memory usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
    this.assert(memoryUsage < this.testConfigs.data.maxMemoryUsage,
      `Memory usage ${memoryUsage}MB exceeds limit`)
    
    await dataManager.cleanup()
  }

  async testMLPipeline() {
    const { ModelManager } = await import('../../server/ml/manager.js')
    const modelManager = new ModelManager()
    
    await modelManager.initialize()
    
    // Test training data preparation
    const trainingStart = performance.now()
    const trainingData = await modelManager.prepareTrainingData('randomforest')
    const trainingTime = performance.now() - trainingStart
    
    this.assert(trainingData && trainingData.length > 0, 'Training data preparation failed')
    this.assert(trainingTime < this.testConfigs.ml.maxTrainingTime,
      `Training data preparation time ${trainingTime}ms exceeds limit`)
    
    // Test prediction performance
    const predictionStart = performance.now()
    const predictions = await modelManager.getPredictions('EURUSD', {
      price: { close: 1.1000, bid: 1.0999, ask: 1.1001 },
      indicators: { rsi_14: [50], sma_20: [1.1000] }
    })
    const predictionTime = performance.now() - predictionStart
    
    this.assert(predictionTime < this.testConfigs.ml.maxPredictionLatency,
      `Prediction time ${predictionTime}ms exceeds limit`)
    
    // Test model performance
    const modelStatus = modelManager.getModelStatus()
    this.assert(modelStatus.activeModels > 0, 'No active models available')
    
    await modelManager.cleanup()
  }

  async testRiskPipeline() {
    const { RiskManager } = await import('../../server/risk/manager.js')
    const riskManager = new RiskManager()
    
    await riskManager.initialize()
    
    // Test signal validation performance
    const validationStart = performance.now()
    const testSignals = this.generateTestSignals(this.testConfigs.risk.testSignalCount)
    
    let validationCount = 0
    for (const signal of testSignals) {
      const validation = await riskManager.validateSignal(signal)
      if (validation.approved !== undefined) validationCount++
    }
    
    const validationTime = performance.now() - validationStart
    const avgValidationTime = validationTime / testSignals.length
    
    this.assert(avgValidationTime < this.testConfigs.risk.maxValidationTime,
      `Average validation time ${avgValidationTime}ms exceeds limit`)
    
    this.assert(validationCount === testSignals.length, 'Signal validation failed')
    
    // Test position sizing
    const positionSize = await riskManager.calculatePositionSize({
      symbol: 'EURUSD',
      confidence: 0.8,
      direction: 'buy'
    })
    
    this.assert(positionSize > 0, 'Position size calculation failed')
    
    // Test risk monitoring
    await riskManager.performRiskCheck()
    const riskState = riskManager.getCurrentRiskState()
    this.assert(riskState !== null, 'Risk state monitoring failed')
    
    await riskManager.cleanup()
  }

  async testTradingPipeline() {
    const { TradingEngine } = await import('../../server/trading/engine.js')
    const tradingEngine = new TradingEngine()
    
    await tradingEngine.initialize()
    
    // Test order processing
    const orderStart = performance.now()
    const testOrders = this.generateTestOrders(this.testConfigs.trading.testOrderCount)
    
    let processedOrders = 0
    for (const order of testOrders) {
      tradingEngine.signalQueue.push(order)
      processedOrders++
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const orderTime = performance.now() - orderStart
    const avgOrderTime = orderTime / testOrders.length
    
    this.assert(avgOrderTime < this.testConfigs.trading.maxOrderLatency,
      `Average order processing time ${avgOrderTime}ms exceeds limit`)
    
    // Test position management
    const positions = tradingEngine.getPositions()
    this.assert(positions !== null, 'Position management failed')
    
    // Test performance tracking
    const performance = tradingEngine.getPerformance()
    this.assert(performance !== null, 'Performance tracking failed')
    
    await tradingEngine.cleanup()
  }

  async testMonitoringPipeline() {
    const { MetricsCollector } = await import('../../server/monitoring/metrics.js')
    const metrics = new MetricsCollector()
    
    await metrics.initialize()
    
    // Test metrics collection performance
    const metricsStart = performance.now()
    
    for (let i = 0; i < this.testConfigs.monitoring.testMetricCount; i++) {
      metrics.incrementCounter('test_counter')
      metrics.recordGauge('test_gauge', Math.random())
      metrics.recordHistogram('test_histogram', Math.random() * 100)
    }
    
    const metricsTime = performance.now() - metricsStart
    const avgMetricTime = metricsTime / (this.testConfigs.monitoring.testMetricCount * 3)
    
    this.assert(avgMetricTime < this.testConfigs.monitoring.maxMetricLatency,
      `Average metric collection time ${avgMetricTime}ms exceeds limit`)
    
    // Test metrics export
    const exportedMetrics = metrics.getMetrics()
    this.assert(exportedMetrics.counters.test_counter > 0, 'Counter metrics failed')
    
    const prometheus = metrics.exportPrometheus()
    this.assert(prometheus.includes('test_counter'), 'Prometheus export failed')
    
    await metrics.cleanup()
  }

  async testIntegration() {
    // Test end-to-end pipeline integration
    const { DatabaseManager } = await import('../../server/database/manager.js')
    const { DataManager } = await import('../../server/data/manager.js')
    const { ModelManager } = await import('../../server/ml/manager.js')
    const { RiskManager } = await import('../../server/risk/manager.js')
    const { TradingEngine } = await import('../../server/trading/engine.js')
    
    const db = new DatabaseManager({ filename: 'integration_test.db' })
    const dataManager = new DataManager()
    const modelManager = new ModelManager()
    const riskManager = new RiskManager()
    const tradingEngine = new TradingEngine({
      dataManager,
      modelManager,
      riskManager
    })
    
    // Initialize all components
    await db.initialize()
    await dataManager.initialize()
    await modelManager.initialize()
    await riskManager.initialize()
    await tradingEngine.initialize()
    
    // Test data flow
    const integrationStart = performance.now()
    
    // 1. Data flows to ML pipeline
    dataManager.emit('price_update', {
      symbol: 'EURUSD',
      bid: 1.0999,
      ask: 1.1001,
      close: 1.1000,
      timestamp: Date.now()
    })
    
    // 2. ML generates predictions
    const predictions = await modelManager.getPredictions('EURUSD', {
      price: { close: 1.1000, bid: 1.0999, ask: 1.1001 },
      indicators: { rsi_14: [50] }
    })
    
    // 3. Risk validates signals
    if (predictions && predictions.length > 0) {
      const validation = await riskManager.validateSignal({
        symbol: 'EURUSD',
        action: 'buy',
        confidence: 0.7
      })
      
      this.assert(validation.approved !== undefined, 'Risk validation integration failed')
    }
    
    // 4. Trading engine processes signals
    tradingEngine.signalQueue.push({
      symbol: 'EURUSD',
      action: 'buy',
      confidence: 0.7,
      marketData: { close: 1.1000 }
    })
    
    const integrationTime = performance.now() - integrationStart
    
    this.assert(integrationTime < 5000, 'Integration test took too long')
    
    // Cleanup
    await Promise.all([
      db.cleanup(),
      dataManager.cleanup(),
      modelManager.cleanup(),
      riskManager.cleanup(),
      tradingEngine.cleanup()
    ])
  }

  generateTestOHLCVData(count) {
    const data = []
    const baseTime = Date.now() - (count * 60000)
    
    for (let i = 0; i < count; i++) {
      const timestamp = baseTime + (i * 60000)
      const open = 1.1000 + Math.random() * 0.01
      const high = open + Math.random() * 0.005
      const low = open - Math.random() * 0.005
      const close = low + Math.random() * (high - low)
      const volume = Math.random() * 1000
      
      data.push([timestamp, open, high, low, close, volume])
    }
    
    return data
  }

  generateTestSignals(count) {
    const signals = []
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
    
    for (let i = 0; i < count; i++) {
      signals.push({
        symbol: symbols[i % symbols.length],
        action: i % 2 === 0 ? 'buy' : 'sell',
        confidence: 0.5 + Math.random() * 0.5,
        timestamp: Date.now() + i * 1000
      })
    }
    
    return signals
  }

  generateTestOrders(count) {
    const orders = []
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']
    
    for (let i = 0; i < count; i++) {
      orders.push({
        symbol: symbols[i % symbols.length],
        action: i % 2 === 0 ? 'buy' : 'sell',
        confidence: 0.7,
        marketData: { close: 1.1000 + Math.random() * 0.01 },
        timestamp: Date.now() + i * 100
      })
    }
    
    return orders
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message)
    }
  }

  generateTestSummary(results, totalTime) {
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => r.passed === false).length
    const passRate = (passed / results.length * 100).toFixed(1)
    
    let summary = `
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                                 PIPELINE TEST SUMMARY                                ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║ Total Tests: ${results.length.toString().padEnd(10)} │ Passed: ${passed.toString().padEnd(10)} │ Failed: ${failed.toString().padEnd(10)} │ Pass Rate: ${passRate}%      ║
║ Total Time: ${(totalTime / 1000).toFixed(2)}s        │ Status: ${passed === results.length ? '✅ ALL PASSED' : '❌ SOME FAILED'}                              ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                    DETAILED RESULTS                                  ║
╠══════════════════════════════════════════════════════════════════════════════════════╣`
    
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      const time = result.performance ? `${result.performance.duration.toFixed(2)}ms` : 'N/A'
      const memory = result.performance ? `${result.performance.memoryUsed.toFixed(2)}MB` : 'N/A'
      
      summary += `\n║ ${result.name.padEnd(20)} │ ${status} │ Time: ${time.padEnd(8)} │ Memory: ${memory.padEnd(8)} ║`
      
      if (!result.passed) {
        summary += `\n║ └─ Error: ${result.error.substring(0, 60).padEnd(60)} ║`
      }
    }
    
    summary += `\n╚══════════════════════════════════════════════════════════════════════════════════════╝`
    
    return summary
  }
}

// Performance benchmarking utilities
export class PerformanceBenchmark {
  constructor() {
    this.benchmarks = new Map()
    this.logger = new Logger()
  }

  async benchmark(name, fn, iterations = 1000) {
    const times = []
    const memoryUsage = []
    
    for (let i = 0; i < iterations; i++) {
      const memBefore = process.memoryUsage().heapUsed
      const start = performance.now()
      
      await fn()
      
      const end = performance.now()
      const memAfter = process.memoryUsage().heapUsed
      
      times.push(end - start)
      memoryUsage.push(memAfter - memBefore)
    }
    
    const stats = {
      name,
      iterations,
      times: {
        min: Math.min(...times),
        max: Math.max(...times),
        mean: times.reduce((a, b) => a + b, 0) / times.length,
        median: times.sort()[Math.floor(times.length / 2)],
        p95: times.sort()[Math.floor(times.length * 0.95)],
        p99: times.sort()[Math.floor(times.length * 0.99)]
      },
      memory: {
        min: Math.min(...memoryUsage),
        max: Math.max(...memoryUsage),
        mean: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length
      }
    }
    
    this.benchmarks.set(name, stats)
    return stats
  }

  getReport() {
    const report = []
    
    for (const [name, stats] of this.benchmarks) {
      report.push(`
${name} Benchmark Results:
  Iterations: ${stats.iterations}
  Time (ms): min=${stats.times.min.toFixed(2)}, max=${stats.times.max.toFixed(2)}, mean=${stats.times.mean.toFixed(2)}
  Memory (bytes): min=${stats.memory.min}, max=${stats.memory.max}, mean=${stats.memory.mean.toFixed(0)}
  Percentiles: p95=${stats.times.p95.toFixed(2)}ms, p99=${stats.times.p99.toFixed(2)}ms
      `)
    }
    
    return report.join('\n')
  }
}

export default { PipelineTestFramework, PerformanceBenchmark }