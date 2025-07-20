#!/bin/bash

# Master Orchestrator for AI Trading System
# Manages deployment, monitoring, and operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-trading-system"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKEND_PORT=8000
FRONTEND_PORT=3000
MT5_PORT=5000

# Logging
LOG_FILE="orchestrator.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        info "Docker is available"
        DOCKER_AVAILABLE=true
    else
        warn "Docker is not available - will use direct deployment"
        DOCKER_AVAILABLE=false
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        error "git is not installed"
        exit 1
    fi
    
    log "System requirements check completed"
}

# Install dependencies
install_dependencies() {
    log "Installing project dependencies..."
    
    # Install frontend dependencies
    if [ -f "package.json" ]; then
        npm install
        log "Frontend dependencies installed"
    fi
    
    # Install backend dependencies
    if [ -d "server" ] && [ -f "server/package.json" ]; then
        cd server
        npm install
        cd ..
        log "Backend dependencies installed"
    fi
    
    log "Dependencies installation completed"
}

# Build the application
build_app() {
    log "Building the application..."
    
    # Build frontend
    if [ -f "vite.config.js" ]; then
        npm run build
        log "Frontend built successfully"
    fi
    
    # Build backend (if needed)
    if [ -d "server" ]; then
        log "Backend is ready for deployment"
    fi
    
    log "Application build completed"
}

# Start services
start_services() {
    log "Starting services..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        start_docker_services
    else
        start_direct_services
    fi
}

# Start Docker services
start_docker_services() {
    log "Starting Docker services..."
    
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        docker-compose up -d
        log "Docker services started"
    else
        error "Docker Compose file not found"
        exit 1
    fi
}

# Start direct services
start_direct_services() {
    log "Starting services directly..."
    
    # Start backend
    if [ -d "server" ]; then
        cd server
        nohup node index.js > ../backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../backend.pid
        cd ..
        log "Backend started with PID: $BACKEND_PID"
    fi
    
    # Start frontend
    if [ -f "package.json" ]; then
        nohup npm run dev > frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > frontend.pid
        log "Frontend started with PID: $FRONTEND_PID"
    fi
    
    log "Direct services started"
}

# Stop services
stop_services() {
    log "Stopping services..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        stop_docker_services
    else
        stop_direct_services
    fi
}

# Stop Docker services
stop_docker_services() {
    log "Stopping Docker services..."
    
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        docker-compose down
        log "Docker services stopped"
    fi
}

# Stop direct services
stop_direct_services() {
    log "Stopping direct services..."
    
    # Stop backend
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            log "Backend stopped"
        fi
        rm -f backend.pid
    fi
    
    # Stop frontend
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            log "Frontend stopped"
        fi
        rm -f frontend.pid
    fi
    
    log "Direct services stopped"
}

# Check service status
check_status() {
    log "Checking service status..."
    
    # Check backend
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log "Backend is running on port $BACKEND_PORT"
    else
        warn "Backend is not responding on port $BACKEND_PORT"
    fi
    
    # Check frontend
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log "Frontend is running on port $FRONTEND_PORT"
    else
        warn "Frontend is not responding on port $FRONTEND_PORT"
    fi
    
    # Check MT5 integration
    if curl -s http://localhost:$MT5_PORT/status > /dev/null 2>&1; then
        log "MT5 integration is running on port $MT5_PORT"
    else
        warn "MT5 integration is not responding on port $MT5_PORT"
    fi
    
    # Check Docker containers (if available)
    if [ "$DOCKER_AVAILABLE" = true ]; then
        log "Docker containers status:"
        docker-compose ps
    fi
}

# Monitor services
monitor_services() {
    log "Starting service monitoring..."
    
    while true; do
        check_status
        sleep 30
    done
}

