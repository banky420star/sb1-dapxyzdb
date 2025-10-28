#!/bin/bash
# Backend Instance Setup Script for Oracle Cloud

set -e

# Update system
yum update -y

# Install Docker
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js (for direct deployment if needed)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install additional tools
yum install -y curl wget git htop postgresql

# Create application directory
mkdir -p /opt/ai-trading
cd /opt/ai-trading

# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://trader:secure_password@database:5432/trading_system
MODEL_SERVICE_URL=http://ml-service:9000
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_API_SECRET=your_bybit_api_secret_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_minimum_32_characters
TRADING_MODE=paper
CONFIDENCE_THRESHOLD=0.60
MAX_DRAWDOWN_PCT=0.15
PER_SYMBOL_USD_CAP=10000
EOF

# Create docker-compose file for backend
cat > docker-compose.yml << EOF
version: '3.9'
services:
  backend:
    image: ai-trading-backend:latest
    container_name: ai-trading-backend
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
      - DATABASE_URL=postgresql://trader:secure_password@database:5432/trading_system
      - MODEL_SERVICE_URL=http://ml-service:9000
      - BYBIT_API_KEY=\${BYBIT_API_KEY}
      - BYBIT_API_SECRET=\${BYBIT_API_SECRET}
      - ALPHA_VANTAGE_API_KEY=\${ALPHA_VANTAGE_API_KEY}
      - JWT_SECRET=\${JWT_SECRET}
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY}
      - TRADING_MODE=\${TRADING_MODE}
      - CONFIDENCE_THRESHOLD=\${CONFIDENCE_THRESHOLD}
      - MAX_DRAWDOWN_PCT=\${MAX_DRAWDOWN_PCT}
      - PER_SYMBOL_USD_CAP=\${PER_SYMBOL_USD_CAP}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/ai-trading-backend.service << EOF
[Unit]
Description=AI Trading Backend
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ai-trading
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable ai-trading-backend

# Create log rotation
cat > /etc/logrotate.d/ai-trading << EOF
/opt/ai-trading/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
EOF

# Set up monitoring
cat > /opt/ai-trading/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for backend

BACKEND_URL="http://localhost:8000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Backend is healthy"
    exit 0
else
    echo "Backend is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x /opt/ai-trading/health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /opt/ai-trading/health-check.sh >> /var/log/ai-trading-health.log 2>&1" | crontab -

# Create necessary directories
mkdir -p /opt/ai-trading/data
mkdir -p /opt/ai-trading/logs
mkdir -p /opt/ai-trading/models

# Set up firewall (if needed)
firewall-cmd --permanent --add-port=8000/tcp
firewall-cmd --reload

echo "Backend setup completed successfully!"