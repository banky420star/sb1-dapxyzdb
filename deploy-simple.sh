#!/bin/bash

echo "🚀 AI TRADING SYSTEM - SIMPLE DEPLOYMENT SCRIPT"
echo "================================================"
echo ""

# Server details
SERVER_IP="45.76.136.30"
SERVER_USER="root"
SERVER_PASS="G-b9ni}9r5TXPRy{"

echo "📋 DEPLOYMENT CHECKLIST:"
echo "1. ✅ Server IP: $SERVER_IP"
echo "2. ✅ Username: $SERVER_USER"
echo "3. ✅ Password: $SERVER_PASS"
echo "4. ✅ Deployment package: ai-trading-system-deploy.tar.gz"
echo ""

echo "🔧 STEP 1: Connect to your server"
echo "Run this command in a new terminal:"
echo "ssh $SERVER_USER@$SERVER_IP"
echo "Password: $SERVER_PASS"
echo ""

echo "🔧 STEP 2: Once connected to server, run these commands:"
echo "========================================================"
echo ""

echo "# Install dependencies"
echo "apt-get update && apt-get install -y curl wget git docker.io docker-compose nodejs npm"
echo ""

echo "# Start Docker"
echo "systemctl start docker && systemctl enable docker"
echo ""

echo "# Create project directory"
echo "cd /root && mkdir -p ai-trading-system && cd ai-trading-system"
echo ""

echo "# Download deployment package (run this from your local machine)"
echo "scp ai-trading-system-deploy.tar.gz $SERVER_USER@$SERVER_IP:/root/ai-trading-system/"
echo ""

echo "# Extract the package (on server)"
echo "tar -xzf ai-trading-system-deploy.tar.gz"
echo ""

echo "# Install Node.js dependencies"
echo "npm install"
echo ""

echo "# Create environment file"
echo "cat > .env << 'EOF'"
echo "NODE_ENV=production"
echo "PORT=8000"
echo "TRADING_MODE=paper"
echo "ENABLE_LIVE_TRADING=false"
echo "MT5_INTEGRATION=false"
echo "ALPHA_VANTAGE_API_KEY=your_api_key_here"
echo "EOF"
echo ""

echo "# Start the application"
echo "npm run server"
echo ""

echo "🔧 STEP 3: Access your application"
echo "=================================="
echo "Frontend: http://$SERVER_IP:3000"
echo "Backend API: http://$SERVER_IP:8000/api/health"
echo ""

echo "🔧 STEP 4: For production deployment"
echo "===================================="
echo "# Install PM2 for process management"
echo "npm install -g pm2"
echo ""

echo "# Start with PM2"
echo "pm2 start server/index.js --name ai-trading-system"
echo "pm2 startup"
echo "pm2 save"
echo ""

echo "🎉 DEPLOYMENT COMPLETE!"
echo "Your AI trading system is now running on your cloud server!"
echo ""
echo "📊 Monitor your system:"
echo "- Check logs: pm2 logs ai-trading-system"
echo "- Restart: pm2 restart ai-trading-system"
echo "- Stop: pm2 stop ai-trading-system"
echo "" 