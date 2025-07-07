#!/bin/bash

# AI Trading System - VPS Deployment Script
# Usage: ./deploy-vps.sh user@your-server-ip

if [ -z "$1" ]; then
    echo "❌ Error: Please provide server address"
    echo "Usage: ./deploy-vps.sh user@your-server-ip"
    exit 1
fi

SERVER=$1
APP_NAME="ai-trading-system"
APP_DIR="/home/${SERVER%%@*}/$APP_NAME"

echo "🚀 Deploying AI Trading System to $SERVER"
echo "========================================"

# Check SSH connection
echo "🔐 Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 $SERVER "echo 'SSH connection successful'"; then
    echo "❌ Cannot connect to $SERVER"
    echo "Make sure your SSH key is added to the server's authorized_keys"
    exit 1
fi

# Create app directory
echo "📁 Creating app directory..."
ssh $SERVER "mkdir -p $APP_DIR"

# Copy files (excluding node_modules and other unnecessary files)
echo "📦 Copying files to server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.log' \
    --exclude '.env.local' \
    . $SERVER:$APP_DIR/

# Install dependencies and build
echo "🔧 Installing dependencies and building..."
ssh $SERVER << EOF
cd $APP_DIR

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "Installing npm packages..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Stop existing instance if running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start application
echo "Starting application..."
PORT=80 pm2 start server.js --name $APP_NAME

# Save PM2 configuration
pm2 save
pm2 startup | grep sudo | bash

# Show status
pm2 status
EOF

# Get server IP
SERVER_IP=$(echo $SERVER | cut -d'@' -f2)

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Your AI Trading System is now live at:"
echo "   http://$SERVER_IP"
echo ""
echo "📊 API Health Check:"
echo "   http://$SERVER_IP/api/health"
echo ""
echo "🔧 Useful commands:"
echo "   SSH to server: ssh $SERVER"
echo "   View logs: ssh $SERVER 'pm2 logs $APP_NAME'"
echo "   Restart app: ssh $SERVER 'pm2 restart $APP_NAME'"
echo "   Stop app: ssh $SERVER 'pm2 stop $APP_NAME'"
echo ""
echo "💡 Next steps:"
echo "   1. Get your API key from alphavantage.co"
echo "   2. Update .env on the server"
echo "   3. Configure your domain (optional)"
echo ""