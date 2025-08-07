#!/bin/bash

# 🚀 Quick Netlify Deployment Script
# Deploy your AI Trading System to Netlify (Free)

echo "🚀 Deploying AI Trading System to Netlify..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "📦 Building project..."
    npm run build
fi

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
npx netlify-cli deploy --prod --dir=dist

echo "✅ Deployment complete!"
echo "🌐 Your site is now live on Netlify!"
echo "🔗 Next: Connect your custom domain (methtrader.xyz)" 