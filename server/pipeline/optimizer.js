import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import { performance } from 'perf_hooks'
import LRU from 'lru-cache'

export class PipelineOptimizer extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.options = {
      cacheSize: options.cacheSize || 1000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      connectionPoolSize: options.connectionPoolSize || 10,
      batchSize: options.batchSize || 100,
      compressionEnabled: options.compressionEnabled || true,
      ...options
    }
    
    // Performance caches
    this.caches = new Map()
    this.connectionPools = new Map()
    this.circuitBreakers = new Map()
    this.performanceCounters = new Map()
    this.batchQueues = new Map()
    
    // Optimization strategies
    this.optimizations = {
      dataManager: new DataPipelineOptimizer(),
      modelManager: new MLPipelineOptimizer(),
      tradingEngine: new TradingPipelineOptimizer(),
      riskManager: new RiskPipelineOptimizer(),
      databaseManager: new DatabasePipelineOptimizer(),
      metricsCollector: new MonitoringPipelineOptimizer()
    }
    
    this.isInitialized = false
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Pipeline Optimizer')
      
      // Initialize caches
      this.initializeCaches()
      
      // Initialize connection pools
      this.initializeConnectionPools()
      
      // Initialize circuit breakers
      this.initializeCircuitBreakers()
      
      // Initialize batch processing
      this.initializeBatchProcessing()
      
      // Start performance monitoring
      this.startPerformanceMonitoring()
      
      this.isInitialized = true
      this.logger.info('✅ Pipeline Optimizer initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('❌ Failed to initialize Pipeline Optimizer:', error)
      throw error
    }
  }

  initializeCaches() {
    const cacheConfigs = {
      'price_data': { max: 10000, ttl: 5 * 60 * 1000 }, // 5 minutes
      'indicators': { max: 5000, ttl: 30 * 1000 },      // 30 seconds
      'predictions': { max: 1000, ttl: 60 * 1000 },     // 1 minute
      'risk_validation': { max: 2000, ttl: 10 * 1000 }, // 10 seconds
      'ohlcv_data': { max: 50000, ttl: 60 * 60 * 1000 }, // 1 hour
      'model_features': { max: 3000, ttl: 5 * 60 * 1000 } // 5 minutes
    }
    
    for (const [name, config] of Object.entries(cacheConfigs)) {
      this.caches.set(name, new LRU(config))
    }
    
    this.logger.info(`🗄️ Initialized ${this.caches.size} performance caches`)
  }

  initializeConnectionPools() {
    const poolConfigs = {
      'database': { min: 2, max: 10, acquireTimeoutMillis: 30000 },
      'zmq': { min: 1, max: 5, acquireTimeoutMillis: 10000 },
      'exchange': { min: 1, max: 3, acquireTimeoutMillis: 15000 }
    }
    
    for (const [name, config] of Object.entries(poolConfigs)) {
      this.connectionPools.set(name, new ConnectionPool(config))
    }
    
    this.logger.info(`🔌 Initialized ${this.connectionPools.size} connection pools`)
  }

  initializeCircuitBreakers() {
    const breakerConfigs = {
      'data_fetch': { threshold: 5, timeout: 30000 },
      'model_prediction': { threshold: 3, timeout: 60000 },
      'order_execution': { threshold: 2, timeout: 120000 },
      'risk_validation': { threshold: 10, timeout: 15000 },
      'database_query': { threshold: 8, timeout: 45000 }
    }
    
    for (const [name, config] of Object.entries(breakerConfigs)) {
      this.circuitBreakers.set(name, new CircuitBreaker(config))
    }
    
    this.logger.info(`⚡ Initialized ${this.circuitBreakers.size} circuit breakers`)
  }

  initializeBatchProcessing() {
    const batchConfigs = {
      'database_writes': { size: 100, timeout: 1000 },
      'metric_updates': { size: 50, timeout: 500 },
      'indicator_calculations': { size: 10, timeout: 2000 }
    }
    
    for (const [name, config] of Object.entries(batchConfigs)) {
      this.batchQueues.set(name, new BatchQueue(config))
    }
    
    this.logger.info(`📦 Initialized ${this.batchQueues.size} batch processors`)
  }

  startPerformanceMonitoring() {
    // Monitor cache performance
    setInterval(() => {
      this.monitorCachePerformance()
    }, 30 * 1000)
    
    // Monitor circuit breaker states
    setInterval(() => {
      this.monitorCircuitBreakers()
    }, 15 * 1000)
    
    // Cleanup expired entries
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 5 * 60 * 1000)
  }

  // Cache operations
  async getCached(cacheName, key, fallbackFn) {
    const cache = this.caches.get(cacheName)
    if (!cache) return fallbackFn()
    
    const cached = cache.get(key)
    if (cached) {
      this.incrementCounter(`cache_hit_${cacheName}`)
      return cached
    }
    
    this.incrementCounter(`cache_miss_${cacheName}`)
    const result = await fallbackFn()
    cache.set(key, result)
    return result
  }

  setCached(cacheName, key, value, ttl) {
    const cache = this.caches.get(cacheName)
    if (cache) {
      cache.set(key, value, ttl)
    }
  }

  invalidateCache(cacheName, key) {
    const cache = this.caches.get(cacheName)
    if (cache) {
      if (key) {
        cache.del(key)
      } else {
        cache.clear()
      }
    }
  }

  // Circuit breaker operations
  async withCircuitBreaker(breakerName, operation) {
    const breaker = this.circuitBreakers.get(breakerName)
    if (!breaker) return operation()
    
    return breaker.execute(operation)
  }

  // Retry mechanism
  async withRetry(operation, attempts = this.options.retryAttempts) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === attempts - 1) throw error
        
        const delay = this.options.retryDelay * Math.pow(2, i) // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Batch processing
  async addToBatch(batchName, item) {
    const batch = this.batchQueues.get(batchName)
    if (batch) {
      await batch.add(item)
    }
  }

  // Performance monitoring
  incrementCounter(name) {
    const current = this.performanceCounters.get(name) || 0
    this.performanceCounters.set(name, current + 1)
  }

  monitorCachePerformance() {
    for (const [name, cache] of this.caches) {
      const stats = {
        size: cache.size,
        hitRate: this.calculateHitRate(name)
      }
      
      this.emit('cache_performance', { name, stats })
    }
  }

  calculateHitRate(cacheName) {
    const hits = this.performanceCounters.get(`cache_hit_${cacheName}`) || 0
    const misses = this.performanceCounters.get(`cache_miss_${cacheName}`) || 0
    const total = hits + misses
    
    return total > 0 ? (hits / total) * 100 : 0
  }

  monitorCircuitBreakers() {
    for (const [name, breaker] of this.circuitBreakers) {
      const stats = breaker.getStats()
      if (stats.state === 'OPEN') {
        this.logger.warn(`⚠️ Circuit breaker ${name} is OPEN`)
      }
      this.emit('circuit_breaker_stats', { name, stats })
    }
  }

  cleanupExpiredEntries() {
    // LRU cache handles TTL automatically
    // This is for additional cleanup if needed
    this.emit('cleanup_completed')
  }

  // Apply optimizations to components
  optimizeDataManager(dataManager) {
    return this.optimizations.dataManager.apply(dataManager, this)
  }

  optimizeModelManager(modelManager) {
    return this.optimizations.modelManager.apply(modelManager, this)
  }

  optimizeTradingEngine(tradingEngine) {
    return this.optimizations.tradingEngine.apply(tradingEngine, this)
  }

  optimizeRiskManager(riskManager) {
    return this.optimizations.riskManager.apply(riskManager, this)
  }

  optimizeDatabaseManager(databaseManager) {
    return this.optimizations.databaseManager.apply(databaseManager, this)
  }

  optimizeMetricsCollector(metricsCollector) {
    return this.optimizations.metricsCollector.apply(metricsCollector, this)
  }

  getOptimizationReport() {
    const cacheStats = new Map()
    for (const [name, cache] of this.caches) {
      cacheStats.set(name, {
        size: cache.size,
        hitRate: this.calculateHitRate(name)
      })
    }
    
    const circuitBreakerStats = new Map()
    for (const [name, breaker] of this.circuitBreakers) {
      circuitBreakerStats.set(name, breaker.getStats())
    }
    
    return {
      caches: Object.fromEntries(cacheStats),
      circuitBreakers: Object.fromEntries(circuitBreakerStats),
      performanceCounters: Object.fromEntries(this.performanceCounters),
      connectionPools: Object.fromEntries(
        Array.from(this.connectionPools.entries()).map(([name, pool]) => [name, pool.getStats()])
      )
    }
  }
}

