// server/routes/monitoring.js
// Monitoring and Performance API Routes

import express from 'express'
import { performanceMonitor } from '../services/monitoring.js'
import logger from '../utils/simple-logger.js'

const router = express.Router()

// Get performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching metrics:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      message: error.message
    })
  }
})

// Get system health status
router.get('/health', async (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus()
    
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching health status:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health status',
      message: error.message
    })
  }
})

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query
    
    const alerts = performanceMonitor.getAlerts(severity, parseInt(limit))
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching alerts:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      message: error.message
    })
  }
})

// Get API performance metrics
router.get('/api-performance', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    
    res.json({
      success: true,
      data: {
        totalRequests: metrics.api.totalRequests,
        successfulRequests: metrics.api.successfulRequests,
        failedRequests: metrics.api.failedRequests,
        successRate: metrics.api.totalRequests > 0 ? (metrics.api.successfulRequests / metrics.api.totalRequests * 100).toFixed(2) : 0,
        averageLatency: metrics.api.averageLatency.toFixed(2),
        lastLatency: metrics.api.lastLatency,
        errorRate: metrics.api.totalRequests > 0 ? (metrics.api.failedRequests / metrics.api.totalRequests * 100).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching API performance:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API performance',
      message: error.message
    })
  }
})

// Get trading performance metrics
router.get('/trading-performance', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    
    res.json({
      success: true,
      data: {
        totalOrders: metrics.trading.totalOrders,
        successfulOrders: metrics.trading.successfulOrders,
        failedOrders: metrics.trading.failedOrders,
        successRate: metrics.trading.totalOrders > 0 ? (metrics.trading.successfulOrders / metrics.trading.totalOrders * 100).toFixed(2) : 0,
        averageSlippage: metrics.trading.averageSlippage.toFixed(4),
        lastOrderLatency: metrics.trading.lastOrderLatency,
        failureRate: metrics.trading.totalOrders > 0 ? (metrics.trading.failedOrders / metrics.trading.totalOrders * 100).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching trading performance:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading performance',
      message: error.message
    })
  }
})

// Get system metrics
router.get('/system-metrics', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    
    res.json({
      success: true,
      data: {
        memoryUsage: (metrics.system.memoryUsage * 100).toFixed(2),
        cpuUsage: (metrics.system.cpuUsage * 100).toFixed(2),
        activeConnections: metrics.system.activeConnections,
        uptime: metrics.system.uptime,
        uptimeFormatted: formatUptime(metrics.system.uptime)
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching system metrics:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics',
      message: error.message
    })
  }
})

// Get risk metrics
router.get('/risk-metrics', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    
    res.json({
      success: true,
      data: {
        violations: metrics.risk.violations,
        alerts: metrics.risk.alerts,
        riskLevel: metrics.risk.riskLevel
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error fetching risk metrics:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch risk metrics',
      message: error.message
    })
  }
})

// Reset metrics (admin only)
router.post('/reset-metrics', async (req, res) => {
  try {
    // TODO: Add admin authentication
    performanceMonitor.resetMetrics()
    
    logger.info('Metrics reset via API', {
      user: req.ip,
      timestamp: new Date().toISOString()
    })
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error resetting metrics:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
      message: error.message
    })
  }
})

// Get detailed performance report
router.get('/performance-report', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics()
    const healthStatus = performanceMonitor.getHealthStatus()
    const alerts = performanceMonitor.getAlerts(null, 10)
    
    const report = {
      summary: {
        status: healthStatus.status,
        uptime: formatUptime(metrics.system.uptime),
        totalRequests: metrics.api.totalRequests,
        totalOrders: metrics.trading.totalOrders,
        riskLevel: metrics.risk.riskLevel
      },
      api: {
        successRate: metrics.api.totalRequests > 0 ? (metrics.api.successfulRequests / metrics.api.totalRequests * 100).toFixed(2) : 0,
        averageLatency: metrics.api.averageLatency.toFixed(2),
        errorRate: metrics.api.totalRequests > 0 ? (metrics.api.failedRequests / metrics.api.totalRequests * 100).toFixed(2) : 0
      },
      trading: {
        successRate: metrics.trading.totalOrders > 0 ? (metrics.trading.successfulOrders / metrics.trading.totalOrders * 100).toFixed(2) : 0,
        averageSlippage: metrics.trading.averageSlippage.toFixed(4),
        failureRate: metrics.trading.totalOrders > 0 ? (metrics.trading.failedOrders / metrics.trading.totalOrders * 100).toFixed(2) : 0
      },
      system: {
        memoryUsage: (metrics.system.memoryUsage * 100).toFixed(2),
        cpuUsage: (metrics.system.cpuUsage * 100).toFixed(2),
        activeConnections: metrics.system.activeConnections
      },
      risk: {
        violations: metrics.risk.violations,
        alerts: metrics.risk.alerts,
        riskLevel: metrics.risk.riskLevel
      },
      recentAlerts: alerts,
      issues: healthStatus.issues
    }
    
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error generating performance report:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
      message: error.message
    })
  }
})

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export default router
