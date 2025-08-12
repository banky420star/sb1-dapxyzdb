#!/bin/bash

# Autonomous Trading Bot Deployment Script
# This script helps deploy the complete autonomous trading system

set -e

echo "🚀 Autonomous Trading Bot Deployment"
echo "====================================="

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "railway-backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Update dependencies
print_status "Updating dependencies..."
cd railway-backend
npm ci
cd ..

# Step 2: Check environment files
print_status "Checking environment configuration..."

if [ ! -f "railway-backend/.env" ]; then
    print_warning "No .env file found in railway-backend/"
    print_status "Copying env.example to .env..."
    cp railway-backend/env.example railway-backend/.env
    print_warning "Please edit railway-backend/.env with your actual values"
fi

if [ ! -f ".env" ]; then
    print_warning "No .env file found in root/"
    print_status "Copying env.example to .env..."
    cp env.example .env
    print_warning "Please edit .env with your actual values"
fi

# Step 3: Run linting
print_status "Running linting checks..."
cd railway-backend
npm run lint || print_warning "Linting failed, but continuing..."
cd ..

# Step 4: Test the enhanced server
print_status "Testing enhanced server..."
cd railway-backend
if node -c enhanced-server.js; then
    print_success "Enhanced server syntax is valid"
else
    print_error "Enhanced server has syntax errors"
    exit 1
fi
cd ..

# Step 5: Check if Railway CLI is available
if command -v railway &> /dev/null; then
    print_status "Railway CLI found, checking deployment status..."
    
    # Check if we're logged in
    if railway whoami &> /dev/null; then
        print_success "Logged into Railway"
        
        # Check if we have a linked project
        if railway status &> /dev/null; then
            print_success "Railway project is linked"
            
            # Deploy to Railway
            print_status "Deploying to Railway..."
            railway up --service backend
            
            print_success "Deployment completed!"
            print_status "Your backend should be available at your Railway URL"
        else
            print_warning "No Railway project linked. Please run: railway link"
        fi
    else
        print_warning "Not logged into Railway. Please run: railway login"
    fi
else
    print_warning "Railway CLI not found. Please install it for automatic deployment."
    print_status "You can deploy manually by pushing to your GitHub repository."
fi

# Step 6: Check Netlify deployment
print_status "Checking Netlify deployment..."
if [ -f "netlify.toml" ]; then
    print_success "Netlify configuration found"
    print_status "Frontend will deploy automatically when pushed to GitHub"
else
    print_warning "No netlify.toml found. Frontend deployment may need manual setup."
fi

# Step 7: Final checks
print_status "Running final system checks..."

# Check if all required files exist
required_files=(
    "railway-backend/enhanced-server.js"
    "railway-backend/lib/bybitClient.js"
    "railway-backend/lib/consensusEngine.js"
    "src/lib/api.ts"
    "src/components/TradeTrigger.tsx"
    ".github/workflows/lint.yml"
    ".github/workflows/test.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ $file (missing)"
    fi
done

# Step 8: Display next steps
echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Edit railway-backend/.env with your Bybit API credentials"
echo "2. Edit .env with your Railway backend URL"
echo "3. Push changes to GitHub to trigger deployment"
echo "4. Monitor deployment in Railway and Netlify dashboards"
echo "5. Test the system with paper trading mode first"
echo ""
echo "🔗 Useful URLs:"
echo "==============="
echo "• Railway Dashboard: https://railway.app/dashboard"
echo "• Netlify Dashboard: https://app.netlify.com/"
echo "• Bybit Testnet: https://testnet.bybit.com/"
echo ""

print_success "Deployment script completed!"
print_status "Your autonomous trading bot is ready to deploy! 🚀" 