#!/bin/bash

# Setup script for AI Trading System Orchestrator
# Initializes the orchestrator and ensures proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log "Setting up AI Trading System Orchestrator..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root"
    exit 1
fi

# Make orchestrator scripts executable
log "Making orchestrator scripts executable..."
chmod +x orchestrator.sh orchestrator-simple.sh

# Check if configuration exists
if [ ! -f "orchestrator.config" ]; then
    warn "Configuration file not found. Creating default configuration..."
    cat > orchestrator.config << 'EOF'
# AI Trading System Orchestrator Configuration

# Project Settings
PROJECT_NAME="ai-trading-system"
PROJECT_VERSION="1.0.0"

# Port Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
MT5_PORT=5000
MONITORING_PORT=9090

# Service Configuration
BACKEND_SERVICE="server/index.js"
FRONTEND_SERVICE="npm run dev"
MT5_SERVICE="mql5-bridge"

# Docker Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
DOCKER_IMAGE_PREFIX="ai-trading"

# Deployment Configuration
DEPLOYMENT_TARGETS=("vultr" "railway" "render" "local")
DEFAULT_DEPLOYMENT_TARGET="vultr"

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=30
LOG_RETENTION_DAYS=7
BACKUP_RETENTION_DAYS=30

# Database Configuration
DATABASE_URL="mongodb://localhost:27017/ai-trading"
REDIS_URL="redis://localhost:6379"

# MT5 Configuration
MT5_SERVER="localhost"
MT5_LOGIN=""
MT5_PASSWORD=""
MT5_SERVER_NAME="MetaQuotes-Demo"

# Trading Configuration
DEFAULT_ACCOUNT_TYPE="demo"
RISK_MANAGEMENT_ENABLED=true
MAX_POSITION_SIZE=0.02
STOP_LOSS_PERCENTAGE=2.0
TAKE_PROFIT_PERCENTAGE=4.0

# Notification Configuration
SLACK_WEBHOOK_URL=""
EMAIL_NOTIFICATIONS=false
EMAIL_SMTP_SERVER=""
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=""
EMAIL_PASSWORD=""

# Security Configuration
JWT_SECRET="your-jwt-secret-here"
API_RATE_LIMIT=100
SESSION_TIMEOUT=3600

# Development Configuration
NODE_ENV="development"
DEBUG_MODE=true
LOG_LEVEL="info"
EOF
    log "Default configuration created"
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check npm installation
if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm first."
    exit 1
fi

log "Node.js version: $(node --version)"
log "npm version: $(npm --version)"

# Install project dependencies
log "Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
    log "Frontend dependencies installed"
else
    warn "package.json not found in current directory"
fi

# Install backend dependencies
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    npm install
    cd ..
    log "Backend dependencies installed"
else
    warn "Backend package.json not found"
fi

# Create necessary directories
log "Creating necessary directories..."
mkdir -p backups
mkdir -p logs
mkdir -p data

# Create .env file if it doesn't exist
if [ ! -f ".env" ] && [ -f "env.example" ]; then
    log "Creating .env file from example..."
    cp env.example .env
    warn "Please edit .env file with your configuration"
fi

# Check for deployment scripts
log "Checking deployment scripts..."
if [ -f "deploy-to-vultr.sh" ]; then
    chmod +x deploy-to-vultr.sh
    log "Vultr deployment script found and made executable"
fi

if [ -f "deploy-to-railway.sh" ]; then
    chmod +x deploy-to-railway.sh
    log "Railway deployment script found and made executable"
fi

if [ -f "deploy-to-render.sh" ]; then
    chmod +x deploy-to-render.sh
    log "Render deployment script found and made executable"
fi

# Test orchestrator
log "Testing orchestrator..."
if ./orchestrator-simple.sh help > /dev/null 2>&1; then
    log "Orchestrator test successful"
else
    error "Orchestrator test failed"
    exit 1
fi

# Create systemd service file (optional)
if command -v systemctl &> /dev/null; then
    log "Creating systemd service file..."
    cat > ai-trading.service << EOF
[Unit]
Description=AI Trading System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/orchestrator-simple.sh start
ExecStop=$(pwd)/orchestrator-simple.sh stop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    log "Systemd service file created: ai-trading.service"
    info "To enable as system service: sudo cp ai-trading.service /etc/systemd/system/ && sudo systemctl enable ai-trading"
fi

# Create cron job for monitoring (optional)
log "Setting up monitoring cron job..."
cat > monitor-cron << EOF
# Monitor AI Trading System every 5 minutes
*/5 * * * * cd $(pwd) && ./orchestrator-simple.sh status >> logs/monitor.log 2>&1
EOF
log "Cron job configuration created: monitor-cron"
info "To enable monitoring: crontab monitor-cron"

# Final setup summary
log "Setup completed successfully!"
echo ""
echo "=== AI Trading System Orchestrator Setup Complete ==="
echo ""
echo "Available commands:"
echo "  ./orchestrator-simple.sh setup   - Install dependencies"
echo "  ./orchestrator-simple.sh dev     - Start development environment"
echo "  ./orchestrator-simple.sh build   - Build for production"
echo "  ./orchestrator-simple.sh start   - Start production services"
echo "  ./orchestrator-simple.sh stop    - Stop all services"
echo "  ./orchestrator-simple.sh status  - Check service status"
echo "  ./orchestrator-simple.sh deploy  - Deploy to configured target"
echo "  ./orchestrator-simple.sh logs    - Show recent logs"
echo ""
echo "Advanced commands:"
echo "  ./orchestrator.sh install        - Full dependency installation"
echo "  ./orchestrator.sh monitor        - Continuous monitoring"
echo "  ./orchestrator.sh backup         - Create backup"
echo "  ./orchestrator.sh test           - Run tests"
echo ""
echo "Next steps:"
echo "1. Edit orchestrator.config with your settings"
echo "2. Edit .env file with your secrets"
echo "3. Run './orchestrator-simple.sh dev' to start development"
echo "4. Run './orchestrator-simple.sh deploy' to deploy to production"
echo ""
echo "Documentation: ORCHESTRATOR_README.md" 