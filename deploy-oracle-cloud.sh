#!/bin/bash

# 🚀 Oracle Cloud Deployment Script for AI Trading System
# This script sets up your AI Trading System on Oracle Cloud Infrastructure

set -e

echo "🚀 Oracle Cloud AI Trading System Deployment"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as ubuntu user."
   exit 1
fi

# Check if we're on Oracle Cloud (Ubuntu)
if ! grep -q "Ubuntu" /etc/os-release; then
    print_warning "This script is optimized for Ubuntu on Oracle Cloud"
fi

print_header "1. System Update and Dependencies"
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
sudo apt install -y curl wget git htop unzip software-properties-common

print_header "2. Installing Docker"
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_status "Docker already installed"
fi

print_header "3. Installing Docker Compose"
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
else
    print_status "Docker Compose already installed"
fi

print_header "4. Installing Node.js"
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js installed: $(node --version)"
else
    print_status "Node.js already installed: $(node --version)"
fi

print_header "5. Configuring Firewall"
print_status "Setting up UFW firewall rules..."
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8000  # API Backend
sudo ufw allow 3000  # Frontend
sudo ufw allow 5555  # MT5 Command
sudo ufw allow 5556  # MT5 Data
sudo ufw allow 3001  # Monitoring
sudo ufw --force enable
print_status "Firewall configured"

print_header "6. Setting up Application Directory"
APP_DIR="$HOME/ai-trading-system"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    print_status "Created application directory: $APP_DIR"
fi

cd "$APP_DIR"

print_header "7. Creating Environment Configuration"
if [ ! -f ".env" ]; then
    print_status "Creating environment file..."
    cat > .env << 'EOF'
# Oracle Cloud Production Configuration
NODE_ENV=production
PORT=8000
TRADING_MODE=paper

# Bybit API Configuration
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_TESTNET=false

# Risk Management
MAX_POSITION_SIZE=0.1
MAX_TOTAL_EXPOSURE=0.5
MAX_DAILY_LOSS=0.05
DEFAULT_STOP_LOSS=0.02
DEFAULT_TAKE_PROFIT=0.04

# CORS Configuration (update with your instance IP)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Logging
LOG_LEVEL=info
ENABLE_DETAILED_LOGGING=true

# Features
ENABLE_AUTONOMOUS_TRADING=false
ENABLE_NOTIFICATIONS=true
ENABLE_MONITORING=true
ENABLE_RISK_MANAGEMENT=true
EOF
    print_status "Environment file created"
else
    print_status "Environment file already exists"
fi

print_header "8. Creating Docker Compose Configuration"
cat > docker-compose.yml << 'EOF'
version: '3.9'

services:
  # AI Trading Backend
  backend:
    build: .
    container_name: ai-trading-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "5555:5555"
      - "5556:5556"
    environment:
      - NODE_ENV=production
      - TRADING_MODE=paper
    env_file:
      - .env
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Frontend (if building locally)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: ai-trading-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      backend:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: ai-trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 256M

  # Monitoring with Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: ai-trading-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=7d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    deploy:
      resources:
        limits:
          cpus: '0.3'
          memory: 512M

  # Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: ai-trading-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '0.3'
          memory: 512M

volumes:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  default:
    name: ai-trading-network
EOF

print_status "Docker Compose configuration created"

print_header "9. Creating Monitoring Configuration"
mkdir -p monitoring/grafana/{dashboards,datasources}

# Prometheus configuration
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ai-trading-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']
EOF

# Grafana datasource
cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

print_status "Monitoring configuration created"

print_header "10. Creating Deployment Scripts"

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AI Trading System..."
docker-compose up -d
echo "✅ System started!"
echo "📊 Dashboard: http://$(curl -s ifconfig.me):3000"
echo "🔧 API: http://$(curl -s ifconfig.me):8000"
echo "📈 Monitoring: http://$(curl -s ifconfig.me):3001"
EOF

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping AI Trading System..."
docker-compose down
echo "✅ System stopped!"
EOF

# Create update script
cat > update.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating AI Trading System..."
git pull origin main
docker-compose build --no-cache
docker-compose up -d
echo "✅ System updated!"
EOF

# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 AI Trading System Health Check"
echo "================================="

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "Public IP: $PUBLIC_IP"

# Check backend
echo -n "Backend Health: "
if curl -sf http://localhost:8000/api/health > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Check frontend
echo -n "Frontend: "
if curl -sf http://localhost:3000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Check trading API
echo -n "Trading API: "
if curl -sf http://localhost:8000/api/crypto/status > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Check containers
echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
EOF

chmod +x start.sh stop.sh update.sh health-check.sh
print_status "Deployment scripts created"

print_header "11. Getting Your Public IP"
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
print_status "Your Oracle Cloud instance public IP: $PUBLIC_IP"

# Update CORS origins with public IP
if [ "$PUBLIC_IP" != "Unable to detect" ]; then
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://$PUBLIC_IP:3000|" .env
    print_status "Updated CORS origins with your public IP"
fi

print_header "12. Final Setup Instructions"
echo ""
print_status "Setup completed! Next steps:"
echo ""
echo "1. If you haven't already, upload your application code to this directory:"
echo "   $APP_DIR"
echo ""
echo "2. If you need to logout and login again for Docker group permissions:"
echo "   exit"
echo "   ssh ubuntu@$PUBLIC_IP"
echo ""
echo "3. Start your application:"
echo "   cd $APP_DIR"
echo "   ./start.sh"
echo ""
echo "4. Access your application:"
echo "   📊 Dashboard: http://$PUBLIC_IP:3000"
echo "   🔧 API: http://$PUBLIC_IP:8000"
echo "   📈 Monitoring: http://$PUBLIC_IP:3001 (admin/admin123)"
echo ""
echo "5. Check system health:"
echo "   ./health-check.sh"
echo ""
print_status "🎉 Oracle Cloud deployment setup completed!"
print_warning "Remember to configure your Oracle Cloud Security Lists to allow the required ports!"

echo ""
echo "📋 Security List Ports to Allow:"
echo "   - 22 (SSH)"
echo "   - 80 (HTTP)"
echo "   - 443 (HTTPS)"
echo "   - 8000 (API Backend)"
echo "   - 3000 (Frontend)"
echo "   - 5555 (MT5 Command)"
echo "   - 5556 (MT5 Data)"
echo "   - 3001 (Monitoring)"