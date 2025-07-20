#!/bin/bash

echo "🚀 Deploying updated AI Trading System to Vultr server..."

# Stop the current PM2 processes
echo "📦 Stopping current processes..."
ssh root@45.76.136.30 "pm2 stop all"

# Backup current system
echo "💾 Creating backup..."
ssh root@45.76.136.30 "cd /root && tar -czf ai-trading-system-backup-$(date +%Y%m%d-%H%M%S).tar.gz ai-trading-system/"

# Extract new system
echo "📂 Extracting updated system..."
ssh root@45.76.136.30 "cd /root && rm -rf ai-trading-system && mkdir ai-trading-system && cd ai-trading-system && tar -xzf ../ai-trading-system-updated.tar.gz"

# Install dependencies
echo "📦 Installing dependencies..."
ssh root@45.76.136.30 "cd /root/ai-trading-system && npm ci"

# Build frontend
echo "🔨 Building frontend..."
ssh root@45.76.136.30 "cd /root/ai-trading-system && npm run build"

# Start the backend
echo "🚀 Starting backend server..."
ssh root@45.76.136.30 "cd /root/ai-trading-system && pm2 start server/index.js --name ai-trading-system"

# Start the frontend
echo "🌐 Starting frontend server..."
ssh root@45.76.136.30 "cd /root/ai-trading-system && pm2 start 'npx serve -s dist -l 3000' --name ai-trading-ui"

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
ssh root@45.76.136.30 "pm2 save"

# Check status
echo "✅ Checking system status..."
ssh root@45.76.136.30 "pm2 status"

echo "🎉 Deployment complete!"
echo "🌐 Frontend: http://45.76.136.30:3000"
echo "🔧 Backend API: http://45.76.136.30:8000/api/health" 