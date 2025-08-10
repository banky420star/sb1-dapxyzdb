# 🚀 Trading Backend for Railway

**Production-ready Bybit V5 API backend** with persistent WebSocket connections and secure HMAC signing.

## 🎯 Features

- ✅ **Bybit V5 API Integration** - Full trading capabilities
- ✅ **HMAC-SHA256 Signing** - Secure API authentication
- ✅ **WebSocket Support** - Real-time market data
- ✅ **CORS Configuration** - Frontend integration ready
- ✅ **Rate Limiting** - API protection
- ✅ **Health Checks** - Monitoring endpoints
- ✅ **Production Ready** - Railway optimized

## 🚀 Quick Deploy to Railway

### 1. **Connect to Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your Railway project
railway link
```

### 2. **Set Environment Variables**

In Railway Dashboard → Variables, add:

```env
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_RECV_WINDOW=5000
NODE_ENV=production
```

### 3. **Deploy**

```bash
# Deploy to Railway
railway up

# Get your deployment URL
railway domain
```

## 📡 API Endpoints

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

## 🔧 Frontend Integration

Update your frontend to use the Railway backend:

```typescript
// Replace Netlify functions with Railway API
const API_BASE = 'https://your-railway-app.railway.app';

// Example: Place order
const placeOrder = async (orderData) => {
  const response = await fetch(`${API_BASE}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return response.json();
};
```

## 🛡️ Security Features

- **HMAC-SHA256 Signing** - Bybit V5 compliant
- **CORS Protection** - Frontend-only access
- **Rate Limiting** - 100 requests per 15 minutes
- **Helmet Security** - HTTP headers protection
- **Environment Variables** - Secure credential storage

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Railway Logs**: `railway logs`
- **Uptime Monitoring**: Railway built-in

## 🔄 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/health
```

## 🚀 Production Benefits

- **Always Online** - No cold starts
- **Persistent Connections** - WebSocket stays alive
- **Global CDN** - Fast worldwide access
- **Auto-scaling** - Handles traffic spikes
- **SSL/TLS** - Secure by default

## 📈 Next Steps

1. **Deploy to Railway** using the steps above
2. **Update frontend** to use Railway API endpoints
3. **Test with small amounts** on Bybit testnet
4. **Monitor performance** via Railway dashboard
5. **Scale as needed** for production trading

---

**Ready for production trading!** 🎉💰 