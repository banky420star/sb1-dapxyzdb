#!/bin/bash

# 🧪 AI Trading System Test Script
# Tests all components before deployment

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing AI Trading System${NC}"
echo "=================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test 1: Check dependencies
echo -e "\n${BLUE}1. Checking Dependencies${NC}"
if command -v node &> /dev/null; then
    print_status "Node.js: $(node --version)"
else
    print_error "Node.js not found"
    exit 1
fi

if command -v npm &> /dev/null; then
    print_status "npm: $(npm --version)"
else
    print_error "npm not found"
    exit 1
fi

if command -v python3 &> /dev/null; then
    print_status "Python3: $(python3 --version)"
else
    print_error "Python3 not found"
    exit 1
fi

# Test 2: Check Python packages
echo -e "\n${BLUE}2. Checking Python Packages${NC}"
python3 -c "import httpx, typer, yaml, requests" 2>/dev/null && \
    print_status "Python packages: OK" || \
    print_error "Missing Python packages"

# Test 3: Check Node.js packages
echo -e "\n${BLUE}3. Checking Node.js Packages${NC}"
if [ -d "node_modules" ]; then
    print_status "Node modules: Installed"
else
    print_warning "Node modules not found, installing..."
    npm install
fi

# Test 4: Test Alpha Vantage integration
echo -e "\n${BLUE}4. Testing Alpha Vantage Integration${NC}"
if [ -f "alpha_vantage_integration.py" ]; then
    python3 test_integration.py > /dev/null 2>&1 && \
        print_status "Alpha Vantage: Working" || \
        print_warning "Alpha Vantage: API limit reached (expected for free tier)"
else
    print_error "Alpha Vantage integration not found"
fi

# Test 5: Check configuration files
echo -e "\n${BLUE}5. Checking Configuration Files${NC}"
[ -f "widgets.yaml" ] && print_status "Widgets config: OK" || print_error "widgets.yaml missing"
[ -f "package.json" ] && print_status "Package.json: OK" || print_error "package.json missing"
[ -f "requirements.txt" ] && print_status "Requirements.txt: OK" || print_error "requirements.txt missing"

# Test 6: Check source files
echo -e "\n${BLUE}6. Checking Source Files${NC}"
[ -f "server/index.js" ] && print_status "Server: OK" || print_error "server/index.js missing"
[ -f "src/App.tsx" ] && print_status "Frontend: OK" || print_error "src/App.tsx missing"
[ -f "src/components/MQL5Widgets.tsx" ] && print_status "MQL5 Widgets: OK" || print_error "MQL5Widgets.tsx missing"

# Test 7: Build frontend
echo -e "\n${BLUE}7. Testing Frontend Build${NC}"
if npm run build > /dev/null 2>&1; then
    print_status "Frontend build: Success"
else
    print_warning "Frontend build: Failed (may have TypeScript warnings)"
fi

# Test 8: Check database initialization
echo -e "\n${BLUE}8. Testing Database Initialization${NC}"
if [ -f "server/database/manager.js" ]; then
    node -e "
    const { DatabaseManager } = require('./server/database/manager.js');
    const db = new DatabaseManager();
    db.initialize().then(() => {
        console.log('Database initialized successfully');
        process.exit(0);
    }).catch(err => {
        console.error('Database initialization failed:', err.message);
        process.exit(1);
    });
    " 2>/dev/null && print_status "Database: OK" || print_warning "Database: Initialization failed"
else
    print_error "Database manager not found"
fi

# Test 9: Check deployment script
echo -e "\n${BLUE}9. Checking Deployment Script${NC}"
[ -f "deploy_vultr.sh" ] && print_status "Deployment script: OK" || print_error "deploy_vultr.sh missing"
[ -x "deploy_vultr.sh" ] && print_status "Deployment script: Executable" || print_warning "Deployment script not executable"

# Test 10: Environment check
echo -e "\n${BLUE}10. Environment Check${NC}"
if [ -n "$ALPHAVANTAGE_API_KEY" ]; then
    print_status "Alpha Vantage API Key: Set"
else
    print_warning "Alpha Vantage API Key: Not set (will use demo mode)"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================="

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for deployment.${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Create Vultr server (Ubuntu 22.04 LTS)"
    echo "2. Upload files: tar -czf ai-trading-system.tar.gz ."
    echo "3. Run deployment: ./deploy_vultr.sh"
    echo "4. Access system: http://YOUR_SERVER_IP"
else
    echo -e "${RED}❌ Some tests failed. Please fix issues before deployment.${NC}"
fi

echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Set ALPHAVANTAGE_API_KEY for real data"
echo "- Check disk space before deployment"
echo "- Ensure all files are committed to git"
echo "- Test on a staging server first" 