#!/bin/bash

# Deploy to the Vultr server that was just created
SERVER_IP="64.176.199.22"
APP_DIR="/root/ai-trading-system"

echo "🚀 Deploying to Vultr server: $SERVER_IP"
echo "========================================"

# Test connection
echo "🔐 Testing connection..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@$SERVER_IP "echo 'Connected successfully!'"

# Create app directory
echo "📁 Creating app directory..."
ssh root@$SERVER_IP "mkdir -p $APP_DIR"

# Create a deployment archive (excluding unnecessary files)
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.log' \
  --exclude='deploy.tar.gz' \
  --exclude='deployment.log' \
  .

# Copy the archive
echo "📤 Uploading application..."
scp -o StrictHostKeyChecking=no deploy.tar.gz root@$SERVER_IP:$APP_DIR/

# Extract and build on server
echo "🏗️ Building application..."
ssh root@$SERVER_IP << 'DEPLOY'
cd /root/ai-trading-system

# Extract files
tar -xzf deploy.tar.gz
rm deploy.tar.gz

# Copy MT5 configuration
cat > mt5-config.env << 'EOF'
# MT5 Paper Trading Configuration
MT5_LOGIN=210079673
MT5_PASSWORD=Fuckyou2/
MT5_SERVER=Exness-MT5Trial9
MT5_ACCOUNT_TYPE=demo

# ZeroMQ Configuration for MT5 Bridge
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556

# Trading Settings
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
EOF

# Merge MT5 config with .env
cat mt5-config.env >> .env

# Install dependencies
npm install

# Build frontend
npm run build

# Install PM2 if not already installed
npm install -g pm2

# Stop any existing instance
pm2 stop ai-trading 2>/dev/null || true
pm2 delete ai-trading 2>/dev/null || true

# Start the application
PORT=80 pm2 start server.js --name ai-trading

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
pm2 save

# Show status
pm2 status
DEPLOY

# Clean up local archive
rm -f deploy.tar.gz

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your AI Trading System is LIVE!"
echo "   Dashboard: http://$SERVER_IP"
echo "   API: http://$SERVER_IP:8000"
echo "   Health: http://$SERVER_IP:8000/api/health"
echo ""
echo "🔌 MT5 Configuration:"
echo "   Login: 210079673"
echo "   Server: Exness-MT5Trial9"
echo "   Mode: Paper Trading (Demo)"
echo ""
echo "📱 Next Steps:"
echo "   1. Open http://$SERVER_IP in your browser"
echo "   2. Your MT5 credentials are already configured"
echo "   3. Start paper trading to test the AI"
echo ""
echo "🔧 Server Commands:"
echo "   SSH: ssh root@$SERVER_IP"
echo "   Logs: ssh root@$SERVER_IP 'pm2 logs'"
echo "   Restart: ssh root@$SERVER_IP 'pm2 restart ai-trading'"
echo ""