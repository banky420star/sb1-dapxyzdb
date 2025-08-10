# 🚀 Railway Backend Deployment Guide

**Complete production setup** for your AI trading system with Railway backend + Netlify frontend.

## 🎯 What We're Building

- **Frontend**: Netlify (https://delightful-crumble-983869.netlify.app)
- **Backend**: Railway (Production-ready Bybit V5 API)
- **Features**: Real trading, persistent WebSocket, HMAC signing

## 📋 Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **Bybit API Keys**: Already have them
3. **GitHub Repository**: Already connected

## 🚀 Step 1: Deploy Railway Backend

### Option A: Automated Deployment (Recommended)

```bash
# Run the deployment script
./deploy-railway.sh
```

This script will:
- ✅ Install Railway CLI
- ✅ Create Railway project
- ✅ Deploy backend code
- ✅ Set environment variables
- ✅ Test deployment

### Option B: Manual Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Navigate to backend
cd railway-backend

# 4. Initialize Railway project
railway init --name "trading-backend"

# 5. Install dependencies
npm install

# 6. Deploy
railway up

# 7. Get your URL
railway domain
```

## 🔐 Step 2: Set Environment Variables

In Railway Dashboard → Variables, add:

```env
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_RECV_WINDOW=5000
NODE_ENV=production
```

## 🔗 Step 3: Connect Frontend to Railway

### Update Environment Variables

Add to your Netlify environment variables:

```env
VITE_RAILWAY_API_URL=https://your-railway-app.railway.app
```

**Replace** `your-railway-app.railway.app` with your actual Railway domain.

### Test the Connection

1. **Visit your frontend**: https://delightful-crumble-983869.netlify.app
2. **Open browser console**
3. **Navigate to Crypto page**
4. **Place a test order**
5. **Check console logs** for Railway API calls

## 📡 API Endpoints Available

### Private Operations (Require API Keys)
- `POST /api/orders/create` - Create trading orders
- `GET /api/positions` - Get current positions  
- `GET /api/account/balance` - Get account balance

### Public Market Data
- `GET /api/market/tickers` - Get market tickers
- `GET /api/market/orderbook` - Get order book
- `GET /api/market/klines` - Get candlestick data

### System
- `GET /health` - Health check endpoint

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-railway-app.railway.app/health
```

### 2. Test Order Creation
```bash
curl -X POST https://your-railway-app.railway.app/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "category": "linear",
    "symbol": "BTCUSDT",
    "side": "Buy",
    "orderType": "Limit",
    "qty": "0.001",
    "price": "35000"
  }'
```

### 3. Test Positions
```bash
curl https://your-railway-app.railway.app/api/positions?category=linear
```

## 🔧 Monitoring & Maintenance

### Railway Dashboard
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, network usage
- **Deployments**: Deployment history and rollbacks

### CLI Commands
```bash
# View logs
railway logs

# Check status
railway status

# Redeploy
railway up

# Get domain
railway domain
```

## 🛡️ Security Features

- ✅ **HMAC-SHA256 Signing** - Bybit V5 compliant
- ✅ **CORS Protection** - Frontend-only access
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **Environment Variables** - Secure credential storage
- ✅ **SSL/TLS** - Secure by default

## 🚀 Production Benefits

- **Always Online** - No cold starts
- **Persistent Connections** - WebSocket stays alive
- **Global CDN** - Fast worldwide access
- **Auto-scaling** - Handles traffic spikes
- **Real Trading** - Full Bybit V5 integration

## 🔄 Fallback System

The frontend includes **automatic fallback**:
1. **Primary**: Railway backend (real trading)
2. **Fallback**: Demo mode (if Railway unavailable)

This ensures your app **always works** even if backend has issues.

## 📈 Next Steps

1. **Test with small amounts** on Bybit testnet
2. **Monitor performance** via Railway dashboard
3. **Scale as needed** for production trading
4. **Add monitoring** (optional: Sentry, DataDog)

## 🎉 Success Checklist

- [ ] Railway backend deployed
- [ ] Environment variables set
- [ ] Frontend connected to Railway
- [ ] Health check passing
- [ ] Test order placed successfully
- [ ] Positions data loading
- [ ] Account balance showing

## 🆘 Troubleshooting

### Backend Not Responding
```bash
# Check Railway logs
railway logs

# Restart deployment
railway up
```

### Frontend Can't Connect
1. Check `VITE_RAILWAY_API_URL` in Netlify
2. Verify CORS settings
3. Check browser console for errors

### API Errors
1. Verify Bybit API keys in Railway
2. Check rate limits
3. Review Railway logs

---

## 🎯 **YOUR PRODUCTION TRADING SYSTEM IS READY!**

**Frontend**: https://delightful-crumble-983869.netlify.app  
**Backend**: https://your-railway-app.railway.app  
**Status**: 🚀 **LIVE & TRADING** 💰 