// Individual pipeline optimizers
class DataPipelineOptimizer {
  apply(dataManager, optimizer) {
    // Cache price data
    const originalGetLatestPrice = dataManager.getLatestPrice.bind(dataManager)
    dataManager.getLatestPrice = async (symbol) => {
      return optimizer.getCached('price_data', symbol, () => originalGetLatestPrice(symbol))
    }
    
    // Cache indicators
    const originalGetIndicators = dataManager.getIndicators.bind(dataManager)
    dataManager.getIndicators = async (symbol, timeframe) => {
      const key = `${symbol}_${timeframe}`
      return optimizer.getCached('indicators', key, () => originalGetIndicators(symbol, timeframe))
    }
    
    // Batch indicator calculations
    const originalCalculateIndicators = dataManager.calculateIndicators.bind(dataManager)
    dataManager.calculateIndicators = async (symbol, timeframe) => {
      return optimizer.addToBatch('indicator_calculations', { symbol, timeframe })
    }
    
    // Add circuit breaker to data fetching
    const originalFetchHistoricalData = dataManager.fetchHistoricalData.bind(dataManager)
    dataManager.fetchHistoricalData = async (symbol, timeframe, limit) => {
      return optimizer.withCircuitBreaker('data_fetch', () => 
        optimizer.withRetry(() => originalFetchHistoricalData(symbol, timeframe, limit))
      )
    }
    
    return dataManager
  }
}

