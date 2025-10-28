#!/bin/bash
# AI Trading System - Oracle Cloud Infrastructure Deployment Script
# Optimized for OCI Arm-based instances (VM.Standard.A1.Flex)

set -e

echo "🚀 Starting AI Trading System deployment on Oracle Cloud Infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on OCI
check_oci_environment() {
    print_status "Checking OCI environment..."
    
    if curl -s -m 5 http://169.254.169.254/opc/v1/instance/ > /dev/null 2>&1; then
        print_success "Running on Oracle Cloud Infrastructure"
        export IS_OCI=true
    else
        print_warning "Not running on OCI, but continuing anyway..."
        export IS_OCI=false
    fi
}

# Get OCI instance metadata
get_instance_info() {
    if [ "$IS_OCI" = true ]; then
        print_status "Fetching instance metadata..."
        export INSTANCE_ID=$(curl -s http://169.254.169.254/opc/v1/instance/id 2>/dev/null || echo "unknown")
        export INSTANCE_REGION=$(curl -s http://169.254.169.254/opc/v1/instance/region 2>/dev/null || echo "unknown")
        export PUBLIC_IP=$(curl -s http://169.254.169.254/opc/v1/instance/metadata | grep -oP '"publicIp":"\K[^"]+' 2>/dev/null || echo "unknown")
        
        print_success "Instance ID: $INSTANCE_ID"
        print_success "Region: $INSTANCE_REGION"
        print_success "Public IP: $PUBLIC_IP"
    fi
}

# Update system
update_system() {
    print_status "Updating system packages..."
    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq
    print_success "System updated"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    sudo apt-get install -y -qq \
        curl \
        wget \
        git \
        build-essential \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        iotop \
        nethogs \
        netfilter-persistent \
        iptables-persistent
    
    print_success "Dependencies installed"
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        print_success "Docker already installed"
        return
    fi
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed"
}

# Install Node.js
install_nodejs() {
    print_status "Installing Node.js 20 LTS..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js already installed: $NODE_VERSION"
        return
    fi
    
    # Install Node.js from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2 --silent
    
    print_success "Node.js installed: $(node -v)"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # OCI uses iptables by default
    # Add rules for application ports
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 9090 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5555 -j ACCEPT
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5556 -j ACCEPT
    
    # Save iptables rules
    sudo netfilter-persistent save
    
    print_success "Firewall configured"
}

# Setup application directory
setup_application() {
    print_status "Setting up application directory..."
    
    # Create app directory if it doesn't exist
    mkdir -p ~/ai-trading-system
    cd ~/ai-trading-system
    
    # Check if we're in a git repository
    if [ -d .git ]; then
        print_status "Pulling latest changes..."
        git pull
    else
        print_warning "Not a git repository. Please upload your application files manually."
        print_warning "Use: scp -r /local/path/* ubuntu@$PUBLIC_IP:~/ai-trading-system/"
    fi
    
    print_success "Application directory ready"
}

# Create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    cd ~/ai-trading-system
    
    if [ -f .env ]; then
        print_warning ".env file already exists. Backing up..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Get public IP for CORS configuration
    if [ "$IS_OCI" = true ] && [ "$PUBLIC_IP" != "unknown" ]; then
        CORS_ORIGINS="http://$PUBLIC_IP:3000,https://$PUBLIC_IP:3000"
    else
        CORS_ORIGINS="*"
    fi
    
    cat > .env << EOF
# AI Trading System - OCI Production Configuration
# Generated: $(date)

# =============================================================================
# CORE CONFIGURATION
# =============================================================================

NODE_ENV=production
PORT=8000
TRADING_MODE=paper

# =============================================================================
# API CREDENTIALS
# =============================================================================

# Bybit API (Get from: https://www.bybit.com/app/user/api-management)
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_SECRET=your_bybit_secret_here
BYBIT_RECV_WINDOW=5000

# Alpha Vantage (Get from: https://www.alphavantage.co/support/#api-key)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# =============================================================================
# RISK MANAGEMENT
# =============================================================================

MAX_POSITION_SIZE=0.1
MAX_TOTAL_EXPOSURE=0.5
MAX_LEVERAGE=10
DEFAULT_STOP_LOSS=0.02
DEFAULT_TAKE_PROFIT=0.04
MAX_DAILY_LOSS=0.05
MAX_DAILY_DRAWDOWN=0.1
MIN_MARGIN_LEVEL=1.5
MAX_VOLATILITY=0.05
MAX_CORRELATED_EXPOSURE=0.3

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ORIGINS=$CORS_ORIGINS

# =============================================================================
# MONITORING
# =============================================================================

MAX_API_LATENCY=5000
MAX_MEMORY_USAGE=0.8
MAX_CPU_USAGE=0.9
MAX_ORDER_LATENCY=3000
MAX_SLIPPAGE=0.005
MAX_FAILED_ORDERS=5
MAX_ERROR_RATE=0.05
MAX_CONCURRENT_CONNECTIONS=100
ALERT_COOLDOWN=300000

# =============================================================================
# FEATURE FLAGS
# =============================================================================

ENABLE_AUTONOMOUS_TRADING=false
ENABLE_NOTIFICATIONS=true
ENABLE_MONITORING=true
ENABLE_RISK_MANAGEMENT=true
ENABLE_DETAILED_LOGGING=true

# =============================================================================
# LOGGING
# =============================================================================

LOG_LEVEL=info

# =============================================================================
# SECURITY
# =============================================================================

JWT_SECRET=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 32)

# =============================================================================
# OCI METADATA
# =============================================================================

OCI_INSTANCE_ID=$INSTANCE_ID
OCI_REGION=$INSTANCE_REGION
OCI_PUBLIC_IP=$PUBLIC_IP
EOF
    
    print_success "Environment file created"
    print_warning "⚠️  IMPORTANT: Edit .env and add your API keys!"
}

# Install npm dependencies
install_npm_packages() {
    print_status "Installing npm dependencies..."
    
    cd ~/ai-trading-system
    
    if [ -f package.json ]; then
        npm install --omit=dev
        print_success "Dependencies installed"
    else
        print_error "package.json not found! Please upload application files."
        return 1
    fi
}

# Build application
build_application() {
    print_status "Building application..."
    
    cd ~/ai-trading-system
    
    if [ -f package.json ]; then
        npm run build 2>/dev/null || print_warning "Build script not found or failed"
        print_success "Application built"
    fi
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    
    cd ~/ai-trading-system
    
    if [ -f docker-compose.yml ]; then
        # Stop existing containers
        docker compose down 2>/dev/null || true
        
        # Start services
        docker compose up -d
        
        print_success "Services started"
    else
        print_error "docker-compose.yml not found!"
        return 1
    fi
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to initialize..."
    
    sleep 10
    
    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            print_success "Backend is ready"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_warning "Backend health check timeout"
}

# Display deployment information
display_info() {
    echo ""
    echo "=================================="
    echo "✅  DEPLOYMENT COMPLETE!"
    echo "=================================="
    echo ""
    
    if [ "$IS_OCI" = true ] && [ "$PUBLIC_IP" != "unknown" ]; then
        echo "🌐 Your AI Trading System is now live at:"
        echo ""
        echo "   📊 Dashboard:   http://$PUBLIC_IP:3000"
        echo "   🔧 API:         http://$PUBLIC_IP:8000"
        echo "   💓 Health:      http://$PUBLIC_IP:8000/api/health"
        echo "   📈 Monitoring:  http://$PUBLIC_IP:3001"
        echo "      (Login: admin / admin123)"
        echo ""
    else
        echo "🌐 Your AI Trading System services:"
        echo ""
        echo "   📊 Dashboard:   http://localhost:3000"
        echo "   🔧 API:         http://localhost:8000"
        echo "   💓 Health:      http://localhost:8000/api/health"
        echo "   📈 Monitoring:  http://localhost:3001"
        echo ""
    fi
    
    echo "📝 Next steps:"
    echo ""
    echo "   1. Edit .env file and add your API keys:"
    echo "      nano ~/ai-trading-system/.env"
    echo ""
    echo "   2. Restart services after updating .env:"
    echo "      cd ~/ai-trading-system && docker compose restart"
    echo ""
    echo "   3. View logs:"
    echo "      docker logs ai-trading-backend -f"
    echo ""
    echo "   4. Set up SSL certificate (optional):"
    echo "      See ORACLE_CLOUD_DEPLOYMENT_GUIDE.md"
    echo ""
    echo "   5. Configure monitoring and alerts"
    echo ""
    
    if [ "$IS_OCI" = true ]; then
        echo "🎯 OCI Instance Information:"
        echo "   Instance ID: $INSTANCE_ID"
        echo "   Region: $INSTANCE_REGION"
        echo "   Public IP: $PUBLIC_IP"
        echo ""
    fi
    
    echo "📚 Documentation:"
    echo "   ~/ai-trading-system/ORACLE_CLOUD_DEPLOYMENT_GUIDE.md"
    echo ""
    echo "🚀 Happy Trading! 💰"
    echo ""
}

# Main deployment flow
main() {
    echo ""
    echo "🌟 AI Trading System - OCI Deployment"
    echo "======================================"
    echo ""
    
    check_oci_environment
    get_instance_info
    update_system
    install_dependencies
    install_docker
    install_nodejs
    configure_firewall
    setup_application
    create_env_file
    install_npm_packages
    build_application
    start_services
    wait_for_services
    display_info
}

# Run main function
main

exit 0
