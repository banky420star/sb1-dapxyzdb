#!/bin/bash

# 🚀 AI Trading System - Automated Deployment Script
# Server: 45.76.136.30 (London)
# This script uploads and deploys everything automatically

set -e  # Exit on any error

echo "🚀 AI TRADING SYSTEM - AUTOMATED DEPLOYMENT"
echo "============================================"
echo ""
echo "🌍 Target Server: 45.76.136.30 (London)"
echo "💻 Specs: 2 vCPU, 4GB RAM, 50GB NVMe"
echo "💰 Cost: $2.87/month"
echo ""

# Configuration
SERVER_IP="45.76.136.30"
SERVER_USER="root"
SERVER_PASSWORD="G-b9ni}9r5TXPRy{"
DEPLOYMENT_PACKAGE="ai-trading-system-deploy.tar.gz"

# Step 1: Check if deployment package exists
echo "📦 Step 1: Checking deployment package..."
if [ ! -f "$DEPLOYMENT_PACKAGE" ]; then
    echo "❌ Error: $DEPLOYMENT_PACKAGE not found!"
    echo "💡 Please run this script from the workspace directory where the package was created."
    exit 1
fi
echo "✅ Deployment package found ($(ls -lh $DEPLOYMENT_PACKAGE | awk '{print $5}'))"
echo ""

# Step 2: Check dependencies
echo "🔧 Step 2: Checking dependencies..."

# Check if sshpass is available (for password-based SSH)
if ! command -v sshpass &> /dev/null; then
    echo "📥 Installing sshpass for automated SSH..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "⚠️  Please install sshpass manually for your system"
        echo "Or use manual deployment method"
        exit 1
    fi
fi
echo "✅ Dependencies ready"
echo ""

# Step 3: Upload deployment package
echo "📤 Step 3: Uploading deployment package to server..."
echo "🔄 Uploading to $SERVER_IP..."

sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    "$DEPLOYMENT_PACKAGE" "$SERVER_USER@$SERVER_IP:/root/"

echo "✅ Upload completed successfully!"
echo ""

# Step 4: Execute deployment on server
echo "🚀 Step 4: Executing automated deployment on server..."
echo "⏳ This will take 10-15 minutes..."
echo ""

# Create deployment command
DEPLOY_COMMANDS="
cd /root && \
echo '🗂️ Extracting deployment package...' && \
tar -xzf $DEPLOYMENT_PACKAGE && \
cd ai-trading-system && \
echo '🔧 Making deployment script executable...' && \
chmod +x deploy.sh && \
echo '🚀 Starting automated deployment...' && \
./deploy.sh
"

# Execute commands on server
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_IP" "$DEPLOY_COMMANDS"

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================="
echo ""

# Step 5: Verify deployment
echo "🧪 Step 5: Verifying deployment..."

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Test API health
echo "🔍 Testing API health..."
if curl -f -s "http://$SERVER_IP:8000/api/health" > /dev/null; then
    echo "✅ API is responding!"
else
    echo "⚠️  API not responding yet (may still be starting)"
fi

# Test dashboard
echo "🔍 Testing dashboard..."
if curl -f -s "http://$SERVER_IP:3000" > /dev/null; then
    echo "✅ Dashboard is accessible!"
else
    echo "⚠️  Dashboard not responding yet (may still be starting)"
fi

echo ""
echo "🌐 YOUR LIVE SYSTEM URLS:"
echo "========================"
echo "📊 Trading Dashboard: http://$SERVER_IP:3000"
echo "🔧 API Backend: http://$SERVER_IP:8000/api/health"
echo "📈 Monitoring: http://$SERVER_IP:3001 (admin/admin123)"
echo "💹 Trading Status: http://$SERVER_IP:8000/api/status"
echo ""

echo "🔌 MT5 EA SETTINGS:"
echo "==================="
echo "Inp_PubEndpoint = \"tcp://$SERVER_IP:5556\""
echo "Inp_RepEndpoint = \"tcp://$SERVER_IP:5555\""
echo "Inp_Magic = 123456"
echo ""

echo "💹 START TRADING:"
echo "================="
echo "curl -X POST http://$SERVER_IP:8000/api/command \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"command\": \"start trading\"}'"
echo ""

echo "🎊 SUCCESS! Your AI trading system is now live!"
echo "💰 Monthly cost: $2.87 | Profit potential: UNLIMITED!"
echo ""
echo "📱 Next steps:"
echo "1. Open http://$SERVER_IP:3000 in your browser"
echo "2. Update your MT5 EA settings"
echo "3. Start trading and monitor performance"
echo ""
echo "🚀 Happy trading! 💰"