class MLPipelineOptimizer {
  apply(modelManager, optimizer) {
    // Cache predictions
    const originalGetPredictions = modelManager.getPredictions.bind(modelManager)
    modelManager.getPredictions = async (symbol, marketData) => {
      const key = `${symbol}_${JSON.stringify(marketData)}`
      return optimizer.getCached('predictions', key, () => originalGetPredictions(symbol, marketData))
    }
    
    // Cache model features
    const originalPrepareInputFeatures = modelManager.prepareInputFeatures.bind(modelManager)
    modelManager.prepareInputFeatures = async (symbol, marketData) => {
      const key = `${symbol}_${JSON.stringify(marketData)}`
      return optimizer.getCached('model_features', key, () => originalPrepareInputFeatures(symbol, marketData))
    }
    
    // Add circuit breaker to model predictions
    const originalModelPredict = modelManager.getPredictions.bind(modelManager)
    modelManager.getPredictions = async (symbol, marketData) => {
      return optimizer.withCircuitBreaker('model_prediction', () => 
        originalModelPredict(symbol, marketData)
      )
    }
    
    return modelManager
  }
}

class TradingPipelineOptimizer {
  apply(tradingEngine, optimizer) {
    // Add circuit breaker to order execution
    const originalExecuteMarketOrder = tradingEngine.executeMarketOrder.bind(tradingEngine)
    tradingEngine.executeMarketOrder = async (signal) => {
      return optimizer.withCircuitBreaker('order_execution', () => 
        optimizer.withRetry(() => originalExecuteMarketOrder(signal))
      )
    }
    
    // Batch position updates
    const originalUpdatePositionPnL = tradingEngine.updatePositionPnL.bind(tradingEngine)
    tradingEngine.updatePositionPnL = async (priceData) => {
      return optimizer.addToBatch('position_updates', priceData)
    }
    
    return tradingEngine
  }
}

class RiskPipelineOptimizer {
  apply(riskManager, optimizer) {
    // Cache risk validations
    const originalValidateSignal = riskManager.validateSignal.bind(riskManager)
    riskManager.validateSignal = async (signal) => {
      const key = `${signal.symbol}_${signal.action}_${signal.confidence}`
      return optimizer.getCached('risk_validation', key, () => originalValidateSignal(signal))
    }
    
    // Add circuit breaker to risk checks
    const originalPerformRiskCheck = riskManager.performRiskCheck.bind(riskManager)
    riskManager.performRiskCheck = async () => {
      return optimizer.withCircuitBreaker('risk_validation', () => originalPerformRiskCheck())
    }
    
    return riskManager
  }
}

