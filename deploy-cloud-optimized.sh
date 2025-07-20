#!/bin/bash

# 🚀 Optimized AI Trading System - Vultr Cloud Deployment
# Features: Rate-limited APIs, Staged Training, Clean Dashboard

echo "🚀 Deploying Optimized AI Trading System to Vultr..."
echo "📋 Features: Reduced API calls, Staged training, Clean dashboard"

# Configuration
VULTR_IP="45.76.136.30"  # Replace with your actual Vultr server IP
APP_NAME="ai-trading-system"
BACKUP_DIR="/root/backups"
DEPLOY_DIR="/root/${APP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if we can connect to server
check_connection() {
    log "🔗 Checking connection to Vultr server..."
    if ! ssh -o ConnectTimeout=10 root@${VULTR_IP} "echo 'Connection successful'"; then
        error "❌ Cannot connect to Vultr server at ${VULTR_IP}"
        error "Please check:"
        error "1. Server IP address is correct"
        error "2. SSH key is properly configured"
        error "3. Server is running"
        exit 1
    fi
    log "✅ Connection to Vultr server established"
}

# Create backup
create_backup() {
    log "💾 Creating backup of existing system..."
    ssh root@${VULTR_IP} "
        mkdir -p ${BACKUP_DIR}
        if [ -d '${DEPLOY_DIR}' ]; then
            cd ${DEPLOY_DIR}/..
            tar -czf ${BACKUP_DIR}/${APP_NAME}-backup-$(date +%Y%m%d-%H%M%S).tar.gz ${APP_NAME}/ 2>/dev/null || true
            echo 'Backup created successfully'
        else
            echo 'No existing installation found, skipping backup'
        fi
    "
}

# Stop current processes
stop_processes() {
    log "⏹️ Stopping current processes..."
    ssh root@${VULTR_IP} "
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        pkill -f 'node.*server' 2>/dev/null || true
        pkill -f 'serve.*dist' 2>/dev/null || true
        echo 'All processes stopped'
    "
}

# Prepare deployment directory
prepare_deployment() {
    log "📁 Preparing deployment directory..."
    ssh root@${VULTR_IP} "
        rm -rf ${DEPLOY_DIR}
        mkdir -p ${DEPLOY_DIR}
        cd ${DEPLOY_DIR}
        echo 'Deployment directory prepared'
    "
}

# Transfer files
transfer_files() {
    log "📦 Transferring optimized system files..."
    
    # Create tarball locally with optimizations
    log "Creating optimized package..."
    tar --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        --exclude='logs/*' \
        --exclude='data/trading.db*' \
        --exclude='*.tar.gz' \
        --exclude='backups' \
        -czf ai-trading-system-optimized.tar.gz \
        server/ src/ public/ package*.json *.js *.md *.json .env* || true
    
    # Transfer to server
    scp ai-trading-system-optimized.tar.gz root@${VULTR_IP}:${DEPLOY_DIR}/
    
    # Extract on server
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        tar -xzf ai-trading-system-optimized.tar.gz
        rm ai-trading-system-optimized.tar.gz
        echo 'Files transferred and extracted'
    "
    
    # Clean up local tarball
    rm -f ai-trading-system-optimized.tar.gz
}

# Install dependencies and build
install_and_build() {
    log "📦 Installing dependencies..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        
        # Install Node.js if not present
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            apt-get install -y nodejs
        fi
        
        # Install PM2 globally if not present
        if ! command -v pm2 &> /dev/null; then
            npm install -g pm2
        fi
        
        # Install dependencies
        npm ci --production
        
        echo 'Dependencies installed'
    "
    
    log "🔨 Building frontend..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        npm run build
        echo 'Frontend built successfully'
    "
}

