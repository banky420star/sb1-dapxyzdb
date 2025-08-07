#!/bin/bash

# 🚀 PHASE 1: SIMPLIFIED INFRASTRUCTURE DEPLOYMENT
# methtrader.xyz - Core Infrastructure Improvements
# Based on Phase 0 Audit Results

set -e

echo "🚀 Starting Phase 1: Simplified Infrastructure Deployment"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="methtrader.xyz"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

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

success "Prerequisites check completed"

# Step 1: Create backup of current configuration
log "Step 1: Creating backup of current configuration..."
mkdir -p $BACKUP_DIR
cp docker-compose.yml $BACKUP_DIR/docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
success "Backup created"

# Step 2: Create enhanced Docker Compose configuration
log "Step 2: Creating enhanced Docker Compose configuration..."

cat > docker-compose.phase1.yml << 'EOF'
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
      - BYBIT_API_KEY=${BYBIT_API_KEY}
      - BYBIT_API_SECRET=${BYBIT_API_SECRET}
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
      - trading-api

  # Database with persistence
  postgres:
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

  # Redis with persistence
  redis:
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

  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    container_name: nginx-lb
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    networks:
      - trading-network
    depends_on:
      - trading-api
      - trading-frontend

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
      - '--storage.tsdb.retention.time=200h'

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
    networks:
      - trading-network
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  trading-network:
    driver: bridge
EOF

success "Enhanced Docker Compose configuration created"

# Step 3: Create Nginx configuration for load balancing
log "Step 3: Creating Nginx load balancer configuration..."

mkdir -p nginx

cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream trading_api {
        server trading-api:8000;
        keepalive 32;
    }

    upstream trading_frontend {
        server trading-frontend:80;
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=1000r/m;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=100r/m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # API endpoints with rate limiting
    server {
        listen 80;
        server_name methtrader.xyz;

        # API rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://trading_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Admin endpoints with stricter rate limiting
        location /admin/ {
            limit_req zone=admin burst=5 nodelay;
            proxy_pass http://trading_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://trading_frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # Monitoring subdomain
    server {
        listen 80;
        server_name monitoring.methtrader.xyz;

        location / {
            proxy_pass http://grafana:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

success "Nginx load balancer configuration created"

# Step 4: Create monitoring configuration
log "Step 4: Creating monitoring configuration..."

mkdir -p monitoring

cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'trading-api'
    static_configs:
      - targets: ['trading-api:8000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF

success "Monitoring configuration created"

# Step 5: Create environment file
log "Step 5: Creating environment configuration..."

cat > .env.phase1 << 'EOF'
# Database Configuration
POSTGRES_PASSWORD=your_secure_postgres_password_here
POSTGRES_DB=trading
POSTGRES_USER=trading_user

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Grafana Configuration
GRAFANA_PASSWORD=your_secure_grafana_password_here

# Application Configuration
NODE_ENV=production
PORT=8000

# Bybit API Configuration
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
EOF

success "Environment configuration created"

# Step 6: Create health check script
log "Step 6: Creating health check script..."

cat > scripts/health-check-phase1.sh << 'EOF'
#!/bin/bash

# Health check script for Phase 1 infrastructure
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
    
    services=("trading-api-primary" "trading-frontend" "postgres-primary" "redis-primary" "nginx-lb" "prometheus" "grafana")
    
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
    echo "🔍 Starting Phase 1 health check..."
    echo "=================================="
    
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

chmod +x scripts/health-check-phase1.sh
success "Health check script created"

# Step 7: Create deployment script
log "Step 7: Creating deployment script..."

cat > scripts/deploy-phase1.sh << 'EOF'
#!/bin/bash

# Phase 1 deployment script
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

# Check if .env.phase1 exists
if [ ! -f .env.phase1 ]; then
    error ".env.phase1 file not found. Please create it first."
fi

# Load environment variables
source .env.phase1

# Stop existing services
log "Stopping existing services..."
docker-compose -f docker-compose.phase1.yml down || true

# Build and start services
log "Building and starting services..."
docker-compose -f docker-compose.phase1.yml build
docker-compose -f docker-compose.phase1.yml up -d

# Wait for services to start
log "Waiting for services to start..."
sleep 30

# Run health check
log "Running health check..."
./scripts/health-check-phase1.sh

# Show service status
log "Service status:"
docker-compose -f docker-compose.phase1.yml ps

log "Phase 1 deployment completed successfully!"
log "Access points:"
log "  - Main application: http://localhost"
log "  - API health: http://localhost/api/health"
log "  - Monitoring: http://localhost:3001"
log "  - Prometheus: http://localhost:9090"
EOF

chmod +x scripts/deploy-phase1.sh
success "Deployment script created"

# Final summary
echo ""
echo "🎉 Phase 1 Simplified Infrastructure Setup Completed!"
echo "===================================================="
echo ""
echo "✅ Created enhanced Docker Compose configuration"
echo "✅ Set up Nginx load balancer with rate limiting"
echo "✅ Configured monitoring with Prometheus + Grafana"
echo "✅ Created health check and deployment scripts"
echo "✅ Set up environment configuration"
echo ""
echo "📋 Next Steps:"
echo "1. Review and customize .env.phase1"
echo "2. Run: ./scripts/deploy-phase1.sh"
echo "3. Run: ./scripts/health-check-phase1.sh"
echo "4. Access monitoring at: http://localhost:3001"
echo ""
echo "🔧 Configuration Files Created:"
echo "- docker-compose.phase1.yml"
echo "- nginx/nginx.conf"
echo "- monitoring/prometheus.yml"
echo "- .env.phase1"
echo "- scripts/health-check-phase1.sh"
echo "- scripts/deploy-phase1.sh"
echo ""
echo "🚀 Ready for Phase 1 Deployment!" 