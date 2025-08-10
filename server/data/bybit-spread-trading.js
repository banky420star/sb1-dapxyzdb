import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import crypto from 'crypto'

export class BybitSpreadTrading extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    
    // Configuration
    this.config = {
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_SECRET || '',
      testnet: process.env.BYBIT_TESTNET === 'true' || false,
      demo: process.env.BYBIT_DEMO === 'true' || false,
      recvWindow: 5000,
      ...options
    }
    
    // Set base URL based on environment
    if (this.config.demo) {
      this.config.baseUrl = 'https://api-demo.bybit.com'
    } else if (this.config.testnet) {
      this.config.baseUrl = 'https://api-testnet.bybit.com'
    } else {
      this.config.baseUrl = 'https://api.bybit.com'
    }
    
    // Spread trading state
    this.spreadOrders = new Map()
    this.spreadExecutions = new Map()
    this.spreadPositions = new Map()
    this.activeSpreads = new Set()
    
    // Performance tracking
    this.performance = {
      totalSpreads: 0,
      successfulSpreads: 0,
      failedSpreads: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now()
    }
    
    this.logger.info('🚀 Bybit Spread Trading module initialized')
  }

  // Authentication and request helpers
  generateSignature(timestamp, method, path, params = '') {
    const message = timestamp + this.config.apiKey + this.config.recvWindow + params
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(message)
      .digest('hex')
  }

  async makeRequest(endpoint, method = 'GET', params = {}) {
    try {
      const timestamp = Date.now().toString()
      const queryString = Object.keys(params).length > 0 
        ? '?' + new URLSearchParams(params).toString() 
        : ''
      
      const signature = this.generateSignature(timestamp, method, endpoint + queryString, queryString)
      
      const headers = {
        'X-BAPI-API-KEY': this.config.apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': this.config.recvWindow.toString(),
        'Content-Type': 'application/json'
      }
      
      const url = `${this.config.baseUrl}${endpoint}${queryString}`
      
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(params) : undefined
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.retCode !== 0) {
        throw new Error(`Bybit API Error: ${data.retMsg} (Code: ${data.retCode})`)
      }
      
      return data.result
      
    } catch (error) {
      this.logger.error('❌ API request failed:', error)
      throw error
    }
  }

  // Spread Trading Methods

  /**
   * Get spread execution list
   * @param {Object} options - Query parameters
   * @param {string} options.symbol - Spread combination symbol name
   * @param {string} options.orderId - Spread combination order ID
   * @param {string} options.orderLinkId - User customised order ID
   * @param {number} options.startTime - Start timestamp (ms)
   * @param {number} options.endTime - End timestamp (ms)
   * @param {number} options.limit - Limit for data size per page [1, 50]
   * @param {string} options.cursor - Cursor for pagination
   */
  async getSpreadExecutions(options = {}) {
    try {
      this.logger.info('📊 Fetching spread executions...')
      
      const result = await this.makeRequest('/v5/spread/execution/list', 'GET', options)
      
      // Process and store executions
      if (result.list && result.list.length > 0) {
        for (const execution of result.list) {
          this.spreadExecutions.set(execution.execId, {
            ...execution,
            timestamp: Date.now()
          })
          
          // Update performance metrics
          this.updatePerformanceMetrics(execution)
        }
      }
      
      this.logger.info(`✅ Retrieved ${result.list?.length || 0} spread executions`)
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get spread executions:', error)
      throw error
    }
  }

  /**
   * Get spread order history
   * @param {Object} options - Query parameters
   */
  async getSpreadOrderHistory(options = {}) {
    try {
      this.logger.info('📊 Fetching spread order history...')
      
      const result = await this.makeRequest('/v5/spread/order/list', 'GET', options)
      
      // Process and store orders
      if (result.list && result.list.length > 0) {
        for (const order of result.list) {
          this.spreadOrders.set(order.orderId, {
            ...order,
            timestamp: Date.now()
          })
        }
      }
      
      this.logger.info(`✅ Retrieved ${result.list?.length || 0} spread orders`)
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get spread order history:', error)
      throw error
    }
  }

  /**
   * Place a spread combination order
   * @param {Object} orderParams - Spread order parameters
   * @param {string} orderParams.symbol - Spread combination symbol name (e.g., "SOLUSDT_SOL/USDT")
   * @param {string} orderParams.side - Order side: "Buy" or "Sell"
   * @param {string} orderParams.orderType - Order type: "Limit" or "Market"
   * @param {string} orderParams.qty - Order quantity
   * @param {string} orderParams.price - Order price (required for Limit orders)
   * @param {string} orderParams.orderLinkId - User customised order ID (max 45 chars)
   * @param {string} orderParams.timeInForce - Time in force: "IOC", "FOK", "GTC", "PostOnly"
   */
  async placeSpreadOrder(orderParams) {
    try {
      this.logger.info('🚀 Placing spread combination order...', orderParams)
      
      // Validate required parameters
      this.validateSpreadOrderParams(orderParams)
      
      // Check order limits (max 50 open orders per account)
      await this.checkOrderLimits()
      
      const result = await this.makeRequest('/v5/spread/order/create', 'POST', orderParams)
      
      if (result.orderId) {
        // Store order with enhanced metadata
        this.spreadOrders.set(result.orderId, {
          ...result,
          ...orderParams,
          timestamp: Date.now(),
          status: 'Created',
          orderType: orderParams.orderType,
          side: orderParams.side,
          qty: orderParams.qty,
          price: orderParams.price,
          timeInForce: orderParams.timeInForce
        })
        
        this.activeSpreads.add(result.orderId)
        this.performance.totalSpreads++
        
        this.emit('spread_order_placed', {
          orderId: result.orderId,
          orderLinkId: result.orderLinkId,
          order: result,
          params: orderParams,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Spread combination order placed: ${result.orderId}`)
        this.logger.info(`📋 Order Link ID: ${result.orderLinkId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to place spread order:', error)
      this.performance.failedSpreads++
      throw error
    }
  }

  /**
   * Validate spread order parameters
   * @param {Object} orderParams - Order parameters to validate
   */
  validateSpreadOrderParams(orderParams) {
    const required = ['symbol', 'side', 'orderType', 'qty']
    const missing = required.filter(param => !orderParams[param])
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`)
    }
    
    // Validate side
    if (!['Buy', 'Sell'].includes(orderParams.side)) {
      throw new Error('Side must be "Buy" or "Sell"')
    }
    
    // Validate order type
    if (!['Limit', 'Market'].includes(orderParams.orderType)) {
      throw new Error('Order type must be "Limit" or "Market"')
    }
    
    // Validate quantity
    const qty = parseFloat(orderParams.qty)
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number')
    }
    
    // Validate price for Limit orders
    if (orderParams.orderType === 'Limit' && !orderParams.price) {
      throw new Error('Price is required for Limit orders')
    }
    
    // Validate orderLinkId length
    if (orderParams.orderLinkId && orderParams.orderLinkId.length > 45) {
      throw new Error('Order link ID must be 45 characters or less')
    }
    
    // Validate timeInForce
    if (orderParams.timeInForce && !['IOC', 'FOK', 'GTC', 'PostOnly'].includes(orderParams.timeInForce)) {
      throw new Error('Time in force must be "IOC", "FOK", "GTC", or "PostOnly"')
    }
  }

  /**
   * Check order limits (max 50 open orders per account)
   */
  async checkOrderLimits() {
    try {
      const openOrders = await this.getSpreadOrderHistory({
        limit: 100
      })
      
      const activeOrderCount = openOrders.list?.filter(order => 
        ['Created', 'New', 'PartiallyFilled'].includes(order.orderStatus)
      ).length || 0
      
      if (activeOrderCount >= 50) {
        throw new Error('Maximum order limit reached (50 open orders per account)')
      }
      
      this.logger.info(`📊 Active orders: ${activeOrderCount}/50`)
      
    } catch (error) {
      this.logger.warn('⚠️ Could not check order limits:', error.message)
    }
  }

  /**
   * Cancel a spread order
   * @param {string} orderId - Spread order ID
   */
  async cancelSpreadOrder(orderId) {
    try {
      this.logger.info(`❌ Cancelling spread order: ${orderId}`)
      
      const result = await this.makeRequest('/v5/spread/order/cancel', 'POST', {
        orderId: orderId
      })
      
      if (result.orderId) {
        const order = this.spreadOrders.get(orderId)
        if (order) {
          order.status = 'Cancelled'
          order.cancelTime = Date.now()
          this.spreadOrders.set(orderId, order)
        }
        
        this.activeSpreads.delete(orderId)
        
        this.emit('spread_order_cancelled', {
          orderId: orderId,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Spread order cancelled: ${orderId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to cancel spread order:', error)
      throw error
    }
  }

  /**
   * Amend a spread order
   * @param {Object} amendParams - Amendment parameters
   * @param {string} amendParams.symbol - Spread combination symbol name
   * @param {string} amendParams.orderId - Spread combination order ID (either orderId or orderLinkId required)
   * @param {string} amendParams.orderLinkId - User customised order ID (either orderId or orderLinkId required)
   * @param {string} amendParams.qty - Order quantity after modification (either qty or price required)
   * @param {string} amendParams.price - Order price after modification (either qty or price required)
   */
  async amendSpreadOrder(amendParams) {
    try {
      this.logger.info('✏️ Amending spread order...', amendParams)
      
      // Validate amendment parameters
      this.validateAmendOrderParams(amendParams)
      
      const result = await this.makeRequest('/v5/spread/order/amend', 'POST', amendParams)
      
      if (result.orderId) {
        // Update local order data
        const order = this.spreadOrders.get(result.orderId)
        if (order) {
          // Update with new parameters
          if (amendParams.qty) order.qty = amendParams.qty
          if (amendParams.price) order.price = amendParams.price
          order.amendedAt = Date.now()
          order.amendmentCount = (order.amendmentCount || 0) + 1
        }
        
        this.emit('spread_order_amended', {
          orderId: result.orderId,
          orderLinkId: result.orderLinkId,
          amendments: amendParams,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Spread order amended: ${result.orderId}`)
        this.logger.info(`📋 Order Link ID: ${result.orderLinkId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to amend spread order:', error)
      throw error
    }
  }

  /**
   * Validate amend order parameters
   * @param {Object} amendParams - Amendment parameters to validate
   */
  validateAmendOrderParams(amendParams) {
    // Check required symbol
    if (!amendParams.symbol) {
      throw new Error('Symbol is required for order amendment')
    }
    
    // Check that either orderId or orderLinkId is provided
    if (!amendParams.orderId && !amendParams.orderLinkId) {
      throw new Error('Either orderId or orderLinkId is required')
    }
    
    // Check that either qty or price is provided
    if (!amendParams.qty && !amendParams.price) {
      throw new Error('Either qty or price is required for amendment')
    }
    
    // Validate quantity if provided
    if (amendParams.qty) {
      const qty = parseFloat(amendParams.qty)
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Quantity must be a positive number')
      }
    }
    
    // Validate price if provided
    if (amendParams.price) {
      const price = parseFloat(amendParams.price)
      if (isNaN(price) || price < 0) {
        throw new Error('Price must be a non-negative number')
      }
    }
  }

  /**
   * Get spread positions
   * @param {Object} options - Query parameters
   */
  async getSpreadPositions(options = {}) {
    try {
      this.logger.info('📊 Fetching spread positions...')
      
      const result = await this.makeRequest('/v5/spread/position/list', 'GET', options)
      
      // Process and store positions
      if (result.list && result.list.length > 0) {
        for (const position of result.list) {
          this.spreadPositions.set(position.symbol, {
            ...position,
            timestamp: Date.now()
          })
        }
      }
      
      this.logger.info(`✅ Retrieved ${result.list?.length || 0} spread positions`)
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get spread positions:', error)
      throw error
    }
  }

  // Spread Strategy Methods

  /**
   * Create a calendar spread (same asset, different expiry)
   * @param {string} symbol - Base symbol (e.g., 'BTCUSDT')
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {string} nearExpiry - Near expiry date
   * @param {string} farExpiry - Far expiry date
   */
  async createCalendarSpread(symbol, side, qty, nearExpiry, farExpiry) {
    try {
      this.logger.info(`📅 Creating calendar spread: ${symbol} ${side} ${qty}`)
      
      const orderParams = {
        symbol: `${symbol}_${nearExpiry}_${farExpiry}`,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        timeInForce: 'GTC',
        orderLinkId: `cal_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to create calendar spread:', error)
      throw error
    }
  }

  /**
   * Create a butterfly spread (three legs)
   * @param {string} symbol - Base symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {number} lowerStrike - Lower strike price
   * @param {number} middleStrike - Middle strike price
   * @param {number} upperStrike - Upper strike price
   */
  async createButterflySpread(symbol, side, qty, lowerStrike, middleStrike, upperStrike) {
    try {
      this.logger.info(`🦋 Creating butterfly spread: ${symbol} ${side} ${qty}`)
      
      const orderParams = {
        symbol: `${symbol}_${lowerStrike}_${middleStrike}_${upperStrike}`,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        timeInForce: 'GTC',
        orderLinkId: `butterfly_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to create butterfly spread:', error)
      throw error
    }
  }

  /**
   * Create a straddle spread
   * @param {string} symbol - Base symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {number} strike - Strike price
   */
  async createStraddleSpread(symbol, side, qty, strike) {
    try {
      this.logger.info(`🎯 Creating straddle spread: ${symbol} ${side} ${qty}`)
      
      const orderParams = {
        symbol: `${symbol}_${strike}_straddle`,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        timeInForce: 'GTC',
        orderLinkId: `straddle_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to create straddle spread:', error)
      throw error
    }
  }

  /**
   * Place a limit spread order with specific price
   * @param {string} symbol - Spread combination symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {number} price - Limit price
   * @param {string} timeInForce - Time in force (default: 'GTC')
   * @param {string} orderLinkId - Custom order ID
   */
  async placeLimitSpreadOrder(symbol, side, qty, price, timeInForce = 'GTC', orderLinkId = null) {
    try {
      this.logger.info(`💰 Placing limit spread order: ${symbol} ${side} ${qty} @ ${price}`)
      
      const orderParams = {
        symbol: symbol,
        side: side,
        orderType: 'Limit',
        qty: qty.toString(),
        price: price.toString(),
        timeInForce: timeInForce,
        orderLinkId: orderLinkId || `limit_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to place limit spread order:', error)
      throw error
    }
  }

  /**
   * Place a market spread order
   * @param {string} symbol - Spread combination symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {string} timeInForce - Time in force (default: 'IOC')
   * @param {string} orderLinkId - Custom order ID
   */
  async placeMarketSpreadOrder(symbol, side, qty, timeInForce = 'IOC', orderLinkId = null) {
    try {
      this.logger.info(`⚡ Placing market spread order: ${symbol} ${side} ${qty}`)
      
      const orderParams = {
        symbol: symbol,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        timeInForce: timeInForce,
        orderLinkId: orderLinkId || `market_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to place market spread order:', error)
      throw error
    }
  }

  /**
   * Place a post-only spread order
   * @param {string} symbol - Spread combination symbol
   * @param {string} side - 'Buy' or 'Sell'
   * @param {number} qty - Quantity
   * @param {number} price - Limit price
   * @param {string} orderLinkId - Custom order ID
   */
  async placePostOnlySpreadOrder(symbol, side, qty, price, orderLinkId = null) {
    try {
      this.logger.info(`📝 Placing post-only spread order: ${symbol} ${side} ${qty} @ ${price}`)
      
      const orderParams = {
        symbol: symbol,
        side: side,
        orderType: 'Limit',
        qty: qty.toString(),
        price: price.toString(),
        timeInForce: 'PostOnly',
        orderLinkId: orderLinkId || `postonly_${Date.now()}`
      }
      
      return await this.placeSpreadOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to place post-only spread order:', error)
      throw error
    }
  }

  /**
   * Amend order quantity
   * @param {string} symbol - Spread combination symbol
   * @param {string} orderId - Order ID
   * @param {number} newQty - New quantity
   */
  async amendOrderQuantity(symbol, orderId, newQty) {
    try {
      this.logger.info(`📏 Amending order quantity: ${orderId} -> ${newQty}`)
      
      return await this.amendSpreadOrder({
        symbol: symbol,
        orderId: orderId,
        qty: newQty.toString()
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to amend order quantity:', error)
      throw error
    }
  }

  /**
   * Amend order price
   * @param {string} symbol - Spread combination symbol
   * @param {string} orderId - Order ID
   * @param {number} newPrice - New price
   */
  async amendOrderPrice(symbol, orderId, newPrice) {
    try {
      this.logger.info(`💰 Amending order price: ${orderId} -> ${newPrice}`)
      
      return await this.amendSpreadOrder({
        symbol: symbol,
        orderId: orderId,
        price: newPrice.toString()
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to amend order price:', error)
      throw error
    }
  }

  /**
   * Amend order by orderLinkId
   * @param {string} symbol - Spread combination symbol
   * @param {string} orderLinkId - Order link ID
   * @param {number} newQty - New quantity (optional)
   * @param {number} newPrice - New price (optional)
   */
  async amendOrderByLinkId(symbol, orderLinkId, newQty = null, newPrice = null) {
    try {
      this.logger.info(`🔗 Amending order by link ID: ${orderLinkId}`)
      
      const amendParams = {
        symbol: symbol,
        orderLinkId: orderLinkId
      }
      
      if (newQty !== null) amendParams.qty = newQty.toString()
      if (newPrice !== null) amendParams.price = newPrice.toString()
      
      return await this.amendSpreadOrder(amendParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to amend order by link ID:', error)
      throw error
    }
  }

  /**
   * Amend both quantity and price
   * @param {string} symbol - Spread combination symbol
   * @param {string} orderId - Order ID
   * @param {number} newQty - New quantity
   * @param {number} newPrice - New price
   */
  async amendOrderQtyAndPrice(symbol, orderId, newQty, newPrice) {
    try {
      this.logger.info(`🔄 Amending order qty & price: ${orderId} -> ${newQty} @ ${newPrice}`)
      
      return await this.amendSpreadOrder({
        symbol: symbol,
        orderId: orderId,
        qty: newQty.toString(),
        price: newPrice.toString()
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to amend order qty and price:', error)
      throw error
    }
  }

  // Performance and Analytics

  updatePerformanceMetrics(execution) {
    try {
      // Calculate P&L from execution
      if (execution.legs && execution.legs.length > 0) {
        let totalPnL = 0
        
        for (const leg of execution.legs) {
          // Calculate leg P&L (simplified calculation)
          const legValue = parseFloat(leg.execValue) || 0
          const legFee = parseFloat(leg.execFee) || 0
          
          if (leg.side === 'Buy') {
            totalPnL -= legValue + legFee
          } else {
            totalPnL += legValue - legFee
          }
        }
        
        this.performance.totalPnL += totalPnL
        
        // Update max drawdown
        if (totalPnL < 0) {
          const drawdown = Math.abs(totalPnL)
          if (drawdown > this.performance.maxDrawdown) {
            this.performance.maxDrawdown = drawdown
          }
        }
        
        // Update success rate
        if (totalPnL > 0) {
          this.performance.successfulSpreads++
        } else {
          this.performance.failedSpreads++
        }
      }
      
    } catch (error) {
      this.logger.error('❌ Error updating performance metrics:', error)
    }
  }

  getPerformanceMetrics() {
    const totalTrades = this.performance.successfulSpreads + this.performance.failedSpreads
    const successRate = totalTrades > 0 ? (this.performance.successfulSpreads / totalTrades) * 100 : 0
    
    return {
      ...this.performance,
      successRate: successRate.toFixed(2) + '%',
      totalTrades,
      uptime: Date.now() - this.performance.startTime
    }
  }

  // Data Retrieval Methods

  getSpreadOrders() {
    return Array.from(this.spreadOrders.values())
  }

  getSpreadExecutions() {
    return Array.from(this.spreadExecutions.values())
  }

  getSpreadPositions() {
    return Array.from(this.spreadPositions.values())
  }

  getActiveSpreads() {
    return Array.from(this.activeSpreads)
  }

  getSpreadOrder(orderId) {
    return this.spreadOrders.get(orderId) || null
  }

  getSpreadExecution(execId) {
    return this.spreadExecutions.get(execId) || null
  }

  getSpreadPosition(symbol) {
    return this.spreadPositions.get(symbol) || null
  }

  // Monitoring and Status

  getStatus() {
    return {
      activeSpreads: this.activeSpreads.size,
      totalOrders: this.spreadOrders.size,
      totalExecutions: this.spreadExecutions.size,
      totalPositions: this.spreadPositions.size,
      performance: this.getPerformanceMetrics(),
      lastUpdate: Date.now()
    }
  }

  // Real-time monitoring
  startMonitoring() {
    this.logger.info('📊 Starting spread trading monitoring...')
    
    // Monitor active spreads every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateSpreadData()
      } catch (error) {
        this.logger.error('❌ Error in spread monitoring:', error)
      }
    }, 30000)
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      this.logger.info('📊 Spread trading monitoring stopped')
    }
  }

  async updateSpreadData() {
    try {
      // Update positions
      await this.getSpreadPositions()
      
      // Update executions for active orders
      for (const orderId of this.activeSpreads) {
        await this.getSpreadExecutions({ orderId })
      }
      
      this.emit('spread_data_updated', {
        timestamp: Date.now(),
        status: this.getStatus()
      })
      
    } catch (error) {
      this.logger.error('❌ Error updating spread data:', error)
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up spread trading module...')
      
      this.stopMonitoring()
      
      this.spreadOrders.clear()
      this.spreadExecutions.clear()
      this.spreadPositions.clear()
      this.activeSpreads.clear()
      
      this.logger.info('✅ Spread trading module cleaned up')
      
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error)
      throw error
    }
  }
} 