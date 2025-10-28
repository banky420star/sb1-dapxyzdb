#!/bin/bash
# ML Service Instance Setup Script for Oracle Cloud

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

# Install Python 3.11 and pip
yum install -y python3.11 python3.11-pip python3.11-devel

# Install additional tools
yum install -y curl wget git htop gcc gcc-c++ make

# Create application directory
mkdir -p /opt/ai-trading
cd /opt/ai-trading

# Create environment file
cat > .env << EOF
MODEL_VERSION=production
PYTHONUNBUFFERED=1
TZ=UTC
EOF

# Create docker-compose file for ML service
cat > docker-compose.yml << EOF
version: '3.9'
services:
  ml-service:
    image: ai-trading-ml:latest
    container_name: ai-trading-ml
    ports:
      - "9000:9000"
    environment:
      - MODEL_VERSION=production
      - PYTHONUNBUFFERED=1
      - TZ=UTC
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    volumes:
      - ./data:/app/data
      - ./models:/app/models
      - ./logs:/app/logs
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/ai-trading-ml.service << EOF
[Unit]
Description=AI Trading ML Service
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
systemctl enable ai-trading-ml

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
# Health check script for ML service

ML_URL="http://localhost:9000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ML_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "ML Service is healthy"
    exit 0
else
    echo "ML Service is unhealthy (HTTP $RESPONSE)"
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
firewall-cmd --permanent --add-port=9000/tcp
firewall-cmd --reload

# Install Python ML dependencies (for direct deployment if needed)
pip3.11 install --upgrade pip
pip3.11 install fastapi uvicorn numpy pandas scikit-learn torch tensorflow joblib python-dotenv requests

echo "ML Service setup completed successfully!"