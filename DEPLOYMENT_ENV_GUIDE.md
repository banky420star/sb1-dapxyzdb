# 🚀 Deployment Environment Variables Guide

## Railway Environment Variables

Set these in your Railway service dashboard:

### Core Trading Configuration
```bash
# Trading Mode (START WITH PAPER)
TRADING_MODE=paper

# Bybit API Credentials (Testnet for paper mode)
BYBIT_API_KEY=your_testnet_api_key
BYBIT_API_SECRET=your_testnet_api_secret

# Risk Management
MAX_TRADE_SIZE_BTC=0.001
STOP_LOSS_PCT=0.02
TAKE_PROFIT_PCT=0.05
DAILY_LOSS_LIMIT_PCT=0.01
CONFIDENCE_THRESHOLD=0.7
```

### Autonomous Trading (Optional)
```bash
# Enable/Disable Autonomous Trading
AUTO_TRADER_ENABLED=false

# Autonomous Trading Configuration
AUTO_INTERVAL_MS=30000
AUTO_SYMBOL=BTCUSDT
```

### System Configuration
```bash
# Environment
NODE_ENV=production
LOG_LEVEL=info
```

## Netlify Environment Variables

Set in your Netlify dashboard:

```bash
# Frontend API Base URL
VITE_API_BASE=https://your-railway-service.up.railway.app
```

## Railway Settings

- **Start Command**: `npm start`
- **Healthcheck Path**: `/health`

## Safety Notes

1. **Always start with `TRADING_MODE=paper`** - No real money at risk
2. **Use testnet API keys** for paper mode testing
3. **Set `AUTO_TRADER_ENABLED=false`** until you're ready
4. **Test thoroughly** before switching to live mode

## Testing Commands

After deployment, test with:

```bash
# Replace with your Railway URL
RAILWAY="https://your-service.up.railway.app"

# Health check
curl -sS $RAILWAY/health

# Status check
curl -sS $RAILWAY/api/status

# Manual trade (paper mode)
curl -sS -X POST $RAILWAY/api/trade/execute \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.9}'

# Autonomous tick
curl -sS -X POST $RAILWAY/api/auto/tick \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"BTCUSDT","candles":[]}'
``` 