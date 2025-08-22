// server/routes/risk.js
// Risk Management API Routes

import express from 'express'
import { riskManager } from '../services/risk-manager.js'
import logger from '../utils/simple-logger.js'

const router = express.Router()

// Get risk status and configuration
router.get('/status', async (req, res) => {
  try {
    const riskStatus = riskManager.getRiskStatus()
    
    res.json({
      success: true,
      data: riskStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching risk status:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk status',
      message: error.message
    })
  }
})

// Get risk configuration
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: riskManager.config,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching risk config:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk configuration',
      message: error.message
    })
  }
})

// Update risk configuration (admin only)
router.put('/config', async (req, res) => {
  try {
    // TODO: Add admin authentication
    const { maxPositionSize, maxTotalExposure, maxLeverage, defaultStopLoss, defaultTakeProfit, maxDailyLoss } = req.body
    
    // Update configuration
    if (maxPositionSize !== undefined) riskManager.config.maxPositionSize = parseFloat(maxPositionSize)
    if (maxTotalExposure !== undefined) riskManager.config.maxTotalExposure = parseFloat(maxTotalExposure)
    if (maxLeverage !== undefined) riskManager.config.maxLeverage = parseInt(maxLeverage)
    if (defaultStopLoss !== undefined) riskManager.config.defaultStopLoss = parseFloat(defaultStopLoss)
    if (defaultTakeProfit !== undefined) riskManager.config.defaultTakeProfit = parseFloat(defaultTakeProfit)
    if (maxDailyLoss !== undefined) riskManager.config.maxDailyLoss = parseFloat(maxDailyLoss)
    
    logger.info('Risk configuration updated', req.body)
    
    res.json({
      success: true,
      data: riskManager.config,
      message: 'Risk configuration updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error updating risk config:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to update risk configuration',
      message: error.message
    })
  }
})

// Get risk violations history
router.get('/violations', async (req, res) => {
  try {
    const { limit = 50, severity } = req.query
    
    let violations = riskManager.state.violations
    
    if (severity) {
      violations = violations.filter(v => v.severity === severity.toUpperCase())
    }
    
    violations = violations.slice(-parseInt(limit))
    
    res.json({
      success: true,
      data: violations,
      count: violations.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching risk violations:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk violations',
      message: error.message
    })
  }
})

// Emergency stop trading
router.post('/emergency-stop', async (req, res) => {
  try {
    // TODO: Add admin authentication
    const result = riskManager.emergencyStop()
    
    logger.critical('Emergency stop triggered via API', {
      user: req.ip,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      data: result,
      message: 'Emergency stop triggered successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error triggering emergency stop:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to trigger emergency stop',
      message: error.message
    })
  }
})

// Reset daily risk state
router.post('/reset-daily', async (req, res) => {
  try {
    // TODO: Add admin authentication
    riskManager.resetDailyState()
    
    logger.info('Daily risk state reset via API', {
      user: req.ip,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      message: 'Daily risk state reset successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error resetting daily risk state:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to reset daily risk state',
      message: error.message
    })
  }
})

// Validate position (for testing)
router.post('/validate-position', async (req, res) => {
  try {
    const { accountBalance, positionSize, symbol, currentPositions = [] } = req.body
    
    if (!accountBalance || !positionSize || !symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountBalance, positionSize, symbol'
      })
    }
    
    const validation = riskManager.validatePosition(
      parseFloat(accountBalance),
      parseFloat(positionSize),
      symbol,
      currentPositions
    )
    
    res.json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error validating position:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to validate position',
      message: error.message
    })
  }
})

// Calculate position size based on risk
router.post('/calculate-position-size', async (req, res) => {
  try {
    const { accountBalance, entryPrice, stopLossPrice, riskPerTrade = 0.01 } = req.body
    
    if (!accountBalance || !entryPrice || !stopLossPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountBalance, entryPrice, stopLossPrice'
      })
    }
    
    const positionSize = riskManager.calculatePositionSize(
      parseFloat(accountBalance),
      parseFloat(entryPrice),
      parseFloat(stopLossPrice),
      parseFloat(riskPerTrade)
    )
    
    res.json({
      success: true,
      data: {
        positionSize,
        riskAmount: parseFloat(accountBalance) * parseFloat(riskPerTrade),
        priceRisk: Math.abs(parseFloat(entryPrice) - parseFloat(stopLossPrice))
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error calculating position size:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to calculate position size',
      message: error.message
    })
  }
})

export default router
