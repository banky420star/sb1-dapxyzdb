#!/bin/bash

# Quick Deploy to Existing Vultr Server
# Usage: ./vultr-quick-deploy.sh root@your-vultr-ip

if [ -z "$1" ]; then
    echo "🚀 Vultr Quick Deploy Guide"
    echo "=========================="
    echo ""
    echo "Option 1: If you already have a Vultr server:"
    echo "   ./vultr-quick-deploy.sh root@your-server-ip"
    echo ""
    echo "Option 2: Create server manually:"
    echo "   1. Go to my.vultr.com"
    echo "   2. Deploy New Server:"
    echo "      - Choose: Cloud Compute"
    echo "      - Location: New Jersey (near financial markets)"
    echo "      - OS: Ubuntu 20.04"
    echo "      - Plan: 25 GB SSD ($5/month)"
    echo "      - Add your SSH key during creation"
    echo "   3. Run: ./vultr-quick-deploy.sh root@new-server-ip"
    echo ""
    exit 1
fi

SERVER=$1
echo "🚀 Deploying to Vultr server: $SERVER"
echo "====================================="

# Test connection
echo "🔐 Testing connection..."
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'Connected'" 2>/dev/null; then
    echo "❌ Cannot connect. Make sure:"
    echo "   - Your SSH key is added to the server"
    echo "   - The server IP is correct"
    echo "   - Port 22 is open"
    exit 1
fi

# Setup server
echo "🔧 Setting up server..."
ssh $SERVER << 'SETUP'
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git build-essential

# Install PM2
npm install -g pm2

# Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 8000
ufw --force enable

# Create app directory
mkdir -p /root/ai-trading-system
SETUP

# Deploy application
echo "📦 Deploying application..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env.local' \
    . $SERVER:/root/ai-trading-system/

# Build and start
echo "🏗️  Building and starting..."
ssh $SERVER << 'START'
cd /root/ai-trading-system

# Install dependencies
npm install

# Build frontend
npm run build

# Stop any existing instance
pm2 stop ai-trading 2>/dev/null || true
pm2 delete ai-trading 2>/dev/null || true

# Start application
PORT=80 pm2 start server.js --name ai-trading

# Setup auto-start
pm2 save
pm2 startup

# Show status
pm2 status
START

# Get IP
SERVER_IP=${SERVER#*@}

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your AI Trading System is live at:"
echo "   http://$SERVER_IP"
echo ""
echo "📊 Check health:"
echo "   http://$SERVER_IP/api/health"
echo ""
echo "🔧 Commands:"
echo "   View logs: ssh $SERVER 'pm2 logs'"
echo "   Restart: ssh $SERVER 'pm2 restart ai-trading'"
echo "   Monitor: ssh $SERVER 'pm2 monit'"
echo ""
echo "💰 Ready to trade! Don't forget to:"
echo "   1. Get Alpha Vantage API key"
echo "   2. Update .env on server"
echo ""