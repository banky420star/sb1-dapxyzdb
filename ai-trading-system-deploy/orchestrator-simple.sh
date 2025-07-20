#!/bin/bash

# Simple AI Trading System Orchestrator
# Loads configuration and provides essential commands

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load configuration
if [ -f "orchestrator.config" ]; then
    source orchestrator.config
else
    echo -e "${RED}Configuration file not found. Please run setup first.${NC}"
    exit 1
fi

# Logging
LOG_FILE="orchestrator.log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

# Quick commands
case "${1:-help}" in
    setup)
        log "Setting up AI Trading System..."
        npm install
        cd server && npm install && cd ..
        log "Setup completed"
        ;;
    dev)
        log "Starting development environment..."
        npm run dev &
        cd server && node index.js &
        cd ..
        log "Development environment started"
        ;;
    build)
        log "Building application..."
        npm run build
        log "Build completed"
        ;;
    start)
        log "Starting production services..."
        npm run build
        cd server && node index.js &
        cd ..
        log "Production services started"
        ;;
    stop)
        log "Stopping services..."
        pkill -f "node index.js" || true
        pkill -f "npm run dev" || true
        log "Services stopped"
        ;;
    status)
        log "Checking service status..."
        echo "Backend: $(curl -s http://localhost:$BACKEND_PORT/health > /dev/null && echo "Running" || echo "Stopped")"
        echo "Frontend: $(curl -s http://localhost:$FRONTEND_PORT > /dev/null && echo "Running" || echo "Stopped")"
        ;;
    deploy)
        log "Deploying to $DEFAULT_DEPLOYMENT_TARGET..."
        case $DEFAULT_DEPLOYMENT_TARGET in
            vultr)
                ./deploy-to-vultr.sh
                ;;
            railway)
                ./deploy-to-railway.sh
                ;;
            render)
                ./deploy-to-render.sh
                ;;
            *)
                error "Unknown deployment target: $DEFAULT_DEPLOYMENT_TARGET"
                ;;
        esac
        ;;
    logs)
        log "Showing recent logs..."
        tail -n 50 "$LOG_FILE" 2>/dev/null || echo "No logs found"
        ;;
    help|--help|-h)
        echo "AI Trading System - Quick Commands"
        echo ""
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  setup   - Install dependencies"
        echo "  dev     - Start development environment"
        echo "  build   - Build for production"
        echo "  start   - Start production services"
        echo "  stop    - Stop all services"
        echo "  status  - Check service status"
        echo "  deploy  - Deploy to configured target"
        echo "  logs    - Show recent logs"
        echo "  help    - Show this help"
        ;;
    *)
        error "Unknown command: $1"
        echo "Run '$0 help' for available commands"
        exit 1
        ;;
esac 