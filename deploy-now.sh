#!/bin/bash

echo "🚀 AI TRADING SYSTEM - ONE-COMMAND DEPLOYMENT"
echo "============================================="

# Server details
SERVER_IP="45.76.136.30"
SERVER_USER="root"
SERVER_PASS="G-b9ni}9r5TXPRy{"

echo "📋 Deploying to: $SERVER_IP"
echo "⏳ This will take 5-10 minutes..."
echo ""

# Step 1: Upload deployment package
echo "📤 Step 1: Uploading deployment package..."
scp ai-trading-system-deploy.tar.gz $SERVER_USER@$SERVER_IP:/root/

# Step 2: Execute deployment commands on server
echo "🔧 Step 2: Installing and configuring on server..."
ssh $SERVER_USER@$SERVER_IP << 'EOF'

echo "Installing dependencies..."
apt-get update -qq
apt-get install -y -qq curl wget git docker.io docker-compose nodejs npm

echo "Starting Docker..."
systemctl start docker
systemctl enable docker

echo "Setting up project directory..."
cd /root
mkdir -p ai-trading-system
cd ai-trading-system

echo "Extracting deployment package..."
tar -xzf /root/ai-trading-system-deploy.tar.gz

echo "Installing Node.js dependencies..."
npm install --silent

echo "Creating environment configuration..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MT5_INTEGRATION=false
ALPHA_VANTAGE_API_KEY=demo_key
ENVEOF

echo "Installing PM2 for process management..."
npm install -g pm2

echo "Starting the application..."
pm2 start server/index.js --name ai-trading-system
pm2 startup
pm2 save

echo "✅ Deployment completed!"
echo "🌐 Your AI Trading System is now running at:"
echo "   Frontend: http://45.76.136.30:3000"
echo "   Backend: http://45.76.136.30:8000/api/health"
echo ""
echo "📊 Management commands:"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs ai-trading-system"
echo "   Restart: pm2 restart ai-trading-system"

EOF

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Your AI Trading System is now live on your cloud server!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$SERVER_IP:3000"
echo "   Backend API: http://$SERVER_IP:8000/api/health"
echo ""
echo "📊 Monitor your system:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   pm2 status"
echo "   pm2 logs ai-trading-system" 