#!/bin/bash
# OCI Deployment Verification Script
# Run this after deployment to verify everything is working

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "🔍 AI Trading System - OCI Deployment Verification"
echo "=================================================="
echo ""

# Function to check service
check_service() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    
    if curl -sf -m 10 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check docker container
check_container() {
    local name=$1
    
    echo -n "Checking container $name... "
    
    if docker ps | grep -q "$name"; then
        local status=$(docker inspect --format='{{.State.Status}}' "$name")
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓ Running${NC}"
            return 0
        else
            echo -e "${RED}✗ Not running (status: $status)${NC}"
            ((ERRORS++))
            return 1
        fi
    else
        echo -e "${RED}✗ Not found${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local name=$2
    
    echo -n "Checking port $port ($name)... "
    
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓ Open${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Not listening${NC}"
        ((WARNINGS++))
        return 1
    fi
}

echo "📦 Docker Containers:"
echo "--------------------"
check_container "ai-trading-backend"
check_container "ai-trading-frontend"
check_container "trading-redis"
check_container "trading-prometheus"
check_container "trading-grafana"
echo ""

echo "🌐 Network Ports:"
echo "----------------"
check_port "8000" "Backend API"
check_port "3000" "Frontend"
check_port "3001" "Grafana"
check_port "9090" "Prometheus"
check_port "6379" "Redis"
echo ""

echo "🔗 Service Health:"
echo "------------------"
check_service "Backend Health" "http://localhost:8000/api/health"
check_service "Frontend" "http://localhost:3000"
check_service "Grafana" "http://localhost:3001/api/health"
check_service "Prometheus" "http://localhost:9090/-/healthy"
echo ""

echo "📊 System Resources:"
echo "-------------------"

# Check memory
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
USED_MEM=$(free -g | awk '/^Mem:/{print $3}')
echo -n "Memory: ${USED_MEM}GB / ${TOTAL_MEM}GB used "
if [ "$USED_MEM" -lt $(($TOTAL_MEM * 80 / 100)) ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ High usage${NC}"
    ((WARNINGS++))
fi

# Check disk
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "Disk: ${DISK_USAGE}% used "
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}⚠ High usage${NC}"
    ((WARNINGS++))
fi

# Check CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo "CPU Load: $CPU_LOAD"

echo ""
echo "🔐 Configuration:"
echo "----------------"

cd ~/ai-trading-system 2>/dev/null || cd /root/ai-trading-system 2>/dev/null || cd .

if [ -f .env ]; then
    echo -n ".env file... ${GREEN}✓ Present${NC}"
    
    # Check for placeholder values
    if grep -q "your_.*_key_here" .env; then
        echo -e " ${YELLOW}⚠ Contains placeholder API keys${NC}"
        ((WARNINGS++))
    else
        echo ""
    fi
else
    echo -e ".env file... ${RED}✗ Missing${NC}"
    ((ERRORS++))
fi

echo ""
echo "📋 Summary:"
echo "----------"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is healthy.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  System is running but has $WARNINGS warning(s).${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check logs: docker compose logs"
    echo "2. Restart services: docker compose restart"
    echo "3. Verify .env configuration"
    echo "4. Check firewall rules"
    exit 1
fi
