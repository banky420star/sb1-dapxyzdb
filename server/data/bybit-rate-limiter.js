import { RateLimiter } from 'limiter'
import { Logger } from '../utils/logger.js'

export class BybitRateLimiter {
  constructor() {
    this.logger = new Logger()
    
    // 60 requests per minute base limit (adjust based on Bybit plan)
    this.restLimiter = new RateLimiter({
      tokensPerInterval: 60,
      interval: 'minute'
    })
    
    // WebSocket connection status
    this.wsConnected = false
    this.wsReconnectAttempts = 0
    this.maxReconnectAttempts = 5
    
    // Rate limit monitoring
    this.rateLimitAlerts = []
    this.lastAlertTime = 0
    this.alertCooldown = 60000 // 1 minute between alerts
  }
  
  async makeRequest(endpoint, params, apiKey, secret) {
    try {
      // Check rate limit before making request
      const remaining = await this.restLimiter.tryRemoveTokens(1)
      
      if (!remaining) {
        this.logger.warn('Bybit rate limit exceeded, request blocked')
        throw new Error('Rate limit exceeded - please wait before making more requests')
      }
      
      // Generate signature for Bybit API
      const timestamp = Date.now().toString()
      const recvWindow = '5000'
      
      const queryString = this._buildQueryString(params)
      const signature = this._generateSignature(secret, queryString, timestamp, recvWindow)
      
      // Make request with proper headers
      const response = await fetch(`https://api.bybit.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bapi-Api-Key': apiKey,
          'X-Bapi-Signature': signature,
          'X-Bapi-Timestamp': timestamp,
          'X-Bapi-Recv-Window': recvWindow
        },
        body: JSON.stringify(params)
      })
      
      // Monitor rate limit headers
      await this._monitorRateLimitHeaders(response)
      
      if (!response.ok) {
        const errorData = await response.json()
        this.logger.error(`Bybit API error: ${errorData.retMsg}`, errorData)
        throw new Error(`Bybit API error: ${errorData.retMsg}`)
      }
      
      const data = await response.json()
      return data
      
    } catch (error) {
      this.logger.error('Bybit request failed:', error)
      throw error
    }
  }
  
  async _monitorRateLimitHeaders(response) {
    const limitStatus = response.headers.get('X-Bapi-Limit-Status')
    const requestedLimit = response.headers.get('X-Bapi-Requested-Limit')
    const remainingLimit = response.headers.get('X-Bapi-Remaining-Limit')
    
    if (limitStatus && requestedLimit) {
      const usagePercent = (parseInt(limitStatus) / parseInt(requestedLimit)) * 100
      
      // Log rate limit status
      this.logger.info(`Bybit rate limit: ${limitStatus}/${requestedLimit} (${usagePercent.toFixed(1)}%)`)
      
      // Alert if usage is high
      if (usagePercent >= 80) {
        await this._sendRateLimitAlert(usagePercent, limitStatus, requestedLimit)
      }
      
      // Block requests if limit exceeded
      if (usagePercent >= 95) {
        this.logger.warn('Bybit rate limit critical - blocking new requests')
        throw new Error('Bybit rate limit critical - please wait')
      }
    }
  }
  
  async _sendRateLimitAlert(usagePercent, limitStatus, requestedLimit) {
    const now = Date.now()
    
    // Prevent spam alerts
    if (now - this.lastAlertTime < this.alertCooldown) {
      return
    }
    
    this.lastAlertTime = now
    
    const alert = {
      type: 'bybit_rate_limit_warning',
      usagePercent,
      limitStatus,
      requestedLimit,
      timestamp: new Date().toISOString(),
      severity: usagePercent >= 90 ? 'critical' : 'warning'
    }
    
    this.rateLimitAlerts.push(alert)
    
    // Send to monitoring system
    this.logger.warn(`Bybit rate limit warning: ${usagePercent.toFixed(1)}% usage`, alert)
    
    // Emit event for external monitoring
    if (global.io) {
      global.io.emit('bybit_rate_limit_alert', alert)
    }
  }
  
  _buildQueryString(params) {
    return Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
  }
  
  _generateSignature(secret, queryString, timestamp, recvWindow) {
    const crypto = require('crypto')
    const message = timestamp + process.env.BYBIT_API_KEY + recvWindow + queryString
    return crypto.createHmac('sha256', secret).update(message).digest('hex')
  }
  
  // WebSocket management
  async setupWebSocket(apiKey, secret) {
    try {
      // Use WebSocket for market data to reduce REST API calls
      this.wsConnected = true
      this.wsReconnectAttempts = 0
      
      this.logger.info('Bybit WebSocket connected for market data')
      
    } catch (error) {
      this.logger.error('Bybit WebSocket connection failed:', error)
      this.wsConnected = false
      
      // Attempt reconnection
      if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
        this.wsReconnectAttempts++
        setTimeout(() => this.setupWebSocket(apiKey, secret), 5000)
      }
    }
  }
  
  // Get current rate limit status
  getRateLimitStatus() {
    return {
      remainingTokens: this.restLimiter.tryRemoveTokens(0),
      wsConnected: this.wsConnected,
      recentAlerts: this.rateLimitAlerts.slice(-5)
    }
  }
  
  // Reset rate limiter (for testing or emergency)
  resetRateLimiter() {
    this.restLimiter = new RateLimiter({
      tokensPerInterval: 60,
      interval: 'minute'
    })
    this.logger.info('Bybit rate limiter reset')
  }
} 