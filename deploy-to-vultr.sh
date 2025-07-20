#!/bin/bash

# 🚀 Deploy Updated AI Trading System to Vultr
# This script copies the updated files to your Vultr server

set -e

# Configuration
SERVER_IP="45.76.136.30"
SERVER_USER="root"
SERVER_PATH="/root/ai-trading-system"
LOCAL_PACKAGE="ai-trading-system-updated.tar.gz"

echo "🚀 Deploying Updated AI Trading System to Vultr"
echo "================================================"

# Check if package exists
if [ ! -f "$LOCAL_PACKAGE" ]; then
    echo "❌ Error: $LOCAL_PACKAGE not found!"
    echo "Please run: tar -czf $LOCAL_PACKAGE --exclude=node_modules --exclude=.git --exclude=dist --exclude=logs --exclude=data --exclude=*.tar.gz ."
    exit 1
fi

echo "📦 Uploading updated package to server..."
scp "$LOCAL_PACKAGE" "$SERVER_USER@$SERVER_IP:/tmp/"

echo "🔧 Installing updates on server..."
ssh "$SERVER_USER@$SERVER_IP" << 'EOF'
    cd /root/ai-trading-system
    
    # Stop current services
    docker-compose down || true
    
    # Backup current files
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz --exclude=node_modules --exclude=logs --exclude=data .
    
    # Extract updated files
    tar -xzf /tmp/ai-trading-system-updated.tar.gz
    
    # Install dependencies
    npm install
    
    # Build frontend
    npm run build
    
    # Start services
    docker-compose up -d
    
    echo "✅ Update completed successfully!"
    echo "🌐 Dashboard: http://45.76.136.30:3000"
    echo "🔧 API Health: http://45.76.136.30:8000/api/health"
EOF

echo "🎉 Deployment completed!"
echo "🌐 Your updated system is live at:"
echo "📊 Dashboard: http://$SERVER_IP:3000"
echo "🔧 API Health: http://$SERVER_IP:8000/api/health"
echo "📈 Monitoring: http://$SERVER_IP:3001" 