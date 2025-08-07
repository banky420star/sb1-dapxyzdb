import { Logger } from '../utils/logger.js'

export class EmergencyBrake {
  constructor(portfolio, thresholds = {}) {
    this.portfolio = portfolio
    this.logger = new Logger()
    
    // Risk thresholds
    this.drawdownThreshold = thresholds.drawdown || 0.10 // 10% drawdown
    this.varThreshold = thresholds.var || 0.05 // 5% VaR
    this.lossThreshold = thresholds.loss || 0.15 // 15% loss
    this.volatilityThreshold = thresholds.volatility || 0.50 // 50% volatility
    
    // Emergency state
    this.emergencyActive = false
    this.emergencyReason = null
    this.emergencyTimestamp = null
    
    // Monitoring
    this.checkInterval = null
    this.alertCooldown = 300000 // 5 minutes between alerts
    this.lastAlertTime = 0
    
    // Start monitoring
    this.startMonitoring()
  }
  
  startMonitoring() {
    // Check emergency conditions every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkEmergencyConditions()
    }, 30000)
    
    this.logger.info('Emergency brake monitoring started')
  }
  
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    this.logger.info('Emergency brake monitoring stopped')
  }
  
  async checkEmergencyConditions() {
    try {
      const conditions = await this._evaluateAllConditions()
      
      // Check if any emergency condition is met
      for (const [condition, value] of Object.entries(conditions)) {
        if (value.triggered) {
          await this._triggerEmergencyStop(condition, value)
          return
        }
      }
      
      // If no emergency conditions, ensure system is running
      if (this.emergencyActive) {
        await this._resumeTrading()
      }
      
    } catch (error) {
      this.logger.error('Error checking emergency conditions:', error)
    }
  }
  
  async _evaluateAllConditions() {
    const conditions = {}
    
    // Check drawdown
    const drawdown = this._calculateDrawdown()
    conditions.drawdown = {
      value: drawdown,
      threshold: this.drawdownThreshold,
      triggered: drawdown > this.drawdownThreshold
    }
    
    // Check VaR
    const var99 = this._calculateVaR()
    conditions.var = {
      value: var99,
      threshold: this.varThreshold,
      triggered: var99 > this.varThreshold
    }
    
    // Check total loss
    const totalLoss = this._calculateTotalLoss()
    conditions.loss = {
      value: totalLoss,
      threshold: this.lossThreshold,
      triggered: totalLoss > this.lossThreshold
    }
    
    // Check volatility
    const volatility = this._calculateVolatility()
    conditions.volatility = {
      value: volatility,
      threshold: this.volatilityThreshold,
      triggered: volatility > this.volatilityThreshold
    }
    
    return conditions
  }
  
  _calculateDrawdown() {
    const currentValue = this.portfolio.getTotalValue()
    const peakValue = this.portfolio.getPeakValue()
    
    if (peakValue <= 0) return 0
    
    return (peakValue - currentValue) / peakValue
  }
  
  _calculateVaR() {
    // Use VaR calculator if available
    if (this.portfolio.varCalculator) {
      return this.portfolio.varCalculator.calculatePortfolioVaR()
    }
    
    // Simple VaR calculation
    const returns = this.portfolio.getRecentReturns(100)
    if (returns.length === 0) return 0
    
    const sortedReturns = returns.sort((a, b) => a - b)
    const varIndex = Math.floor(0.01 * sortedReturns.length) // 99% VaR
    return Math.abs(sortedReturns[varIndex] || 0)
  }
  
  _calculateTotalLoss() {
    const initialValue = this.portfolio.getInitialValue()
    const currentValue = this.portfolio.getTotalValue()
    
    if (initialValue <= 0) return 0
    
    return (initialValue - currentValue) / initialValue
  }
  
  _calculateVolatility() {
    const returns = this.portfolio.getRecentReturns(30)
    if (returns.length < 2) return 0
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }
  
  async _triggerEmergencyStop(reason, condition) {
    const now = Date.now()
    
    // Prevent spam alerts
    if (now - this.lastAlertTime < this.alertCooldown) {
      return
    }
    
    this.lastAlertTime = now
    
    // Set emergency state
    this.emergencyActive = true
    this.emergencyReason = reason
    this.emergencyTimestamp = new Date().toISOString()
    
    this.logger.error(`EMERGENCY STOP ACTIVATED: ${reason}`, {
      reason: reason,
      value: condition.value,
      threshold: condition.threshold,
      timestamp: this.emergencyTimestamp
    })
    
    try {
      // Step 1: Stop all trading engines
      await this._stopAllTrading()
      
      // Step 2: Liquidate all positions to USDT
      await this._liquidateAllPositions()
      
      // Step 3: Cancel all pending orders
      await this._cancelAllOrders()
      
      // Step 4: Send emergency alert
      await this._sendEmergencyAlert(reason, condition)
      
      // Step 5: Log emergency action
      this._logEmergencyAction(reason, condition)
      
    } catch (error) {
      this.logger.error('Error during emergency stop:', error)
    }
  }
  
  async _stopAllTrading() {
    try {
      // Stop traditional trading engine
      if (this.portfolio.tradingEngine) {
        await this.portfolio.tradingEngine.stop()
      }
      
      // Stop crypto trading engine
      if (this.portfolio.cryptoTradingEngine) {
        await this.portfolio.cryptoTradingEngine.stop()
      }
      
      this.logger.info('All trading engines stopped')
      
    } catch (error) {
      this.logger.error('Error stopping trading engines:', error)
    }
  }
  
  async _liquidateAllPositions() {
    try {
      const positions = this.portfolio.getPositions()
      let liquidatedCount = 0
      
      for (const position of positions) {
        if (position.status === 'open') {
          await this.portfolio.closePosition(position.id, 'emergency_liquidation')
          liquidatedCount++
        }
      }
      
      this.logger.info(`Liquidated ${liquidatedCount} positions`)
      
    } catch (error) {
      this.logger.error('Error liquidating positions:', error)
    }
  }
  
  async _cancelAllOrders() {
    try {
      const orders = this.portfolio.getOrders()
      let cancelledCount = 0
      
      for (const order of orders) {
        if (order.status === 'pending') {
          await this.portfolio.cancelOrder(order.id)
          cancelledCount++
        }
      }
      
      this.logger.info(`Cancelled ${cancelledCount} orders`)
      
    } catch (error) {
      this.logger.error('Error cancelling orders:', error)
    }
  }
  
  async _sendEmergencyAlert(reason, condition) {
    const alert = {
      type: 'emergency_stop',
      reason: reason,
      value: condition.value,
      threshold: condition.threshold,
      timestamp: this.emergencyTimestamp,
      severity: 'critical'
    }
    
    // Send to monitoring system
    this.logger.error('EMERGENCY ALERT SENT', alert)
    
    // Emit event for external monitoring
    if (global.io) {
      global.io.emit('emergency_alert', alert)
    }
    
    // TODO: Send SMS/email alerts to operations team
    // await this._sendSMSAlert(alert)
    // await this._sendEmailAlert(alert)
  }
  
  _logEmergencyAction(reason, condition) {
    const emergencyLog = {
      timestamp: this.emergencyTimestamp,
      reason: reason,
      value: condition.value,
      threshold: condition.threshold,
      portfolioValue: this.portfolio.getTotalValue(),
      positions: this.portfolio.getPositions().length,
      orders: this.portfolio.getOrders().length
    }
    
    // Store emergency log
    this.portfolio.addEmergencyLog(emergencyLog)
    
    this.logger.info('Emergency action logged', emergencyLog)
  }
  
  async _resumeTrading() {
    if (!this.emergencyActive) return
    
    this.logger.info('Resuming trading after emergency stop')
    
    // Reset emergency state
    this.emergencyActive = false
    this.emergencyReason = null
    this.emergencyTimestamp = null
    
    // Resume trading engines
    try {
      if (this.portfolio.tradingEngine) {
        await this.portfolio.tradingEngine.start()
      }
      
      if (this.portfolio.cryptoTradingEngine) {
        await this.portfolio.cryptoTradingEngine.start()
      }
      
      this.logger.info('Trading resumed successfully')
      
    } catch (error) {
      this.logger.error('Error resuming trading:', error)
    }
  }
  
  // Manual emergency stop
  async manualEmergencyStop(reason = 'manual_emergency_stop') {
    await this._triggerEmergencyStop(reason, { value: 0, threshold: 0 })
  }
  
  // Manual resume
  async manualResume() {
    await this._resumeTrading()
  }
  
  // Get emergency status
  getEmergencyStatus() {
    return {
      emergencyActive: this.emergencyActive,
      emergencyReason: this.emergencyReason,
      emergencyTimestamp: this.emergencyTimestamp,
      thresholds: {
        drawdown: this.drawdownThreshold,
        var: this.varThreshold,
        loss: this.lossThreshold,
        volatility: this.volatilityThreshold
      }
    }
  }
  
  // Update thresholds
  updateThresholds(newThresholds) {
    if (newThresholds.drawdown !== undefined) {
      this.drawdownThreshold = newThresholds.drawdown
    }
    if (newThresholds.var !== undefined) {
      this.varThreshold = newThresholds.var
    }
    if (newThresholds.loss !== undefined) {
      this.lossThreshold = newThresholds.loss
    }
    if (newThresholds.volatility !== undefined) {
      this.volatilityThreshold = newThresholds.volatility
    }
    
    this.logger.info('Emergency brake thresholds updated', newThresholds)
  }
} 