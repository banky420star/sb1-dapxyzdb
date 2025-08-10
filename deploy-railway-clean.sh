#!/bin/bash

# 🚀 Clean Railway Deployment Script
# Deploys only the backend directory to avoid dependency conflicts

set -e

echo "🚀 CLEAN RAILWAY DEPLOYMENT"
echo "============================"

# Railway configuration
PROJECT_ID="fe622622-dbe0-490e-ab89-151fd0b8d21d"
SERVICE_NAME="trading-backend"

echo "🧹 Cleaning Railway backend..."

# Navigate to backend directory
cd railway-backend

# Clean any existing node_modules
echo "🧹 Cleaning existing node_modules..."
rm -rf node_modules package-lock.json

# Install only backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Verify no problematic dependencies
echo "🔍 Checking dependencies..."
if npm list | grep -E "(numjs|sharp|tensorflow)"; then
    echo "❌ Found problematic dependencies!"
    exit 1
fi

echo "✅ Backend dependencies clean!"

# Create deployment package
echo "📦 Creating clean deployment package..."
tar -czf ../railway-deployment.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=*.log \
    --exclude=.env.local \
    --exclude=.env.development \
    --exclude=.env.test \
    .

cd ..

echo "🚀 Ready for Railway deployment!"
echo ""
echo "🎯 DEPLOYMENT INSTRUCTIONS:"
echo "1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "2. Open project: $PROJECT_ID"
echo "3. Add new service → Deploy from GitHub"
echo "4. Select repository: sb1-dapxyzdb"
echo "5. Set root directory to: railway-backend"
echo "6. Add environment variables:"
echo "   - BYBIT_API_KEY=3fg29yhr1a9JJ1etm3"
echo "   - BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14"
echo "   - BYBIT_RECV_WINDOW=5000"
echo "   - NODE_ENV=production"
echo "7. Deploy!"
echo ""
echo "📦 Clean deployment package created: railway-deployment.tar.gz"
echo "🌐 Backend will be available at: https://$SERVICE_NAME-$PROJECT_ID.railway.app"

echo "🎉 Clean Railway deployment preparation complete!" 