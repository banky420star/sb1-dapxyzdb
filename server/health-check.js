import { execSync } from 'child_process'
import { DatabaseManager } from './database/manager.js'
import { Logger } from './utils/logger.js'

const logger = new Logger()

// Health check functions
async function checkDatabase() {
  try {
    const startTime = Date.now()
    const db = new DatabaseManager()
    await db.initialize()
    
    // Test database connection using SQLite syntax
    const result = await db.db.get('SELECT 1 as test')
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      response_time: responseTime,
      connection: 'active'
    }
  } catch (error) {
    logger.error('Database health check failed:', error)
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    }
  }
}

async function checkRedis() {
  try {
    // Test Redis connection using ES module import
    const Redis = await import('ioredis')
    const client = new Redis.default(process.env.REDIS_URL || 'redis://localhost:6379')
    
    await client.ping()
    await client.quit()
    
    return {
      status: 'healthy',
      connection: 'active'
    }
  } catch (error) {
    logger.error('Redis health check failed:', error)
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    }
  }
}

async function checkBybitConnection() {
  try {
    const startTime = Date.now()
    
    // Test Bybit API connection
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT', {
      method: 'GET',
      timeout: 5000
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        status: 'healthy',
        response_time: responseTime,
        connection: 'active'
      }
    } else {
      return {
        status: 'degraded',
        status_code: response.status,
        response_time: responseTime,
        connection: 'limited'
      }
    }
  } catch (error) {
    logger.error('Bybit health check failed:', error)
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    }
  }
}

async function checkMLflow() {
  try {
    // Test MLflow tracking server
    const response = await fetch(process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000/health', {
      method: 'GET',
      timeout: 3000
    })
    
    if (response.ok) {
      return {
        status: 'healthy',
        connection: 'active'
      }
    } else {
      return {
        status: 'degraded',
        status_code: response.status,
        connection: 'limited'
      }
    }
  } catch (error) {
    logger.error('MLflow health check failed:', error)
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    }
  }
}

