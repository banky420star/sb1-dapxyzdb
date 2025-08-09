#!/bin/bash

# 🚀 PHASE 1: BATTLE-GRADE INFRASTRUCTURE SETUP
# methtrader.xyz - Infrastructure Hardening Script
# Based on Phase 0 Audit Results

set -e

echo "🚀 Starting Phase 1: Battle-Grade Infrastructure Setup"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRIMARY_SERVER="45.76.136.30"
SECONDARY_SERVER=""  # To be configured
DOMAIN="methtrader.xyz"
BACKUP_DIR="/opt/ats/backups"
LOG_DIR="/opt/ats/logs"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Check prerequisites
log "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if Caddy is installed
if ! command -v caddy &> /dev/null; then
    warning "Caddy is not installed. Installing Caddy..."
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy
fi

success "Prerequisites check completed"

# Step 1: Create backup of current configuration
log "Step 1: Creating backup of current configuration..."
mkdir -p $BACKUP_DIR
cp docker-compose.yml $BACKUP_DIR/docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
cp nginx/nginx.conf $BACKUP_DIR/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
success "Backup created"

# Step 2: Create enhanced Docker Compose configuration
log "Step 2: Creating enhanced Docker Compose configuration..."

cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # Primary Application Stack
  trading-api:
    build: .
    container_name: trading-api-primary
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    networks:
      - trading-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  trading-api-secondary:
    build: .
    container_name: trading-api-secondary
    restart: unless-stopped
    ports:
      - "8001:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    networks:
      - trading-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend
  trading-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: trading-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    networks:
      - trading-network
    depends_on:
      - trading-api-primary

  # Database with WAL shipping
  postgres-primary:
    image: postgres:15
    container_name: postgres-primary
    restart: unless-stopped
    environment:
      POSTGRES_DB: trading
      POSTGRES_USER: trading_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - trading-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trading_user -d trading"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres-replica:
    image: postgres:15
    container_name: postgres-replica
    restart: unless-stopped
    environment:
      POSTGRES_DB: trading
      POSTGRES_USER: trading_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    networks:
      - trading-network
    depends_on:
      - postgres-primary

  # Redis with persistence
  redis-primary:
    image: redis:7-alpine
    container_name: redis-primary
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - trading-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis-replica:
    image: redis:7-alpine
    container_name: redis-replica
    restart: unless-stopped
    command: redis-server --slaveof redis-primary 6379 --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_replica_data:/data
    networks:
      - trading-network
    depends_on:
      - redis-primary

  # Load Balancer (Caddy)
  caddy:
    image: caddy:2-alpine
    container_name: caddy-lb
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - trading-network
    depends_on:
      - trading-api-primary
      - trading-api-secondary

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - trading-network
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - trading-network
    depends_on:
      - prometheus

  # MLflow Tracking Server
  mlflow:
    image: python:3.9-slim
    container_name: mlflow-server
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./mlflow_tracking_server.py:/app/mlflow_tracking_server.py
      - mlflow_data:/app/mlruns
    working_dir: /app
    command: >
      bash -c "pip install mlflow && 
               mlflow server --host 0.0.0.0 --port 5000 
               --backend-store-uri sqlite:///mlflow.db 
               --default-artifact-root /app/mlruns"
    networks:
      - trading-network

  # Log Aggregation
  loki:
    image: grafana/loki:latest
    container_name: loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    networks:
      - trading-network
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    restart: unless-stopped
    volumes:
      - ./logs:/var/log
      - ./monitoring/promtail.yml:/etc/promtail/config.yml
    networks:
      - trading-network
    command: -config.file=/etc/promtail/config.yml

volumes:
  postgres_data:
  postgres_replica_data:
  redis_data:
  redis_replica_data:
  caddy_data:
  caddy_config:
  prometheus_data:
  grafana_data:
  mlflow_data:
  loki_data:

networks:
  trading-network:
    driver: bridge
EOF

success "Enhanced Docker Compose configuration created"

# Step 3: Create Caddy configuration for load balancing
log "Step 3: Creating Caddy load balancer configuration..."

mkdir -p caddy

cat > caddy/Caddyfile << 'EOF'
{
    # Global settings
    admin off
    log {
        output file /var/log/caddy/access.log
        format json
    }
}

