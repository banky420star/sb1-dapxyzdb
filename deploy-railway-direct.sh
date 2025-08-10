#!/bin/bash

# 🚀 Direct Railway Deployment Script
# Uses Railway API with provided token and project ID

set -e

echo "🚀 DIRECT RAILWAY DEPLOYMENT"
echo "=============================="

# Railway credentials
RAILWAY_TOKEN="b951cfd1-282e-4fc6-b55a-c6d0d5929d25"
PROJECT_ID="fe622622-dbe0-490e-ab89-151fd0b8d21d"

echo "📁 Preparing backend for deployment..."

# Navigate to backend directory
cd railway-backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deployment.tar.gz --exclude=node_modules --exclude=.git .

echo "🚀 Deploying to Railway..."
echo "Project ID: $PROJECT_ID"

# Deploy using Railway CLI with token
RAILWAY_TOKEN=$RAILWAY_TOKEN railway up --project $PROJECT_ID

echo "✅ Deployment completed!"

# Get the deployment URL
echo "🌐 Getting deployment URL..."
RAILWAY_URL=$(railway domain --project $PROJECT_ID)
echo "✅ Backend deployed at: $RAILWAY_URL"

echo "🔐 Setting environment variables..."
railway variables set BYBIT_API_KEY="3fg29yhr1a9JJ1etm3" --project $PROJECT_ID
railway variables set BYBIT_API_SECRET="wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14" --project $PROJECT_ID
railway variables set BYBIT_RECV_WINDOW="5000" --project $PROJECT_ID
railway variables set NODE_ENV="production" --project $PROJECT_ID

echo "🧪 Testing deployment..."
sleep 10
curl -s "$RAILWAY_URL/health"

echo ""
echo "🎉 RAILWAY BACKEND DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo "🌐 Backend URL: $RAILWAY_URL"
echo "📊 Health Check: $RAILWAY_URL/health"
echo ""
echo "💰 Ready for production trading!" 