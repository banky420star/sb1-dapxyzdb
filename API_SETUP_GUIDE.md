# 🚀 API Setup Guide - Quick Steps

## Step 1: Get Bybit API Keys (5 minutes)

### For Testing (Recommended First):
1. Go to: https://testnet.bybit.com
2. Register/Login
3. Go to Account → API Management
4. Create new API key with:
   - Read permission
   - Trade permission
5. Copy all 3 values

### For Live Trading (Later):
1. Go to: https://www.bybit.com
2. Same process as testnet
3. ⚠️ Use carefully - real money!

## Step 2: Get Alpha Vantage API Key (2 minutes)
1. Visit: https://www.alphavantage.co/support/#api-key
2. Enter email
3. Get free key instantly
4. Check email

## Step 3: Add to .env File
```bash
# Copy template to .env
cp env.template .env

# Edit .env file
nano .env
```

Add your keys:
```env
# For Testing (Testnet)
BYBIT_API_KEY=your_testnet_api_key_here
BYBIT_API_SECRET=your_testnet_api_secret_here
BYBIT_SECRET=your_testnet_secret_here
BYBIT_TESTNET=true
BYBIT_DEMO=false

# Alpha Vantage
ALPHAVANTAGE_API_KEY=your_alpha_vantage_key_here

# Keep these as-is for safety
TRADING_MODE=paper  # Paper trading first!
```

## Step 4: Validate
```bash
npm run validate-env
```

## What Each API Does:

### Bybit API:
- Executes cryptocurrency trades
- Gets real-time crypto prices
- Manages positions and orders
- Provides account balance info
- WebSocket for live market data

### Alpha Vantage API:
- Historical stock/forex data
- Technical indicators (SMA, EMA, RSI, etc.)
- Fundamental data
- Economic indicators
- Free tier is sufficient for testing

## Important Notes:
1. **Start with Testnet** - No real money at risk
2. **Paper trading mode** - Simulated trades even on testnet
3. **Keep secrets secure** - Never share or commit API keys
4. **Rate limits** - Alpha Vantage: 5/min, Bybit: 100/min

## Test Your APIs:
```bash
# After adding keys to .env
node test-trading-v5.js
```