class DatabasePipelineOptimizer {
  apply(databaseManager, optimizer) {
    // Cache OHLCV data
    const originalGetOHLCVData = databaseManager.getOHLCVData.bind(databaseManager)
    databaseManager.getOHLCVData = async (symbol, timeframe, limit) => {
      const key = `${symbol}_${timeframe}_${limit}`
      return optimizer.getCached('ohlcv_data', key, () => originalGetOHLCVData(symbol, timeframe, limit))
    }
    
    // Batch database writes
    const originalSaveOHLCVData = databaseManager.saveOHLCVData.bind(databaseManager)
    databaseManager.saveOHLCVData = async (symbol, timeframe, ohlcvData) => {
      return optimizer.addToBatch('database_writes', { symbol, timeframe, ohlcvData })
    }
    
    // Add circuit breaker to database operations
    const originalQuery = databaseManager.db?.all?.bind(databaseManager.db)
    if (originalQuery) {
      databaseManager.db.all = async (sql, params) => {
        return optimizer.withCircuitBreaker('database_query', () => 
          optimizer.withRetry(() => originalQuery(sql, params))
        )
      }
    }
    
    return databaseManager
  }
}

class MonitoringPipelineOptimizer {
  apply(metricsCollector, optimizer) {
    // Batch metric updates
    const originalIncrementCounter = metricsCollector.incrementCounter.bind(metricsCollector)
    metricsCollector.incrementCounter = async (name, value) => {
      return optimizer.addToBatch('metric_updates', { type: 'counter', name, value })
    }
    
    const originalRecordGauge = metricsCollector.recordGauge.bind(metricsCollector)
    metricsCollector.recordGauge = async (name, value) => {
      return optimizer.addToBatch('metric_updates', { type: 'gauge', name, value })
    }
    
    return metricsCollector
  }
}

// Supporting classes
class ConnectionPool {
  constructor(config) {
    this.config = config
    this.connections = []
    this.available = []
    this.pending = []
    this.stats = { created: 0, acquired: 0, released: 0, errors: 0 }
  }

  async acquire() {
    if (this.available.length > 0) {
      const connection = this.available.pop()
      this.stats.acquired++
      return connection
    }
    
    if (this.connections.length < this.config.max) {
      const connection = await this.createConnection()
      this.connections.push(connection)
      this.stats.created++
      this.stats.acquired++
      return connection
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection acquisition timeout'))
      }, this.config.acquireTimeoutMillis)
      
      this.pending.push({ resolve, reject, timeout })
    })
  }

  release(connection) {
    this.available.push(connection)
    this.stats.released++
    
    if (this.pending.length > 0) {
      const { resolve, reject, timeout } = this.pending.shift()
      clearTimeout(timeout)
      const nextConnection = this.available.pop()
      resolve(nextConnection)
    }
  }

  async createConnection() {
    // Override in subclasses
    return { id: Date.now() }
  }

  getStats() {
    return {
      total: this.connections.length,
      available: this.available.length,
      pending: this.pending.length,
      stats: this.stats
    }
  }
}

class CircuitBreaker {
  constructor(config) {
    this.config = config
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailureTime = null
    this.stats = { attempts: 0, successes: 0, failures: 0, state: 'CLOSED' }
  }

  async execute(operation) {
    this.stats.attempts++
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'HALF_OPEN'
        this.stats.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
    this.stats.successes++
    this.stats.state = 'CLOSED'
  }

  onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    this.stats.failures++
    
    if (this.failures >= this.config.threshold) {
      this.state = 'OPEN'
      this.stats.state = 'OPEN'
    }
  }

  getStats() {
    return { ...this.stats, failures: this.failures }
  }
}

class BatchQueue {
  constructor(config) {
    this.config = config
    this.queue = []
    this.processing = false
    this.timer = null
  }

  async add(item) {
    this.queue.push(item)
    
    if (this.queue.length >= this.config.size) {
      await this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.config.timeout)
    }
  }

  async flush() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    const batch = this.queue.splice(0, this.config.size)
    
    try {
      await this.processBatch(batch)
    } catch (error) {
      console.error('Batch processing error:', error)
    }
    
    this.processing = false
    
    if (this.queue.length > 0) {
      setImmediate(() => this.flush())
    }
  }

  async processBatch(batch) {
    // Override in subclasses
    console.log(`Processing batch of ${batch.length} items`)
  }
}

// Exports handled at top of file with class definitions