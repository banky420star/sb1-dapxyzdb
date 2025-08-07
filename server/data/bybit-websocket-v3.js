import { EventEmitter } from 'events'
import { Logger } from '../utils/logger.js'
import crypto from 'crypto'
import WebSocket from 'ws'

export class BybitWebSocketV3 extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logger = new Logger()
    
    // Configuration
    this.config = {
      apiKey: process.env.BYBIT_API_KEY || '3fg29yhr1a9JJ1etm3',
      secret: process.env.BYBIT_SECRET || 'wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14',
      testnet: process.env.BYBIT_TESTNET === 'true' || false,
      demo: process.env.BYBIT_DEMO === 'true' || false,
      symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT'],
      maxActiveTime: 600, // 10 minutes max connection time
      heartbeatInterval: 20000, // 20 seconds
      reconnectAttempts: 5,
      reconnectDelay: 5000,
      ...options
    }
    
    // Connection state
    this.ws = null
    this.isConnected = false
    this.isAuthenticated = false
    this.reconnectAttempts = 0
    this.heartbeatTimer = null
    this.reconnectTimer = null
    this.subscriptions = new Set()
    
    // WebSocket URLs based on environment
    if (this.config.demo) {
      this.urls = {
        public: {
          spot: 'wss://stream.bybit.com/v5/public/spot', // Demo uses mainnet public streams
          linear: 'wss://stream.bybit.com/v5/public/linear',
          inverse: 'wss://stream.bybit.com/v5/public/inverse',
          spread: 'wss://stream.bybit.com/v5/public/spread',
          option: 'wss://stream.bybit.com/v5/public/option'
        },
        private: 'wss://stream-demo.bybit.com/v5/private', // Demo private streams
        trade: 'wss://stream.bybit.com/v5/trade', // Demo doesn't support WS Trade
        status: 'wss://stream.bybit.com/v5/public/misc/status'
      }
    } else if (this.config.testnet) {
      this.urls = {
        public: {
          spot: 'wss://stream-testnet.bybit.com/v5/public/spot',
          linear: 'wss://stream-testnet.bybit.com/v5/public/linear',
          inverse: 'wss://stream-testnet.bybit.com/v5/public/inverse',
          spread: 'wss://stream-testnet.bybit.com/v5/public/spread',
          option: 'wss://stream-testnet.bybit.com/v5/public/option'
        },
        private: 'wss://stream-testnet.bybit.com/v5/private',
        trade: 'wss://stream-testnet.bybit.com/v5/trade',
        status: 'wss://stream-testnet.bybit.com/v5/public/misc/status'
      }
    } else {
      this.urls = {
        public: {
          spot: 'wss://stream.bybit.com/v5/public/spot',
          linear: 'wss://stream.bybit.com/v5/public/linear',
          inverse: 'wss://stream.bybit.com/v5/public/inverse',
          spread: 'wss://stream.bybit.com/v5/public/spread',
          option: 'wss://stream.bybit.com/v5/public/option'
        },
        private: 'wss://stream.bybit.com/v5/private',
        trade: 'wss://stream.bybit.com/v5/trade',
        status: 'wss://stream.bybit.com/v5/public/misc/status'
      }
    }
    
    // Spread trading configuration
    this.spreadSymbols = this.config.spreadSymbols || ['BTCUSDT_SOL/USDT', 'ETHUSDT_SOL/USDT']
    
    // Data storage
    this.marketData = new Map()
    this.orderBook = new Map()
    this.trades = new Map()
    this.tickers = new Map()
    this.positions = new Map()
    this.orders = new Map()
    this.wallet = null
    
    // Spread trading data storage
    this.spreadOrderBook = new Map()
    this.spreadTrades = new Map()
    this.spreadTickers = new Map()
    this.spreadPositions = new Map()
    this.spreadOrders = new Map()
    
    this.logger.info('🚀 Bybit WebSocket V3 client initialized')
  }

  async connect() {
    try {
      this.logger.info('🔗 Connecting to Bybit WebSocket V3...')
      
      // Connect to public streams
      await this.connectPublicStreams()
      
      // Connect to spread trading streams
      await this.connectSpreadStreams()
      
      // Connect to private streams
      await this.connectPrivateStreams()
      
      // Start heartbeat
      this.startHeartbeat()
      
      this.isConnected = true
      this.logger.info('✅ Bybit WebSocket V3 connected successfully')
      
      return true
    } catch (error) {
      this.logger.error('❌ Failed to connect to Bybit WebSocket V3:', error)
      throw error
    }
  }

  async connectPublicStreams() {
    try {
      // Connect to linear perpetual streams (USDT/USDC)
      const linearUrl = `${this.urls.public.linear}?max_active_time=${this.config.maxActiveTime}s`
      this.ws = new WebSocket(linearUrl)
      
      this.ws.onopen = () => {
        this.logger.info('✅ Public WebSocket connected')
        this.subscribeToPublicStreams()
      }
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }
      
      this.ws.onerror = (error) => {
        this.logger.error('❌ Public WebSocket error:', error)
        this.emit('error', error)
      }
      
      this.ws.onclose = () => {
        this.logger.warn('⚠️ Public WebSocket disconnected')
        this.isConnected = false
        this.handleReconnection()
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to public streams:', error)
      throw error
    }
  }

  async connectSpreadStreams() {
    try {
      // Connect to spread trading streams
      const spreadUrl = `${this.urls.public.spread}?max_active_time=${this.config.maxActiveTime}s`
      this.spreadWs = new WebSocket(spreadUrl)
      
      this.spreadWs.onopen = () => {
        this.logger.info('✅ Spread WebSocket connected')
        this.subscribeToSpreadStreams()
      }
      
      this.spreadWs.onmessage = (event) => {
        this.handleSpreadMessage(JSON.parse(event.data))
      }
      
      this.spreadWs.onerror = (error) => {
        this.logger.error('❌ Spread WebSocket error:', error)
        this.emit('error', error)
      }
      
      this.spreadWs.onclose = () => {
        this.logger.warn('⚠️ Spread WebSocket disconnected')
        this.handleSpreadReconnection()
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to spread streams:', error)
      throw error
    }
  }

  async connectPrivateStreams() {
    try {
      // Connect to private streams with authentication
      const privateUrl = `${this.urls.private}?max_active_time=${this.config.maxActiveTime}s`
      this.privateWs = new WebSocket(privateUrl)
      
      this.privateWs.onopen = () => {
        this.logger.info('✅ Private WebSocket connected')
        this.authenticate()
      }
      
      this.privateWs.onmessage = (event) => {
        this.handlePrivateMessage(JSON.parse(event.data))
      }
      
      this.privateWs.onerror = (error) => {
        this.logger.error('❌ Private WebSocket error:', error)
        this.emit('error', error)
      }
      
      this.privateWs.onclose = () => {
        this.logger.warn('⚠️ Private WebSocket disconnected')
        this.isAuthenticated = false
        this.handlePrivateReconnection()
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to connect to private streams:', error)
      throw error
    }
  }

  authenticate() {
    try {
      const expires = Date.now() + 10000 // 10 seconds from now
      const signature = this.generateSignature('GET/realtime' + expires)
      
      const authMessage = {
        req_id: 'auth_' + Date.now(),
        op: 'auth',
        args: [this.config.apiKey, expires, signature]
      }
      
      this.privateWs.send(JSON.stringify(authMessage))
      this.logger.info('🔐 Authentication request sent')
      
    } catch (error) {
      this.logger.error('❌ Authentication failed:', error)
      throw error
    }
  }

  generateSignature(message) {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(message)
      .digest('hex')
  }

  subscribeToPublicStreams() {
    try {
      const subscriptions = []
      
      // Subscribe to orderbook for all symbols
      for (const symbol of this.config.symbols) {
        subscriptions.push(`orderbook.50.${symbol}`)
        subscriptions.push(`publicTrade.${symbol}`)
        subscriptions.push(`tickers.${symbol}`)
      }
      
      // Check args length limit (21,000 characters for public streams)
      const argsString = JSON.stringify(subscriptions)
      if (argsString.length > 21000) {
        this.logger.warn('⚠️ Subscription args too long, splitting into multiple requests')
        this.splitSubscriptions(subscriptions)
        return
      }
      
      const subscribeMessage = {
        req_id: 'subscribe_' + Date.now(),
        op: 'subscribe',
        args: subscriptions
      }
      
      this.ws.send(JSON.stringify(subscribeMessage))
      this.logger.info(`📡 Subscribed to ${subscriptions.length} public streams`)
      
    } catch (error) {
      this.logger.error('❌ Failed to subscribe to public streams:', error)
      throw error
    }
  }

  splitSubscriptions(subscriptions) {
    const chunkSize = 10 // Max 10 args per request for spot
    const chunks = []
    
    for (let i = 0; i < subscriptions.length; i += chunkSize) {
      chunks.push(subscriptions.slice(i, i + chunkSize))
    }
    
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        const subscribeMessage = {
          req_id: `subscribe_${index}_${Date.now()}`,
          op: 'subscribe',
          args: chunk
        }
        this.ws.send(JSON.stringify(subscribeMessage))
        this.logger.info(`📡 Subscribed to chunk ${index + 1}/${chunks.length}`)
      }, index * 1000) // 1 second delay between chunks
    })
  }

  subscribeToPrivateStreams() {
    try {
      const privateSubscriptions = [
        'position',
        'order',
        'wallet',
        'execution'
      ]
      
      const subscribeMessage = {
        req_id: 'private_subscribe_' + Date.now(),
        op: 'subscribe',
        args: privateSubscriptions
      }
      
      this.privateWs.send(JSON.stringify(subscribeMessage))
      this.logger.info('📡 Subscribed to private streams')
      
    } catch (error) {
      this.logger.error('❌ Failed to subscribe to private streams:', error)
      throw error
    }
  }

  subscribeToSpreadStreams() {
    try {
      const spreadSubscriptions = []
      
      // Subscribe to spread orderbook for all spread symbols
      for (const symbol of this.spreadSymbols) {
        spreadSubscriptions.push(`orderbook.50.${symbol}`)
        spreadSubscriptions.push(`publicTrade.${symbol}`)
        spreadSubscriptions.push(`tickers.${symbol}`)
      }
      
      const subscribeMessage = {
        req_id: 'spread_subscribe_' + Date.now(),
        op: 'subscribe',
        args: spreadSubscriptions
      }
      
      this.spreadWs.send(JSON.stringify(subscribeMessage))
      this.logger.info(`📡 Subscribed to ${spreadSubscriptions.length} spread streams`)
      
    } catch (error) {
      this.logger.error('❌ Failed to subscribe to spread streams:', error)
      throw error
    }
  }

  handleMessage(data) {
    try {
      // Handle subscription responses
      if (data.op === 'subscribe' && data.success) {
        this.logger.info('✅ Subscription successful:', data.req_id)
        return
      }
      
      // Handle pong responses
      if (data.op === 'pong') {
        this.logger.debug('🏓 Pong received')
        return
      }
      
      // Handle topic data
      if (data.topic) {
        this.handleTopicData(data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling message:', error)
    }
  }

  handleSpreadMessage(data) {
    try {
      // Handle subscription responses
      if (data.op === 'subscribe' && data.success) {
        this.logger.info('✅ Spread subscription successful:', data.req_id)
        return
      }
      
      // Handle pong responses
      if (data.op === 'pong') {
        this.logger.debug('🏓 Spread pong received')
        return
      }
      
      // Handle topic data
      if (data.topic) {
        this.handleSpreadTopicData(data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling spread message:', error)
    }
  }

  handlePrivateMessage(data) {
    try {
      // Handle authentication response
      if (data.op === 'auth') {
        if (data.success) {
          this.isAuthenticated = true
          this.logger.info('✅ Authentication successful')
          this.subscribeToPrivateStreams()
        } else {
          this.logger.error('❌ Authentication failed:', data.ret_msg)
          throw new Error('Authentication failed: ' + data.ret_msg)
        }
        return
      }
      
      // Handle subscription responses
      if (data.op === 'subscribe' && data.success) {
        this.logger.info('✅ Private subscription successful:', data.req_id)
        return
      }
      
      // Handle pong responses
      if (data.op === 'pong') {
        this.logger.debug('🏓 Private pong received')
        return
      }
      
      // Handle topic data
      if (data.topic) {
        this.handlePrivateTopicData(data)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling private message:', error)
    }
  }

  handleTopicData(data) {
    try {
      const { topic, data: topicData, ts } = data
      
      if (topic.startsWith('orderbook.')) {
        const symbol = topic.split('.')[2]
        this.orderBook.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('orderbook_update', { symbol, data: topicData, timestamp: ts })
      }
      
      else if (topic.startsWith('publicTrade.')) {
        const symbol = topic.split('.')[1]
        this.trades.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('trade_update', { symbol, data: topicData, timestamp: ts })
      }
      
      else if (topic.startsWith('tickers.')) {
        const symbol = topic.split('.')[1]
        this.tickers.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('ticker_update', { symbol, data: topicData, timestamp: ts })
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling topic data:', error)
    }
  }

  handleSpreadTopicData(data) {
    try {
      const { topic, data: topicData, ts } = data
      
      if (topic.startsWith('orderbook.')) {
        const symbol = topic.split('.')[2]
        this.spreadOrderBook.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('spread_orderbook_update', { symbol, data: topicData, timestamp: ts })
      }
      
      else if (topic.startsWith('publicTrade.')) {
        const symbol = topic.split('.')[1]
        this.spreadTrades.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('spread_trade_update', { symbol, data: topicData, timestamp: ts })
      }
      
      else if (topic.startsWith('tickers.')) {
        const symbol = topic.split('.')[1]
        this.spreadTickers.set(symbol, {
          ...topicData,
          timestamp: ts
        })
        this.emit('spread_ticker_update', { symbol, data: topicData, timestamp: ts })
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling spread topic data:', error)
    }
  }

  handlePrivateTopicData(data) {
    try {
      const { topic, data: topicData, ts } = data
      
      if (topic === 'position') {
        this.handlePositionUpdate(topicData)
      }
      
      else if (topic === 'order') {
        this.handleOrderUpdate(topicData)
      }
      
      else if (topic === 'wallet') {
        this.handleWalletUpdate(topicData)
      }
      
      else if (topic === 'execution') {
        this.handleExecutionUpdate(topicData)
      }
      
    } catch (error) {
      this.logger.error('❌ Error handling private topic data:', error)
    }
  }

  handlePositionUpdate(data) {
    try {
      for (const position of data) {
        if (parseFloat(position.size) > 0) {
          this.positions.set(position.symbol, {
            symbol: position.symbol,
            side: position.side,
            size: parseFloat(position.size),
            entryPrice: parseFloat(position.avgPrice),
            currentPrice: parseFloat(position.markPrice),
            pnl: parseFloat(position.unrealisedPnl),
            pnlPercent: parseFloat(position.unrealisedPnlPercent),
            timestamp: Date.now()
          })
        } else {
          this.positions.delete(position.symbol)
        }
      }
      
      this.emit('position_update', {
        positions: Array.from(this.positions.values()),
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling position update:', error)
    }
  }

  handleOrderUpdate(data) {
    try {
      for (const order of data) {
        this.orders.set(order.orderId, {
          id: order.orderId,
          symbol: order.symbol,
          type: order.orderType,
          side: order.side,
          size: parseFloat(order.qty),
          price: parseFloat(order.price),
          status: order.orderStatus,
          timestamp: Date.now()
        })
      }
      
      this.emit('order_update', {
        orders: Array.from(this.orders.values()),
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling order update:', error)
    }
  }

  handleWalletUpdate(data) {
    try {
      for (const wallet of data) {
        this.wallet = {
          equity: parseFloat(wallet.totalEquity),
          balance: parseFloat(wallet.totalWalletBalance),
          margin: parseFloat(wallet.totalInitialMargin),
          freeMargin: parseFloat(wallet.totalAvailableBalance),
          marginLevel: parseFloat(wallet.totalMarginRatio) * 100,
          timestamp: Date.now()
        }
      }
      
      this.emit('wallet_update', {
        wallet: this.wallet,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling wallet update:', error)
    }
  }

  handleExecutionUpdate(data) {
    try {
      this.emit('execution_update', {
        executions: data,
        timestamp: Date.now()
      })
      
    } catch (error) {
      this.logger.error('❌ Error handling execution update:', error)
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)
    
    this.logger.info(`💓 Heartbeat started (${this.config.heartbeatInterval}ms interval)`)
  }

  sendHeartbeat() {
    try {
      const pingMessage = {
        req_id: 'ping_' + Date.now(),
        op: 'ping'
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(pingMessage))
      }
      
      if (this.privateWs && this.privateWs.readyState === WebSocket.OPEN) {
        this.privateWs.send(JSON.stringify(pingMessage))
      }
      
      if (this.spreadWs && this.spreadWs.readyState === WebSocket.OPEN) {
        this.spreadWs.send(JSON.stringify(pingMessage))
      }
      
    } catch (error) {
      this.logger.error('❌ Error sending heartbeat:', error)
    }
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.config.reconnectAttempts) {
      this.reconnectAttempts++
      this.logger.info(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.config.reconnectAttempts}`)
      
      this.reconnectTimer = setTimeout(() => {
        this.connect()
      }, this.config.reconnectDelay)
    } else {
      this.logger.error('❌ Max reconnection attempts reached')
      this.emit('max_reconnect_attempts_reached')
    }
  }

  handlePrivateReconnection() {
    if (this.reconnectAttempts < this.config.reconnectAttempts) {
      this.logger.info(`🔄 Attempting private reconnection ${this.reconnectAttempts}/${this.config.reconnectAttempts}`)
      
      setTimeout(() => {
        this.connectPrivateStreams()
      }, this.config.reconnectDelay)
    }
  }

  handleSpreadReconnection() {
    if (this.reconnectAttempts < this.config.reconnectAttempts) {
      this.logger.info(`🔄 Attempting spread reconnection ${this.reconnectAttempts}/${this.config.reconnectAttempts}`)
      
      setTimeout(() => {
        this.connectSpreadStreams()
      }, this.config.reconnectDelay)
    }
  }

  unsubscribe(topic) {
    try {
      const unsubscribeMessage = {
        req_id: 'unsubscribe_' + Date.now(),
        op: 'unsubscribe',
        args: [topic]
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(unsubscribeMessage))
      }
      
      this.subscriptions.delete(topic)
      this.logger.info(`📡 Unsubscribed from: ${topic}`)
      
    } catch (error) {
      this.logger.error('❌ Error unsubscribing:', error)
    }
  }

  getOrderBook(symbol) {
    return this.orderBook.get(symbol) || null
  }

  getTrades(symbol) {
    return this.trades.get(symbol) || null
  }

  getTicker(symbol) {
    return this.tickers.get(symbol) || null
  }

  getPositions() {
    return Array.from(this.positions.values())
  }

  getOrders() {
    return Array.from(this.orders.values())
  }

  getWallet() {
    return this.wallet
  }

  // Spread trading data retrieval methods
  getSpreadOrderBook(symbol) {
    return this.spreadOrderBook.get(symbol) || null
  }

  getSpreadTrades(symbol) {
    return this.spreadTrades.get(symbol) || null
  }

  getSpreadTicker(symbol) {
    return this.spreadTickers.get(symbol) || null
  }

  getSpreadPositions() {
    return Array.from(this.spreadPositions.values())
  }

  getSpreadOrders() {
    return Array.from(this.spreadOrders.values())
  }

  getStatus() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      spreadSymbols: this.spreadSymbols.length
    }
  }

  async disconnect() {
    try {
      this.logger.info('🔌 Disconnecting from Bybit WebSocket V3...')
      
      // Clear timers
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      // Close connections
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
      
      if (this.privateWs) {
        this.privateWs.close()
        this.privateWs = null
      }
      
      if (this.spreadWs) {
        this.spreadWs.close()
        this.spreadWs = null
      }
      
      this.isConnected = false
      this.isAuthenticated = false
      this.reconnectAttempts = 0
      
      this.logger.info('✅ Bybit WebSocket V3 disconnected')
      
    } catch (error) {
      this.logger.error('❌ Error disconnecting:', error)
      throw error
    }
  }
} 