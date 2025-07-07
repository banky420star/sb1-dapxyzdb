# ⚡ **QUICK START GUIDE**

## 🚀 **Your AI Trading System is Ready!**

All checks passed ✅ - Let's get you trading in 5 steps!

---

## 🎯 **5-Minute Setup**

### **1. Choose Your Path:**

#### **🧪 Demo Trading (Start Here)**
```bash
# Your system is already configured for demo trading
# Just start the server and begin!
npm run server
```

#### **💰 Live Trading (Advanced)**
```bash
# Follow the full MT5 setup guide
open LIVE_TRADING_SETUP.md
```

---

## 🎮 **Essential Commands**

### **🚀 System Control:**
```bash
# Start full system (backend + frontend)
npm run dev

# Start backend only
npm run server

# Check system health
curl http://localhost:8000/api/health

# Check setup status
npm run setup:mt5
```

### **💼 Trading Control:**
```bash
# Start trading
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'

# Stop trading
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "stop trading"}'

# Emergency stop
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'
```

### **📊 Monitoring:**
```bash
# System status
curl http://localhost:8000/api/status

# Trading metrics
curl http://localhost:8000/api/metrics

# View logs
tail -f logs/trading.log

# Frontend dashboard
http://localhost:3000
```

---

## 🎪 **Demo Trading (Recommended Start)**

### **🚀 Quick Demo Setup:**
```bash
# 1. Start the system
npm run server

# 2. Start trading (paper mode)
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'

# 3. Monitor performance
curl http://localhost:8000/api/metrics
```

### **📈 What You'll See:**
- ✅ **AI Predictions**: ML models making decisions
- ✅ **Paper Trades**: Simulated order execution
- ✅ **Live Metrics**: Real-time performance tracking
- ✅ **Risk Management**: Automated safety controls

---

## 🏦 **Live Trading Setup** 

### **Prerequisites:**
1. **Choose Broker**: OANDA, Interactive Brokers, IC Markets
2. **Download MT5**: From your broker
3. **Demo Account**: Test first (MANDATORY)

### **Quick MT5 Setup:**
```bash
# 1. Download libzmq.dll (64-bit)
# https://github.com/zeromq/libzmq/releases

# 2. Copy to MT5 Libraries
# C:\Program Files\MetaTrader 5\MQL5\Libraries\libzmq.dll

# 3. Copy Expert Advisor
# cp mt5/ZmqDealerEA.mq5 [MT5_DATA]/MQL5/Experts/

# 4. Compile in MetaEditor (F4 → F7)

# 5. Attach to chart (Allow DLL imports)
```

### **Verify Connection:**
```bash
# Test MT5 bridge
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "test mt5 connection"}'
```

---

## 🛡️ **Safety First**

### **🚨 Risk Limits (NEVER EXCEED):**
```bash
POSITION_SIZE_LIMIT=0.01     # Micro lots only
MAX_DAILY_LOSS=0.005         # 0.5% daily limit  
MAX_POSITIONS=3              # Start small
```

### **⚡ Emergency Controls:**
```bash
# Instant stop (memorize this!)
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'

# Close all positions
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "close all positions"}'
```

---

## 📱 **Access Points**

### **🌐 URLs:**
- **Backend API**: `http://localhost:8000`
- **Frontend Dashboard**: `http://localhost:3000`
- **Health Check**: `http://localhost:8000/api/health`
- **Trading Status**: `http://localhost:8000/api/status`

### **📊 Key Endpoints:**
```bash
GET  /api/health     # System health
GET  /api/status     # Trading status
GET  /api/metrics    # Performance data
POST /api/command    # Execute commands
```

---

## 🎯 **Success Checklist**

### **✅ Before Demo Trading:**
- [ ] System started (`npm run server`)
- [ ] Health check passes
- [ ] Models loaded (3 models)
- [ ] Trading started
- [ ] Metrics available

### **✅ Before Live Trading:**
- [ ] 30+ days demo success
- [ ] Win rate >55%
- [ ] Max drawdown <5%
- [ ] MT5 connected
- [ ] Emergency stops tested

---

## 🚀 **You're All Set!**

### **🎉 Your AI Trading System:**
- ✅ **Smart**: 3 ML models making predictions
- ✅ **Fast**: Millisecond execution speed
- ✅ **Safe**: Multiple risk management layers
- ✅ **Profitable**: Designed for consistent gains
- ✅ **Scalable**: Ready for any account size

### **📚 Documentation:**
- `LIVE_TRADING_SETUP.md` - Complete setup guide
- `MT5_INTEGRATION_GUIDE.md` - Technical details
- `SYSTEM_INTEGRATION_STATUS.md` - System status

---

## 🎪 **Start Trading Now!**

### **Quick Demo (1 Minute):**
```bash
# Start your AI trading system
npm run server

# Begin trading
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "start trading"}'

# Watch the magic happen
curl http://localhost:8000/api/status
```

**🚀 Your AI is now making intelligent trading decisions!**

**Welcome to the future of trading! 🎉**