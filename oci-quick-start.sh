#!/bin/bash
# Quick Start Script for Oracle Cloud Infrastructure
# Run this after connecting to your OCI instance via SSH

set -e

echo "🚀 AI Trading System - OCI Quick Start"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  Please run as non-root user (ubuntu)${NC}"
    exit 1
fi

echo "📦 Step 1/5: Updating system..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

echo "🐳 Step 2/5: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

echo "📥 Step 3/5: Cloning repository..."
if [ ! -d "ai-trading-system" ]; then
    git clone https://github.com/banky420star/sb1-dapxyzdb.git ai-trading-system
    cd ai-trading-system
else
    echo "Directory exists, pulling latest..."
    cd ai-trading-system
    git pull
fi

echo "⚙️  Step 4/5: Setting up environment..."
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${YELLOW}⚠️  Edit .env file and add your API keys!${NC}"
    echo "   nano .env"
fi

echo "🚀 Step 5/5: Starting services..."
# Use OCI-optimized docker-compose if available
if [ -f docker-compose.oci.yml ]; then
    docker compose -f docker-compose.oci.yml up -d
else
    docker compose up -d
fi

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/opc/v1/instance/metadata | grep -oP '"publicIp":"\K[^"]+' 2>/dev/null || echo "your-server-ip")

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "🌐 Access your system:"
echo "   📊 Dashboard:  http://$PUBLIC_IP:3000"
echo "   🔧 API:        http://$PUBLIC_IP:8000"
echo "   💓 Health:     http://$PUBLIC_IP:8000/api/health"
echo "   📈 Monitoring: http://$PUBLIC_IP:3001"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env:     nano .env"
echo "   2. Restart:       docker compose restart"
echo "   3. View logs:     docker logs ai-trading-backend -f"
echo ""

exit 0
