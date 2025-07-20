#!/bin/bash

# Enhanced AI Trading System Deployment Script
# Includes Bybit Integration, Fixed Notifications, and Autonomous Trading

set -e

echo "🚀 Enhanced AI Trading System Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt-get install -y curl wget git docker.io docker-compose nodejs npm python3 python3-pip

# Install Node.js 20.x if not already installed
if ! command -v node &> /dev/null || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    print_status "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Verify installations
print_status "Verifying installations..."
node --version
npm --version
pm2 --version

# Create application directory
APP_DIR="/opt/ai-trading-system"
print_status "Setting up application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Install Python dependencies
print_status "Installing Python dependencies..."
pip3 install -r requirements.txt

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database Configuration
DB_PATH=./data/trading.db

# Alpha Vantage API (for forex data)
ALPHA_VANTAGE_API_KEY=demo

# Bybit API Configuration
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_SANDBOX=true

# MT5 Integration (optional)
MT5_INTEGRATION=false
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/trading.log

# Trading Configuration
TRADING_MODE=paper
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2
EOF

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data logs monitoring

# Set up PM2 configuration
print_status "Setting up PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ai-trading-backend',
    script: './server/enhanced-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }, {
    name: 'ai-trading-frontend',
    script: 'npm',
    args: 'run preview',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/frontend-err.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true
  }]
}
EOF

# Create systemd service for auto-start
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/ai-trading.service > /dev/null << EOF
[Unit]
Description=AI Trading System
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
print_status "Enabling and starting systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable ai-trading.service
sudo systemctl start ai-trading.service

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor-system.sh << 'EOF'
#!/bin/bash

# AI Trading System Monitoring Script

APP_DIR="/opt/ai-trading-system"
LOG_FILE="$APP_DIR/logs/monitor.log"

echo "$(date): Starting system monitoring..." >> $LOG_FILE

# Check if services are running
if ! pm2 list | grep -q "ai-trading-backend"; then
    echo "$(date): Backend service not running, restarting..." >> $LOG_FILE
    cd $APP_DIR && pm2 start ecosystem.config.js
fi

if ! pm2 list | grep -q "ai-trading-frontend"; then
    echo "$(date): Frontend service not running, restarting..." >> $LOG_FILE
    cd $APP_DIR && pm2 start ecosystem.config.js
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "$(date): WARNING: Memory usage is ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Clean old logs (keep last 7 days)
find $APP_DIR/logs -name "*.log" -mtime +7 -delete

echo "$(date): Monitoring check completed" >> $LOG_FILE
EOF

chmod +x monitor-system.sh

# Set up cron job for monitoring
print_status "Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor-system.sh") | crontab -

# Create health check script
print_status "Creating health check script..."
cat > health-check.sh << 'EOF'
#!/bin/bash

# Health check endpoints
BACKEND_URL="http://localhost:8000/api/health"
FRONTEND_URL="http://localhost:3000"

echo "=== AI Trading System Health Check ==="
echo "Timestamp: $(date)"
echo

# Check backend
echo "Backend Status:"
if curl -s $BACKEND_URL > /dev/null; then
    echo "✅ Backend is running"
    curl -s $BACKEND_URL | jq '.' 2>/dev/null || curl -s $BACKEND_URL
else
    echo "❌ Backend is not responding"
fi
echo

# Check frontend
echo "Frontend Status:"
if curl -s $FRONTEND_URL > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not responding"
fi
echo

# Check PM2 processes
echo "PM2 Processes:"
pm2 list
echo

# Check system resources
echo "System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk Usage: $(df / | awk 'NR==2 {print $5}')"
echo

# Check Bybit integration
echo "Bybit Integration:"
if curl -s "http://localhost:8000/api/bybit/status" > /dev/null; then
    echo "✅ Bybit integration is available"
    curl -s "http://localhost:8000/api/bybit/status" | jq '.' 2>/dev/null || curl -s "http://localhost:8000/api/bybit/status"
else
    echo "❌ Bybit integration is not available"
fi
echo

echo "Health check completed at $(date)"
EOF

chmod +x health-check.sh

# Create quick start guide
print_status "Creating quick start guide..."
cat > QUICK_START.md << 'EOF'
# Enhanced AI Trading System - Quick Start Guide

## 🚀 System Status

Check if the system is running:
```bash
./health-check.sh
```

## 📊 Access Points

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/api/health
- **Bybit Status**: http://localhost:8000/api/bybit/status

## 🤖 AI Features

### 1. AI Notification Agent
- Real-time system monitoring
- Trading performance alerts
- Model accuracy tracking
- Data stream health monitoring

