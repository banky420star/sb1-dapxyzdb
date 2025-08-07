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