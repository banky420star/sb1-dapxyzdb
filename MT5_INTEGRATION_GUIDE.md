# 🚀 MetaTrader 5 Integration Guide

## 🎯 **Complete MT5 ⇆ AI System Integration**

Your autonomous trading system is now **ready to connect directly to MetaTrader 5** for live trading! This guide will walk you through the complete setup process.

---

## 📋 **Integration Overview**

### **🔄 Communication Flow:**
```
Your AI System ← ZeroMQ → MT5 Bridge EA → MetaTrader 5 → Broker → Market
```

### **🎯 What This Achieves:**
- ✅ **Real-time Data**: Live price feeds from MT5 to your AI
- ✅ **Instant Execution**: AI decisions executed in MT5 within milliseconds
- ✅ **Position Tracking**: Real-time position and account monitoring
- ✅ **Risk Management**: Your AI's risk rules applied to live trading

---

## 🛠️ **Phase 1: MetaTrader 5 Setup**

### **1. Install MetaTrader 5**
- Download from: https://www.metatrader5.com/en/download
- Install MT5 terminal
- Create demo account first (recommended)

### **2. Choose Your Broker**
**Popular MT5 Forex Brokers:**
- **OANDA**: Excellent for forex, good spreads
- **Interactive Brokers**: Global markets, institutional grade
- **FXCM**: Large broker with good tools
- **Pepperstone**: Low spreads, good for scalping
- **IC Markets**: ECN trading, very low spreads

### **3. Setup Trading Account**
```
Recommended for Testing:
- Account Type: Demo (start here!)
- Leverage: 1:100 or lower
- Base Currency: USD
- Initial Balance: $10,000 demo
```

---

## ⚙️ **Phase 2: ZeroMQ Bridge Installation**

### **1. Install ZeroMQ for MT5**
**Download libzmq.dll:**
- Get 64-bit version from: https://zeromq.org/download/
- Or use this direct link: https://github.com/zeromq/libzmq/releases
- Place `libzmq.dll` in: `C:\Program Files\MetaTrader 5\MQL5\Libraries\`

### **2. Install the Expert Advisor**
```bash
# Your MT5 bridge is already in your project:
# Copy mt5/ZmqDealerEA.mq5 to:
# C:\Users\[Username]\AppData\Roaming\MetaQuotes\Terminal\[ID]\MQL5\Experts\
```

### **3. Compile in MT5**
1. Open MetaEditor in MT5 (F4)
2. Open `ZmqDealerEA.mq5`
3. Click Compile (F7)
4. Fix any errors (usually missing libzmq.dll)

---

## 🚀 **Phase 3: System Integration**

### **1. Update Your Environment**
```bash
# Edit .env file
TRADING_MODE=live
ENABLE_LIVE_TRADING=true
MT5_INTEGRATION=true
POSITION_SIZE_LIMIT=0.01        # Start VERY small!

# ZeroMQ Configuration (already set)
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
```

### **2. Start MT5 Bridge**
1. **Open MT5 Terminal**
2. **Navigate to Expert Advisors**
3. **Drag ZmqDealerEA onto a chart** (any symbol)
4. **Configure settings:**
   ```
   Inp_PubEndpoint: tcp://*:5556
   Inp_RepEndpoint: tcp://*:5555
   Inp_Magic: 123456
   Inp_LogLevel: 2
   ```
5. **Click OK and allow DLL imports**

### **3. Start Your AI System**
```bash
# Make sure your models are trained first!
npm run train status

# Start the live trading system
npm run server
```

---

## 🔍 **Phase 4: Testing & Validation**

### **1. Connection Test**
```bash
# Test MT5 connection
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "test mt5 connection"}'

# Should see in MT5 Expert tab:
# "ZMQ-EA: ZMQ sockets up & running"
```

### **2. Demo Trading Test**
```bash
# Place a tiny test order
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'

# Monitor in MT5:
# - Check Expert Advisors tab for logs
# - Watch Terminal tab for trades
# - Monitor account equity changes
```

### **3. Monitoring Setup**
```bash
# Real-time system monitoring
curl http://localhost:8000/api/status
curl http://localhost:8000/api/metrics

# Check your dashboard
# http://localhost:3000
```

---

## 📊 **Communication Protocol**

### **AI → MT5 (Trading Signals)**
```json
{
  "action": "order",
  "side": "buy",
  "vol": 0.01,
  "symbol": "EURUSD"
}
```

### **MT5 → AI (Responses)**
```json
// Success
{"ticket": 123456789}

