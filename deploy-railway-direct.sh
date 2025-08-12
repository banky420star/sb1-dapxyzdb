#!/bin/bash

# 🚀 Direct Railway Deployment Script
# Uses Railway API with provided token and project ID

set -e

echo "🚀 DIRECT RAILWAY DEPLOYMENT"
echo "=============================="

# Railway credentials (must be provided via environment)
: "${RAILWAY_TOKEN:?Set RAILWAY_TOKEN in your environment}"
: "${PROJECT_ID:?Set PROJECT_ID in your environment}"

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
# Set required variables if provided
[ -n "$BYBIT_API_KEY" ] && railway variables set BYBIT_API_KEY="$BYBIT_API_KEY" --project $PROJECT_ID || echo "Skip BYBIT_API_KEY (not set)"
[ -n "$BYBIT_API_SECRET" ] && railway variables set BYBIT_API_SECRET="$BYBIT_API_SECRET" --project $PROJECT_ID || echo "Skip BYBIT_API_SECRET (not set)"
railway variables set BYBIT_RECV_WINDOW="${BYBIT_RECV_WINDOW:-5000}" --project $PROJECT_ID
railway variables set NODE_ENV="production" --project $PROJECT_ID
[ -n "$ALLOWED_ORIGINS" ] && railway variables set ALLOWED_ORIGINS="$ALLOWED_ORIGINS" --project $PROJECT_ID || echo "Set ALLOWED_ORIGINS later in dashboard"
[ -n "$VITE_RAILWAY_API_URL" ] && railway variables set VITE_RAILWAY_API_URL="$VITE_RAILWAY_API_URL" --project $PROJECT_ID || true

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