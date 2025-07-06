import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'

export class MetricsCollector extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.isInitialized = false
    
    // Metrics storage
    this.counters = new Map()
    this.gauges = new Map()
    this.histograms = new Map()
    
    // Performance metrics
    this.startTime = Date.now()
    this.requestCount = 0
    this.errorCount = 0
    
    // Trading metrics
    this.tradingMetrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      averageLatency: 0,
      zmqMessages: {
        sent: 0,
        received: 0,
        errors: 0
      }
    }
    
    // System metrics
    this.systemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkIO: 0
    }
  }

  async initialize() {
    try {
      this.logger.info('Initializing Metrics Collector')
      
      // Start metrics collection
      this.startMetricsCollection()
      
      this.isInitialized = true
      this.logger.info('Metrics Collector initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Metrics Collector:', error)
      throw error
    }
  }

  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics()
    }, 30 * 1000)
  }

  collectSystemMetrics() {
    try {
      // Get memory usage
      const memUsage = process.memoryUsage()
      this.systemMetrics.memoryUsage = memUsage.heapUsed / 1024 / 1024 // MB
      
      // Get CPU usage
      const cpuUsage = process.cpuUsage()
      this.systemMetrics.cpuUsage = cpuUsage.user + cpuUsage.system
      
      // Record as gauge
      this.recordGauge('system_memory_mb', this.systemMetrics.memoryUsage)
      this.recordGauge('system_cpu_usage', this.systemMetrics.cpuUsage)
      
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error)
    }
  }

  // Counter methods
  incrementCounter(name, value = 1) {
    const current = this.counters.get(name) || 0
    this.counters.set(name, current + value)
    this.emit('counter_incremented', { name, value, total: current + value })
  }

  decrementCounter(name, value = 1) {
    const current = this.counters.get(name) || 0
    this.counters.set(name, Math.max(0, current - value))
    this.emit('counter_decremented', { name, value, total: current - value })
  }

  getCounter(name) {
    return this.counters.get(name) || 0
  }

  // Gauge methods
  recordGauge(name, value) {
    this.gauges.set(name, value)
    this.emit('gauge_recorded', { name, value })
  }

  getGauge(name) {
    return this.gauges.get(name)
  }

  // Histogram methods
  recordHistogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, [])
    }
    
    const values = this.histograms.get(name)
    values.push(value)
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift()
    }
    
    this.emit('histogram_recorded', { name, value })
  }

  getHistogram(name) {
    const values = this.histograms.get(name) || []
    if (values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((acc, val) => acc + val, 0)
    
    return {
      count: values.length,
      sum: sum,
      mean: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  // Trading-specific metrics
  recordTrade(trade) {
    this.tradingMetrics.totalTrades++
    this.tradingMetrics.totalVolume += trade.size || 0
    this.tradingMetrics.totalPnL += trade.pnl || 0
    
    if (trade.success) {
      this.tradingMetrics.successfulTrades++
    } else {
      this.tradingMetrics.failedTrades++
    }
    
    this.incrementCounter('trades_total')
    this.recordGauge('total_pnl', this.tradingMetrics.totalPnL)
    this.recordGauge('total_volume', this.tradingMetrics.totalVolume)
  }

  recordPriceUpdate(priceData) {
    this.incrementCounter('price_updates_total')
    this.recordGauge(`price_${priceData.symbol}`, priceData.last || priceData.close)
  }

  recordNewsEvent(newsData) {
    this.incrementCounter('news_events_total')
    this.incrementCounter(`news_${newsData.impact}_impact`)
  }

  recordZMQMessage(type, topic, latency) {
    this.tradingMetrics.zmqMessages[type]++
    this.incrementCounter(`zmq_${type}_total`)
    
    if (latency) {
      this.recordHistogram(`zmq_${type}_latency_ms`, latency)
    }
  }

  recordZMQError() {
    this.tradingMetrics.zmqMessages.errors++
    this.incrementCounter('zmq_errors_total')
  }

  recordOrderLatency(latency) {
    this.recordHistogram('order_latency_ms', latency)
  }

  recordPositionUpdate(position) {
    this.recordGauge(`position_pnl_${position.symbol}`, position.pnl)
    this.recordGauge(`position_size_${position.symbol}`, position.size)
  }

  // Get all metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime
    
    return {
      timestamp: Date.now(),
      uptime: uptime,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.keys()).map(key => [key, this.getHistogram(key)])
      ),
      trading: this.tradingMetrics,
      system: this.systemMetrics,
      performance: {
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        uptime: uptime
      }
    }
  }

  // Export metrics in Prometheus format
  exportPrometheus() {
    const lines = []
    
    // Counters
    for (const [name, value] of this.counters) {
      lines.push(`# TYPE ${name} counter`)
      lines.push(`${name} ${value}`)
    }
    
    // Gauges
    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE ${name} gauge`)
      lines.push(`${name} ${value}`)
    }
    
    // Histograms
    for (const [name, histogram] of this.histograms) {
      const hist = this.getHistogram(name)
      if (hist) {
        lines.push(`# TYPE ${name} histogram`)
        lines.push(`${name}_count ${hist.count}`)
        lines.push(`${name}_sum ${hist.sum}`)
        lines.push(`${name}_bucket{le="0.5"} ${hist.p50}`)
        lines.push(`${name}_bucket{le="0.95"} ${hist.p95}`)
        lines.push(`${name}_bucket{le="0.99"} ${hist.p99}`)
        lines.push(`${name}_bucket{le="+Inf"} ${hist.count}`)
      }
    }
    
    return lines.join('\n')
  }

  // Reset metrics
  reset() {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
    this.tradingMetrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      totalPnL: 0,
      averageLatency: 0,
      zmqMessages: {
        sent: 0,
        received: 0,
        errors: 0
      }
    }
    this.logger.info('Metrics reset')
  }

  // Health check
  healthCheck() {
    return {
      status: 'healthy',
      initialized: this.isInitialized,
      uptime: Date.now() - this.startTime,
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      totalTrades: this.tradingMetrics.totalTrades,
      memoryUsage: this.systemMetrics.memoryUsage
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('Cleaning up Metrics Collector')
      
      // Clear all metrics
      this.counters.clear()
      this.gauges.clear()
      this.histograms.clear()
      
      this.isInitialized = false
      this.logger.info('Metrics Collector cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}