# 🚀 Autonomous Trading Setup Guide

## 🎯 **Phase 1: Real Data & ML Training (Current Phase)**

Your system is now ready to be configured for autonomous trading! Follow this step-by-step guide to train your models and enable autonomous decision-making.

---

## 📋 **Step 1: Get API Keys (5 minutes)**

### **Alpha Vantage (Required - Free)**
1. Visit: https://www.alphavantage.co/support/#api-key
2. Sign up for a free account
3. Get your API key (500 requests/day free)
4. Copy the key for the next step

### **Optional APIs (Better Data)**
- **IEX Cloud**: https://iexcloud.io/ (Free tier available)
- **Polygon.io**: https://polygon.io/ (Real-time data)

---

## ⚙️ **Step 2: Configure Environment (2 minutes)**

Open your `.env` file and update these keys:

```bash
# === Required ===
ALPHA_VANTAGE_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# === Optional (Better performance) ===
IEX_CLOUD_API_KEY=your_iex_key_here
POLYGON_API_KEY=your_polygon_key_here

# === Trading Configuration ===
TRADING_MODE=paper               # Start with paper trading
AUTO_TRADING=false              # Enable autonomous decisions later
CONTINUOUS_LEARNING=true        # Enable continuous model improvement
MAX_DAILY_LOSS=0.02            # 2% maximum daily loss
MAX_POSITIONS=5                # Maximum simultaneous positions
POSITION_SIZE_LIMIT=0.01       # Start with small position sizes
```

---

## 🚀 **Step 3: Initialize System (3 minutes)**

Run the setup and verification commands:

```bash
# 1. Set up environment
npm run train setup

# 2. Test API connections
npm run train api-test

# 3. Collect historical data (6 months)
npm run train collect

# 4. Train ML models
npm run train train
```

### **Expected Output:**
```
🤖 AlgoTrader ML Training System
=====================================
🔧 Setting up environment...
✅ Environment setup complete!
📊 API Status:
   alphaVantage: ✅ Configured (Rate limit: 5/min)
📥 Starting historical data collection...
✅ Total collected: 15,234 bars
🤖 Starting ML model training...
🎯 Ensemble: 67.3% accuracy (3 models)
🎉 Training successful! Models are ready for autonomous trading.
```

---

## 📊 **Step 4: Monitor Training Progress**

Check your training status anytime:

```bash
# View current training progress
npm run train status

# View detailed system status
curl http://localhost:8000/api/status
```

---

## 🧠 **Understanding Your ML Models**

### **Model Types Trained:**
1. **Random Forest** (40% weight): Pattern recognition
2. **LSTM Neural Network** (35% weight): Sequence prediction
3. **DDQN Reinforcement** (25% weight): Action optimization

### **Success Metrics:**
- ✅ **Good**: >60% ensemble accuracy
- 🎯 **Excellent**: >70% ensemble accuracy
- ⚠️ **Needs work**: <60% accuracy

### **If Accuracy is Low:**
```bash
# Collect more data (longer timeframe)
npm run train collect EURUSD,GBPUSD,USDJPY 1h,4h,1d 12

# Re-train with more data
npm run train train
```

---

## 🎛️ **Step 5: Enable Autonomous Features**

Once your models achieve >60% accuracy:

### **Phase 1: Paper Trading Validation**
```bash
# Update .env file
AUTO_TRADING=true
TRADING_MODE=paper
CONTINUOUS_LEARNING=true

# Restart system
npm run server
```

### **Phase 2: Live Trading (After 30 days validation)**
```bash
# Update .env file
TRADING_MODE=live
ENABLE_LIVE_TRADING=true
POSITION_SIZE_LIMIT=0.01        # Start VERY small!

# Add broker API keys
MT5_SERVER=your_mt5_server
MT5_LOGIN=your_mt5_login
MT5_PASSWORD=your_mt5_password
```

---

## 🔄 **Continuous Learning & Scaling**

### **Daily Model Retraining (Automatic)**
Your system will automatically:
- Retrain models every 24 hours
- Adjust to new market conditions
- Improve accuracy over time
- Add new trading pairs when profitable

### **Manual Scaling Commands**
```bash
# Add new currency pairs
npm run train collect USDCAD,USDCHF,NZDUSD 1h,4h 6
npm run train train USDCAD,USDCHF,NZDUSD 1h,4h

# Increase position sizes (after validation)
# Update .env: POSITION_SIZE_LIMIT=0.05
```

---

## 📈 **Performance Monitoring**

### **Key Metrics to Watch:**
- **Ensemble Accuracy**: Should stay >60%
- **Daily P&L**: Track profitability
- **Drawdown**: Should stay <5%
- **Win Rate**: Target >55%

### **Monitoring Commands:**
```bash
# Real-time metrics
curl http://localhost:8000/api/metrics

# System health
curl http://localhost:8000/api/health

# Training history
npm run train status
```

---

## 🛡️ **Safety Features**

### **Automated Risk Management:**
- ✅ Daily loss limits (2% max)
- ✅ Position size limits
- ✅ Correlation checks
- ✅ Volatility adjustments
- ✅ News blackout periods
- ✅ Emergency stop functionality

### **Manual Controls:**
```bash
# Emergency stop (via API)
curl -X POST http://localhost:8000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "emergency stop"}'

# View current positions
curl http://localhost:8000/api/status
```

---

## 🎯 **Deployment Timeline**

### **Week 1-2: Model Training**
- ✅ Collect historical data
- ✅ Train and validate models
- ✅ Achieve >60% accuracy

### **Week 3-4: Paper Trading**
- 🔄 Enable autonomous paper trading
- 📊 Monitor for 30+ days
- 📈 Validate consistent profitability

### **Month 2: Live Trading**
- 💰 Start with $100-500 capital
- 📊 Monitor closely
- 📈 Scale gradually if profitable

### **Month 3+: Scaling**
- 💰 Increase capital allocation
- 🌍 Add more currency pairs
- 🤖 Full autonomous operation

---

## 🚨 **Important Warnings**

### **⚠️ NEVER:**
- Start with large amounts
- Trade without monitoring
- Ignore risk limits
- Skip paper trading validation

### **✅ ALWAYS:**
- Start with money you can afford to lose
- Monitor performance daily
- Respect risk management rules
- Keep emergency stops ready

---

## 🎉 **Quick Start Summary**

```bash
# 1. Setup (5 minutes)
npm run train setup
npm run train api-test

# 2. Train models (30-60 minutes)
npm run train collect
npm run train train

# 3. Enable autonomous trading
# Edit .env: AUTO_TRADING=true
npm run server

# 4. Monitor and scale
npm run train status
curl http://localhost:8000/api/metrics
```

---

## 📞 **Need Help?**

### **Check Logs:**
```bash
tail -f logs/combined.log
tail -f logs/trading.log
tail -f logs/error.log
```

### **Common Issues:**
- **API Rate Limits**: Wait and retry
- **Low Accuracy**: Collect more data
- **No Trades**: Check risk settings
- **Connection Issues**: Verify API keys

### **System Status:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Health: http://localhost:8000/api/health

---

## 🎖️ **Success Indicators**

You'll know your autonomous trading system is working when:

✅ **Models trained with >60% accuracy**  
✅ **Paper trading shows consistent profits**  
✅ **Risk management prevents large losses**  
✅ **System adapts to market conditions**  
✅ **Continuous learning improves performance**  

**🚀 You're ready for autonomous trading!**