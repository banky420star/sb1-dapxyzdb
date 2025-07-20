#!/bin/bash

# 🚀 Vultr Trading System Deployment Script
# This script deploys the complete AI trading system to Vultr

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ai-trading-system"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="trading"
SERVICE_GROUP="trading"
NODE_VERSION="20"
PYTHON_VERSION="3.11"

echo -e "${BLUE}🚀 Starting AI Trading System Deployment on Vultr${NC}"
echo "=================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    sqlite3 \
    supervisor \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Create service user
print_status "Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d $APP_DIR $SERVICE_USER
    usermod -aG sudo $SERVICE_USER
fi

# Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
chown $SERVICE_USER:$SERVICE_GROUP $APP_DIR

# Install Node.js
print_status "Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
apt-get install -y nodejs

# Install Python dependencies
print_status "Installing Python dependencies..."
pip3 install --upgrade pip
pip3 install httpx typer pyyaml requests

# Clone or copy application files
print_status "Setting up application files..."
if [ -d ".git" ]; then
    # If we're in a git repo, copy current directory
    cp -r . $APP_DIR/
else
    # Otherwise, clone from git (replace with your repo URL)
    cd $APP_DIR
    git clone https://github.com/yourusername/ai-trading-system.git .
fi

# Set proper permissions
chown -R $SERVICE_USER:$SERVICE_GROUP $APP_DIR
chmod +x $APP_DIR/*.sh

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd $APP_DIR
npm install --production

# Create environment file
print_status "Creating environment configuration..."
cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=8000
ALPHAVANTAGE_API_KEY=2ZQ8QZSN1U9XN5TK
MT5_INTEGRATION=false
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
DATABASE_PATH=$APP_DIR/data/trading.db
LOG_LEVEL=info
EOF

chown $SERVICE_USER:$SERVICE_GROUP $APP_DIR/.env

# Create data directory
print_status "Creating data directories..."
mkdir -p $APP_DIR/data
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups
chown -R $SERVICE_USER:$SERVICE_GROUP $APP_DIR/data
chown -R $SERVICE_USER:$SERVICE_GROUP $APP_DIR/logs
chown -R $SERVICE_USER:$SERVICE_GROUP $APP_DIR/backups

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=AI Trading System
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=8000
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/data $APP_DIR/logs

[Install]
WantedBy=multi-user.target
EOF

# Create MQL5 collector service
print_status "Creating MQL5 collector service..."
cat > /etc/systemd/system/$APP_NAME-collector.service << EOF
[Unit]
Description=AI Trading System MQL5 Collector
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$APP_DIR
Environment=PYTHONPATH=$APP_DIR
ExecStart=/usr/bin/python3 mql5_collector.py
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME-collector

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/data $APP_DIR/logs

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (React app)
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configure Nginx
sed -i 's/# server_names_hash_bucket_size 64;/server_names_hash_bucket_size 64;/' /etc/nginx/nginx.conf

# Create logrotate configuration
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_GROUP
    postrotate
        systemctl reload $APP_NAME
    endscript
}
EOF

# Create firewall rules
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp

# Build frontend
print_status "Building frontend application..."
cd $APP_DIR
sudo -u $SERVICE_USER npm run build

# Initialize database
print_status "Initializing database..."
sudo -u $SERVICE_USER node -e "
const { DatabaseManager } = require('./server/database/manager.js');
const db = new DatabaseManager();
db.initialize().then(() => {
    console.log('Database initialized successfully');
    process.exit(0);
}).catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});
"

# Start services
print_status "Starting services..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl enable $APP_NAME-collector
systemctl enable nginx

systemctl start nginx
systemctl start $APP_NAME
systemctl start $APP_NAME-collector

# Wait for services to start
sleep 10

# Check service status
print_status "Checking service status..."
if systemctl is-active --quiet $APP_NAME; then
    print_status "Main application service is running"
else
    print_error "Main application service failed to start"
    systemctl status $APP_NAME
fi

if systemctl is-active --quiet $APP_NAME-collector; then
    print_status "MQL5 collector service is running"
else
    print_warning "MQL5 collector service failed to start"
    systemctl status $APP_NAME-collector
fi

if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx failed to start"
    systemctl status nginx
fi

# Create monitoring script
print_status "Creating monitoring script..."
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for AI Trading System
APP_NAME="ai-trading-system"
APP_DIR="/opt/$APP_NAME"

echo "=== AI Trading System Status ==="
echo "Time: $(date)"
echo ""

# Check services
echo "Service Status:"
systemctl is-active --quiet $APP_NAME && echo "✅ Main App: Running" || echo "❌ Main App: Stopped"
systemctl is-active --quiet ${APP_NAME}-collector && echo "✅ Collector: Running" || echo "❌ Collector: Stopped"
systemctl is-active --quiet nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"

echo ""
echo "Resource Usage:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "Application Logs (last 10 lines):"
tail -n 10 $APP_DIR/logs/combined.log 2>/dev/null || echo "No logs found"

echo ""
echo "Database Status:"
if [ -f "$APP_DIR/data/trading.db" ]; then
    echo "✅ Database file exists"
    echo "Size: $(du -h $APP_DIR/data/trading.db | cut -f1)"
else
    echo "❌ Database file not found"
fi
EOF

chmod +x $APP_DIR/monitor.sh

# Create backup script
print_status "Creating backup script..."
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

# Backup script for AI Trading System
APP_NAME="ai-trading-system"
APP_DIR="/opt/$APP_NAME"
BACKUP_DIR="$APP_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Creating backup: $DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "$APP_DIR/data/trading.db" ]; then
    cp $APP_DIR/data/trading.db $BACKUP_DIR/trading_$DATE.db
    echo "Database backed up: trading_$DATE.db"
fi

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    $APP_DIR/.env \
    $APP_DIR/widgets.yaml \
    $APP_DIR/package.json \
    $APP_DIR/requirements.txt

echo "Configuration backed up: config_$DATE.tar.gz"

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed successfully"
EOF

chmod +x $APP_DIR/backup.sh

# Set up cron jobs
print_status "Setting up cron jobs..."
(crontab -u $SERVICE_USER -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -u $SERVICE_USER -
(crontab -u $SERVICE_USER -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/monitor.sh >> $APP_DIR/logs/monitor.log 2>&1") | crontab -u $SERVICE_USER -

# Final status check
print_status "Performing final status check..."
sleep 5

# Test API endpoint
if curl -s http://localhost:8000/api/health > /dev/null; then
    print_status "API health check passed"
else
    print_warning "API health check failed"
fi

# Test web interface
if curl -s http://localhost > /dev/null; then
    print_status "Web interface is accessible"
else
    print_warning "Web interface check failed"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}Access your trading system:${NC}"
echo "  🌐 Web Interface: http://$(curl -s ifconfig.me)"
echo "  🔧 API Endpoint: http://$(curl -s ifconfig.me):8000/api"
echo "  📊 Health Check: http://$(curl -s ifconfig.me)/health"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  📋 Check status: $APP_DIR/monitor.sh"
echo "  💾 Create backup: $APP_DIR/backup.sh"
echo "  📝 View logs: journalctl -u $APP_NAME -f"
echo "  🔄 Restart: systemctl restart $APP_NAME"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "  - Set up SSL certificate for production use"
echo "  - Configure firewall rules for your specific needs"
echo "  - Monitor system resources regularly"
echo "  - Set up automated backups"
echo ""
echo -e "${GREEN}🚀 Your AI Trading System is now live!${NC}" 