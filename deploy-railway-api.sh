#!/bin/bash

# 🚀 Railway API Deployment Script
# Deploys the trading backend using Railway API directly

set -e

echo "🚀 RAILWAY API DEPLOYMENT"
echo "=========================="

# Railway configuration
RAILWAY_TOKEN="b951cfd1-282e-4fc6-b55a-c6d0d5929d25"
PROJECT_ID="fe622622-dbe0-490e-ab89-151fd0b8d21d"
SERVICE_NAME="trading-backend"

echo "📦 Preparing deployment package..."

# Create deployment package
cd railway-backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create deployment archive
echo "📦 Creating deployment package..."
tar -czf ../deployment.tar.gz --exclude=node_modules --exclude=.git .

cd ..

echo "🚀 Deploying to Railway..."

# Deploy using Railway API
curl -X POST \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d @deployment.tar.gz \
  "https://api.railway.app/v2/projects/$PROJECT_ID/services/$SERVICE_NAME/deployments"

echo "✅ Deployment initiated!"
echo "🔍 Check Railway dashboard for deployment status"
echo "🌐 Your backend will be available at: https://$SERVICE_NAME-$PROJECT_ID.railway.app"

# Cleanup
rm deployment.tar.gz

echo "🎉 Railway backend deployment complete!" 