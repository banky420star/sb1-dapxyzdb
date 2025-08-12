# 🚀 Autonomous Bot V2 - Development Steps

## Quick Start Checklist

### 1. Create Working Branch
```bash
git checkout -b feat/auto-bot-v2
```

### 2. Backend Files (Already Complete ✅)
- ✅ `railway-backend/lib/bybitClient.js` - Bybit v5 REST API integration
- ✅ `railway-backend/lib/consensusEngine.js` - AI consensus engine
- ✅ `railway-backend/lib/featureBuilder.js` - Technical indicators
- ✅ `railway-backend/server.js` - Production server with v2 endpoints
- ✅ `railway-backend/.eslintrc.cjs` - ESLint configuration
- ✅ `railway-backend/package.json` - Dependencies and scripts

### 3. Frontend Files (Already Complete ✅)
- ✅ `src/lib/api.ts` - TypeScript API client
- ✅ `src/components/TradeTriggerV2.tsx` - Trading interface

### 4. Repository Hygiene (Already Complete ✅)
- ✅ `.gitignore` - Comprehensive ignore rules
- ✅ `CODEOWNERS` - Code ownership
- ✅ `.github/workflows/lint.yml` - Automated linting
- ✅ `.github/workflows/test.yml` - Automated testing

### 5. Test Backend Locally
```bash
cd railway-backend
npm ci
npm run dev
```

### 6. Test Endpoints
```bash
# Health check
curl -sS http://localhost:8000/health

# Status check
curl -sS http://localhost:8000/api/status | jq

# Manual trade (paper mode)
curl -sS -X POST http://localhost:8000/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.85}' | jq

# Autonomous tick
curl -sS -X POST http://localhost:8000/api/auto/tick \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","candles":[]}' | jq
```

### 7. Commit and Push
```bash
git add .
git commit -m "feat(autobot): bybit v5 client, consensus engine, endpoints, ci, hygiene"
git push --set-upstream origin feat/auto-bot-v2
```

### 8. Open PR and Merge
- Create pull request
- Wait for CI to pass
- Merge to main

## Railway Deployment

### 1. Railway Configuration
- **Start Command**: `npm start`
- **Healthcheck Path**: `/health`

### 2. Environment Variables
Set in Railway dashboard:
```bash
TRADING_MODE=paper
BYBIT_API_KEY=your_testnet_key
BYBIT_API_SECRET=your_testnet_secret
MAX_TRADE_SIZE_BTC=0.001
STOP_LOSS_PCT=0.02
TAKE_PROFIT_PCT=0.05
DAILY_LOSS_LIMIT_PCT=0.01
CONFIDENCE_THRESHOLD=0.7
AUTO_TRADER_ENABLED=false
```

### 3. Deploy and Test
```bash
# Health check
curl https://your-service.up.railway.app/health

# Status check
curl https://your-service.up.railway.app/api/status

# Manual trade
curl -X POST https://your-service.up.railway.app/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.9}'
```

## Netlify Configuration

### 1. Environment Variables
Set in Netlify dashboard:
```bash
VITE_API_BASE=https://your-railway-service.up.railway.app
```

### 2. Test Frontend
After Netlify redeploys, test in browser console:
```javascript
fetch(import.meta.env.VITE_API_BASE + '/api/status').then(r=>r.json())
```

## Autonomous Trading

### Enable Autonomous Trading
1. Set `AUTO_TRADER_ENABLED=true` in Railway
2. Configure `AUTO_INTERVAL_MS=30000` (30 seconds)
3. Set `AUTO_SYMBOL=BTCUSDT`

### Control Endpoints
```bash
# Start autonomous trading
curl -X POST https://your-service.up.railway.app/api/trading/start

# Stop autonomous trading
curl -X POST https://your-service.up.railway.app/api/trading/stop

# Check status
curl https://your-service.up.railway.app/api/trading/status
```

## Safety Reminders

1. **Always start with `TRADING_MODE=paper`**
2. **Use testnet API keys for testing**
3. **Test thoroughly before switching to live**
4. **Monitor logs for any errors**
5. **Use kill switches if needed**

## Troubleshooting

### Health Check Failing
- Check Railway logs for "listening on" message
- Verify `/health` endpoint returns 200
- Check environment variables are set

### API Errors
- Verify Bybit API credentials
- Check `TRADING_MODE` is set correctly
- Review server logs for detailed errors

### Frontend Issues
- Verify `VITE_API_BASE` points to Railway URL
- Check browser console for CORS errors
- Ensure Railway service is healthy

## Next Steps

1. **Deploy to Railway** using the checklist above
2. **Test all endpoints** using the verification commands
3. **Configure frontend** to point to Railway backend
4. **Test autonomous trading** in paper mode
5. **Monitor performance** and logs
6. **Switch to live mode** only after thorough testing 