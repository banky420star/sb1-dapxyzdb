#!/bin/bash
# Frontend Instance Setup Script for Oracle Cloud

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

# Install additional tools
yum install -y curl wget git htop

# Create application directory
mkdir -p /opt/ai-trading
cd /opt/ai-trading

# Create environment file
cat > .env << EOF
NODE_ENV=production
VITE_API_URL=http://backend:8000
VITE_MODEL_SERVICE_URL=http://ml-service:9000
EOF

# Create docker-compose file for frontend
cat > docker-compose.yml << EOF
version: '3.9'
services:
  frontend:
    image: ai-trading-frontend:latest
    container_name: ai-trading-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - VITE_API_URL=http://backend:8000
      - VITE_MODEL_SERVICE_URL=http://ml-service:9000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/ai-trading-frontend.service << EOF
[Unit]
Description=AI Trading Frontend
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
systemctl enable ai-trading-frontend

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
# Health check script for frontend

FRONTEND_URL="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Frontend is healthy"
    exit 0
else
    echo "Frontend is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x /opt/ai-trading/health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /opt/ai-trading/health-check.sh >> /var/log/ai-trading-health.log 2>&1" | crontab -

# Create log directory
mkdir -p /opt/ai-trading/logs

echo "Frontend setup completed successfully!"