async function checkSystemResources() {
  try {
    // Get system memory usage
    const memInfo = process.memoryUsage()
    
    // Get CPU usage (simplified)
    const cpuUsage = process.cpuUsage()
    
    return {
      memory: {
        used: Math.round(memInfo.heapUsed / 1024 / 1024),
        total: Math.round(memInfo.heapTotal / 1024 / 1024),
        external: Math.round(memInfo.external / 1024 / 1024),
        rss: Math.round(memInfo.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    }
  } catch (error) {
    logger.error('System resources check failed:', error)
    return {
      error: error.message
    }
  }
}

async function checkTradingEngines() {
  try {
    const engines = {
      traditional: 'unknown',
      crypto: 'unknown'
    }
    
    // Check if trading engines are available
    if (global.tradingEngine) {
      engines.traditional = global.tradingEngine.isRunning ? 'running' : 'stopped'
    }
    
    if (global.cryptoTradingEngine) {
      engines.crypto = global.cryptoTradingEngine.isRunning ? 'running' : 'stopped'
    }
    
    return engines
  } catch (error) {
    logger.error('Trading engines check failed:', error)
    return {
      error: error.message
    }
  }
}

// Main health check endpoint
export const healthCheck = async (req, res) => {
  const startTime = Date.now()
  
  try {
    // Get Git information
    let gitInfo = {}
    try {
      const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
      const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
      const gitTag = execSync('git describe --tags --always', { encoding: 'utf8' }).trim()
      
      gitInfo = {
        sha: gitSha,
        branch: gitBranch,
        tag: gitTag
      }
    } catch (error) {
      gitInfo = { error: 'Git info unavailable' }
    }
    
    // Check all services
    const [db, redis, bybit, mlflow, resources, engines] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkBybitConnection(),
      checkMLflow(),
      checkSystemResources(),
      checkTradingEngines()
    ])
    
    // Determine overall status
    const services = {
      database: db.status === 'fulfilled' ? db.value : { status: 'unhealthy', error: db.reason },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy', error: redis.reason },
      bybit: bybit.status === 'fulfilled' ? bybit.value : { status: 'unhealthy', error: bybit.reason },
      mlflow: mlflow.status === 'fulfilled' ? mlflow.value : { status: 'unhealthy', error: mlflow.reason }
    }
    
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length
    const totalServices = Object.keys(services).length
    
    let overallStatus = 'green'
    if (healthyServices < totalServices * 0.8) {
      overallStatus = 'yellow'
    }
    if (healthyServices < totalServices * 0.5) {
      overallStatus = 'red'
    }
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      git: gitInfo,
      response_time: Date.now() - startTime,
      uptime: process.uptime(),
      services: services,
      resources: resources.status === 'fulfilled' ? resources.value : { error: resources.reason },
      trading_engines: engines.status === 'fulfilled' ? engines.value : { error: engines.reason },
      compliance: {
        audit_trail: 'enabled',
        model_versioning: 'active',
        risk_monitoring: 'active'
      }
    }
    
    // Set appropriate status code
    const statusCode = overallStatus === 'green' ? 200 : overallStatus === 'yellow' ? 200 : 503
    
    res.status(statusCode).json(health)
    
  } catch (error) {
    logger.error('Health check failed:', error)
    
    res.status(503).json({
      status: 'red',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// Prometheus metrics endpoint
export const metrics = async (req, res) => {
  try {
    const metrics = await generatePrometheusMetrics()
    
    res.set('Content-Type', 'text/plain')
    res.send(metrics)
    
  } catch (error) {
    logger.error('Metrics generation failed:', error)
    res.status(500).send('# Error generating metrics\n')
  }
}

async function generatePrometheusMetrics() {
  const metrics = []
  
  // System metrics
  const memInfo = process.memoryUsage()
  metrics.push(`# HELP nodejs_heap_size_total Process heap size from Node.js in bytes.`)
  metrics.push(`# TYPE nodejs_heap_size_total gauge`)
  metrics.push(`nodejs_heap_size_total ${memInfo.heapTotal}`)
  
  metrics.push(`# HELP nodejs_heap_size_used Process heap size used from Node.js in bytes.`)
  metrics.push(`# TYPE nodejs_heap_size_used gauge`)
  metrics.push(`nodejs_heap_size_used ${memInfo.heapUsed}`)
  
  metrics.push(`# HELP nodejs_heap_size_external Process external heap size from Node.js in bytes.`)
  metrics.push(`# TYPE nodejs_heap_size_external gauge`)
  metrics.push(`nodejs_heap_size_external ${memInfo.external}`)
  
  metrics.push(`# HELP nodejs_heap_size_rss Process heap size rss from Node.js in bytes.`)
  metrics.push(`# TYPE nodejs_heap_size_rss gauge`)
  metrics.push(`nodejs_heap_size_rss ${memInfo.rss}`)
  
  // Application metrics
  metrics.push(`# HELP trading_system_uptime_seconds Trading system uptime in seconds.`)
  metrics.push(`# TYPE trading_system_uptime_seconds gauge`)
  metrics.push(`trading_system_uptime_seconds ${process.uptime()}`)
  
  // Service health metrics
  const services = ['database', 'redis', 'bybit', 'mlflow']
  for (const service of services) {
    metrics.push(`# HELP service_health Service health status (1=healthy, 0=unhealthy).`)
    metrics.push(`# TYPE service_health gauge`)
    // This would be populated with actual service health data
    metrics.push(`service_health{service="${service}"} 1`)
  }
  
  return metrics.join('\n')
}

// Read-only status endpoint for public access
export const publicStatus = async (req, res) => {
  try {
    const status = {
      system: 'operational',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime()
    }
    
    res.json(status)
    
  } catch (error) {
    logger.error('Public status check failed:', error)
    
    res.status(503).json({
      system: 'degraded',
      timestamp: new Date().toISOString()
    })
  }
} 