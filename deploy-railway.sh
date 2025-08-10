#!/bin/bash

# 🚀 Railway Backend Deployment Script
# Deploys the trading backend to Railway for production

set -e

echo "🚀 RAILWAY BACKEND DEPLOYMENT"
echo "=============================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway:"
    railway login
fi

echo "📁 Setting up Railway backend..."

# Create Railway project if not exists
if [ ! -f "railway-backend/railway.json" ]; then
    echo "🆕 Creating new Railway project..."
    cd railway-backend
    railway init --name "trading-backend"
    cd ..
else
    echo "✅ Railway project already exists"
fi

echo "🔧 Installing dependencies..."
cd railway-backend
npm install

echo "🚀 Deploying to Railway..."
railway up

echo "🌐 Getting deployment URL..."
RAILWAY_URL=$(railway domain)
echo "✅ Backend deployed at: $RAILWAY_URL"

echo "🔐 Setting environment variables..."
railway variables set BYBIT_API_KEY="3fg29yhr1a9JJ1etm3"
railway variables set BYBIT_API_SECRET="wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14"
railway variables set BYBIT_RECV_WINDOW="5000"
railway variables set NODE_ENV="production"

echo "🧪 Testing deployment..."
sleep 10
curl -s "$RAILWAY_URL/health" | jq .

echo ""
echo "🎉 RAILWAY BACKEND DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo "🌐 Backend URL: $RAILWAY_URL"
echo "📊 Health Check: $RAILWAY_URL/health"
echo "📡 API Endpoints:"
echo "   - POST $RAILWAY_URL/api/orders/create"
echo "   - GET  $RAILWAY_URL/api/positions"
echo "   - GET  $RAILWAY_URL/api/account/balance"
echo ""
echo "🔧 Next Steps:"
echo "1. Update frontend with Railway URL: $RAILWAY_URL"
echo "2. Test API endpoints"
echo "3. Monitor logs: railway logs"
echo ""
echo "💰 Ready for production trading!" 