import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class AutonomousOrchestrator extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger()
    this.config = this.loadConfig()
    this.isRunning = false
    this.healthCheckInterval = null
    this.dataFetchInterval = null
    this.modelTrainInterval = null
    this.performanceCheckInterval = null
    this.lastHealthCheck = Date.now()
    this.systemComponents = {}
  }

  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'autonomous-config.json')
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'))
      }
      this.logger.warn('Autonomous config not found, using defaults')
      return this.getDefaultConfig()
    } catch (error) {
      this.logger.error('Error loading autonomous config:', error)
      return this.getDefaultConfig()
    }
  }

  getDefaultConfig() {
    return {
      autonomous: { enabled: true, mode: 'paper', autoStart: true },
      trading: { enabled: true, maxPositions: 5, maxRiskPerTrade: 0.02 },
      data: { autoFetch: true, fetchInterval: 30000 },
      models: { autoTrain: true, trainInterval: 3600000 },
      monitoring: { enabled: true, healthCheckInterval: 60000 }
    }
  }

  setSystemComponents(components) {
    this.systemComponents = components
    this.logger.info('System components set for autonomous orchestrator')
  }

  async initialize() {
    this.logger.info('Initializing Autonomous Trading Orchestrator')
    // Configuration is already loaded in constructor
    await this.startAutonomousMode()
    this.logger.info('Autonomous Trading Orchestrator initialized successfully')
  }

  async startAutonomousMode() {
    this.logger.info('🚀 Starting Autonomous Trading Mode')
    this.isRunning = true

    // Set up autonomous trading
    if (this.config.trading.enabled) {
      await this.setupAutonomousTrading()
    }

    // Set up data fetching
    if (this.config.data.autoFetch) {
      this.setupDataFetching()
    }

    // Set up model training
    if (this.config.models.autoTrain) {
      this.setupModelTraining()
    }

    // Set up monitoring
    if (this.config.monitoring.enabled) {
      this.setupMonitoring()
    }

    // Set up performance tracking
    this.setupPerformanceTracking()

    this.logger.info('✅ Autonomous mode activated - System is now fully autonomous')
    this.emit('autonomous_started')
  }

  async setupAutonomousTrading() {
    this.logger.info('Setting up autonomous trading')
    
    try {
      // Set trading mode
      if (this.systemComponents.tradingEngine) {
        await this.systemComponents.tradingEngine.setMode(this.config.autonomous.mode)
        this.logger.info(`Trading mode set to: ${this.config.autonomous.mode}`)
      }

      // Configure risk management
      if (this.systemComponents.riskManager) {
        await this.systemComponents.riskManager.configure({
          maxPositions: this.config.trading.maxPositions,
          maxRiskPerTrade: this.config.trading.maxRiskPerTrade,
          maxDailyLoss: this.config.trading.maxDailyLoss,
          stopLoss: this.config.trading.stopLoss,
          takeProfit: this.config.trading.takeProfit
        })
        this.logger.info('Risk management configured for autonomous trading')
      }

      // Start trading if auto-start is enabled
      if (this.config.autonomous.autoStart) {
        await this.startTrading()
      }

    } catch (error) {
      this.logger.error('Error setting up autonomous trading:', error)
    }
  }

  async startTrading() {
    try {
      if (this.systemComponents.tradingEngine) {
        await this.systemComponents.tradingEngine.start()
        this.logger.info('🤖 Autonomous trading started')
        this.emit('trading_started')
      }
    } catch (error) {
      this.logger.error('Error starting autonomous trading:', error)
    }
  }

  setupDataFetching() {
    this.logger.info('Setting up autonomous data fetching')
    
    this.dataFetchInterval = setInterval(async () => {
      try {
        if (this.systemComponents.dataManager) {
          await this.systemComponents.dataManager.fetchLatestData()
          this.logger.debug('Autonomous data fetch completed')
        }
      } catch (error) {
        this.logger.error('Error in autonomous data fetch:', error)
      }
    }, this.config.data.fetchInterval)

    this.logger.info(`Data fetching scheduled every ${this.config.data.fetchInterval / 1000} seconds`)
  }

  setupModelTraining() {
    this.logger.info('Setting up autonomous model training')
    
    this.modelTrainInterval = setInterval(async () => {
      try {
        if (this.systemComponents.modelManager) {
          this.logger.info('🔄 Starting autonomous model retraining')
          await this.systemComponents.modelManager.retrainAll()
          this.logger.info('✅ Autonomous model retraining completed')
        }
      } catch (error) {
        this.logger.error('Error in autonomous model training:', error)
      }
    }, this.config.models.trainInterval)

    this.logger.info(`Model training scheduled every ${this.config.models.trainInterval / 1000 / 60} minutes`)
  }

  setupMonitoring() {
    this.logger.info('Setting up autonomous monitoring')
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, this.config.monitoring.healthCheckInterval)

    this.logger.info(`Health monitoring scheduled every ${this.config.monitoring.healthCheckInterval / 1000} seconds`)
  }

  setupPerformanceTracking() {
    this.logger.info('Setting up performance tracking')
    
    this.performanceCheckInterval = setInterval(async () => {
      await this.checkPerformance()
    }, 300000) // Every 5 minutes

    this.logger.info('Performance tracking activated')
  }

  async performHealthCheck() {
    try {
      this.lastHealthCheck = Date.now()
      
      // Check system components
      const healthStatus = {
        timestamp: new Date().toISOString(),
        tradingEngine: this.systemComponents.tradingEngine?.isRunning || false,
        dataManager: this.systemComponents.dataManager?.isConnected || false,
        modelManager: this.systemComponents.modelManager?.isReady || false,
        riskManager: this.systemComponents.riskManager?.isActive || false,
        database: this.systemComponents.database?.isConnected || false
      }

      // Log health status
      this.logger.info('System health check:', healthStatus)

      // Check for critical issues
      const criticalIssues = Object.entries(healthStatus)
        .filter(([key, value]) => key !== 'timestamp' && !value)
        .map(([key]) => key)

      if (criticalIssues.length > 0) {
        this.logger.warn(`Critical system issues detected: ${criticalIssues.join(', ')}`)
        await this.handleSystemIssues(criticalIssues)
      }

      this.emit('health_check', healthStatus)

    } catch (error) {
      this.logger.error('Error during health check:', error)
    }
  }

  async checkPerformance() {
    try {
      if (this.systemComponents.tradingEngine) {
        const performance = await this.systemComponents.tradingEngine.getPerformance()
        
        // Check for performance alerts
        if (performance.drawdown > this.config.risk.maxDrawdown) {
          this.logger.warn(`⚠️ High drawdown detected: ${(performance.drawdown * 100).toFixed(2)}%`)
          await this.handlePerformanceAlert('high_drawdown', performance)
        }

        if (performance.dailyPnL < -(this.config.trading.maxDailyLoss * 100)) {
          this.logger.warn(`⚠️ Daily loss limit exceeded: ${performance.dailyPnL.toFixed(2)}%`)
          await this.handlePerformanceAlert('daily_loss_limit', performance)
        }

        this.emit('performance_update', performance)
      }
    } catch (error) {
      this.logger.error('Error checking performance:', error)
    }
  }

  async handleSystemIssues(issues) {
    this.logger.warn(`Handling system issues: ${issues.join(', ')}`)
    
    // Attempt to restart failed components
    for (const issue of issues) {
      try {
        await this.restartComponent(issue)
      } catch (error) {
        this.logger.error(`Failed to restart ${issue}:`, error)
      }
    }

    // If critical components are down, consider emergency stop
    if (issues.includes('tradingEngine') || issues.includes('riskManager')) {
      this.logger.error('🚨 Critical components down - considering emergency stop')
      await this.considerEmergencyStop()
    }
  }

  async restartComponent(componentName) {
    this.logger.info(`Attempting to restart ${componentName}`)
    
    try {
      switch (componentName) {
        case 'dataManager':
          if (this.systemComponents.dataManager) {
            await this.systemComponents.dataManager.reconnect()
          }
          break
        case 'modelManager':
          if (this.systemComponents.modelManager) {
            await this.systemComponents.modelManager.reinitialize()
          }
          break
        case 'tradingEngine':
          if (this.systemComponents.tradingEngine) {
            await this.systemComponents.tradingEngine.restart()
          }
          break
        default:
          this.logger.warn(`Unknown component to restart: ${componentName}`)
      }
      
      this.logger.info(`✅ ${componentName} restarted successfully`)
    } catch (error) {
      this.logger.error(`Failed to restart ${componentName}:`, error)
      throw error
    }
  }

  async handlePerformanceAlert(type, performance) {
    this.logger.warn(`Performance alert: ${type}`, performance)
    
    switch (type) {
      case 'high_drawdown':
        await this.handleHighDrawdown(performance)
        break
      case 'daily_loss_limit':
        await this.handleDailyLossLimit(performance)
        break
      default:
        this.logger.warn(`Unknown performance alert type: ${type}`)
    }
  }

  async handleHighDrawdown(performance) {
    this.logger.warn('Handling high drawdown')
    
    // Reduce position sizes
    if (this.systemComponents.riskManager) {
      await this.systemComponents.riskManager.adjustRiskLevel('reduce')
    }
    
    // Consider stopping trading if drawdown is extreme
    if (performance.drawdown > 0.25) {
      this.logger.error('🚨 Extreme drawdown - stopping trading')
      await this.stopTrading()
    }
  }

  async handleDailyLossLimit(performance) {
    this.logger.warn('Handling daily loss limit exceeded')
    
    // Stop trading for the day
    await this.stopTrading()
    
    // Schedule restart for next day
    setTimeout(async () => {
      this.logger.info('🔄 Restarting trading after daily loss limit')
      await this.startTrading()
    }, 24 * 60 * 60 * 1000) // 24 hours
  }

  async considerEmergencyStop() {
    this.logger.error('🚨 Emergency stop conditions met')
    
    // Stop all trading
    await this.stopTrading()
    
    // Notify administrators
    this.emit('emergency_stop', {
      timestamp: new Date().toISOString(),
      reason: 'Critical system components down'
    })
  }

  async stopTrading() {
    try {
      if (this.systemComponents.tradingEngine) {
        await this.systemComponents.tradingEngine.stop()
        this.logger.info('🛑 Autonomous trading stopped')
        this.emit('trading_stopped')
      }
    } catch (error) {
      this.logger.error('Error stopping autonomous trading:', error)
    }
  }

  async shutdown() {
    this.logger.info('🔄 Shutting down autonomous orchestrator')
    this.isRunning = false

    // Clear all intervals
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval)
    if (this.dataFetchInterval) clearInterval(this.dataFetchInterval)
    if (this.modelTrainInterval) clearInterval(this.modelTrainInterval)
    if (this.performanceCheckInterval) clearInterval(this.performanceCheckInterval)

    // Stop trading
    await this.stopTrading()

    this.logger.info('✅ Autonomous orchestrator shutdown complete')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastHealthCheck: this.lastHealthCheck,
      components: Object.keys(this.systemComponents)
    }
  }
} 