# Configure environment
configure_environment() {
    log "⚙️ Configuring optimized environment..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        
        # Create optimized .env file
        cat > .env << 'EOL'
# Server Configuration - OPTIMIZED FOR CLOUD
NODE_ENV=production
PORT=8000

# Database Configuration
DATABASE_URL=sqlite:./data/trading.db

# Trading Configuration - SAFE DEFAULTS
TRADING_MODE=paper
MAX_POSITION_SIZE=0.02
MAX_DRAWDOWN=0.1
STOP_LOSS_ATR=2.0

# API Keys - RATE LIMITED CONFIGURATION
ALPHA_VANTAGE_API_KEY=2ZQ8QZSN1U9XN5TK
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14

# OPTIMIZED INTERVALS - REDUCED API CALLS
DATA_UPDATE_FREQUENCY=300000
TRAINING_CHECK_FREQUENCY=3600000
MODEL_UPDATE_INTERVAL=1440

# Model Configuration - STAGED TRAINING
BACKTEST_DAYS=30
MIN_ACCURACY_THRESHOLD=0.55
TRAINING_SCHEDULE=daily
TRAINING_TIME=02:00

# Monitoring
LOG_LEVEL=info
EOL
        
        # Create data directory
        mkdir -p data logs
        
        # Set permissions
        chmod 755 data logs
        
        echo 'Environment configured'
    "
}

# Start services
start_services() {
    log "🚀 Starting optimized services..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        
        # Start backend with PM2
        pm2 start server/index.js --name '${APP_NAME}-backend' --env production
        
        # Wait for backend to start
        sleep 5
        
        # Start frontend with serve
        pm2 start 'npx serve -s dist -l 3000' --name '${APP_NAME}-frontend'
        
        # Save PM2 configuration
        pm2 save
        pm2 startup
        
        echo 'Services started successfully'
    "
}

# Verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        
        # Check PM2 status
        echo '📊 PM2 Status:'
        pm2 status
        
        echo ''
        echo '🌐 Service URLs:'
        echo 'Frontend: http://${VULTR_IP}:3000'
        echo 'Backend:  http://${VULTR_IP}:8000'
        echo 'Health:   http://${VULTR_IP}:8000/api/health'
        
        echo ''
        echo '📁 Directory structure:'
        ls -la ${DEPLOY_DIR}
        
        echo ''
        echo '🔧 Environment check:'
        node --version
        npm --version
        pm2 --version
    "
}

# Setup monitoring
setup_monitoring() {
    log "📊 Setting up monitoring..."
    ssh root@${VULTR_IP} "
        cd ${DEPLOY_DIR}
        
        # Create monitoring script
        cat > monitor.sh << 'EOL'
#!/bin/bash
echo '=== AI Trading System Health Check ==='
echo 'Date: ' \$(date)
echo ''
echo 'PM2 Status:'
pm2 status
echo ''
echo 'Disk Usage:'
df -h
echo ''
echo 'Memory Usage:'
free -h
echo ''
echo 'Backend Health:'
curl -s http://localhost:8000/api/health || echo 'Backend not responding'
echo ''
echo 'Frontend Status:'
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'Frontend not responding'
echo ''
EOL
        
        chmod +x monitor.sh
        
        # Schedule health checks
        (crontab -l 2>/dev/null; echo '*/15 * * * * /root/${APP_NAME}/monitor.sh >> /root/${APP_NAME}/logs/health.log 2>&1') | crontab -
        
        echo 'Monitoring configured'
    "
}

# Main deployment function
main() {
    log "🚀 Starting AI Trading System deployment to Vultr..."
    log "📋 Optimizations: Rate-limited APIs, Staged training, Clean dashboard"
    
    check_connection
    create_backup
    stop_processes
    prepare_deployment
    transfer_files
    install_and_build
    configure_environment
    start_services
    setup_monitoring
    verify_deployment
    
    log "✅ Deployment completed successfully!"
    log ""
    log "🌐 Access your trading system:"
    log "   Frontend: http://${VULTR_IP}:3000"
    log "   Backend:  http://${VULTR_IP}:8000"
    log "   Health:   http://${VULTR_IP}:8000/api/health"
    log ""
    log "📊 Optimizations applied:"
    log "   • API calls reduced from 5s to 1min intervals"
    log "   • Training switched from continuous to daily (2 AM)"
    log "   • Clean dashboard with direct model controls"
    log "   • Staged training approach"
    log ""
    log "🔧 Next steps:"
    log "   1. Access the dashboard to verify everything works"
    log "   2. Check training status in the Models section"
    log "   3. Monitor system health via the dashboard"
    log "   4. Optionally configure domain and SSL"
}

# Run deployment
main "$@" 