### 2. Bybit Integration
- BTCUSD real-time data
- Autonomous trading strategies
- News event monitoring
- Strategy signal generation

### 3. Autonomous Trading
- Trend following strategy
- Mean reversion strategy
- Breakout strategy
- Risk management

## 🛠️ Management Commands

### Start/Stop Services
```bash
# Start all services
sudo systemctl start ai-trading

# Stop all services
sudo systemctl stop ai-trading

# Restart all services
sudo systemctl restart ai-trading

# Check service status
sudo systemctl status ai-trading
```

### PM2 Management
```bash
# View all processes
pm2 list

# View logs
pm2 logs

# Restart specific process
pm2 restart ai-trading-backend
pm2 restart ai-trading-frontend

# Monitor processes
pm2 monit
```

### Bybit Trading
```bash
# Check Bybit status
curl http://localhost:8000/api/bybit/status

# Get account balance
curl http://localhost:8000/api/bybit/balance

# Get open positions
curl http://localhost:8000/api/bybit/positions

# Get strategy signals
curl http://localhost:8000/api/bybit/signals
```

## 📈 Trading Strategies

### 1. Trend Following
- Uses 20 and 50 period moving averages
- RSI for confirmation
- Buy when short MA > long MA and RSI < 70
- Sell when short MA < long MA and RSI > 30

### 2. Mean Reversion
- Uses Bollinger Bands
- RSI for oversold/overbought conditions
- Buy when price < lower BB and RSI < 30
- Sell when price > upper BB and RSI > 70

### 3. Breakout
- Uses ATR for volatility measurement
- Support/resistance levels
- Buy when price breaks above resistance + ATR
- Sell when price breaks below support - ATR

## 🔧 Configuration

Edit `.env` file to modify:
- API keys and secrets
- Trading parameters
- Risk management settings
- System configuration

## 📊 Monitoring

### System Monitoring
- Automatic health checks every 5 minutes
- Log rotation (7 days retention)
- Resource usage monitoring
- Service auto-restart

### Trading Monitoring
- Real-time P&L tracking
- Win rate monitoring
- Drawdown protection
- Model performance tracking

## 🚨 Alerts

The AI notification system provides alerts for:
- High system load (>80% CPU)
- High memory usage (>90%)
- Trading losses exceeding thresholds
- Low win rates (<40%)
- High drawdowns (>10%)
- Model accuracy drops (<50%)
- Data stream interruptions

## 🔒 Security

- CORS protection enabled
- API rate limiting
- Secure environment variables
- Sandbox trading mode by default

## 📞 Support

For issues or questions:
1. Check the health check script: `./health-check.sh`
2. View logs: `pm2 logs`
3. Restart services: `sudo systemctl restart ai-trading`
4. Check system resources: `htop` or `top`

## 🎯 Next Steps

1. **Configure API Keys**: Update `.env` with your actual API keys
2. **Test Paper Trading**: Verify system works in paper mode
3. **Monitor Performance**: Watch AI notifications and trading signals
4. **Enable Live Trading**: Switch to live mode when ready
5. **Customize Strategies**: Modify strategy parameters in the code

Happy Trading! 🤖📈
EOF

# Set proper permissions
print_status "Setting proper permissions..."
chmod +x *.sh
sudo chown -R $USER:$USER $APP_DIR

# Start the services
print_status "Starting services..."
pm2 start ecosystem.config.js

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Run health check
print_status "Running health check..."
./health-check.sh

# Final status
print_success "Enhanced AI Trading System deployed successfully!"
print_status "System components:"
echo "  ✅ Backend API (Port 8000)"
echo "  ✅ Frontend Dashboard (Port 3000)"
echo "  ✅ AI Notification Agent"
echo "  ✅ Bybit Integration (BTCUSD)"
echo "  ✅ Autonomous Trading Strategies"
echo "  ✅ System Monitoring"
echo "  ✅ Auto-restart Service"

print_status "Access your system:"
echo "  🌐 Frontend: http://localhost:3000"
echo "  🔧 Backend: http://localhost:8000"
echo "  📊 Health: http://localhost:8000/api/health"
echo "  🤖 Bybit: http://localhost:8000/api/bybit/status"

print_status "Management commands:"
echo "  📋 Health check: ./health-check.sh"
echo "  🔄 Restart: sudo systemctl restart ai-trading"
echo "  📊 Monitor: pm2 monit"
echo "  📝 Logs: pm2 logs"

print_success "Deployment completed! Check QUICK_START.md for detailed instructions." 