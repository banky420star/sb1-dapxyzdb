import { EventEmitter } from 'events'
import zmq from 'zeromq'
import { Logger } from '../utils/logger.js'
import { DatabaseManager } from '../database/manager.js'
import { DataManager } from '../data/manager.js'
import { ModelManager } from '../ml/manager.js'
import { RiskManager } from '../risk/manager.js'
import { MetricsCollector } from '../monitoring/metrics.js'

export class TradingEngine extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    this.db = new DatabaseManager()
    this.dataManager = options.dataManager || new DataManager()
    this.modelManager = options.modelManager || new ModelManager()
    this.riskManager = options.riskManager || new RiskManager()
    this.metrics = options.metrics || new MetricsCollector()
    this.io = options.io // Socket.io instance
    
    // Trading state
    this.isRunning = false
    this.tradingMode = 'paper' // 'paper' or 'live'
    this.emergencyStop = false
    this.isInitialized = false
    
    // ZeroMQ connections
    this.zmqSockets = {
      command: null,    // REQ socket for commands
      data: null,       // SUB socket for data
      trade: null       // PUSH socket for trades
    }
    
    // Trading data
    this.positions = new Map()
    this.orders = new Map()
    this.trades = []
    this.balance = {
      equity: 10000,
      balance: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: 0
    }
    
    // Configuration (matches MT5 bridge ports)
    this.config = {
      zmq: {
        commandPort: 5555,    // MT5 REP socket (receives commands)
        dataPort: 5556,       // MT5 PUB socket (sends data)
        tradePort: 5555,      // Same as command port for this bridge
        host: 'localhost',
        timeout: 5000
      },
      trading: {
        maxPositions: 10,
        maxRiskPerTrade: 0.02, // 2%
        maxDailyLoss: 0.05,    // 5%
        slippage: 0.0001,      // 1 pip
        commission: 0.00007    // 0.7 pips
      },
      symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
      timeframes: ['1m', '5m', '15m', '1h']
    }
    
    // Performance tracking
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      startTime: Date.now()
    }
    
    // Signal processing
    this.signalQueue = []
    this.processingSignals = false
  }

  async initialize() {
    try {
      this.logger.info('Initializing Trading Engine')
      
      // Initialize dependencies
      await this.db.initialize()
      await this.dataManager.initialize()
      await this.modelManager.initialize()
      await this.riskManager.initialize()
      await this.metrics.initialize()
      
      // Setup ZeroMQ connections
      await this.setupZMQConnections()
      
      // Load existing positions and orders
      await this.loadTradingState()
      
      // Setup event listeners
      this.setupEventListeners()
      
      // Start signal processing
      this.startSignalProcessing()
      
      this.isInitialized = true
      this.logger.info('Trading Engine initialized successfully')
      
      return true
    } catch (error) {
      this.logger.error('Failed to initialize Trading Engine:', error)
      throw error
    }
  }

  async setupZMQConnections() {
    try {
      this.logger.info('Setting up ZeroMQ connections')
      
      // Command socket (REQ) - for sending commands to MT5
      this.zmqSockets.command = new zmq.Request()
      await this.zmqSockets.command.connect(`tcp://${this.config.zmq.host}:${this.config.zmq.commandPort}`)
      
      // Data socket (SUB) - for receiving market data from MT5
      this.zmqSockets.data = new zmq.Subscriber()
      await this.zmqSockets.data.connect(`tcp://${this.config.zmq.host}:${this.config.zmq.dataPort}`)
      this.zmqSockets.data.subscribe('PRICE')
      this.zmqSockets.data.subscribe('TICK')
      this.zmqSockets.data.subscribe('NEWS')
      
      // Trade socket (PUSH) - for sending trade orders to MT5
      this.zmqSockets.trade = new zmq.Push()
      await this.zmqSockets.trade.connect(`tcp://${this.config.zmq.host}:${this.config.zmq.tradePort}`)
      
      // Start listening for data
      this.startZMQDataListener()
      
      this.logger.info('ZeroMQ connections established')
    } catch (error) {
      this.logger.error('Error setting up ZeroMQ connections:', error)
      // Continue without ZMQ for development
      this.logger.warn('Continuing without ZeroMQ connections (development mode)')
    }
  }

  startZMQDataListener() {
    if (!this.zmqSockets.data) return
    
    // Listen for incoming data
    const processData = async () => {
      try {
        for await (const [topic, message] of this.zmqSockets.data) {
          const topicStr = topic.toString()
          const data = JSON.parse(message.toString())
          
          this.metrics.recordZMQMessage('received', topicStr)
          
          switch (topicStr) {
            case 'PRICE':
              await this.handlePriceUpdate(data)
              break
            case 'TICK':
              await this.handleTickUpdate(data)
              break
            case 'NEWS':
              await this.handleNewsUpdate(data)
              break
            default:
              this.logger.debug(`Unknown ZMQ topic: ${topicStr}`)
          }
        }
      } catch (error) {
        this.logger.error('Error in ZMQ data listener:', error)
        this.metrics.recordZMQError()
        
        // Attempt to reconnect
        setTimeout(() => {
          this.setupZMQConnections()
        }, 5000)
      }
    }
    
    processData()
  }

  async handlePriceUpdate(data) {
    try {
      // Update internal price data
      this.dataManager.emit('price_update', data)
      
      // Check for trading signals
      if (this.isRunning && !this.emergencyStop) {
        await this.checkTradingSignals(data.symbol)
      }
      
      // Update position P&L
      await this.updatePositionPnL(data)
      
      this.metrics.recordPriceUpdate(data)
    } catch (error) {
      this.logger.error('Error handling price update:', error)
    }
  }

  async handleTickUpdate(data) {
    try {
      // Process tick data for high-frequency analysis
      this.emit('tick_update', data)
      
      // Update metrics
      this.metrics.recordPriceUpdate(data)
    } catch (error) {
      this.logger.error('Error handling tick update:', error)
    }
  }

  async handleNewsUpdate(data) {
    try {
      // Process news events
      this.emit('news_update', data)
      
      // Check if news affects our positions
      await this.assessNewsImpact(data)
      
      this.metrics.recordNewsEvent(data)
    } catch (error) {
      this.logger.error('Error handling news update:', error)
    }
  }

  // Set MT5 ZeroMQ sockets from server
  setMT5Sockets(commandSocket, dataSocket) {
    this.zmqSockets = {
      command: commandSocket,
      data: dataSocket,
      trade: commandSocket // Use same socket for commands and trades
    }
    this.logger.info('MT5 ZeroMQ sockets configured')
  }

  // Handle MT5 tick data
  handleMT5Tick(tickData) {
    try {
      // Update price data
      const priceData = {
        symbol: tickData.sym,
        bid: tickData.bid,
        ask: tickData.ask,
        close: (tickData.bid + tickData.ask) / 2,
        spread: tickData.ask - tickData.bid,
        timestamp: new Date(tickData.ts * 1000)
      }
      
      // Update data manager
      this.dataManager.emit('price_update', priceData)
      
      // Update position P&L
      this.updatePositionPnL(priceData)
      
      // Check for trading signals on this new tick
      if (this.isRunning && !this.emergencyStop) {
        this.checkTradingSignals(tickData.sym)
      }
      
      // Update metrics
      this.metrics.recordPriceUpdate(priceData)
      
      // Emit to connected clients
      if (this.io) {
        this.io.emit('tick_update', {
          symbol: tickData.sym,
          bid: tickData.bid,
          ask: tickData.ask,
          timestamp: new Date(tickData.ts * 1000)
        })
      }
      
    } catch (error) {
      this.logger.error('Error handling MT5 tick:', error)
    }
  }

  async loadTradingState() {
    try {
      // Load positions from database
      const positions = await this.db.getActivePositions()
      for (const position of positions) {
        this.positions.set(position.id, position)
      }
      
      // Load pending orders
      const orders = await this.db.getPendingOrders()
      for (const order of orders) {
        this.orders.set(order.id, order)
      }
      
      // Load account balance
      const balance = await this.db.getAccountBalance()
      if (balance) {
        this.balance = balance
      }
      
      this.logger.info(`Loaded ${positions.length} positions and ${orders.length} orders`)
    } catch (error) {
      this.logger.error('Error loading trading state:', error)
    }
  }

  setupEventListeners() {
    // Data manager events
    this.dataManager.on('price_update', (data) => {
      this.emit('price_update', data)
    })
    
    this.dataManager.on('indicators_update', (data) => {
      this.emit('indicators_update', data)
    })
    
    // Model manager events
    this.modelManager.on('prediction', async (prediction) => {
      await this.handleModelPrediction(prediction)
    })
    
    this.modelManager.on('model_updated', (modelInfo) => {
      this.emit('model_updated', modelInfo)
    })
    
    // Risk manager events
    this.riskManager.on('risk_violation', async (violation) => {
      await this.handleRiskViolation(violation)
    })
    
    this.riskManager.on('emergency_stop', () => {
      this.emergencyStop()
    })
  }

  startSignalProcessing() {
    // Process signals every second
    setInterval(async () => {
      if (!this.processingSignals && this.signalQueue.length > 0) {
        this.processingSignals = true
        try {
          await this.processSignalQueue()
        } catch (error) {
          this.logger.error('Error processing signal queue:', error)
        } finally {
          this.processingSignals = false
        }
      }
    }, 1000)
  }

  async processSignalQueue() {
    while (this.signalQueue.length > 0) {
      const signal = this.signalQueue.shift()
      try {
        await this.processSignal(signal)
      } catch (error) {
        this.logger.error('Error processing signal:', error)
      }
    }
  }

  async processSignal(signal) {
    if (!this.isRunning || this.emergencyStop) return
    
    // Risk check
    const riskCheck = await this.riskManager.validateSignal(signal)
    if (!riskCheck.approved) {
      this.logger.warn(`Signal rejected by risk manager: ${riskCheck.reason}`)
      return
    }
    
    // Execute signal
    switch (signal.action) {
      case 'buy':
      case 'sell':
        await this.executeMarketOrder(signal)
        break
      case 'close':
        await this.closePosition(signal.positionId)
        break
      case 'modify':
        await this.modifyPosition(signal.positionId, signal.modifications)
        break
      default:
        this.logger.warn(`Unknown signal action: ${signal.action}`)
    }
  }

  async checkTradingSignals(symbol) {
    try {
      // Get latest market data
      const marketData = this.dataManager.getLatestPrice(symbol)
      const indicators = this.dataManager.getLatestIndicators(symbol, '1m')
      
      if (!marketData || !indicators) return
      
      // Get model predictions
      const predictions = await this.modelManager.getPredictions(symbol, {
        price: marketData,
        indicators
      })
      
      if (!predictions || predictions.length === 0) return
      
      // Combine predictions using ensemble method
      const signal = this.combineSignals(symbol, predictions, marketData, indicators)
      
      if (signal && signal.confidence > 0.6) {
        this.signalQueue.push(signal)
      }
    } catch (error) {
      this.logger.error(`Error checking trading signals for ${symbol}:`, error)
    }
  }

  combineSignals(symbol, predictions, marketData, indicators) {
    if (predictions.length === 0) return null
    
    // Weighted ensemble based on model performance
    let totalWeight = 0
    let weightedSignal = 0
    let totalConfidence = 0
    
    for (const prediction of predictions) {
      const weight = prediction.modelAccuracy || 0.5
      totalWeight += weight
      weightedSignal += prediction.signal * weight
      totalConfidence += prediction.confidence * weight
    }
    
    if (totalWeight === 0) return null
    
    const finalSignal = weightedSignal / totalWeight
    const finalConfidence = totalConfidence / totalWeight
    
    // Determine action
    let action = null
    if (finalSignal > 0.1) {
      action = 'buy'
    } else if (finalSignal < -0.1) {
      action = 'sell'
    }
    
    if (!action) return null
    
    return {
      symbol,
      action,
      signal: finalSignal,
      confidence: finalConfidence,
      timestamp: Date.now(),
      predictions,
      marketData,
      indicators
    }
  }

  async executeMarketOrder(signal) {
    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Calculate position size
      const positionSize = await this.riskManager.calculatePositionSize(signal)
      
      if (positionSize <= 0) {
        this.logger.warn('Position size is zero or negative, skipping order')
        return null
      }
      
      const order = {
        id: orderId,
        symbol: signal.symbol,
        type: 'market',
        side: signal.action,
        size: positionSize,
        price: signal.marketData.close,
        timestamp: Date.now(),
        status: 'pending',
        signal: signal
      }
      
      // Store order
      this.orders.set(orderId, order)
      await this.db.saveOrder(order)
      
      // Send to MT5 via ZeroMQ or execute directly in paper mode
      if (this.tradingMode === 'live' && this.zmqSockets.trade) {
        await this.sendOrderToMT5(order)
      } else {
        // Paper trading execution
        await this.executePaperOrder(order)
      }
      
      this.emit('order_placed', order)
      this.logger.info(`Order placed: ${order.side} ${order.size} ${order.symbol} at ${order.price}`)
      
      return order
    } catch (error) {
      this.logger.error('Error executing market order:', error)
      throw error
    }
  }

  async sendOrderToMT5(order) {
    try {
      // Format for MT5 ZeroMQ bridge
      const mt5Order = {
        action: 'order',
        side: order.side,           // 'buy' or 'sell'
        vol: order.size,            // volume in lots
        symbol: order.symbol,
        magic: 123456,              // matches MT5 EA magic number
        comment: `AlgoTrader_${order.id}`
      }
      
      const startTime = Date.now()
      
      // Send as JSON string to MT5 REP socket
      const requestData = JSON.stringify(mt5Order)
      await this.zmqSockets.command.send(requestData)
      
      // Wait for response from MT5
      const responseBuffer = await this.zmqSockets.command.receive()
      const response = JSON.parse(responseBuffer.toString())
      
      const latency = Date.now() - startTime
      this.metrics.recordZMQMessage('sent', 'ORDER', latency)
      
      if (response.ticket) {
        // Success - got ticket number
        await this.handleOrderFilled(order, { 
          ticket: response.ticket,
          success: true 
        })
      } else if (response.err) {
        // Error from MT5
        await this.handleOrderRejected(order, { 
          error: `MT5 Error: ${response.err}`,
          code: response.err
        })
      }
    } catch (error) {
      this.logger.error('Error sending order to MT5:', error)
      this.metrics.recordZMQError()
      await this.handleOrderRejected(order, { error: error.message })
    }
  }

  async executePaperOrder(order) {
    try {
      // Simulate order execution with slippage
      const slippage = (Math.random() - 0.5) * this.config.trading.slippage * 2
      const executionPrice = order.price + (order.side === 'buy' ? slippage : -slippage)
      
      // Create position
      const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const position = {
        id: positionId,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        size: order.size,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        pnl: 0,
        pnlPercent: 0,
        timestamp: Date.now(),
        status: 'open'
      }
      
      // Store position
      this.positions.set(positionId, position)
      await this.db.savePosition(position)
      
      // Update order status
      order.status = 'filled'
      order.executionPrice = executionPrice
      order.positionId = positionId
      await this.db.updateOrder(order)
      
      // Update balance
      this.balance.margin += order.size * executionPrice * 0.01 // 1% margin requirement
      this.balance.freeMargin = this.balance.equity - this.balance.margin
      await this.db.saveAccountBalance(this.balance)
      
      this.emit('position_opened', position)
      this.metrics.recordPositionOpen(position)
      
      this.logger.info(`Position opened: ${position.side} ${position.size} ${position.symbol} at ${position.entryPrice}`)
      
      return position
    } catch (error) {
      this.logger.error('Error executing paper order:', error)
      throw error
    }
  }

  async waitForMT5Response(orderId, timeout = 5000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null)
      }, timeout)
      
      // In a real implementation, this would listen for MT5 responses
      // For now, simulate a successful response
      setTimeout(() => {
        clearTimeout(timer)
        resolve({
          success: true,
          orderId,
          ticket: Math.floor(Math.random() * 1000000),
          price: Math.random() * 0.0001 + 1.1000
        })
      }, 100)
    })
  }

  async handleOrderFilled(order, response) {
    try {
      // Create position from filled order
      const positionId = `pos_${response.ticket}`
      const position = {
        id: positionId,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        size: order.size,
        entryPrice: response.price,
        currentPrice: response.price,
        pnl: 0,
        pnlPercent: 0,
        timestamp: Date.now(),
        status: 'open',
        mt5Ticket: response.ticket
      }
      
      this.positions.set(positionId, position)
      await this.db.savePosition(position)
      
      // Update order
      order.status = 'filled'
      order.executionPrice = response.price
      order.positionId = positionId
      await this.db.updateOrder(order)
      
      this.emit('position_opened', position)
      this.metrics.recordPositionOpen(position)
      
      this.logger.info(`Position opened via MT5: ${position.side} ${position.size} ${position.symbol} at ${position.entryPrice}`)
    } catch (error) {
      this.logger.error('Error handling filled order:', error)
    }
  }

  async handleOrderRejected(order, response) {
    try {
      order.status = 'rejected'
      order.rejectionReason = response.error || 'Unknown error'
      await this.db.updateOrder(order)
      
      this.orders.delete(order.id)
      
      this.emit('order_rejected', order)
      this.logger.warn(`Order rejected: ${order.id} - ${order.rejectionReason}`)
    } catch (error) {
      this.logger.error('Error handling rejected order:', error)
    }
  }

  async updatePositionPnL(priceData) {
    try {
      for (const position of this.positions.values()) {
        if (position.symbol === priceData.symbol && position.status === 'open') {
          const oldPnL = position.pnl
          
          // Calculate new P&L
          if (position.side === 'buy') {
            position.pnl = (priceData.bid - position.entryPrice) * position.size
          } else {
            position.pnl = (position.entryPrice - priceData.ask) * position.size
          }
          
          position.currentPrice = position.side === 'buy' ? priceData.bid : priceData.ask
          position.pnlPercent = (position.pnl / (position.entryPrice * position.size)) * 100
          
          // Update balance if P&L changed significantly
          if (Math.abs(position.pnl - oldPnL) > 0.01) {
            this.updateAccountBalance()
          }
          
          // Check for stop loss or take profit
          await this.checkPositionLevels(position)
        }
      }
    } catch (error) {
      this.logger.error('Error updating position P&L:', error)
    }
  }

  updateAccountBalance() {
    let totalPnL = 0
    let totalMargin = 0
    
    for (const position of this.positions.values()) {
      if (position.status === 'open') {
        totalPnL += position.pnl
        totalMargin += position.size * position.entryPrice * 0.01 // 1% margin
      }
    }
    
    this.balance.equity = this.balance.balance + totalPnL
    this.balance.margin = totalMargin
    this.balance.freeMargin = this.balance.equity - this.balance.margin
    this.balance.marginLevel = this.balance.margin > 0 ? (this.balance.equity / this.balance.margin) * 100 : 0
    
    this.emit('balance_update', this.balance)
  }

  async checkPositionLevels(position) {
    try {
      // Check stop loss
      if (position.stopLoss) {
        const shouldClose = (position.side === 'buy' && position.currentPrice <= position.stopLoss) ||
                           (position.side === 'sell' && position.currentPrice >= position.stopLoss)
        
        if (shouldClose) {
          await this.closePosition(position.id, 'stop_loss')
          return
        }
      }
      
      // Check take profit
      if (position.takeProfit) {
        const shouldClose = (position.side === 'buy' && position.currentPrice >= position.takeProfit) ||
                           (position.side === 'sell' && position.currentPrice <= position.takeProfit)
        
        if (shouldClose) {
          await this.closePosition(position.id, 'take_profit')
          return
        }
      }
      
      // Check risk manager rules
      const riskCheck = await this.riskManager.checkPosition(position)
      if (riskCheck.shouldClose) {
        await this.closePosition(position.id, riskCheck.reason)
      }
    } catch (error) {
      this.logger.error('Error checking position levels:', error)
    }
  }

  async closePosition(positionId, reason = 'manual') {
    try {
      const position = this.positions.get(positionId)
      if (!position || position.status !== 'open') {
        this.logger.warn(`Cannot close position ${positionId}: not found or not open`)
        return null
      }
      
      // Create close order
      const closeOrder = {
        id: `close_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: position.symbol,
        type: 'market',
        side: position.side === 'buy' ? 'sell' : 'buy',
        size: position.size,
        price: position.currentPrice,
        timestamp: Date.now(),
        status: 'pending',
        positionId: position.id,
        reason
      }
      
      if (this.tradingMode === 'live' && this.zmqSockets.trade) {
        await this.sendOrderToMT5(closeOrder)
      } else {
        // Paper trading close
        await this.executePaperClose(position, closeOrder)
      }
      
      return closeOrder
    } catch (error) {
      this.logger.error('Error closing position:', error)
      throw error
    }
  }

  async executePaperClose(position, closeOrder) {
    try {
      // Simulate close execution
      const slippage = (Math.random() - 0.5) * this.config.trading.slippage * 2
      const closePrice = position.currentPrice + (closeOrder.side === 'buy' ? slippage : -slippage)
      
      // Calculate final P&L
      let finalPnL
      if (position.side === 'buy') {
        finalPnL = (closePrice - position.entryPrice) * position.size
      } else {
        finalPnL = (position.entryPrice - closePrice) * position.size
      }
      
      // Subtract commission
      finalPnL -= this.config.trading.commission * position.size * 2 // Open + close
      
      // Update position
      position.status = 'closed'
      position.closePrice = closePrice
      position.closePnL = finalPnL
      position.closeTime = Date.now()
      position.closeReason = closeOrder.reason
      
      await this.db.updatePosition(position)
      
      // Update balance
      this.balance.balance += finalPnL
      this.balance.margin -= position.size * position.entryPrice * 0.01
      this.balance.freeMargin = this.balance.equity - this.balance.margin
      await this.db.saveAccountBalance(this.balance)
      
      // Remove from active positions
      this.positions.delete(position.id)
      
      // Record trade
      const trade = {
        id: `trade_${Date.now()}`,
        positionId: position.id,
        symbol: position.symbol,
        side: position.side,
        size: position.size,
        entryPrice: position.entryPrice,
        closePrice: closePrice,
        pnl: finalPnL,
        duration: position.closeTime - position.timestamp,
        timestamp: position.closeTime,
        reason: closeOrder.reason
      }
      
      this.trades.push(trade)
      await this.db.saveTrade(trade)
      
      // Update performance metrics
      this.updatePerformanceMetrics(trade)
      
      this.emit('position_closed', position)
      this.emit('trade_completed', trade)
      this.metrics.recordPositionClose(trade)
      
      this.logger.info(`Position closed: ${position.symbol} P&L: ${finalPnL.toFixed(2)}`)
      
      return trade
    } catch (error) {
      this.logger.error('Error executing paper close:', error)
      throw error
    }
  }

  updatePerformanceMetrics(trade) {
    this.performance.totalTrades++
    this.performance.totalPnL += trade.pnl
    
    if (trade.pnl > 0) {
      this.performance.winningTrades++
    } else {
      this.performance.losingTrades++
    }
    
    // Calculate drawdown
    const runningBalance = this.balance.balance
    if (runningBalance < this.performance.peakBalance) {
      const drawdown = (this.performance.peakBalance - runningBalance) / this.performance.peakBalance
      this.performance.maxDrawdown = Math.max(this.performance.maxDrawdown, drawdown)
    } else {
      this.performance.peakBalance = runningBalance
    }
    
    // Calculate Sharpe ratio (simplified)
    if (this.trades.length > 1) {
      const returns = this.trades.map(t => t.pnl / (t.entryPrice * t.size))
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length)
      this.performance.sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
    }
  }

  async handleModelPrediction(prediction) {
    try {
      if (!this.isRunning || this.emergencyStop) return
      
      // Convert prediction to signal
      const signal = {
        symbol: prediction.symbol,
        action: prediction.direction > 0 ? 'buy' : 'sell',
        signal: prediction.direction,
        confidence: prediction.confidence,
        timestamp: Date.now(),
        source: 'model',
        modelType: prediction.modelType,
        predictions: [prediction]
      }
      
      // Add to signal queue
      this.signalQueue.push(signal)
      
      this.metrics.recordPrediction(prediction)
    } catch (error) {
      this.logger.error('Error handling model prediction:', error)
    }
  }

  async handleRiskViolation(violation) {
    try {
      this.logger.warn(`Risk violation detected: ${violation.type} - ${violation.message}`)
      
      switch (violation.severity) {
        case 'critical':
          await this.emergencyStop()
          break
        case 'high':
          await this.closeAllPositions('risk_violation')
          break
        case 'medium':
          // Reduce position sizes or stop new trades
          this.isRunning = false
          setTimeout(() => {
            this.isRunning = true
          }, 60000) // Stop for 1 minute
          break
        default:
          // Log only
          break
      }
      
      this.emit('risk_violation', violation)
      this.metrics.recordRiskViolation(violation)
    } catch (error) {
      this.logger.error('Error handling risk violation:', error)
    }
  }

  async assessNewsImpact(newsData) {
    try {
      // Check if news affects our positions
      for (const position of this.positions.values()) {
        if (position.status === 'open' && this.isNewsRelevant(newsData, position.symbol)) {
          // High impact news - consider closing position
          if (newsData.impact === 'high') {
            this.logger.info(`High impact news for ${position.symbol}, considering position closure`)
            
            // Add to signal queue for evaluation
            this.signalQueue.push({
              symbol: position.symbol,
              action: 'close',
              positionId: position.id,
              confidence: 0.8,
              timestamp: Date.now(),
              source: 'news',
              newsData
            })
          }
        }
      }
    } catch (error) {
      this.logger.error('Error assessing news impact:', error)
    }
  }

  isNewsRelevant(newsData, symbol) {
    const symbolCurrencies = symbol.match(/[A-Z]{3}/g) || []
    return symbolCurrencies.some(currency => 
      newsData.currencies && newsData.currencies.includes(currency)
    )
  }

  // Control methods
  async start() {
    try {
      if (!this.isInitialized) {
        throw new Error('Trading Engine not initialized')
      }
      
      this.isRunning = true
      this.emergencyStop = false
      
      this.logger.info('Trading Engine started')
      this.emit('engine_started')
      
      return true
    } catch (error) {
      this.logger.error('Error starting Trading Engine:', error)
      throw error
    }
  }

  async stop() {
    try {
      this.isRunning = false
      
      this.logger.info('Trading Engine stopped')
      this.emit('engine_stopped')
      
      return true
    } catch (error) {
      this.logger.error('Error stopping Trading Engine:', error)
      throw error
    }
  }

  async emergencyStop() {
    try {
      this.logger.warn('EMERGENCY STOP ACTIVATED')
      
      this.isRunning = false
      this.emergencyStop = true
      
      // Close all positions immediately
      await this.closeAllPositions('emergency_stop')
      
      // Cancel all pending orders
      await this.cancelAllOrders()
      
      this.emit('emergency_stop')
      
      return true
    } catch (error) {
      this.logger.error('Error during emergency stop:', error)
      throw error
    }
  }

  async closeAllPositions(reason = 'manual') {
    try {
      const closePromises = []
      
      for (const position of this.positions.values()) {
        if (position.status === 'open') {
          closePromises.push(this.closePosition(position.id, reason))
        }
      }
      
      await Promise.all(closePromises)
      
      this.logger.info(`Closed ${closePromises.length} positions`)
      return closePromises.length
    } catch (error) {
      this.logger.error('Error closing all positions:', error)
      throw error
    }
  }

  async cancelAllOrders() {
    try {
      let cancelledCount = 0
      
      for (const order of this.orders.values()) {
        if (order.status === 'pending') {
          order.status = 'cancelled'
          await this.db.updateOrder(order)
          this.orders.delete(order.id)
          cancelledCount++
        }
      }
      
      this.logger.info(`Cancelled ${cancelledCount} orders`)
      return cancelledCount
    } catch (error) {
      this.logger.error('Error cancelling all orders:', error)
      throw error
    }
  }

  async setMode(mode) {
    if (!['paper', 'live'].includes(mode)) {
      throw new Error('Invalid trading mode')
    }
    
    this.tradingMode = mode
    this.logger.info(`Trading mode set to ${mode}`)
    this.emit('mode_changed', mode)
  }

  // Data retrieval methods
  getPositions() {
    return Array.from(this.positions.values())
  }

  getOrders() {
    return Array.from(this.orders.values())
  }

  getBalance() {
    return { ...this.balance }
  }

  getTrades() {
    return [...this.trades]
  }

  getPerformance() {
    return {
      ...this.performance,
      winRate: this.performance.totalTrades > 0 ? 
        this.performance.winningTrades / this.performance.totalTrades : 0,
      profitFactor: this.performance.losingTrades > 0 ? 
        Math.abs(this.performance.totalPnL / this.performance.losingTrades) : 0,
      avgTrade: this.performance.totalTrades > 0 ? 
        this.performance.totalPnL / this.performance.totalTrades : 0
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      mode: this.tradingMode,
      emergencyStop: this.emergencyStop,
      positions: this.positions.size,
      orders: this.orders.size,
      balance: this.balance.equity,
      performance: this.getPerformance()
    }
  }

  // Backtesting
  async backtest(config = {}) {
    try {
      this.logger.info('Starting backtest')
      
      const backtestConfig = {
        startDate: config.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: config.endDate || new Date(),
        symbols: config.symbols || ['EURUSD'],
        initialBalance: config.initialBalance || 10000,
        ...config
      }
      
      // Save current state
      const originalMode = this.tradingMode
      const originalBalance = { ...this.balance }
      const originalPositions = new Map(this.positions)
      
      // Set backtest mode
      this.tradingMode = 'paper'
      this.balance = { 
        equity: backtestConfig.initialBalance,
        balance: backtestConfig.initialBalance,
        margin: 0,
        freeMargin: backtestConfig.initialBalance,
        marginLevel: 0
      }
      this.positions.clear()
      
      // Run backtest simulation
      const results = await this.runBacktestSimulation(backtestConfig)
      
      // Restore original state
      this.tradingMode = originalMode
      this.balance = originalBalance
      this.positions = originalPositions
      
      this.logger.info('Backtest completed')
      return results
    } catch (error) {
      this.logger.error('Error during backtest:', error)
      throw error
    }
  }

  async runBacktestSimulation(config) {
    // This would implement the actual backtesting logic
    // For now, return mock results
    return {
      startDate: config.startDate,
      endDate: config.endDate,
      initialBalance: config.initialBalance,
      finalBalance: config.initialBalance * 1.15,
      totalReturn: 0.15,
      totalTrades: 45,
      winningTrades: 28,
      losingTrades: 17,
      winRate: 0.622,
      maxDrawdown: 0.08,
      sharpeRatio: 1.25,
      profitFactor: 1.8
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.logger.info('Cleaning up Trading Engine')
      
      // Stop trading
      await this.stop()
      
      // Close ZMQ connections
      for (const socket of Object.values(this.zmqSockets)) {
        if (socket) {
          socket.close()
        }
      }
      
      // Cleanup dependencies
      if (this.dataManager) {
        await this.dataManager.cleanup()
      }
      if (this.modelManager) {
        await this.modelManager.cleanup()
      }
      if (this.riskManager) {
        await this.riskManager.cleanup()
      }
      if (this.metrics) {
        await this.metrics.cleanup()
      }
      if (this.db) {
        await this.db.cleanup()
      }
      
      this.isInitialized = false
      this.logger.info('Trading Engine cleaned up successfully')
    } catch (error) {
      this.logger.error('Error during cleanup:', error)
    }
  }
}