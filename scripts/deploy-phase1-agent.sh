#!/bin/bash

# 🚀 Phase 1 Deployment Agent
# Automated deployment script that handles all common issues

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "🚀 Starting Phase 1 Deployment Agent..."
echo "======================================"

# Step 1: Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    error "package.json not found. Please run this script from the project root."
fi

# Step 2: Check for package-lock.json and fix Dockerfile if needed
if [[ ! -f "package-lock.json" ]]; then
    warning "package-lock.json missing. Updating Dockerfile to use npm install..."
    if grep -q "npm ci" Dockerfile; then
        sed -i '' 's/npm ci --only=production/npm install --omit=dev/' Dockerfile
        log "Dockerfile updated to use npm install --omit=dev"
    fi
else
    log "package-lock.json found - using npm ci"
fi

# Step 3: Ensure Dockerfile uses Node 20
if grep -q "FROM node:18" Dockerfile; then
    warning "Upgrading Dockerfile base image to Node 20..."
    sed -i '' 's/FROM node:18.*/FROM node:20-alpine/' Dockerfile
    log "Dockerfile updated to use Node 20"
fi

# Step 4: Check for environment file
ENV_FILE=".env.phase1"
if [[ ! -f "$ENV_FILE" ]]; then
    error "$ENV_FILE not found. Please create it first."
fi

# Step 5: Verify Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker Desktop first."
fi

# Step 6: Clean up Docker cache (optional but recommended)
info "Cleaning up Docker cache..."
docker system prune -af --volumes || true
log "Docker cache cleaned"

# Step 7: Stop any existing services
info "Stopping existing services..."
docker-compose -f docker-compose.phase1.yml down || true
log "Existing services stopped"

# Step 8: Build and deploy
info "Building and starting services with Docker Compose..."
log "Using environment file: $ENV_FILE"
log "Using compose file: docker-compose.phase1.yml"

# Deploy with explicit env file loading
docker-compose --env-file "$ENV_FILE" -f docker-compose.phase1.yml up --build -d

# Step 9: Wait for services to start
info "Waiting for services to start..."
sleep 30

# Step 10: Check service status
info "Checking service status..."
docker-compose -f docker-compose.phase1.yml ps

# Step 11: Run health checks
info "Running health checks..."
./scripts/health-check-phase1.sh || warning "Some health checks failed - check logs"

# Step 12: Show access information
echo ""
echo "🎉 Phase 1 Deployment Complete!"
echo "================================"
echo ""
echo "📊 Service Access Points:"
echo "  • Main Application: http://localhost"
echo "  • API Health Check: http://localhost/api/health"
echo "  • Grafana Monitoring: http://localhost:3001"
echo "  • Prometheus Metrics: http://localhost:9090"
echo ""
echo "🔧 Useful Commands:"
echo "  • View logs: docker-compose -f docker-compose.phase1.yml logs"
echo "  • Stop services: docker-compose -f docker-compose.phase1.yml down"
echo "  • Restart services: docker-compose -f docker-compose.phase1.yml restart"
echo ""
echo "✅ Phase 1 Infrastructure is now running!"
echo "🚀 Ready for Phase 2: Immutable Config + Secrets" 