#!/bin/bash

# 🚀 Railway Deployment Preparation Script
# Prepares the backend for Railway deployment

set -e

echo "🚀 PREPARING RAILWAY DEPLOYMENT"
echo "================================"

# Railway configuration
PROJECT_ID="fe622622-dbe0-490e-ab89-151fd0b8d21d"
SERVICE_NAME="trading-backend"

echo "📦 Preparing Railway backend..."

# Navigate to backend directory
cd railway-backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create Railway configuration
echo "⚙️ Creating Railway configuration..."
cat > railway.json << EOF
{
  "project": "$PROJECT_ID",
  "team": "personal"
}
EOF

# Create environment variables file
echo "🔐 Creating environment variables template..."
cat > .env << EOF
# Bybit API Configuration
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_RECV_WINDOW=5000
NODE_ENV=production
PORT=3000
EOF

echo "✅ Railway backend prepared!"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "2. Open project: $PROJECT_ID"
echo "3. Add new service from GitHub"
echo "4. Select this repository: sb1-dapxyzdb"
echo "5. Set root directory to: railway-backend"
echo "6. Add environment variables:"
echo "   - BYBIT_API_KEY=3fg29yhr1a9JJ1etm3"
echo "   - BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14"
echo "   - BYBIT_RECV_WINDOW=5000"
echo "   - NODE_ENV=production"
echo "7. Deploy!"
echo ""
echo "🌐 Your backend will be available at: https://$SERVICE_NAME-$PROJECT_ID.railway.app"
echo ""
echo "📡 API Endpoints:"
echo "   - Health: /health"
echo "   - Orders: POST /api/orders/create"
echo "   - Positions: GET /api/positions"
echo "   - Balance: GET /api/account/balance"
echo "   - Tickers: GET /api/market/tickers"
echo "   - Orderbook: GET /api/market/orderbook"
echo "   - Klines: GET /api/market/klines"

cd ..

echo "🎉 Railway deployment preparation complete!" 