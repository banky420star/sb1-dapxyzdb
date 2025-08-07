import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import crypto from 'crypto'

export class BybitTradingV5 extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    
    // Configuration
    this.config = {
      apiKey: process.env.BYBIT_API_KEY || '3fg29yhr1a9JJ1etm3',
      secret: process.env.BYBIT_SECRET || 'wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14',
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
    
    // Trading state
    this.orders = new Map()
    this.executions = new Map()
    this.positions = new Map()
    this.activeOrders = new Set()
    
    // Performance tracking
    this.performance = {
      totalOrders: 0,
      successfulOrders: 0,
      failedOrders: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      startTime: Date.now()
    }
    
    this.logger.info('🚀 Bybit V5 Trading module initialized')
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

  // Order Management Methods

  /**
   * Place an order (supports all product types)
   * @param {Object} orderParams - Order parameters
   * @param {string} orderParams.category - Product type: linear, inverse, spot, option
   * @param {string} orderParams.symbol - Symbol name (e.g., BTCUSDT)
   * @param {string} orderParams.side - Buy or Sell
   * @param {string} orderParams.orderType - Market or Limit
   * @param {string} orderParams.qty - Order quantity
   * @param {string} orderParams.price - Order price (required for Limit orders)
   * @param {string} orderParams.timeInForce - GTC, IOC, FOK, PostOnly, RPI
   * @param {string} orderParams.orderLinkId - Custom order ID (max 36 chars)
   * @param {boolean} orderParams.reduceOnly - Reduce only order
   * @param {boolean} orderParams.closeOnTrigger - Close on trigger order
   * @param {string} orderParams.takeProfit - Take profit price
   * @param {string} orderParams.stopLoss - Stop loss price
   * @param {string} orderParams.triggerPrice - Conditional order trigger price
   * @param {string} orderParams.triggerBy - Trigger price type: LastPrice, IndexPrice, MarkPrice
   * @param {string} orderParams.triggerDirection - 1: rise, 2: fall
   * @param {string} orderParams.orderFilter - Order, tpslOrder, StopOrder (spot only)
   * @param {string} orderParams.tpslMode - Full or Partial
   * @param {string} orderParams.tpOrderType - Market or Limit
   * @param {string} orderParams.slOrderType - Market or Limit
   * @param {string} orderParams.tpLimitPrice - Limit price for take profit
   * @param {string} orderParams.slLimitPrice - Limit price for stop loss
   * @param {string} orderParams.tpTriggerBy - TP trigger price type
   * @param {string} orderParams.slTriggerBy - SL trigger price type
   * @param {number} orderParams.positionIdx - Position index (0, 1, 2)
   * @param {number} orderParams.isLeverage - Whether to borrow (spot only)
   * @param {string} orderParams.marketUnit - baseCoin or quoteCoin (spot market orders)
   * @param {string} orderParams.slippageToleranceType - TickSize or Percent
   * @param {string} orderParams.slippageTolerance - Slippage tolerance value
   * @param {string} orderParams.orderIv - Implied volatility (options only)
   * @param {string} orderParams.smpType - SMP execution type
   * @param {boolean} orderParams.mmp - Market maker protection (options only)
   */
  async placeOrder(orderParams) {
    try {
      this.logger.info('🚀 Placing order...', orderParams)
      
      // Validate required parameters
      this.validateOrderParams(orderParams)
      
      // Check order limits
      await this.checkOrderLimits(orderParams.category, orderParams.symbol)
      
      const result = await this.makeRequest('/v5/order/create', 'POST', orderParams)
      
      if (result.orderId) {
        // Store order with enhanced metadata
        this.orders.set(result.orderId, {
          ...result,
          ...orderParams,
          timestamp: Date.now(),
          status: 'Created',
          category: orderParams.category,
          symbol: orderParams.symbol,
          side: orderParams.side,
          orderType: orderParams.orderType,
          qty: orderParams.qty,
          price: orderParams.price,
          timeInForce: orderParams.timeInForce
        })
        
        this.activeOrders.add(result.orderId)
        this.performance.totalOrders++
        
        this.emit('order_placed', {
          orderId: result.orderId,
          orderLinkId: result.orderLinkId,
          order: result,
          params: orderParams,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Order placed: ${result.orderId}`)
        this.logger.info(`📋 Order Link ID: ${result.orderLinkId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to place order:', error)
      this.performance.failedOrders++
      throw error
    }
  }

  /**
   * Validate order parameters
   * @param {Object} orderParams - Order parameters to validate
   */
  validateOrderParams(orderParams) {
    const required = ['category', 'symbol', 'side', 'orderType', 'qty']
    const missing = required.filter(param => !orderParams[param])
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`)
    }
    
    // Validate category
    const validCategories = ['linear', 'inverse', 'spot', 'option']
    if (!validCategories.includes(orderParams.category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
    }
    
    // Validate side
    if (!['Buy', 'Sell'].includes(orderParams.side)) {
      throw new Error('Side must be "Buy" or "Sell"')
    }
    
    // Validate order type
    if (!['Market', 'Limit'].includes(orderParams.orderType)) {
      throw new Error('Order type must be "Market" or "Limit"')
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
    if (orderParams.orderLinkId && orderParams.orderLinkId.length > 36) {
      throw new Error('Order link ID must be 36 characters or less')
    }
    
    // Validate timeInForce
    if (orderParams.timeInForce && !['GTC', 'IOC', 'FOK', 'PostOnly', 'RPI'].includes(orderParams.timeInForce)) {
      throw new Error('Time in force must be "GTC", "IOC", "FOK", "PostOnly", or "RPI"')
    }
    
    // Validate triggerDirection
    if (orderParams.triggerDirection && ![1, 2].includes(parseInt(orderParams.triggerDirection))) {
      throw new Error('Trigger direction must be 1 (rise) or 2 (fall)')
    }
    
    // Validate positionIdx
    if (orderParams.positionIdx !== undefined && ![0, 1, 2].includes(parseInt(orderParams.positionIdx))) {
      throw new Error('Position index must be 0, 1, or 2')
    }
  }

  /**
   * Check order limits based on category
   * @param {string} category - Product category
   * @param {string} symbol - Symbol name
   */
  async checkOrderLimits(category, symbol) {
    try {
      const openOrders = await this.getOpenOrders({
        category: category,
        symbol: symbol,
        limit: 100
      })
      
      let maxOrders = 500 // Default limit
      
      if (category === 'option') {
        maxOrders = 50
      } else if (category === 'spot') {
        maxOrders = 500 // Total, including max 30 TP/SL and 30 conditional per symbol
      }
      
      const activeOrderCount = openOrders.list?.length || 0
      
      if (activeOrderCount >= maxOrders) {
        throw new Error(`Maximum order limit reached (${maxOrders} open orders for ${category})`)
      }
      
      this.logger.info(`📊 Active orders for ${symbol}: ${activeOrderCount}/${maxOrders}`)
      
    } catch (error) {
      this.logger.warn('⚠️ Could not check order limits:', error.message)
    }
  }

  /**
   * Cancel an order
   * @param {Object} cancelParams - Cancel parameters
   * @param {string} cancelParams.category - Product type
   * @param {string} cancelParams.symbol - Symbol name
   * @param {string} cancelParams.orderId - Order ID (either orderId or orderLinkId required)
   * @param {string} cancelParams.orderLinkId - Order link ID (either orderId or orderLinkId required)
   */
  async cancelOrder(cancelParams) {
    try {
      this.logger.info('❌ Cancelling order...', cancelParams)
      
      if (!cancelParams.orderId && !cancelParams.orderLinkId) {
        throw new Error('Either orderId or orderLinkId is required')
      }
      
      const result = await this.makeRequest('/v5/order/cancel', 'POST', cancelParams)
      
      if (result.orderId) {
        // Update local order data
        const order = this.orders.get(result.orderId)
        if (order) {
          order.status = 'Cancelled'
          order.cancelledAt = Date.now()
        }
        
        this.activeOrders.delete(result.orderId)
        
        this.emit('order_cancelled', {
          orderId: result.orderId,
          orderLinkId: result.orderLinkId,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Order cancelled: ${result.orderId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to cancel order:', error)
      throw error
    }
  }

  /**
   * Amend an order
   * @param {Object} amendParams - Amendment parameters
   * @param {string} amendParams.category - Product type
   * @param {string} amendParams.symbol - Symbol name
   * @param {string} amendParams.orderId - Order ID (either orderId or orderLinkId required)
   * @param {string} amendParams.orderLinkId - Order link ID (either orderId or orderLinkId required)
   * @param {string} amendParams.qty - New quantity
   * @param {string} amendParams.price - New price
   * @param {string} amendParams.takeProfit - New take profit price
   * @param {string} amendParams.stopLoss - New stop loss price
   * @param {string} amendParams.tpTriggerBy - TP trigger price type
   * @param {string} amendParams.slTriggerBy - SL trigger price type
   */
  async amendOrder(amendParams) {
    try {
      this.logger.info('✏️ Amending order...', amendParams)
      
      if (!amendParams.orderId && !amendParams.orderLinkId) {
        throw new Error('Either orderId or orderLinkId is required')
      }
      
      const result = await this.makeRequest('/v5/order/amend', 'POST', amendParams)
      
      if (result.orderId) {
        // Update local order data
        const order = this.orders.get(result.orderId)
        if (order) {
          if (amendParams.qty) order.qty = amendParams.qty
          if (amendParams.price) order.price = amendParams.price
          if (amendParams.takeProfit) order.takeProfit = amendParams.takeProfit
          if (amendParams.stopLoss) order.stopLoss = amendParams.stopLoss
          order.amendedAt = Date.now()
          order.amendmentCount = (order.amendmentCount || 0) + 1
        }
        
        this.emit('order_amended', {
          orderId: result.orderId,
          orderLinkId: result.orderLinkId,
          amendments: amendParams,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Order amended: ${result.orderId}`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to amend order:', error)
      throw error
    }
  }

  /**
   * Cancel all orders
   * @param {Object} cancelAllParams - Cancel all parameters
   * @param {string} cancelAllParams.category - Product type
   * @param {string} cancelAllParams.symbol - Symbol name (optional)
   * @param {string} cancelAllParams.baseCoin - Base coin (optional)
   * @param {string} cancelAllParams.settleCoin - Settle coin (optional)
   * @param {string} cancelAllParams.orderFilter - Order filter (optional)
   */
  async cancelAllOrders(cancelAllParams) {
    try {
      this.logger.info('❌ Cancelling all orders...', cancelAllParams)
      
      const result = await this.makeRequest('/v5/order/cancel-all', 'POST', cancelAllParams)
      
      if (result.list) {
        // Update local order data
        result.list.forEach(cancelledOrder => {
          const order = this.orders.get(cancelledOrder.orderId)
          if (order) {
            order.status = 'Cancelled'
            order.cancelledAt = Date.now()
          }
          this.activeOrders.delete(cancelledOrder.orderId)
        })
        
        this.emit('all_orders_cancelled', {
          cancelledOrders: result.list,
          timestamp: Date.now()
        })
        
        this.logger.info(`✅ Cancelled ${result.list.length} orders`)
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to cancel all orders:', error)
      throw error
    }
  }

  /**
   * Get open orders
   * @param {Object} options - Query parameters
   * @param {string} options.category - Product type
   * @param {string} options.symbol - Symbol name (optional)
   * @param {string} options.baseCoin - Base coin (optional)
   * @param {string} options.settleCoin - Settle coin (optional)
   * @param {string} options.orderId - Order ID (optional)
   * @param {string} options.orderLinkId - Order link ID (optional)
   * @param {string} options.openOnly - Open only (optional)
   * @param {string} options.orderFilter - Order filter (optional)
   * @param {number} options.limit - Limit (optional, default: 20)
   * @param {string} options.cursor - Cursor (optional)
   */
  async getOpenOrders(options = {}) {
    try {
      this.logger.info('📊 Getting open orders...', options)
      
      const result = await this.makeRequest('/v5/order/realtime', 'GET', options)
      
      // Update local order data
      if (result.list) {
        result.list.forEach(orderData => {
          this.orders.set(orderData.orderId, {
            ...orderData,
            timestamp: Date.now()
          })
        })
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get open orders:', error)
      throw error
    }
  }

  /**
   * Get order history
   * @param {Object} options - Query parameters
   * @param {string} options.category - Product type
   * @param {string} options.symbol - Symbol name (optional)
   * @param {string} options.baseCoin - Base coin (optional)
   * @param {string} options.orderId - Order ID (optional)
   * @param {string} options.orderLinkId - Order link ID (optional)
   * @param {string} options.orderFilter - Order filter (optional)
   * @param {string} options.orderStatus - Order status (optional)
   * @param {number} options.startTime - Start time (optional)
   * @param {number} options.endTime - End time (optional)
   * @param {number} options.limit - Limit (optional, default: 20)
   * @param {string} options.cursor - Cursor (optional)
   */
  async getOrderHistory(options = {}) {
    try {
      this.logger.info('📊 Getting order history...', options)
      
      const result = await this.makeRequest('/v5/order/history', 'GET', options)
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get order history:', error)
      throw error
    }
  }

  /**
   * Get trade history
   * @param {Object} options - Query parameters
   * @param {string} options.category - Product type
   * @param {string} options.symbol - Symbol name (optional)
   * @param {string} options.baseCoin - Base coin (optional)
   * @param {string} options.orderId - Order ID (optional)
   * @param {string} options.orderLinkId - Order link ID (optional)
   * @param {string} options.execType - Execution type (optional)
   * @param {number} options.startTime - Start time (optional)
   * @param {number} options.endTime - End time (optional)
   * @param {number} options.limit - Limit (optional, default: 20)
   * @param {string} options.cursor - Cursor (optional)
   */
  async getTradeHistory(options = {}) {
    try {
      this.logger.info('📊 Getting trade history...', options)
      
      const result = await this.makeRequest('/v5/execution/list', 'GET', options)
      
      // Update local execution data
      if (result.list) {
        result.list.forEach(execution => {
          this.executions.set(execution.execId, {
            ...execution,
            timestamp: Date.now()
          })
        })
      }
      
      return result
      
    } catch (error) {
      this.logger.error('❌ Failed to get trade history:', error)
      throw error
    }
  }

  // Convenience Methods for Common Order Types

  /**
   * Place a limit order
   * @param {string} category - Product type
   * @param {string} symbol - Symbol name
   * @param {string} side - Buy or Sell
   * @param {string} qty - Quantity
   * @param {string} price - Price
   * @param {string} timeInForce - Time in force (default: GTC)
   * @param {string} orderLinkId - Custom order ID (optional)
   */
  async placeLimitOrder(category, symbol, side, qty, price, timeInForce = 'GTC', orderLinkId = null) {
    try {
      this.logger.info(`💰 Placing limit order: ${symbol} ${side} ${qty} @ ${price}`)
      
      return await this.placeOrder({
        category: category,
        symbol: symbol,
        side: side,
        orderType: 'Limit',
        qty: qty,
        price: price,
        timeInForce: timeInForce,
        orderLinkId: orderLinkId || `limit_${Date.now()}`
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to place limit order:', error)
      throw error
    }
  }

  /**
   * Place a market order
   * @param {string} category - Product type
   * @param {string} symbol - Symbol name
   * @param {string} side - Buy or Sell
   * @param {string} qty - Quantity
   * @param {string} timeInForce - Time in force (default: IOC)
   * @param {string} orderLinkId - Custom order ID (optional)
   */
  async placeMarketOrder(category, symbol, side, qty, timeInForce = 'IOC', orderLinkId = null) {
    try {
      this.logger.info(`⚡ Placing market order: ${symbol} ${side} ${qty}`)
      
      return await this.placeOrder({
        category: category,
        symbol: symbol,
        side: side,
        orderType: 'Market',
        qty: qty,
        timeInForce: timeInForce,
        orderLinkId: orderLinkId || `market_${Date.now()}`
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to place market order:', error)
      throw error
    }
  }

  /**
   * Place a post-only order
   * @param {string} category - Product type
   * @param {string} symbol - Symbol name
   * @param {string} side - Buy or Sell
   * @param {string} qty - Quantity
   * @param {string} price - Price
   * @param {string} orderLinkId - Custom order ID (optional)
   */
  async placePostOnlyOrder(category, symbol, side, qty, price, orderLinkId = null) {
    try {
      this.logger.info(`📝 Placing post-only order: ${symbol} ${side} ${qty} @ ${price}`)
      
      return await this.placeOrder({
        category: category,
        symbol: symbol,
        side: side,
        orderType: 'Limit',
        qty: qty,
        price: price,
        timeInForce: 'PostOnly',
        orderLinkId: orderLinkId || `postonly_${Date.now()}`
      })
      
    } catch (error) {
      this.logger.error('❌ Failed to place post-only order:', error)
      throw error
    }
  }

  /**
   * Place a conditional order
   * @param {string} category - Product type
   * @param {string} symbol - Symbol name
   * @param {string} side - Buy or Sell
   * @param {string} orderType - Market or Limit
   * @param {string} qty - Quantity
   * @param {string} triggerPrice - Trigger price
   * @param {number} triggerDirection - 1: rise, 2: fall
   * @param {string} price - Price (for limit orders)
   * @param {string} orderLinkId - Custom order ID (optional)
   */
  async placeConditionalOrder(category, symbol, side, orderType, qty, triggerPrice, triggerDirection, price = null, orderLinkId = null) {
    try {
      this.logger.info(`🎯 Placing conditional order: ${symbol} ${side} ${qty} @ ${triggerPrice}`)
      
      const orderParams = {
        category: category,
        symbol: symbol,
        side: side,
        orderType: orderType,
        qty: qty,
        triggerPrice: triggerPrice,
        triggerDirection: triggerDirection,
        orderLinkId: orderLinkId || `conditional_${Date.now()}`
      }
      
      if (orderType === 'Limit' && price) {
        orderParams.price = price
      }
      
      return await this.placeOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to place conditional order:', error)
      throw error
    }
  }

  /**
   * Place an order with take profit and stop loss
   * @param {string} category - Product type
   * @param {string} symbol - Symbol name
   * @param {string} side - Buy or Sell
   * @param {string} orderType - Market or Limit
   * @param {string} qty - Quantity
   * @param {string} price - Price (for limit orders)
   * @param {string} takeProfit - Take profit price
   * @param {string} stopLoss - Stop loss price
   * @param {string} orderLinkId - Custom order ID (optional)
   */
  async placeOrderWithTPSL(category, symbol, side, orderType, qty, price, takeProfit, stopLoss, orderLinkId = null) {
    try {
      this.logger.info(`🎯 Placing order with TP/SL: ${symbol} ${side} ${qty} TP:${takeProfit} SL:${stopLoss}`)
      
      const orderParams = {
        category: category,
        symbol: symbol,
        side: side,
        orderType: orderType,
        qty: qty,
        takeProfit: takeProfit,
        stopLoss: stopLoss,
        orderLinkId: orderLinkId || `tpsl_${Date.now()}`
      }
      
      if (orderType === 'Limit' && price) {
        orderParams.price = price
      }
      
      return await this.placeOrder(orderParams)
      
    } catch (error) {
      this.logger.error('❌ Failed to place order with TP/SL:', error)
      throw error
    }
  }

  // Performance and Status Methods

  /**
   * Update performance metrics
   * @param {Object} execution - Execution data
   */
  updatePerformanceMetrics(execution) {
    try {
      const pnl = parseFloat(execution.execPnl || 0)
      this.performance.totalPnL += pnl
      
      if (pnl > 0) {
        this.performance.successfulOrders++
      } else if (pnl < 0) {
        this.performance.failedOrders++
      }
      
      // Update max drawdown
      if (pnl < 0 && Math.abs(pnl) > this.performance.maxDrawdown) {
        this.performance.maxDrawdown = Math.abs(pnl)
      }
      
    } catch (error) {
      this.logger.error('❌ Error updating performance metrics:', error)
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const uptime = Date.now() - this.performance.startTime
    const successRate = this.performance.totalOrders > 0 
      ? ((this.performance.successfulOrders / this.performance.totalOrders) * 100).toFixed(2) + '%'
      : '0.00%'
    
    return {
      ...this.performance,
      successRate: successRate,
      totalTrades: this.executions.size,
      uptime: uptime
    }
  }

  /**
   * Get all orders
   * @returns {Array} Array of orders
   */
  getOrders() {
    return Array.from(this.orders.values())
  }

  /**
   * Get all executions
   * @returns {Array} Array of executions
   */
  getExecutions() {
    return Array.from(this.executions.values())
  }

  /**
   * Get active orders
   * @returns {Array} Array of active order IDs
   */
  getActiveOrders() {
    return Array.from(this.activeOrders)
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Object|null} Order data
   */
  getOrder(orderId) {
    return this.orders.get(orderId) || null
  }

  /**
   * Get execution by ID
   * @param {string} execId - Execution ID
   * @returns {Object|null} Execution data
   */
  getExecution(execId) {
    return this.executions.get(execId) || null
  }

  /**
   * Get system status
   * @returns {Object} System status
   */
  getStatus() {
    return {
      activeOrders: this.activeOrders.size,
      totalOrders: this.orders.size,
      totalExecutions: this.executions.size,
      performance: this.getPerformanceMetrics(),
      lastUpdate: Date.now()
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.logger.info('📊 Starting trading monitoring...')
    this.monitoringInterval = setInterval(() => {
      this.updateTradingData()
    }, 30000) // Update every 30 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      this.logger.info('📊 Trading monitoring stopped')
    }
  }

  /**
   * Update trading data
   */
  async updateTradingData() {
    try {
      // Update open orders
      await this.getOpenOrders({ limit: 100 })
      
      // Update trade history
      await this.getTradeHistory({ limit: 100 })
      
      this.emit('trading_data_updated', {
        status: this.getStatus(),
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error updating trading data:', error)
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up trading module...')
      
      this.stopMonitoring()
      
      // Clear data
      this.orders.clear()
      this.executions.clear()
      this.positions.clear()
      this.activeOrders.clear()
      
      this.logger.info('✅ Trading module cleaned up')
      
    } catch (error) {
      this.logger.error('❌ Error during cleanup:', error)
    }
  }
} 