// Error  
{"err": 10004}
```

### **MT5 → AI (Market Data)**
```json
{
  "type": "tick",
  "sym": "EURUSD", 
  "bid": 1.08123,
  "ask": 1.08125,
  "ts": 1672531200
}
```

---

## 🛡️ **Safety & Risk Management**

### **🚨 Before Live Trading:**
1. **Demo Test**: Run demo trading for 30+ days
2. **Small Positions**: Start with 0.01 lots maximum
3. **Stop Loss**: Always set stop losses
4. **Daily Limits**: Respect daily loss limits
5. **Monitor Closely**: Watch first trades manually

### **🔒 Built-in Protections:**
- ✅ **Position Size Limits**: Controlled by your .env
- ✅ **Daily Loss Limits**: Automatic shutdown
- ✅ **Emergency Stop**: Instant halt capability
- ✅ **Risk Validation**: Every trade pre-approved
- ✅ **Connection Monitoring**: Heartbeat system

### **⚠️ Emergency Controls:**
```bash
# Emergency stop all trading
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'

# Close all positions
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "close all positions"}'
```

---

## 🎯 **Deployment Phases**

### **Phase 1: Demo Validation (Week 1-2)**
```bash
# Configuration
TRADING_MODE=live
MT5_ACCOUNT_TYPE=demo
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.01

# Goals
- Verify MT5 connection stability
- Test order execution speed
- Validate risk management
- Monitor performance metrics
```

### **Phase 2: Live Micro Trading (Week 3-4)**
```bash
# Configuration  
TRADING_MODE=live
MT5_ACCOUNT_TYPE=live
POSITION_SIZE_LIMIT=0.01    # Micro lots only!
MAX_DAILY_LOSS=0.005        # 0.5% daily limit

# Goals
- Trade with real money (small amounts)
- Validate slippage and spreads
- Test during different market conditions
- Build confidence in the system
```

### **Phase 3: Scaled Trading (Month 2+)**
```bash
# Configuration (gradually increase)
POSITION_SIZE_LIMIT=0.1     # Standard lots
MAX_DAILY_LOSS=0.02         # 2% daily limit
MAX_POSITIONS=10            # More concurrent trades

# Goals
- Scale position sizes based on performance
- Add more currency pairs
- Optimize for different market sessions
- Achieve consistent profitability
```

---

## 📈 **Performance Monitoring**

### **Key Metrics to Track:**
```bash
# System Performance
- Order execution latency: <100ms target
- MT5 connection uptime: >99.9%
- Data feed continuity: No gaps >1 second

# Trading Performance  
- Win rate: >55% target
- Profit factor: >1.3 target
- Maximum drawdown: <5%
- Sharpe ratio: >1.0 target
```

### **Monitoring Commands:**
```bash
# Real-time dashboard
http://localhost:3000

# System health
curl http://localhost:8000/api/health

# Trading metrics
curl http://localhost:8000/api/metrics

# MT5 connection status
# Check MT5 Expert Advisors tab
```

---

## 🔧 **Troubleshooting**

### **Common Issues:**

**1. MT5 Bridge Won't Start**
```
Solution:
- Check libzmq.dll is in correct folder
- Allow DLL imports in MT5 settings
- Compile EA in MetaEditor
- Check MT5 Expert Advisors tab for errors
```

**2. No Price Data Received**
```
Solution:
- Verify MT5 is connected to broker
- Check symbol is available in Market Watch
- Restart EA on the chart
- Check ZMQ port conflicts
```

**3. Orders Not Executing**
```
Solution:
- Verify demo/live account status
- Check account has sufficient margin
- Verify symbol trading hours
- Check MT5 auto-trading is enabled
```

**4. High Latency**
```
Solution:
- Use VPS close to broker server
- Optimize MT5 settings
- Check network connection
- Consider dedicated MT5 instance
```

---

## 🎉 **Success Checklist**

Before going live, ensure:
- [ ] **Models trained** to >60% accuracy
- [ ] **Demo trading** profitable for 30+ days
- [ ] **MT5 connection** stable and fast
- [ ] **Risk management** tested and working
- [ ] **Emergency stops** tested
- [ ] **Monitoring** setup and alerts configured
- [ ] **Backup plans** in place
- [ ] **Legal compliance** verified in your jurisdiction

---

## 🚀 **You're Ready for Live Trading!**

With this MT5 integration, your AI system can:
- ✅ **Trade autonomously** with real money
- ✅ **Execute in milliseconds** with institutional speed
- ✅ **Scale automatically** based on performance
- ✅ **Manage risk** in real-time
- ✅ **Learn continuously** from live market data

**🎯 Start with demo trading, prove profitability, then scale to live trading!**

---

**📞 Need Help?**
- Check MT5 Expert Advisors tab for bridge logs
- Monitor `logs/trading.log` for system logs
- Use `npm run train status` for model status
- Test connection with API endpoints

**🚀 Your AI is now ready to trade with MetaTrader 5!**