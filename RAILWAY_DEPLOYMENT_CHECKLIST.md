# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment Status

### Repository Cleanup (COMPLETED)
- ✅ Server entrypoints consolidated to `server.js`
- ✅ Non-canonical servers moved to `examples/` directory
- ✅ Database artifacts removed from git tracking
- ✅ Build artifacts removed from git tracking
- ✅ .gitignore updated to prevent future issues
- ✅ All branches synchronized

### V2 Implementation (COMPLETED)
- ✅ Bybit v5 REST API integration
- ✅ AI consensus engine with 3-model voting
- ✅ Technical indicators and feature builder
- ✅ New API endpoints: `/api/trade/execute`, `/api/auto/tick`
- ✅ Frontend API client updated
- ✅ Comprehensive security and monitoring

---

## 🔧 Railway Configuration

### 1. Start Command + Health
**Railway → Service → Settings:**
- **Start Command:** `npm start`
- **Healthcheck Path:** `/health`

### 2. Environment Variables (Paper Mode First)
Set these in Railway environment variables:

```bash
# Trading Mode (START WITH PAPER)
TRADING_MODE=paper

# Bybit API (Testnet for paper mode)
BYBIT_API_KEY=your_testnet_api_key
BYBIT_API_SECRET=your_testnet_api_secret

# Risk Management
MAX_TRADE_SIZE_BTC=0.001
STOP_LOSS_PCT=0.02
TAKE_PROFIT_PCT=0.05
DAILY_LOSS_LIMIT_PCT=0.01
CONFIDENCE_THRESHOLD=0.7

# Autonomous Trading (Optional)
AUTO_TRADER_ENABLED=false
```

### 3. Deploy + Smoke Test
After deployment, test these endpoints:

```bash
# Replace with your Railway URL
RAILWAY="https://your-service.up.railway.app"

echo "# Health Check"
curl -sS $RAILWAY/health

echo "# Status Check"
curl -sS $RAILWAY/api/status

echo "# Manual Trade (Paper Mode)"
curl -sS -X POST $RAILWAY/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.9}'

echo "# Autonomous Tick"
curl -sS -X POST $RAILWAY/api/auto/tick \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","candles":[]}'
```

---

## 🌐 Frontend Configuration

### Netlify Environment Variables
Set in Netlify dashboard:
```bash
VITE_API_BASE=https://your-service.up.railway.app
```

### Frontend Test
After Netlify redeploys, test in browser console:
```javascript
fetch(import.meta.env.VITE_API_BASE + '/api/status').then(r=>r.json())
```

---

## 🤖 Autonomous Trading Setup

### Option 1: Internal Scheduler (Recommended)
The server includes an internal autonomous trading loop. To enable:

1. Set environment variable: `AUTO_TRADER_ENABLED=true`
2. Use API endpoints:
   - `POST /api/trading/start` - Start autonomous trading
   - `POST /api/trading/stop` - Stop autonomous trading
   - `GET /api/trading/status` - Check status

### Option 2: External Scheduler
Use GitHub Actions or cron to hit `/api/auto/tick` endpoint.

---

## 🔍 Verification Steps

### 1. Health Check
```bash
curl https://your-service.up.railway.app/health
```
Expected: `{"status":"healthy","tradingMode":"paper",...}`

### 2. Status Check
```bash
curl https://your-service.up.railway.app/api/status
```
Expected: `{"status":"ok","mode":"paper","features":{...}}`

### 3. Manual Trade Test
```bash
curl -X POST https://your-service.up.railway.app/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.9}'
```
Expected: `{"ok":true,"simulated":true,"appliedRisk":{...}}`

### 4. Autonomous Tick Test
```bash
curl -X POST https://your-service.up.railway.app/api/auto/tick \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","candles":[]}'
```
Expected: `{"ok":true,"consensus":{...},"appliedRisk":{...}}`

---

## 🚨 Important Notes

### Security
- ✅ All endpoints have rate limiting
- ✅ Input validation on all requests
- ✅ CORS configured for frontend
- ✅ Helmet.js security headers
- ✅ Environment variables protected

### Paper Mode Safety
- ✅ Default trading mode is `paper`
- ✅ No real money at risk in paper mode
- ✅ All trades are simulated
- ✅ Test thoroughly before switching to `live`

### Monitoring
- ✅ Health endpoint for Railway monitoring
- ✅ Comprehensive logging
- ✅ Error handling on all endpoints
- ✅ Graceful shutdown handling

---

## 🎯 Next Steps

1. **Deploy to Railway** using the checklist above
2. **Test all endpoints** using the verification steps
3. **Configure frontend** to point to Railway backend
4. **Test autonomous trading** in paper mode
5. **Monitor performance** and logs
6. **Switch to live mode** only after thorough testing

---

*Last Updated: 2025-08-11 18:30 UTC*
*Status: Ready for Deployment* 