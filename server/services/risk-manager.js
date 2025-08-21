// server/services/risk-manager.js
// Comprehensive Risk Management System

import { logger } from '../utils/logger.js'

// Risk Management Configuration
const RISK_CONFIG = {
  // Position sizing limits
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'), // 10% of account
  maxTotalExposure: parseFloat(process.env.MAX_TOTAL_EXPOSURE || '0.5'), // 50% of account
  
  // Leverage limits
  maxLeverage: parseInt(process.env.MAX_LEVERAGE || '10'),
  
  // Stop-loss and take-profit
  defaultStopLoss: parseFloat(process.env.DEFAULT_STOP_LOSS || '0.02'), // 2%
  defaultTakeProfit: parseFloat(process.env.DEFAULT_TAKE_PROFIT || '0.04'), // 4%
  
  // Daily loss limits
  maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.05'), // 5% of account
  maxDailyDrawdown: parseFloat(process.env.MAX_DAILY_DRAWDOWN || '0.1'), // 10% of account
  
  // Margin requirements
  minMarginLevel: parseFloat(process.env.MIN_MARGIN_LEVEL || '1.5'), // 150%
  
  // Volatility limits
  maxVolatility: parseFloat(process.env.MAX_VOLATILITY || '0.05'), // 5% hourly volatility
  
  // Correlation limits
  maxCorrelatedExposure: parseFloat(process.env.MAX_CORRELATED_EXPOSURE || '0.3'), // 30%
}

// Risk state tracking
let riskState = {
  dailyPnL: 0,
  dailyHigh: 0,
  currentExposure: 0,
  marginLevel: 1.0,
  lastUpdate: new Date(),
  alerts: [],
  violations: []
}

// Risk validation functions
export class RiskManager {
  constructor() {
    this.config = RISK_CONFIG
    this.state = riskState
  }

  // Validate new position
  validatePosition(accountBalance, positionSize, symbol, currentPositions = []) {
    const violations = []
    
    // Position size validation
    const positionValue = positionSize
    const positionSizePct = positionValue / accountBalance
    
    if (positionSizePct > this.config.maxPositionSize) {
      violations.push({
        type: 'POSITION_SIZE_EXCEEDED',
        message: `Position size ${(positionSizePct * 100).toFixed(2)}% exceeds limit ${(this.config.maxPositionSize * 100).toFixed(2)}%`,
        severity: 'HIGH'
      })
    }
    
    // Total exposure validation
    const totalExposure = currentPositions.reduce((sum, pos) => sum + Math.abs(pos.size), 0) + positionValue
    const totalExposurePct = totalExposure / accountBalance
    
    if (totalExposurePct > this.config.maxTotalExposure) {
      violations.push({
        type: 'TOTAL_EXPOSURE_EXCEEDED',
        message: `Total exposure ${(totalExposurePct * 100).toFixed(2)}% exceeds limit ${(this.config.maxTotalExposure * 100).toFixed(2)}%`,
        severity: 'HIGH'
      })
    }
    
    // Daily loss validation
    if (this.state.dailyPnL < -(accountBalance * this.config.maxDailyLoss)) {
      violations.push({
        type: 'DAILY_LOSS_LIMIT_EXCEEDED',
        message: `Daily loss ${Math.abs(this.state.dailyPnL).toFixed(2)} exceeds limit ${(accountBalance * this.config.maxDailyLoss).toFixed(2)}`,
        severity: 'CRITICAL'
      })
    }
    
    // Margin level validation
    if (this.state.marginLevel < this.config.minMarginLevel) {
      violations.push({
        type: 'MARGIN_LEVEL_INSUFFICIENT',
        message: `Margin level ${this.state.marginLevel.toFixed(2)} below minimum ${this.config.minMarginLevel}`,
        severity: 'CRITICAL'
      })
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      warnings: violations.filter(v => v.severity !== 'CRITICAL')
    }
  }

  // Calculate position size based on risk
  calculatePositionSize(accountBalance, entryPrice, stopLossPrice, riskPerTrade = 0.01) {
    const riskAmount = accountBalance * riskPerTrade
    const priceRisk = Math.abs(entryPrice - stopLossPrice)
    const positionSize = riskAmount / priceRisk
    
    // Apply position size limits
    const maxSize = accountBalance * this.config.maxPositionSize / entryPrice
    return Math.min(positionSize, maxSize)
  }