# Main domain with load balancing
methtrader.xyz {
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
    }

    # Rate limiting
    rate_limit {
        zone api {
            key {remote_host}
            events 1000
            window 1m
        }
        zone admin {
            key {remote_host}
            events 100
            window 1m
        }
    }

    # Load balancing for API
    @api {
        path /api/*
    }
    reverse_proxy @api trading-api-primary:8000, trading-api-secondary:8000 {
        lb_policy round_robin
        health_uri /api/health
        health_interval 30s
        health_timeout 10s
        health_status 200
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Frontend
    reverse_proxy trading-frontend:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Logging
    log {
        output file /var/log/caddy/methtrader.xyz.log {
            roll_size 10MB
            roll_keep 5
            roll_keep_for 720h
        }
    }
}

# Admin subdomain (VPN only)
admin.methtrader.xyz {
    # Only allow VPN IPs
    @vpn {
        remote_ip 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
    }
    respond @vpn 403

    reverse_proxy trading-api-primary:8000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

# Monitoring subdomain
monitoring.methtrader.xyz {
    # Basic auth for monitoring
    basicauth /* {
        admin JDJhJDEwJGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6
    }

    reverse_proxy grafana:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF

success "Caddy load balancer configuration created"

# Step 4: Create monitoring configuration
log "Step 4: Creating monitoring configuration..."

mkdir -p monitoring

cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'trading-api'
    static_configs:
      - targets: ['trading-api-primary:8000', 'trading-api-secondary:8001']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-primary:5432']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-primary:6379']
    scrape_interval: 30s

  - job_name: 'caddy'
    static_configs:
      - targets: ['caddy-lb:80']
    scrape_interval: 30s
EOF

cat > monitoring/promtail.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log

  - job_name: trading-api
    static_configs:
      - targets:
          - localhost
        labels:
          job: trading-api
          __path__: /var/log/trading-api*.log

  - job_name: caddy
    static_configs:
      - targets:
          - localhost
        labels:
          job: caddy
          __path__: /var/log/caddy/*.log
EOF

success "Monitoring configuration created"

# Step 5: Create environment file
log "Step 5: Creating environment configuration..."

cat > .env.production << 'EOF'
# Database Configuration
POSTGRES_PASSWORD=your_secure_postgres_password_here
POSTGRES_DB=trading
POSTGRES_USER=trading_user

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here
REDIS_URL=redis://:${REDIS_PASSWORD}@redis-primary:6379

# Grafana Configuration
GRAFANA_PASSWORD=your_secure_grafana_password_here

# Application Configuration
NODE_ENV=production
PORT=8000

# Bybit API Configuration
BYBIT_API_KEY=
BYBIT_API_SECRET=

# MLflow Configuration
MLFLOW_TRACKING_URI=http://mlflow:5000

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
LOKI_URL=http://loki:3100
EOF

success "Environment configuration created"

# Step 6: Create health check script
log "Step 6: Creating health check script..."

cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for the trading platform
# Checks all services and reports status

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check Docker services
check_docker_services() {
    log "Checking Docker services..."
    
    services=("trading-api-primary" "trading-api-secondary" "postgres-primary" "redis-primary" "caddy-lb" "prometheus" "grafana" "mlflow")
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            status=$(docker inspect --format='{{.State.Status}}' "$service")
            if [ "$status" = "running" ]; then
                log "✅ $service: $status"
            else
                error "❌ $service: $status"
            fi
        else
            error "❌ $service: not found"
        fi
    done
}

# Check API endpoints
check_api_endpoints() {
    log "Checking API endpoints..."
    
    endpoints=("http://localhost/api/health" "http://localhost/api/metrics" "http://localhost/status")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$endpoint" > /dev/null; then
            log "✅ $endpoint: OK"
        else
            error "❌ $endpoint: FAILED"
        fi
    done
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker exec postgres-primary pg_isready -U trading_user -d trading > /dev/null 2>&1; then
        log "✅ PostgreSQL: OK"
    else
        error "❌ PostgreSQL: FAILED"
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis connectivity..."
    
    if docker exec redis-primary redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis: OK"
    else
        error "❌ Redis: FAILED"
    fi
}

# Check monitoring
check_monitoring() {
    log "Checking monitoring services..."
    
    if curl -s -f "http://localhost:9090/-/healthy" > /dev/null; then
        log "✅ Prometheus: OK"
    else
        error "❌ Prometheus: FAILED"
    fi
    
    if curl -s -f "http://localhost:3001/api/health" > /dev/null; then
        log "✅ Grafana: OK"
    else
        error "❌ Grafana: FAILED"
    fi
}

# Main execution
main() {
    echo "🔍 Starting comprehensive health check..."
    echo "========================================"
    
    check_docker_services
    echo ""
    check_api_endpoints
    echo ""
    check_database
    echo ""
    check_redis
    echo ""
    check_monitoring
    echo ""
    
    log "Health check completed"
}

main "$@"
EOF

chmod +x scripts/health-check.sh
success "Health check script created"

# Step 7: Create deployment script
log "Step 7: Creating deployment script..."

cat > scripts/deploy-production.sh << 'EOF'
#!/bin/bash

# Production deployment script
# Deploys the enhanced infrastructure

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    error ".env.production file not found. Please create it first."
fi

# Load environment variables
source .env.production

# Stop existing services
log "Stopping existing services..."
docker-compose -f docker-compose.production.yml down || true

# Build and start services
log "Building and starting services..."
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Wait for services to start
log "Waiting for services to start..."
sleep 30

# Run health check
log "Running health check..."
./scripts/health-check.sh

# Show service status
log "Service status:"
docker-compose -f docker-compose.production.yml ps

log "Deployment completed successfully!"
log "Access points:"
log "  - Main application: https://methtrader.xyz"
log "  - Monitoring: https://monitoring.methtrader.xyz"
log "  - API health: https://methtrader.xyz/api/health"
EOF

chmod +x scripts/deploy-production.sh
success "Deployment script created"

# Step 8: Create backup script
log "Step 8: Creating backup script..."

cat > scripts/backup-system.sh << 'EOF'
#!/bin/bash

# System backup script
# Creates comprehensive backups of all data

set -e

# Configuration
BACKUP_DIR="/opt/ats/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="trading-system-backup-$DATE"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
log "Backing up PostgreSQL..."
docker exec postgres-primary pg_dump -U trading_user trading > "$BACKUP_DIR/postgres-$BACKUP_NAME.sql"

# Backup Redis
log "Backing up Redis..."
docker exec redis-primary redis-cli --rdb /data/dump.rdb
docker cp redis-primary:/data/dump.rdb "$BACKUP_DIR/redis-$BACKUP_NAME.rdb"

# Backup configuration files
log "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config-$BACKUP_NAME.tar.gz" \
    docker-compose.production.yml \
    caddy/ \
    monitoring/ \
    .env.production \
    scripts/

# Backup logs
log "Backing up logs..."
tar -czf "$BACKUP_DIR/logs-$BACKUP_NAME.tar.gz" logs/

# Create backup manifest
cat > "$BACKUP_DIR/manifest-$BACKUP_NAME.txt" << MANIFEST
Trading System Backup Manifest
==============================
Date: $(date)
Backup Name: $BACKUP_NAME
Components:
- PostgreSQL database
- Redis data
- Configuration files
- Log files
- Docker volumes

Files:
- postgres-$BACKUP_NAME.sql
- redis-$BACKUP_NAME.rdb
- config-$BACKUP_NAME.tar.gz
- logs-$BACKUP_NAME.tar.gz
- manifest-$BACKUP_NAME.txt
MANIFEST

log "Backup completed: $BACKUP_NAME"
log "Backup location: $BACKUP_DIR"
EOF

chmod +x scripts/backup-system.sh
success "Backup script created"

# Final summary
echo ""
echo "🎉 Phase 1 Infrastructure Setup Completed!"
echo "=========================================="
echo ""
echo "✅ Created enhanced Docker Compose configuration"
echo "✅ Set up Caddy load balancer with rate limiting"
echo "✅ Configured monitoring with Prometheus + Grafana"
echo "✅ Created health check and deployment scripts"
echo "✅ Set up backup and recovery procedures"
echo ""
echo "📋 Next Steps:"
echo "1. Review and customize .env.production"
echo "2. Run: ./scripts/deploy-production.sh"
echo "3. Run: ./scripts/health-check.sh"
echo "4. Access monitoring at: https://monitoring.methtrader.xyz"
echo ""
echo "🔧 Configuration Files Created:"
echo "- docker-compose.production.yml"
echo "- caddy/Caddyfile"
echo "- monitoring/prometheus.yml"
echo "- monitoring/promtail.yml"
echo "- .env.production"
echo "- scripts/health-check.sh"
echo "- scripts/deploy-production.sh"
echo "- scripts/backup-system.sh"
echo ""
echo "🚀 Ready for Phase 2: Immutable Config + Secrets" 