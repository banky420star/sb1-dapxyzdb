#!/bin/bash

# Simple health check script for Phase 1 infrastructure

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

# Main execution
main() {
    echo "🔍 Starting Phase 1 health check..."
    echo "=================================="
    
    check_docker_services
    echo ""
    check_api_endpoints
    echo ""
    
    log "Health check completed"
}

main "$@" 