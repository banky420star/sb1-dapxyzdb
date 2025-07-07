#!/bin/bash

# AI Trading System - Quick Deployment Script
# This script automates the deployment process

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 AI Trading System - Quick Deployment${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Function to check if running on server
check_environment() {
    if [ -f /.dockerenv ]; then
        echo -e "${RED}❌ Cannot run inside Docker container${NC}"
        exit 1
    fi
}

# Function to collect deployment info
collect_info() {
    echo -e "${YELLOW}📋 Deployment Configuration${NC}\n"
    
    # Get server IP
    read -p "Enter your server IP address: " SERVER_IP
    
    # Get API key
    read -p "Enter your Alpha Vantage API key (get free at alphavantage.co): " API_KEY
    
    # Confirm deployment
    echo -e "\n${YELLOW}📌 Configuration Summary:${NC}"
    echo "• Server IP: $SERVER_IP"
    echo "• API Key: $API_KEY"
    echo "• MT5 Ports: 5555, 5556"
    echo "• Dashboard Port: 3000"
    echo "• API Port: 8000"
    
    read -p $'\n'"Continue with deployment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
}

# Function to prepare deployment package
prepare_package() {
    echo -e "\n${BLUE}📦 Preparing Deployment Package...${NC}"
    
    # Update environment configuration
    cp .env.production .env
    sed -i "s/YOUR-SERVER-IP/$SERVER_IP/g" .env
    sed -i "s/YOUR_API_KEY_HERE/$API_KEY/g" .env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i "s/GENERATE_STRONG_SECRET_HERE/$JWT_SECRET/g" .env
    sed -i "s/GENERATE_STRONG_SECRET_HERE/$SESSION_SECRET/g" .env
    
    # Create deployment archive
    tar -czf ai-trading-deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='*.log' \
        .
    
    echo -e "${GREEN}✅ Deployment package created: ai-trading-deploy.tar.gz${NC}"
}

# Function to show deployment instructions
show_instructions() {
    echo -e "\n${GREEN}🎉 Deployment Package Ready!${NC}"
    echo -e "${GREEN}===========================${NC}\n"
    
    echo -e "${YELLOW}📋 Follow these steps to deploy:${NC}\n"
    
    echo "1. Upload to your server:"
    echo -e "   ${BLUE}scp ai-trading-deploy.tar.gz root@$SERVER_IP:/root/${NC}\n"
    
    echo "2. Connect to your server:"
    echo -e "   ${BLUE}ssh root@$SERVER_IP${NC}\n"
    
    echo "3. Deploy the system:"
    echo -e "   ${BLUE}cd /root && tar -xzf ai-trading-deploy.tar.gz && chmod +x deploy.sh && ./deploy.sh${NC}\n"
    
    echo -e "${YELLOW}🌐 After deployment, access your system at:${NC}"
    echo "• Trading Dashboard: http://$SERVER_IP:3000"
    echo "• API Backend: http://$SERVER_IP:8000"
    echo "• Health Check: http://$SERVER_IP:8000/api/health"
    echo "• Monitoring: http://$SERVER_IP:3001 (admin/admin123)"
    
    echo -e "\n${YELLOW}🔌 Update your MT5 EA settings:${NC}"
    echo "• Command Port: tcp://$SERVER_IP:5555"
    echo "• Data Port: tcp://$SERVER_IP:5556"
    
    echo -e "\n${GREEN}✅ Your AI trading system will be live in ~15 minutes!${NC}"
}

# Main execution
main() {
    check_environment
    collect_info
    prepare_package
    show_instructions
}

# Run main function
main