#!/bin/bash

# AI Trading System - Production Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="ai-trading-system"
COMPOSE_FILE="docker-compose.yml"

echo -e "${BLUE}🚀 AI Trading System - Production Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}📋 Checking Prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_status "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_status "Docker Compose found"
    
    # Check .env file
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from template..."
        cp .env.production .env
    fi
    print_status "Environment configuration ready"
}

# Build Docker images
build_images() {
    echo -e "\n${BLUE}🔨 Building Docker Images...${NC}"
    
    docker-compose build --no-cache
    print_status "Docker images built successfully"
}

# Setup environment
setup_environment() {
    echo -e "\n${BLUE}⚙️  Setting up Environment...${NC}"
    
    # Create directories
    mkdir -p data logs models config nginx/ssl monitoring/grafana
    
    # Set permissions
    chmod 755 data logs models config
    
    print_status "Environment directories created"
}

# Train ML Models
train_models() {
    echo -e "\n${BLUE}🧠 Training ML Models...${NC}"
    
    if [ ! -d "models" ] || [ -z "$(ls -A models)" ]; then
        print_warning "No trained models found, training now..."
        
        # Start temporary container to train models
        docker-compose run --rm trading-backend npm run train setup
        docker-compose run --rm trading-backend npm run train collect
        docker-compose run --rm trading-backend npm run train train
        
        print_status "ML models trained successfully"
    else
        print_status "ML models already exist"
    fi
}

# Deploy services
deploy_services() {
    echo -e "\n${BLUE}🚀 Deploying Services...${NC}"
    
    # Stop existing services
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    print_status "Services deployed successfully"
}

# Health check
health_check() {
    echo -e "\n${BLUE}🏥 Running Health Checks...${NC}"
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        print_status "Backend service is healthy"
    else
        print_error "Backend service health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend service is healthy"
    else
        print_warning "Frontend service might still be starting up"
    fi
    
    # Check monitoring
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        print_status "Monitoring service is healthy"
    else
        print_warning "Monitoring service might still be starting up"
    fi
}

# Setup SSL (optional)
setup_ssl() {
    if [ "$2" = "--ssl" ]; then
        echo -e "\n${BLUE}🔒 Setting up SSL...${NC}"
        
        # Generate self-signed certificate for testing
        if [ ! -f nginx/ssl/cert.pem ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/key.pem \
                -out nginx/ssl/cert.pem \
                -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
            
            print_status "SSL certificates generated"
        fi
    fi
}

# Show deployment info
show_deployment_info() {
    echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
    echo -e "${GREEN}======================${NC}"
    echo
    echo -e "${BLUE}📊 Service URLs:${NC}"
    echo "• Trading Dashboard: http://localhost:3000"
    echo "• API Backend: http://localhost:8000"
    echo "• Health Check: http://localhost:8000/api/health"
    echo "• Monitoring (Grafana): http://localhost:3001 (admin/admin123)"
    echo "• Metrics (Prometheus): http://localhost:9090"
    echo
    echo -e "${BLUE}🔌 ZeroMQ Ports (for MT5):${NC}"
    echo "• Command Port: 5555"
    echo "• Data Port: 5556"
    echo
    echo -e "${BLUE}📋 Management Commands:${NC}"
    echo "• View logs: docker-compose logs -f"
    echo "• Restart services: docker-compose restart"
    echo "• Stop services: docker-compose down"
    echo "• Update services: ./deploy.sh"
    echo
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "• Make sure your MT5 EA is configured to connect to ports 5555/5556"
    echo "• Monitor the system for 24 hours before live trading"
    echo "• Check logs regularly: docker-compose logs trading-backend"
    echo "• Set up firewall rules for production environment"
}

# Backup function
backup_data() {
    if [ "$1" = "backup" ]; then
        echo -e "\n${BLUE}💾 Creating Backup...${NC}"
        
        BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p $BACKUP_DIR
        
        cp -r data models logs $BACKUP_DIR/
        tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
        rm -rf $BACKUP_DIR
        
        print_status "Backup created: $BACKUP_DIR.tar.gz"
        return 0
    fi
}

# Main deployment process
main() {
    # Handle backup command
    backup_data $1 && exit 0
    
    # Check for help
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Usage: $0 [environment] [options]"
        echo
        echo "Environments:"
        echo "  production    Production deployment (default)"
        echo "  development   Development deployment"
        echo
        echo "Options:"
        echo "  --ssl         Setup SSL certificates"
        echo "  backup        Create backup of data and models"
        echo "  --help        Show this help message"
        echo
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    setup_environment
    setup_ssl $@
    build_images
    train_models
    deploy_services
    health_check
    show_deployment_info
}

# Run main function
main $@