  // Update risk state
  updateRiskState(accountData, positions, orders) {
    const now = new Date()
    
    // Calculate current exposure
    const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.size * pos.entry), 0)
    
    // Calculate margin level (simplified)
    const marginLevel = accountData.available > 0 ? (accountData.total / totalExposure) : 1.0
    
    // Update daily PnL (simplified - would need real PnL tracking)
    const dailyPnL = positions.reduce((sum, pos) => sum + (pos.pnlPct || 0), 0)
    
    this.state = {
      ...this.state,
      dailyPnL,
      dailyHigh: Math.max(this.state.dailyHigh, dailyPnL),
      currentExposure: totalExposure,
      marginLevel,
      lastUpdate: now
    }
    
    // Check for violations
    this.checkViolations(accountData)
    
    logger.info('Risk state updated', {
      dailyPnL: this.state.dailyPnL,
      exposure: this.state.currentExposure,
      marginLevel: this.state.marginLevel
    })
  }

  // Check for risk violations
  checkViolations(accountData) {
    const violations = []
    
    // Daily loss limit
    if (this.state.dailyPnL < -(accountData.total * this.config.maxDailyLoss)) {
      violations.push({
        type: 'DAILY_LOSS_LIMIT',
        message: `Daily loss limit exceeded: ${Math.abs(this.state.dailyPnL).toFixed(2)}`,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL'
      })
    }
    
    // Daily drawdown
    const drawdown = (this.state.dailyHigh - this.state.dailyPnL) / this.state.dailyHigh
    if (drawdown > this.config.maxDailyDrawdown) {
      violations.push({
        type: 'DAILY_DRAWDOWN_LIMIT',
        message: `Daily drawdown limit exceeded: ${(drawdown * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
      })
    }
    
    // Margin level
    if (this.state.marginLevel < this.config.minMarginLevel) {
      violations.push({
        type: 'MARGIN_LEVEL_LIMIT',
        message: `Margin level below minimum: ${this.state.marginLevel.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL'
      })
    }
    
    // Add to violations history
    this.state.violations.push(...violations)
    
    // Keep only last 100 violations
    if (this.state.violations.length > 100) {
      this.state.violations = this.state.violations.slice(-100)
    }
    
    // Log critical violations
    violations.filter(v => v.severity === 'CRITICAL').forEach(violation => {
      logger.error('CRITICAL RISK VIOLATION', violation)
    })
    
    return violations
  }

  // Get risk status
  getRiskStatus() {
    return {
      config: this.config,
      state: this.state,
      alerts: this.state.alerts,
      violations: this.state.violations.slice(-10), // Last 10 violations
      riskLevel: this.calculateRiskLevel()
    }
  }

  // Calculate overall risk level
  calculateRiskLevel() {
    let riskScore = 0
    
    // Daily PnL impact
    if (this.state.dailyPnL < 0) {
      riskScore += Math.abs(this.state.dailyPnL) * 10
    }
    
    // Exposure impact
    riskScore += this.state.currentExposure * 5
    
    // Margin level impact
    if (this.state.marginLevel < 2.0) {
      riskScore += (2.0 - this.state.marginLevel) * 20
    }
    
    // Violation impact
    const criticalViolations = this.state.violations.filter(v => v.severity === 'CRITICAL').length
    riskScore += criticalViolations * 50
    
    if (riskScore > 100) return 'CRITICAL'
    if (riskScore > 50) return 'HIGH'
    if (riskScore > 20) return 'MEDIUM'
    return 'LOW'
  }

  // Emergency stop trading
  emergencyStop() {
    logger.critical('EMERGENCY STOP TRIGGERED - Trading halted due to risk violations')
    
    this.state.alerts.push({
      type: 'EMERGENCY_STOP',
      message: 'Trading halted due to risk violations',
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL'
    })
    
    return {
      success: true,
      message: 'Emergency stop triggered - trading halted',
      timestamp: new Date().toISOString()
    }
  }

  // Reset daily risk state
  resetDailyState() {
    this.state.dailyPnL = 0
    this.state.dailyHigh = 0
    this.state.alerts = []
    
    logger.info('Daily risk state reset')
  }
}

// Export singleton instance
export const riskManager = new RiskManager()
