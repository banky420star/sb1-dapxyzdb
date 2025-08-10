# 🚀 Crypto Trading Platform - Quick Start Guide

*Get started with cryptocurrency trading in 5 minutes*

## ⚡ **Quick Setup**

### **1. Install Dependencies**
```bash
npm install bybit-api
```

### **2. Configure Environment**
```bash
# Add to your .env file
BYBIT_API_KEY=<set-in-netlify-ui>
BYBIT_SECRET=<set-in-netlify-ui>
BYBIT_TESTNET=false  # Set to true for testing
```

### **3. Start the Platform**
```bash
npm start
```

### **4. Test the System**
```bash
npm run test:crypto
```

## 🎯 **Your First Trade**

### **Check System Status**
```bash
npm run crypto:status
```

### **View Account Balance**
```bash
npm run crypto:balance
```

### **Start Trading Engine**
```bash
npm run crypto:start
```

### **Place Your First Order**
```bash
curl -X POST http://localhost:8000/api/crypto/order \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "type": "Market",
    "side": "Buy",
    "size": 0.001
  }'
```

## 📊 **Monitor Your Trades**

### **Real-Time Dashboard**
Visit: `http://localhost:3000`

### **API Endpoints**
- **Status**: `GET /api/crypto/status`
- **Balance**: `GET /api/crypto/balance`
- **Positions**: `GET /api/crypto/positions`
- **Performance**: `GET /api/crypto/performance`

### **WebSocket Events**
```javascript
// Connect to real-time updates
const socket = io('http://localhost:8000')

socket.on('crypto_price_update', (data) => {
  console.log('Price:', data)
})

socket.on('crypto_signal_executed', (data) => {
  console.log('Trade executed:', data)
})
```

## 🔧 **Trading Modes**

### **Paper Trading (Recommended for Beginners)**
- No real money involved
- Full simulation of market conditions
- Perfect for strategy testing

### **Live Trading**
- Real money and positions
- Full risk management active
- Start with small amounts

## 🛡️ **Safety Features**

### **Risk Management**
- **Max Risk per Trade**: 2% of account
- **Daily Loss Limit**: 5% of account
- **Emergency Stop**: Instant halt of all trading

### **Position Limits**
- **Max Positions**: 10 concurrent
- **Min Order Sizes**: Enforced per cryptocurrency
- **Dynamic Sizing**: Based on signal confidence

## 📈 **Supported Cryptocurrencies**

| Symbol | Name | Min Order |
|--------|------|-----------|
| BTCUSDT | Bitcoin | 0.001 BTC |
| ETHUSDT | Ethereum | 0.01 ETH |
| ADAUSDT | Cardano | 1 ADA |
| DOTUSDT | Polkadot | 0.1 DOT |
| SOLUSDT | Solana | 0.1 SOL |
| MATICUSDT | Polygon | 1 MATIC |

## 🎯 **Trading Strategies**

### **Automatic Strategies**
1. **Trend Following**: MA crossover + RSI
2. **Mean Reversion**: Bollinger Bands + RSI
3. **Breakout**: ATR-based breakouts

### **Manual Trading**
- Place orders via API
- Set custom stop-loss and take-profit
- Monitor positions in real-time

## 🚨 **Emergency Controls**

### **Stop Trading**
```bash
npm run crypto:stop
```

### **Emergency Stop**
```bash
curl -X POST http://localhost:8000/api/crypto/emergency-stop
```

### **Close All Positions**
```bash
curl -X POST http://localhost:8000/api/crypto/close-all-positions
```

## 📱 **Mobile Access**

### **API Access**
All endpoints work from mobile apps:
- TradingView integration
- Custom mobile apps
- Web-based interfaces

### **WebSocket Connection**
```javascript
// Mobile WebSocket connection
const socket = io('http://your-server:8000', {
  transports: ['websocket']
})
```

## 🔍 **Troubleshooting**

### **Common Issues**

**Server Not Starting**
```bash
# Check if port is in use
lsof -i :8000
# Kill process if needed
kill -9 <PID>
```

**API Connection Failed**
```bash
# Verify API keys
curl -X GET "https://api.bybit.com/v5/market/time"
```

**WebSocket Connection Issues**
```bash
# Check server logs
npm run logs
```

### **Support Commands**
```bash
# System health check
npm run health

# Test all components
npm run test:crypto

# View system metrics
npm run metrics
```

## 🎉 **Success Checklist**

- ✅ Server running on port 8000
- ✅ Bybit API connected
- ✅ Crypto trading engine initialized
- ✅ WebSocket streams active
- ✅ Paper trading mode enabled
- ✅ First test order placed
- ✅ Real-time updates working

## 🚀 **Next Steps**

1. **Test Strategies**: Use paper trading to test strategies
2. **Monitor Performance**: Track P&L and win rates
3. **Adjust Risk**: Modify position sizes and limits
4. **Go Live**: Switch to live trading when ready
5. **Scale Up**: Increase position sizes gradually

---

## 📞 **Need Help?**

- **Documentation**: `CRYPTO_TRADING_PLATFORM.md`
- **API Reference**: Check server logs for endpoints
- **Testing**: Run `npm run test:crypto`
- **Monitoring**: Use the web dashboard

**Happy Trading! 🚀** 