// server/services/monitoring.js
// Comprehensive Monitoring and Alerting System

import logger from '../utils/simple-logger.js'
import { riskManager } from './risk-manager.js'

// Monitoring configuration
const MONITORING_CONFIG = {
  // Performance thresholds
  maxApiLatency: parseInt(process.env.MAX_API_LATENCY || '5000'), // 5 seconds
  maxMemoryUsage: parseFloat(process.env.MAX_MEMORY_USAGE || '0.8'), // 80%
  maxCpuUsage: parseFloat(process.env.MAX_CPU_USAGE || '0.9'), // 90%
  
  // Trading thresholds
  maxOrderLatency: parseInt(process.env.MAX_ORDER_LATENCY || '3000'), // 3 seconds
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.005'), // 0.5%
  maxFailedOrders: parseInt(process.env.MAX_FAILED_ORDERS || '5'), // 5 failed orders
  
  // System thresholds
  maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE || '0.05'), // 5%
  maxConcurrentConnections: parseInt(process.env.MAX_CONCURRENT_CONNECTIONS || '100'),
  
  // Alert intervals
  alertCooldown: parseInt(process.env.ALERT_COOLDOWN || '300000'), // 5 minutes
}

// Monitoring state
let monitoringState = {
  startTime: new Date(),
  metrics: {
    api: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastLatency: 0
    },
    trading: {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      averageSlippage: 0,
      lastOrderLatency: 0
    },
    system: {
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      uptime: 0
    },
    risk: {
      violations: 0,
      alerts: 0,
      riskLevel: 'LOW'
    }
  },
  alerts: [],
  health: {
    status: 'healthy',
    lastCheck: new Date(),
    issues: []
  }
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = monitoringState.metrics
    this.startTime = monitoringState.startTime
  }

  // Track API performance
  trackApiRequest(latency, success = true) {
    this.metrics.api.totalRequests++
    this.metrics.api.lastLatency = latency
    
    if (success) {
      this.metrics.api.successfulRequests++
    } else {
      this.metrics.api.failedRequests++
    }
    
    // Update average latency
    const totalLatency = this.metrics.api.averageLatency * (this.metrics.api.totalRequests - 1) + latency
    this.metrics.api.averageLatency = totalLatency / this.metrics.api.totalRequests
    
    // Check for latency violations
    if (latency > MONITORING_CONFIG.maxApiLatency) {
      this.createAlert('HIGH_API_LATENCY', `API latency ${latency}ms exceeds threshold ${MONITORING_CONFIG.maxApiLatency}ms`, 'HIGH')
    }
    
    // Check error rate
    const errorRate = this.metrics.api.failedRequests / this.metrics.api.totalRequests
    if (errorRate > MONITORING_CONFIG.maxErrorRate) {
      this.createAlert('HIGH_ERROR_RATE', `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(MONITORING_CONFIG.maxErrorRate * 100).toFixed(2)}%`, 'CRITICAL')
    }
  }

  // Track trading performance
  trackOrder(orderData, success = true, latency = 0, slippage = 0) {
    this.metrics.trading.totalOrders++
    this.metrics.trading.lastOrderLatency = latency
    
    if (success) {
      this.metrics.trading.successfulOrders++
    } else {
      this.metrics.trading.failedOrders++
    }
    
    if (slippage > 0) {
      this.metrics.trading.averageSlippage = (this.metrics.trading.averageSlippage * (this.metrics.trading.totalOrders - 1) + slippage) / this.metrics.trading.totalOrders
    }
    
    // Check for order latency violations
    if (latency > MONITORING_CONFIG.maxOrderLatency) {
      this.createAlert('HIGH_ORDER_LATENCY', `Order latency ${latency}ms exceeds threshold ${MONITORING_CONFIG.maxOrderLatency}ms`, 'HIGH')
    }
    
    // Check for slippage violations
    if (slippage > MONITORING_CONFIG.maxSlippage) {
      this.createAlert('HIGH_SLIPPAGE', `Slippage ${(slippage * 100).toFixed(2)}% exceeds threshold ${(MONITORING_CONFIG.maxSlippage * 100).toFixed(2)}%`, 'MEDIUM')
    }
    
    // Check for failed orders
    if (this.metrics.trading.failedOrders > MONITORING_CONFIG.maxFailedOrders) {
      this.createAlert('TOO_MANY_FAILED_ORDERS', `${this.metrics.trading.failedOrders} failed orders exceeds threshold ${MONITORING_CONFIG.maxFailedOrders}`, 'CRITICAL')
    }
  }

  // Update system metrics
  updateSystemMetrics() {
    const memUsage = process.memoryUsage()
    this.metrics.system.memoryUsage = memUsage.heapUsed / memUsage.heapTotal
    this.metrics.system.uptime = process.uptime()
    
    // Check memory usage
    if (this.metrics.system.memoryUsage > MONITORING_CONFIG.maxMemoryUsage) {
      this.createAlert('HIGH_MEMORY_USAGE', `Memory usage ${(this.metrics.system.memoryUsage * 100).toFixed(2)}% exceeds threshold ${(MONITORING_CONFIG.maxMemoryUsage * 100).toFixed(2)}%`, 'HIGH')
    }
    
    // Update risk metrics
    const riskStatus = riskManager.getRiskStatus()
    this.metrics.risk.violations = riskStatus.state.violations.length
    this.metrics.risk.alerts = riskStatus.state.alerts.length
    this.metrics.risk.riskLevel = riskStatus.riskLevel
  }

  // Create alert
  createAlert(type, message, severity = 'MEDIUM') {
    const now = new Date()
    const lastAlert = monitoringState.alerts.find(a => a.type === type)
    
    // Check cooldown
    if (lastAlert && (now - new Date(lastAlert.timestamp)) < MONITORING_CONFIG.alertCooldown) {
      return
    }
    
    const alert = {
      type,
      message,
      severity,
      timestamp: now.toISOString(),
      metrics: { ...this.metrics }
    }
    
    monitoringState.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (monitoringState.alerts.length > 100) {
      monitoringState.alerts = monitoringState.alerts.slice(-100)
    }
    
    // Log based on severity
    switch (severity) {
      case 'CRITICAL':
        logger.critical(`CRITICAL ALERT: ${type} - ${message}`)
        break
      case 'HIGH':
        logger.error(`HIGH ALERT: ${type} - ${message}`)
        break
      case 'MEDIUM':
        logger.warn(`MEDIUM ALERT: ${type} - ${message}`)
        break
      default:
        logger.info(`ALERT: ${type} - ${message}`)
    }
    
    return alert
  }

  // Get performance metrics
  getMetrics() {
    this.updateSystemMetrics()
    return {
      ...this.metrics,
      uptime: process.uptime(),
      startTime: this.startTime.toISOString()
    }
  }

  // Get health status
  getHealthStatus() {
    const issues = []
    
    // Check API health
    if (this.metrics.api.failedRequests / Math.max(this.metrics.api.totalRequests, 1) > MONITORING_CONFIG.maxErrorRate) {
      issues.push('High API error rate')
    }
    
    // Check trading health
    if (this.metrics.trading.failedOrders > MONITORING_CONFIG.maxFailedOrders) {
      issues.push('Too many failed orders')
    }
    
    // Check system health
    if (this.metrics.system.memoryUsage > MONITORING_CONFIG.maxMemoryUsage) {
      issues.push('High memory usage')
    }
    
    // Check risk health
    if (this.metrics.risk.riskLevel === 'CRITICAL') {
      issues.push('Critical risk level')
    }
    
    const status = issues.length === 0 ? 'healthy' : 'degraded'
    
    monitoringState.health = {
      status,
      lastCheck: new Date(),
      issues
    }
    
    return monitoringState.health
  }

  // Get alerts
  getAlerts(severity = null, limit = 50) {
    let alerts = monitoringState.alerts
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity)
    }
    
    return alerts.slice(-limit)
  }

  // Reset metrics (for testing)
  resetMetrics() {
    this.metrics = {
      api: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        lastLatency: 0
      },
      trading: {
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        averageSlippage: 0,
        lastOrderLatency: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        uptime: 0
      },
      risk: {
        violations: 0,
        alerts: 0,
        riskLevel: 'LOW'
      }
    }
    
    monitoringState.alerts = []
    logger.info('Monitoring metrics reset')
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Middleware for tracking API requests
export const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now()
  
  // Track request
  res.on('finish', () => {
    const latency = Date.now() - startTime
    const success = res.statusCode < 400
    
    performanceMonitor.trackApiRequest(latency, success)
  })
  
  next()
}