# Deploy to cloud
deploy_cloud() {
    log "Deploying to cloud..."
    
    # Check for deployment scripts
    if [ -f "deploy-to-vultr.sh" ]; then
        log "Found Vultr deployment script"
        ./deploy-to-vultr.sh
    elif [ -f "deploy-to-railway.sh" ]; then
        log "Found Railway deployment script"
        ./deploy-to-railway.sh
    elif [ -f "deploy-to-render.sh" ]; then
        log "Found Render deployment script"
        ./deploy-to-render.sh
    else
        error "No deployment script found"
        exit 1
    fi
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Run frontend tests
    if [ -f "package.json" ] && npm run test > /dev/null 2>&1; then
        npm run test
        log "Frontend tests completed"
    fi
    
    # Run backend tests
    if [ -d "tests" ]; then
        cd tests
        npm test
        cd ..
        log "Backend tests completed"
    fi
    
    log "All tests completed"
}

# Backup data
backup_data() {
    log "Creating backup..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup server data
    if [ -d "server/data" ]; then
        cp -r server/data "$BACKUP_DIR/"
    fi
    
    # Backup configuration files
    cp *.env "$BACKUP_DIR/" 2>/dev/null || true
    cp *.json "$BACKUP_DIR/" 2>/dev/null || true
    
    log "Backup created in $BACKUP_DIR"
}

# Restore data
restore_data() {
    if [ -z "$1" ]; then
        error "Please specify backup directory"
        exit 1
    fi
    
    BACKUP_DIR="$1"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    log "Restoring from backup: $BACKUP_DIR"
    
    # Restore server data
    if [ -d "$BACKUP_DIR/data" ]; then
        cp -r "$BACKUP_DIR/data" server/
    fi
    
    # Restore configuration files
    cp "$BACKUP_DIR"/*.env . 2>/dev/null || true
    cp "$BACKUP_DIR"/*.json . 2>/dev/null || true
    
    log "Data restored from backup"
}

# Show logs
show_logs() {
    log "Showing recent logs..."
    
    echo "=== Backend Logs ==="
    tail -n 50 backend.log 2>/dev/null || echo "No backend logs found"
    
    echo -e "\n=== Frontend Logs ==="
    tail -n 50 frontend.log 2>/dev/null || echo "No frontend logs found"
    
    echo -e "\n=== Orchestrator Logs ==="
    tail -n 50 "$LOG_FILE" 2>/dev/null || echo "No orchestrator logs found"
}

# Clean up
cleanup() {
    log "Cleaning up..."
    
    # Stop services
    stop_services
    
    # Remove PID files
    rm -f backend.pid frontend.pid
    
    # Remove log files
    rm -f backend.log frontend.log
    
    log "Cleanup completed"
}

# Show help
show_help() {
    echo "AI Trading System Master Orchestrator"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     - Install dependencies"
    echo "  build       - Build the application"
    echo "  start       - Start all services"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  status      - Check service status"
    echo "  monitor     - Monitor services continuously"
    echo "  deploy      - Deploy to cloud"
    echo "  test        - Run tests"
    echo "  backup      - Create backup"
    echo "  restore     - Restore from backup (specify backup dir)"
    echo "  logs        - Show recent logs"
    echo "  cleanup     - Clean up temporary files"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 restore backups/20231201_143022"
}

# Main function
main() {
    case "${1:-help}" in
        install)
            check_root
            check_requirements
            install_dependencies
            ;;
        build)
            check_root
            build_app
            ;;
        start)
            check_root
            start_services
            ;;
        stop)
            check_root
            stop_services
            ;;
        restart)
            check_root
            stop_services
            sleep 2
            start_services
            ;;
        status)
            check_status
            ;;
        monitor)
            check_root
            monitor_services
            ;;
        deploy)
            check_root
            deploy_cloud
            ;;
        test)
            check_root
            run_tests
            ;;
        backup)
            check_root
            backup_data
            ;;
        restore)
            check_root
            restore_data "$2"
            ;;
        logs)
            show_logs
            ;;
        cleanup)
            check_root
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap signals
trap 'log "Received interrupt signal, cleaning up..."; cleanup; exit 0' INT TERM

# Run main function
main "$@" 