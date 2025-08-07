# 🔄 Bybit WebSocket V3 Integration Steps

*Step-by-step guide to integrate the new WebSocket V3 client into your existing system*

## 🎯 **Overview**

This guide will help you replace your existing Bybit WebSocket implementation with the new V3 client that provides enhanced features, better performance, and improved reliability.

---

## 📋 **Prerequisites**

### **1. Current System Status**
Your system currently has:
- ✅ Bybit integration in `server/data/bybit-integration.js`
- ✅ WebSocket handling in `server/index.js`
- ✅ Enhanced features in `server/enhanced-server.js`
- ✅ Crypto trading engine in `server/trading/crypto-engine.js`

### **2. New Components Available**
- ✅ `server/data/bybit-websocket-v3.js` (New V3 client)
- ✅ `test-bybit-websocket-v3.js` (Test implementation)
- ✅ `BYBIT_WEBSOCKET_V3_GUIDE.md` (Complete documentation)

---

## 🚀 **Integration Steps**

### **Step 1: Backup Current Implementation**

```bash
# Create backup of current implementation
cp server/data/bybit-integration.js server/data/bybit-integration-backup.js
cp server/index.js server/index-backup.js
```

### **Step 2: Update Your Main Server**

Edit `server/index.js` to use the new V3 client:

```javascript
// Replace the import
// OLD:
// import { BybitIntegration } from './data/bybit-integration.js'

// NEW:
import { BybitWebSocketV3 } from './data/bybit-websocket-v3.js'

// In your server initialization, replace:
// OLD:
// bybitIntegration = new BybitIntegration()
// await bybitIntegration.initialize()

// NEW:
bybitIntegration = new BybitWebSocketV3({
  apiKey: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_SECRET,
  testnet: process.env.BYBIT_TESTNET === 'true',
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT'],
  heartbeatInterval: 20000,
  reconnectAttempts: 5
})
await bybitIntegration.connect()
```

### **Step 3: Update Event Handlers**

```javascript
// OLD event handlers:
bybitIntegration.on('orderbook_update', (symbol, data) => {
  io.emit('bybit_orderbook_update', { symbol, data })
})

bybitIntegration.on('ticker_update', (symbol, data) => {
  io.emit('bybit_ticker_update', { symbol, data })
})

// NEW event handlers:
bybitIntegration.on('orderbook_update', (data) => {
  io.emit('bybit_orderbook_update', {
    symbol: data.symbol,
    data: data.data,
    timestamp: data.timestamp
  })
})

bybitIntegration.on('ticker_update', (data) => {
  io.emit('bybit_ticker_update', {
    symbol: data.symbol,
    data: data.data,
    timestamp: data.timestamp
  })
})

// Add new event handlers for enhanced features:
bybitIntegration.on('trade_update', (data) => {
  io.emit('bybit_trade_update', {
    symbol: data.symbol,
    data: data.data,
    timestamp: data.timestamp
  })
})

bybitIntegration.on('position_update', (data) => {
  io.emit('bybit_position_update', {
    positions: data.positions,
    timestamp: data.timestamp
  })
})

bybitIntegration.on('order_update', (data) => {
  io.emit('bybit_order_update', {
    orders: data.orders,
    timestamp: data.timestamp
  })
})

bybitIntegration.on('wallet_update', (data) => {
  io.emit('bybit_wallet_update', {
    wallet: data.wallet,
    timestamp: data.timestamp
  })
})
```

### **Step 4: Update Data Retrieval Methods**

```javascript
// OLD methods (still work but enhanced):
const orderBook = bybitIntegration.getOrderBook('BTCUSDT')
const ticker = bybitIntegration.getTicker('BTCUSDT')
const trades = bybitIntegration.getTrades('BTCUSDT')

// NEW methods:
const positions = bybitIntegration.getPositions()
const orders = bybitIntegration.getOrders()
const wallet = bybitIntegration.getWallet()
const status = bybitIntegration.getStatus()
```

### **Step 5: Update Enhanced Server**

Edit `server/enhanced-server.js`:

```javascript
// Replace BybitIntegration import
import { BybitWebSocketV3 } from './data/bybit-websocket-v3.js'

// Update initialization
bybitIntegration = new BybitWebSocketV3({
  apiKey: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_SECRET,
  testnet: process.env.BYBIT_TESTNET === 'true',
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT']
})
await bybitIntegration.connect()

// Update event handlers (same as Step 3)
```

### **Step 6: Update Crypto Trading Engine**

Edit `server/trading/crypto-engine.js`:

```javascript
// Update event handlers
this.bybit.on('ticker_update', (data) => {
  this.handlePriceUpdate({
    symbol: data.symbol,
    price: data.data.lastPrice,
    timestamp: data.timestamp
  })
})

this.bybit.on('position_update', (data) => {
  this.handlePositionUpdate(data.positions)
})

this.bybit.on('order_update', (data) => {
  this.handleOrderUpdate(data.orders)
})

this.bybit.on('wallet_update', (data) => {
  this.handleWalletUpdate(data.wallet)
})
```

