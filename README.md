# 🤖 Autonomous Trading Bot (Frontend + Backend)

A complete AI-powered autonomous trading system with Bybit integration, AI consensus engine, and real-time risk management.

## 🚀 Quick Start (Development)

### Backend Setup
```bash
cd railway-backend
cp env.example .env   # fill in your Bybit API credentials
npm ci
npm run dev          # http://localhost:8000 (has /health endpoint)
```

### Frontend Setup
```bash
cp env.example .env   # set VITE_API_BASE to your backend URL
npm ci
npm run dev          # http://localhost:5173
```

## 🏗️ System Architecture

### Frontend (Netlify)
- **React + Vite** with TypeScript
- **Tailwind CSS** for styling
- **Real-time trading interface**
- **AI consensus visualization**
- **Risk management dashboard**

### Backend (Railway)
- **Node.js + Express** with ES modules
- **Bybit API integration** (paper/live modes)
- **AI Consensus Engine** (3 ML models)
- **Risk management system**
- **Autonomous trading bot**

## 🤖 AI Consensus Engine

The system uses 3 simulated ML models for trading decisions:

1. **LSTM Model** - Time series analysis
2. **CNN Model** - Pattern recognition
3. **XGBoost Model** - Ensemble predictions

### Consensus Logic
- **Majority voting** (2+ models must agree)
- **Confidence threshold** (default: 70%)
- **Risk-adjusted position sizing**
- **Real-time market feature analysis**

## 🔒 Security Features

- **Helmet.js** for security headers
- **CORS protection** with whitelist
- **Rate limiting** (100 requests/30s)
- **Input validation** and sanitization
- **Environment variable protection**
- **Paper trading mode** by default

## 📊 API Endpoints

### Health & Status
- `GET /health` - Health check (Railway)
- `GET /api/status` - System status

### Trading
- `POST /api/trade/execute` - Execute trade with AI consensus
- `GET /api/account/balance` - Get account balance
- `GET /api/positions` - Get open positions

### AI & Autonomous
- `POST /api/ai/consensus` - Get AI consensus analysis
- `POST /api/trading/start` - Start autonomous trading
- `POST /api/trading/stop` - Stop autonomous trading
- `GET /api/trading/status` - Get trading status

## 🔧 Configuration

### Environment Variables

```bash
# Trading Mode
TRADING_MODE=paper  # paper | live

# Bybit API
BYBIT_API_KEY=your_key
BYBIT_API_SECRET=your_secret

# Risk Management
MAX_TRADE_SIZE_BTC=0.001
STOP_LOSS_PCT=0.02
TAKE_PROFIT_PCT=0.05
CONFIDENCE_THRESHOLD=0.7

# Frontend
VITE_API_BASE=https://your-railway-service.up.railway.app
```

## 🚀 Production Deployment

### Railway Backend
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main

### Netlify Frontend
1. Connect your GitHub repo to Netlify
2. Set `VITE_API_BASE` to your Railway URL
3. Deploy automatically on push to main

## 🧪 Testing

### Manual Testing
```bash
# Test health endpoint
curl https://your-railway-service.up.railway.app/health

# Test AI consensus
curl -X POST https://your-railway-service.up.railway.app/api/ai/consensus \
  -H "Content-Type: application/json" \
  -d '{}'

# Test trade execution (paper mode)
curl -X POST https://your-railway-service.up.railway.app/api/trade/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT"}'
```

### Automated Testing
```bash
# Backend tests
cd railway-backend
npm test

# Frontend build test
npm run build
```

## 📈 Monitoring

- **Health checks** every 30 seconds
- **Real-time logging** with structured output
- **Performance metrics** via `/health` endpoint
- **Error tracking** with detailed stack traces
- **Trading activity** logging

## 🔄 CI/CD Pipeline

- **GitHub Actions** for linting and testing
- **Automatic deployment** to Railway and Netlify
- **Code quality checks** on every PR
- **Security scanning** for dependencies

## 🛡️ Risk Management

- **Position sizing** based on confidence
- **Stop loss** and take profit orders
- **Daily loss limits**
- **Paper trading mode** for testing
- **Manual override** capability

## 📱 Features

### Frontend
- **Real-time trading interface**
- **AI consensus visualization**
- **Account balance display**
- **Position management**
- **Risk parameter controls**
- **Mobile responsive design**

### Backend
- **24/7 autonomous trading**
- **AI-powered decision making**
- **Real-time market data**
- **Risk management system**
- **Comprehensive logging**
- **Graceful error handling**

## 🎯 Usage Examples

### Execute AI Trade
```typescript
import api from './lib/api';

const result = await api.executeTrade({
  symbol: 'BTCUSDT'
});
console.log('AI consensus result:', result.consensus);
```

### Manual Override
```typescript
const result = await api.executeTrade({
  symbol: 'BTCUSDT',
  manualOverride: {
    side: 'buy',
    confidence: 0.85
  }
});
```

### Start Autonomous Trading
```typescript
await api.startAutonomousTrading();
const status = await api.getTradingStatus();
console.log('Autonomous trading:', status.autonomousTrading);
```

## 🚨 Important Notes

1. **Always test in paper mode first**
2. **Set appropriate risk parameters**
3. **Monitor autonomous trading closely**
4. **Keep API credentials secure**
5. **Regularly review trading performance**

## 📞 Support

For issues or questions:
1. Check the logs in Railway dashboard
2. Review the health endpoint
3. Test with paper trading mode
4. Verify environment variables

---

**Built with ❤️ for autonomous trading**