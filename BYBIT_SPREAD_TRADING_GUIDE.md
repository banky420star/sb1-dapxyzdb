# 🎯 Bybit Spread Trading Integration Guide

*Complete Guide to Advanced Spread Trading with Bybit API*

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Spread Trading Concepts](#spread-trading-concepts)
3. [API Integration](#api-integration)
4. [WebSocket Streams](#websocket-streams)
5. [Spread Strategies](#spread-strategies)
6. [Implementation Examples](#implementation-examples)
7. [Risk Management](#risk-management)
8. [Performance Monitoring](#performance-monitoring)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

The Bybit Spread Trading integration provides comprehensive support for advanced spread trading strategies, including calendar spreads, butterfly spreads, straddles, and custom multi-leg combinations. This implementation includes:

- **REST API Integration** for order management and execution
- **WebSocket Streams** for real-time spread data
- **Pre-built Strategies** for common spread types
- **Performance Analytics** and risk management
- **Real-time Monitoring** and alerting

### **Key Features**

- ✅ **Multiple Spread Types**: Calendar, Butterfly, Straddle, Custom
- ✅ **Real-time Data**: Orderbook, trades, tickers for spread combinations
- ✅ **Order Management**: Place, cancel, and monitor spread orders
- ✅ **Execution Tracking**: Detailed execution history with leg breakdown
- ✅ **Performance Analytics**: P&L tracking, success rates, drawdown analysis
- ✅ **Risk Management**: Position limits, exposure monitoring

---

## 📊 **Spread Trading Concepts**

### **What is Spread Trading?**

Spread trading involves simultaneously buying and selling related financial instruments to profit from the price difference between them. Unlike single-leg trading, spreads offer:

- **Reduced Directional Risk**: Less exposure to overall market movements
- **Defined Risk**: Maximum loss is typically limited to the spread cost
- **Theta Decay Benefits**: Can profit from time decay in options
- **Volatility Trading**: Can profit from changes in implied volatility

### **Common Spread Types**

#### **1. Calendar Spread (Time Spread)**
```javascript
// Same asset, different expiry dates
// Example: Buy BTC Dec 2024, Sell BTC Mar 2025
{
  symbol: 'BTCUSDT',
  nearExpiry: '2024-12-31',
  farExpiry: '2025-03-31',
  side: 'Buy', // Long calendar spread
  qty: 1
}
```

#### **2. Butterfly Spread**
```javascript
// Three legs with defined risk/reward
// Example: Sell 1 BTC 40000, Buy 2 BTC 45000, Sell 1 BTC 50000
{
  symbol: 'BTCUSDT',
  lowerStrike: 40000,
  middleStrike: 45000,
  upperStrike: 50000,
  side: 'Sell', // Short butterfly
  qty: 1
}
```

#### **3. Straddle Spread**
```javascript
// Simultaneous call and put at same strike
// Example: Buy BTC 45000 call and put
{
  symbol: 'BTCUSDT',
  strike: 45000,
  side: 'Buy', // Long straddle
  qty: 1
}
```

---

## 🔌 **API Integration**

### **Spread Trading Module**

The `BybitSpreadTrading` class provides comprehensive spread trading functionality:

```javascript
import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'

const spreadTrading = new BybitSpreadTrading({
  apiKey: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_SECRET,
  testnet: process.env.BYBIT_TESTNET === 'true'
})
```

### **Core Methods**

#### **Order Management**
```javascript
// Place spread order
const order = await spreadTrading.placeSpreadOrder({
  symbol: 'BTCUSDT_SOL/USDT',
  side: 'Buy',
  orderType: 'Market',
  qty: '1',
  timeInForce: 'GTC'
})

// Cancel spread order
await spreadTrading.cancelSpreadOrder(orderId)

// Get order history
const orders = await spreadTrading.getSpreadOrderHistory({
  limit: 20
})
```

#### **Execution Tracking**
```javascript
// Get execution list
const executions = await spreadTrading.getSpreadExecutions({
  symbol: 'BTCUSDT_SOL/USDT',
  limit: 50
})

// Execution data structure
{
  symbol: 'BTCUSDT_SOL/USDT',
  orderId: '5e010c35-2b44-4f03-8081-8fa31fb73376',
  execPrice: '21',
  execQty: '2',
  legs: [
    {
      symbol: 'BTCUSDT',
      side: 'Buy',
      execPrice: '124.1',
      execQty: '2',
      execFee: '0.039712',
      category: 'linear'
    },
    {
      symbol: 'SOLUSDT',
      side: 'Sell',
      execPrice: '103.1152',
      execQty: '2',
      execFee: '0.06186912',
      category: 'spot'
    }
  ]
}
```

#### **Position Management**
```javascript
// Get spread positions
const positions = await spreadTrading.getSpreadPositions()

// Position data structure
{
  symbol: 'BTCUSDT_SOL/USDT',
  side: 'Buy',
  size: '2',
  avgPrice: '21.5',
  unrealisedPnl: '0.5',
  margin: '43.0'
}
```

---

## 📡 **WebSocket Streams**

### **Spread Trading Streams**

The enhanced WebSocket V3 client includes dedicated spread trading streams:

```javascript
import { BybitWebSocketV3 } from './server/data/bybit-websocket-v3.js'

const wsClient = new BybitWebSocketV3({
  apiKey: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_SECRET,
  testnet: true,
  spreadSymbols: ['BTCUSDT_SOL/USDT', 'ETHUSDT_SOL/USDT']
})

// Spread-specific event handlers
wsClient.on('spread_orderbook_update', (data) => {
  console.log('Spread OrderBook:', data.symbol, data.data.b.length, 'bids')
})

wsClient.on('spread_trade_update', (data) => {
  console.log('Spread Trade:', data.symbol, data.data.length, 'trades')
})

wsClient.on('spread_ticker_update', (data) => {
  console.log('Spread Ticker:', data.symbol, data.data.lastPrice)
})
```

### **Available Spread Streams**

| Stream Type | Topic Format | Description |
|-------------|--------------|-------------|
| **Orderbook** | `orderbook.50.{symbol}` | Real-time depth data |
| **Trades** | `publicTrade.{symbol}` | Live trade executions |
| **Tickers** | `tickers.{symbol}` | Price and volume updates |

### **Spread Symbol Format**

Spread symbols follow the pattern: `{baseSymbol}_{leg1}/{leg2}`

Examples:
- `BTCUSDT_SOL/USDT` - BTC/SOL spread
- `ETHUSDT_BTC/USDT` - ETH/BTC spread
- `ADAUSDT_DOT/USDT` - ADA/DOT spread

---

## 🎯 **Spread Strategies**

### **Pre-built Strategy Methods**

#### **1. Calendar Spread**
```javascript
// Create calendar spread
const calendarSpread = await spreadTrading.createCalendarSpread(
  'BTCUSDT',    // Base symbol
  'Buy',        // Side
  1,            // Quantity
  '2024-12-31', // Near expiry
  '2025-03-31'  // Far expiry
)
```

#### **2. Butterfly Spread**
```javascript
// Create butterfly spread
const butterflySpread = await spreadTrading.createButterflySpread(
  'BTCUSDT', // Base symbol
  'Sell',    // Side
  1,         // Quantity
  40000,     // Lower strike
  45000,     // Middle strike
  50000      // Upper strike
)
```

#### **3. Straddle Spread**
```javascript
// Create straddle spread
const straddleSpread = await spreadTrading.createStraddleSpread(
  'BTCUSDT', // Base symbol
  'Buy',     // Side
  1,         // Quantity
  45000      // Strike price
)
```

### **Custom Spread Orders**

For complex multi-leg spreads, use the generic order placement:

```javascript
const customSpread = await spreadTrading.placeSpreadOrder({
  symbol: 'BTCUSDT_SOL/USDT_ADA/USDT', // Custom 3-leg spread
  side: 'Buy',
  orderType: 'Limit',
  qty: '1',
  price: '25.50',
  timeInForce: 'GTC',
  orderLinkId: 'custom_spread_' + Date.now()
})
```

---

## 💻 **Implementation Examples**

### **Complete Spread Trading System**

```javascript
import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'
import { BybitWebSocketV3 } from './server/data/bybit-websocket-v3.js'

class SpreadTradingSystem {
  constructor() {
    this.spreadTrading = new BybitSpreadTrading({
      apiKey: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_SECRET,
      testnet: true
    })
    
    this.wsClient = new BybitWebSocketV3({
      apiKey: process.env.BYBIT_API_KEY,
      secret: process.env.BYBIT_SECRET,
      testnet: true,
      spreadSymbols: ['BTCUSDT_SOL/USDT', 'ETHUSDT_SOL/USDT']
    })
    
    this.setupEventHandlers()
  }
  
  setupEventHandlers() {
    // Spread trading events
    this.spreadTrading.on('spread_order_placed', (data) => {
      console.log('Spread order placed:', data.orderId)
    })
    
    this.spreadTrading.on('spread_order_cancelled', (data) => {
      console.log('Spread order cancelled:', data.orderId)
    })
    
    // WebSocket events
    this.wsClient.on('spread_ticker_update', (data) => {
      this.handleSpreadPriceUpdate(data)
    })
    
    this.wsClient.on('spread_orderbook_update', (data) => {
      this.handleSpreadOrderbookUpdate(data)
    })
  }
  
  async initialize() {
    await this.spreadTrading.startMonitoring()
    await this.wsClient.connect()
  }
  
  async executeCalendarSpreadStrategy() {
    try {
      // Analyze market conditions
      const btcPrice = this.wsClient.getTicker('BTCUSDT')
      const solPrice = this.wsClient.getTicker('SOLUSDT')
      
      // Calculate spread ratio
      const spreadRatio = btcPrice.data.lastPrice / solPrice.data.lastPrice
      
      // Execute if conditions are met
      if (spreadRatio > 0.02) { // 2% spread threshold
        const order = await this.spreadTrading.createCalendarSpread(
          'BTCUSDT',
          'Buy',
          1,
          '2024-12-31',
          '2025-03-31'
        )
        
        console.log('Calendar spread executed:', order.orderId)
      }
      
    } catch (error) {
      console.error('Calendar spread strategy failed:', error)
    }
  }
  
  handleSpreadPriceUpdate(data) {
    // Real-time price monitoring
    const spreadTicker = this.wsClient.getSpreadTicker(data.symbol)
    if (spreadTicker) {
      // Update strategy calculations
      this.updateSpreadMetrics(data.symbol, spreadTicker)
    }
  }
  
  handleSpreadOrderbookUpdate(data) {
    // Real-time orderbook monitoring
    const orderbook = this.wsClient.getSpreadOrderBook(data.symbol)
    if (orderbook) {
      // Calculate spread liquidity
      this.calculateSpreadLiquidity(data.symbol, orderbook)
    }
  }
  
  updateSpreadMetrics(symbol, ticker) {
    // Update performance metrics
    const performance = this.spreadTrading.getPerformanceMetrics()
    console.log('Spread performance:', performance)
  }
  
  calculateSpreadLiquidity(symbol, orderbook) {
    // Calculate bid-ask spread and liquidity
    const bidAskSpread = orderbook.data.a[0]?.[0] - orderbook.data.b[0]?.[0]
    console.log(`${symbol} bid-ask spread:`, bidAskSpread)
  }
}

// Usage
const spreadSystem = new SpreadTradingSystem()
await spreadSystem.initialize()
```

### **Risk Management System**

```javascript
class SpreadRiskManager {
  constructor(spreadTrading) {
    this.spreadTrading = spreadTrading
    this.maxPositionSize = 10
    this.maxDailyLoss = 1000 // USD
    this.maxDrawdown = 0.1 // 10%
  }
  
  async validateSpreadOrder(orderParams) {
    try {
      // Check position limits
      const positions = this.spreadTrading.getSpreadPositions()
      if (positions.length >= this.maxPositionSize) {
        throw new Error('Maximum position limit reached')
      }
      
      // Check daily loss limit
      const performance = this.spreadTrading.getPerformanceMetrics()
      if (performance.totalPnL < -this.maxDailyLoss) {
        throw new Error('Daily loss limit exceeded')
      }
      
      // Check drawdown
      if (performance.maxDrawdown > this.maxDrawdown) {
        throw new Error('Maximum drawdown exceeded')
      }
      
      return true
      
    } catch (error) {
      console.error('Risk validation failed:', error)
      return false
    }
  }
  
  async monitorPositions() {
    setInterval(async () => {
      const positions = this.spreadTrading.getSpreadPositions()
      
      for (const position of positions) {
        // Check for stop-loss conditions
        if (position.unrealisedPnl < -position.margin * 0.5) {
          console.warn(`Stop-loss triggered for ${position.symbol}`)
          // Implement stop-loss logic
        }
      }
    }, 30000) // Check every 30 seconds
  }
}
```

---

## 📊 **Performance Monitoring**

### **Performance Metrics**

The spread trading module tracks comprehensive performance metrics:

```javascript
const performance = spreadTrading.getPerformanceMetrics()

// Available metrics
{
  totalSpreads: 25,           // Total spread orders placed
  successfulSpreads: 18,      // Profitable spreads
  failedSpreads: 7,           // Losing spreads
  totalPnL: 1250.50,          // Total profit/loss
  maxDrawdown: 250.00,        // Maximum drawdown
  successRate: '72.00%',      // Success rate
  totalTrades: 25,            // Total trades
  uptime: 86400000            // Uptime in milliseconds
}
```

### **Real-time Monitoring**

```javascript
// Start monitoring
spreadTrading.startMonitoring()

// Monitor events
spreadTrading.on('spread_data_updated', (data) => {
  console.log('Spread data updated:', data.status)
  
  // Send alerts if needed
  if (data.status.performance.totalPnL < -1000) {
    sendAlert('Spread trading loss exceeded threshold')
  }
})
```

### **Status Monitoring**

```javascript
const status = spreadTrading.getStatus()

// Status information
{
  activeSpreads: 3,           // Currently active spreads
  totalOrders: 25,            // Total orders placed
  totalExecutions: 22,        // Total executions
  totalPositions: 3,          // Open positions
  performance: { ... },       // Performance metrics
  lastUpdate: 1640995200000   // Last update timestamp
}
```

---

## 🛡️ **Risk Management**

### **Position Limits**

```javascript
// Set position limits
const maxPositions = 10
const maxExposure = 5000 // USD

// Validate before placing orders
if (spreadTrading.getSpreadPositions().length >= maxPositions) {
  throw new Error('Position limit reached')
}
```

### **Stop-Loss Management**

```javascript
// Implement stop-loss for spreads
const stopLossPercent = 0.05 // 5%

spreadTrading.on('spread_data_updated', (data) => {
  const positions = spreadTrading.getSpreadPositions()
  
  for (const position of positions) {
    const lossPercent = position.unrealisedPnl / position.margin
    
    if (lossPercent < -stopLossPercent) {
      // Trigger stop-loss
      spreadTrading.cancelSpreadOrder(position.orderId)
    }
  }
})
```

### **Exposure Monitoring**

```javascript
// Monitor total exposure
const calculateTotalExposure = () => {
  const positions = spreadTrading.getSpreadPositions()
  return positions.reduce((total, pos) => total + pos.margin, 0)
}

// Check exposure limits
if (calculateTotalExposure() > maxExposure) {
  console.warn('Exposure limit exceeded')
}
```

---

## 🎯 **Best Practices**

### **1. Strategy Development**

```javascript
// Always backtest strategies before live trading
const backtestStrategy = async (strategy, historicalData) => {
  // Implement backtesting logic
  const results = await strategy.backtest(historicalData)
  
  // Validate results
  if (results.sharpeRatio < 1.0) {
    console.warn('Strategy has low Sharpe ratio')
  }
  
  if (results.maxDrawdown > 0.2) {
    console.warn('Strategy has high drawdown')
  }
  
  return results
}
```

### **2. Order Management**

```javascript
// Use limit orders for better execution
const placeLimitSpreadOrder = async (symbol, side, qty, price) => {
  return await spreadTrading.placeSpreadOrder({
    symbol,
    side,
    orderType: 'Limit',
    qty: qty.toString(),
    price: price.toString(),
    timeInForce: 'GTC'
  })
}

// Implement order tracking
const trackOrder = async (orderId) => {
  const order = spreadTrading.getSpreadOrder(orderId)
  
  if (order.status === 'Filled') {
    console.log('Order filled:', orderId)
    // Update strategy state
  } else if (order.status === 'Cancelled') {
    console.log('Order cancelled:', orderId)
    // Handle cancellation
  }
}
```

### **3. Data Management**

```javascript
// Store spread data for analysis
const storeSpreadData = (data) => {
  // Store in database
  database.spreadData.insert({
    symbol: data.symbol,
    price: data.data.lastPrice,
    volume: data.data.volume24h,
    timestamp: data.timestamp
  })
}

// Analyze spread relationships
const analyzeSpreadCorrelation = (symbol1, symbol2) => {
  // Calculate correlation between spreads
  const data1 = getSpreadData(symbol1)
  const data2 = getSpreadData(symbol2)
  
  return calculateCorrelation(data1, data2)
}
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Authentication Errors**
```javascript
// Check API credentials
if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_SECRET) {
  throw new Error('Bybit API credentials not configured')
}

// Verify testnet/mainnet configuration
if (process.env.BYBIT_TESTNET === 'true') {
  console.log('Using testnet environment')
}
```

#### **2. Order Placement Failures**
```javascript
// Validate order parameters
const validateOrderParams = (params) => {
  if (!params.symbol || !params.side || !params.qty) {
    throw new Error('Missing required order parameters')
  }
  
  if (parseFloat(params.qty) <= 0) {
    throw new Error('Invalid quantity')
  }
}
```

#### **3. WebSocket Connection Issues**
```javascript
// Handle WebSocket reconnection
wsClient.on('error', (error) => {
  console.error('WebSocket error:', error)
  
  // Attempt reconnection
  setTimeout(() => {
    wsClient.connect()
  }, 5000)
})
```

### **Debug Mode**

```javascript
// Enable debug logging
const spreadTrading = new BybitSpreadTrading({
  debug: true,
  // ... other options
})

// Monitor all events
spreadTrading.on('*', (event, data) => {
  console.log(`Event: ${event}`, data)
})
```

---

## 📞 **Support & Resources**

### **Documentation**
- **Bybit API Docs**: https://bybit-exchange.github.io/docs/v5/spread
- **WebSocket Guide**: `BYBIT_WEBSOCKET_V3_GUIDE.md`
- **Integration Guide**: `INTEGRATION_STEPS.md`

### **Testing**
- **Spread Trading Test**: `test-spread-trading.js`
- **WebSocket Test**: `test-bybit-websocket-v3.js`

### **Examples**
- **Complete System**: See implementation examples above
- **Strategy Examples**: Calendar, Butterfly, Straddle spreads
- **Risk Management**: Position limits and stop-loss

---

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Compatibility**: Bybit API V5, Node.js 16+  
**License**: MIT 