---

## 🧪 **Testing the Integration**

### **Step 1: Test Basic Functionality**

```bash
# Test the new WebSocket V3 client
node test-bybit-websocket-v3.js
```

### **Step 2: Test Your Server**

```bash
# Start your server
npm start

# Check logs for WebSocket connection status
# Look for: "✅ Bybit WebSocket V3 connected successfully"
```

### **Step 3: Test Real-time Data**

```javascript
// In your browser console or client
socket.on('bybit_orderbook_update', (data) => {
  console.log('Orderbook Update:', data)
})

socket.on('bybit_ticker_update', (data) => {
  console.log('Ticker Update:', data)
})

socket.on('bybit_trade_update', (data) => {
  console.log('Trade Update:', data)
})
```

---

## 🔧 **Configuration Options**

### **Environment Variables**

```bash
# .env file
BYBIT_API_KEY=your_api_key
BYBIT_SECRET=your_api_secret
BYBIT_TESTNET=true  # Set to false for production
```

### **Client Configuration**

```javascript
const bybitIntegration = new BybitWebSocketV3({
  // API Configuration
  apiKey: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_SECRET,
  testnet: process.env.BYBIT_TESTNET === 'true',
  
  // Trading Configuration
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'SOLUSDT', 'MATICUSDT'],
  
  // Connection Configuration
  maxActiveTime: 600,        // 10 minutes
  heartbeatInterval: 20000,  // 20 seconds
  reconnectAttempts: 5,
  reconnectDelay: 5000
})
```

---

## 📊 **Monitoring Integration**

### **Add Status Monitoring**

```javascript
// Add to your health check endpoint
app.get('/api/health', (req, res) => {
  const bybitStatus = bybitIntegration.getStatus()
  
  res.json({
    status: 'healthy',
    services: {
      database: dbStatus,
      redis: redisStatus,
      bybit: {
        connected: bybitStatus.connected,
        authenticated: bybitStatus.authenticated,
        subscriptions: bybitStatus.subscriptions,
        reconnectAttempts: bybitStatus.reconnectAttempts
      }
    }
  })
})
```

### **Add Performance Monitoring**

```javascript
// Monitor WebSocket performance
setInterval(() => {
  const status = bybitIntegration.getStatus()
  
  if (!status.connected) {
    console.warn('⚠️ Bybit WebSocket disconnected')
    // Send alert
  }
  
  if (status.reconnectAttempts > 3) {
    console.error('❌ Bybit WebSocket reconnection issues')
    // Send critical alert
  }
}, 30000) // Check every 30 seconds
```

---

## 🚨 **Error Handling**

### **Add Error Handlers**

```javascript
// Handle WebSocket errors
bybitIntegration.on('error', (error) => {
  console.error('❌ Bybit WebSocket error:', error)
  // Send error alert
})

// Handle reconnection failures
bybitIntegration.on('max_reconnect_attempts_reached', () => {
  console.error('❌ Bybit WebSocket max reconnection attempts reached')
  // Send critical alert
  // Implement fallback logic
})
```

### **Graceful Shutdown**

```javascript
// Add to your server shutdown handler
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down server...')
  
  if (bybitIntegration) {
    await bybitIntegration.disconnect()
  }
  
  process.exit(0)
})
```

---

## ✅ **Verification Checklist**

### **Before Deployment**
- [ ] WebSocket V3 client connects successfully
- [ ] Public streams (orderbook, trades, ticker) working
- [ ] Event handlers updated and working
- [ ] Data retrieval methods working
- [ ] Error handling implemented
- [ ] Monitoring added
- [ ] Graceful shutdown implemented

### **After Deployment**
- [ ] Real-time data flowing to clients
- [ ] No errors in server logs
- [ ] Performance metrics acceptable
- [ ] Connection stability verified
- [ ] Reconnection working properly

---

## 🔄 **Rollback Plan**

If issues occur, you can quickly rollback:

```bash
# Restore backup files
cp server/data/bybit-integration-backup.js server/data/bybit-integration.js
cp server/index-backup.js server/index.js

# Restart server
npm restart
```

---

## 📞 **Support**

If you encounter issues:

1. **Check the troubleshooting section** in `BYBIT_WEBSOCKET_V3_GUIDE.md`
2. **Review the test output** from `test-bybit-websocket-v3.js`
3. **Check server logs** for specific error messages
4. **Verify environment variables** are set correctly
5. **Test with minimal configuration** first

---

**Integration Status**: Ready for Implementation  
**Estimated Time**: 30-60 minutes  
**Risk Level**: Low (with rollback plan)  
**Next Step**: Start with Step 1 - Backup 