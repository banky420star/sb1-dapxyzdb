#!/bin/bash

# 🚀 Netlify Deployment Script for MetaTrader.xyz
# This script helps deploy the frontend to Netlify

set -e

echo "🚀 DEPLOYING METHTRADER.XYZ TO NETLIFY"
echo "======================================"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Check if logged in to Netlify
if ! netlify status &> /dev/null; then
    echo "🔐 Please login to Netlify:"
    netlify login
fi

echo "🔨 Building frontend..."
npm run build

echo "🚀 Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo "🌐 Getting deployment URL..."
NETLIFY_URL=$(netlify status | grep "Website URL" | awk '{print $3}')
echo "✅ Frontend deployed at: $NETLIFY_URL"

echo "🔧 Setting environment variables..."
netlify env:set VITE_API_BASE "https://methtrader-backend-production.up.railway.app"
netlify env:set NODE_ENV "production"

echo ""
echo "🎉 NETLIFY DEPLOYMENT COMPLETE!"
echo "==============================="
echo "🌐 Frontend URL: $NETLIFY_URL"
echo "🔧 Backend URL: https://methtrader-backend-production.up.railway.app"
echo ""
echo "🔍 Next Steps:"
echo "1. Configure custom domain: methtrader.xyz"
echo "2. Update DNS records to point to Netlify"
echo "3. Test all functionality"
echo "4. Start generating revenue!"
echo ""
echo "💰 Your AI trading system is now live and ready to make money!"