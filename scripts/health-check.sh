#!/bin/bash
# health-check.sh - Complete AI Trading System Health Check
# Based on Ops/Runbook.md specifications

echo "=== AI TRADING SYSTEM HEALTH CHECK ==="
echo "Timestamp: $(date)"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Exit codes
EXIT_CODE=0

# Function to check service health
check_service() {
    local service_name="$1"
    local check_command="$2"
    local expected_pattern="$3"
    
    echo -n "Checking $service_name: "
    
    if eval "$check_command" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Function to check numeric threshold
check_threshold() {
    local metric_name="$1"
    local current_value="$2"
    local threshold="$3"
    local comparison="$4" # "lt" for less than, "gt" for greater than
    
    echo -n "Checking $metric_name ($current_value): "
    
    if [[ "$comparison" == "lt" ]]; then
        if (( $(echo "$current_value < $threshold" | bc -l) )); then
            echo -e "${GREEN}✅ PASS${NC} (< $threshold)"
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (>= $threshold)"
            return 1
        fi
    elif [[ "$comparison" == "gt" ]]; then
        if (( $(echo "$current_value > $threshold" | bc -l) )); then
            echo -e "${GREEN}✅ PASS${NC} (> $threshold)"
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (<= $threshold)"
            return 1
        fi
    fi
}

echo "🔍 CORE SERVICES HEALTH"
echo "------------------------"

# API Health Check
if check_service "API Health" "curl -s http://localhost:8000/api/health" "ok"; then
    echo "   ├─ API responding properly"
else
    echo "   ├─ API not responding"
    EXIT_CODE=1
fi

# Database Check
if check_service "Database" "curl -s http://localhost:8000/api/status" "connected"; then
    echo "   ├─ Database connected"
else
    echo "   ├─ Database connection failed"
    EXIT_CODE=1
fi

# Trading System Status
if check_service "Trading System" "curl -s http://localhost:8000/api/status" "paper mode"; then
    echo "   ├─ Trading system operational (paper mode)"
else
    echo "   ├─ Trading system status unknown"
    EXIT_CODE=1
fi

# Model Status
if check_service "ML Models" "curl -s http://localhost:8000/api/models" "ready"; then
    echo "   └─ ML models loaded and ready"
else
    echo "   └─ ML models not ready"
    EXIT_CODE=1
fi

echo ""
echo "📊 SYSTEM RESOURCES"
echo "-------------------"

# CPU Usage Check
CPU_USAGE=$(top -l 1 -n 0 | awk '/CPU usage/ {print $3}' | sed 's/%//')
if [[ -n "$CPU_USAGE" ]]; then
    check_threshold "CPU Usage" "$CPU_USAGE" "85" "lt" || EXIT_CODE=1
else
    echo "❌ Could not determine CPU usage"
    EXIT_CODE=1
fi

# Memory Usage Check
MEMORY_USAGE=$(vm_stat | awk '/Pages active/ {active=$3} /Pages inactive/ {inactive=$3} /Pages speculative/ {speculative=$3} /Pages wired/ {wired=$4} /Pages free/ {free=$3} END {total_used=active+inactive+speculative+wired; total=total_used+free; print (total_used/total)*100}' | cut -d. -f1)
if [[ -n "$MEMORY_USAGE" ]]; then
    check_threshold "Memory Usage" "$MEMORY_USAGE" "90" "lt" || EXIT_CODE=1
else
    echo "❌ Could not determine memory usage"
    EXIT_CODE=1
fi

# Disk Usage Check
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
check_threshold "Disk Usage" "$DISK_USAGE" "90" "lt" || EXIT_CODE=1

echo ""
echo "🌐 NETWORK CONNECTIVITY"
echo "----------------------"

# External API Connectivity
if check_service "Alpha Vantage API" "curl -s --max-time 10 https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo" "Global Quote"; then
    echo "   ├─ Alpha Vantage reachable"
else
    echo -e "   ├─ ${YELLOW}⚠️ WARN${NC} Alpha Vantage unreachable (may affect real data)"
fi

# Internal API Response Time
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/api/health)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
check_threshold "API Response Time" "$RESPONSE_MS" "2000" "lt" || EXIT_CODE=1

echo ""
echo "💹 TRADING METRICS"
echo "-----------------"

# Check trading data
TRADES_RESPONSE=$(curl -s http://localhost:8000/api/trades)
if echo "$TRADES_RESPONSE" | grep -q "EURUSD\|GBPUSD"; then
    echo -e "Trading Data: ${GREEN}✅ PASS${NC} (sample trades available)"
else
    echo -e "Trading Data: ${YELLOW}⚠️ WARN${NC} (no sample trades found)"
fi

# Check price data
PRICES_RESPONSE=$(curl -s http://localhost:8000/api/prices)
if echo "$PRICES_RESPONSE" | grep -q "EURUSD.*price"; then
    echo -e "Price Data: ${GREEN}✅ PASS${NC} (live prices available)"
    # Extract EURUSD price for validation
    EURUSD_PRICE=$(echo "$PRICES_RESPONSE" | grep -o '"EURUSD":{"price":[0-9.]*' | grep -o '[0-9.]*$')
    if [[ -n "$EURUSD_PRICE" ]]; then
        echo "   └─ Current EURUSD: $EURUSD_PRICE"
    fi
else
    echo -e "Price Data: ${RED}❌ FAIL${NC} (no price data)"
    EXIT_CODE=1
fi

echo ""
echo "🛡️ SECURITY & COMPLIANCE"
echo "------------------------"

# Check trading mode (should be paper)
TRADING_MODE=$(curl -s http://localhost:8000/api/status | grep -o '"trading":"[^"]*"' | cut -d'"' -f4)
if [[ "$TRADING_MODE" == "paper mode" ]]; then
    echo -e "Trading Mode: ${GREEN}✅ PASS${NC} (paper mode - safe)"
else
    echo -e "Trading Mode: ${RED}❌ CRITICAL${NC} (not in paper mode!)"
    EXIT_CODE=2 # Critical error
fi

# Check for proper error handling
ERROR_RESPONSE=$(curl -s http://localhost:8000/api/nonexistent)
if echo "$ERROR_RESPONSE" | grep -q "Cannot GET"; then
    echo -e "Error Handling: ${GREEN}✅ PASS${NC} (proper 404 responses)"
else
    echo -e "Error Handling: ${YELLOW}⚠️ WARN${NC} (unexpected error format)"
fi

echo ""
echo "📱 PROCESS MONITORING"
echo "--------------------"

# Check for running Node.js processes
NODE_PROCESSES=$(ps aux | grep -E "node.*start-simple" | grep -v grep | wc -l)
if [[ "$NODE_PROCESSES" -gt 0 ]]; then
    echo -e "Node.js Process: ${GREEN}✅ PASS${NC} ($NODE_PROCESSES process(es) running)"
    ps aux | grep -E "node.*start-simple" | grep -v grep | while read line; do
        echo "   └─ $line"
    done
else
    echo -e "Node.js Process: ${RED}❌ FAIL${NC} (no Node.js processes found)"
    EXIT_CODE=1
fi

# Check process uptime
PROCESS_PID=$(ps aux | grep -E "node.*start-simple" | grep -v grep | awk '{print $2}' | head -1)
if [[ -n "$PROCESS_PID" ]]; then
    PROCESS_START=$(ps -o lstart= -p "$PROCESS_PID" 2>/dev/null)
    if [[ -n "$PROCESS_START" ]]; then
        echo "   └─ Process started: $PROCESS_START"
    fi
fi

echo ""
echo "📁 FILE SYSTEM CHECKS"
echo "---------------------"

# Check critical files exist
CRITICAL_FILES=(
    "package.json"
    "start-simple.js"
    "server/index.js"
    "dist/index.html"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "$file: ${GREEN}✅ EXISTS${NC}"
    else
        echo -e "$file: ${RED}❌ MISSING${NC}"
        EXIT_CODE=1
    fi
done

# Check log directory
if [[ -d "logs" ]]; then
    LOG_COUNT=$(ls -1 logs/*.log 2>/dev/null | wc -l)
    echo -e "Log Directory: ${GREEN}✅ EXISTS${NC} ($LOG_COUNT log files)"
else
    echo -e "Log Directory: ${YELLOW}⚠️ WARN${NC} (no logs directory)"
fi

echo ""
echo "🔧 CONFIGURATION VALIDATION"
echo "---------------------------"

# Check environment configuration
if [[ -f ".env" ]]; then
    echo -e "Environment File: ${GREEN}✅ EXISTS${NC}"
    
    # Check critical env variables
    if grep -q "TRADING_MODE=paper" .env; then
        echo -e "   ├─ Trading Mode: ${GREEN}✅ PAPER${NC}"
    else
        echo -e "   ├─ Trading Mode: ${RED}❌ NOT PAPER${NC}"
        EXIT_CODE=2
    fi
    
    if grep -q "NODE_ENV=" .env; then
        NODE_ENV=$(grep "NODE_ENV=" .env | cut -d'=' -f2)
        echo -e "   └─ Node Environment: ${GREEN}✅ $NODE_ENV${NC}"
    fi
else
    echo -e "Environment File: ${RED}❌ MISSING${NC}"
    EXIT_CODE=1
fi

echo ""
echo "========================================"
echo "🏁 HEALTH CHECK SUMMARY"
echo "========================================"

if [[ $EXIT_CODE -eq 0 ]]; then
    echo -e "Overall Status: ${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
    echo "All checks passed successfully!"
elif [[ $EXIT_CODE -eq 1 ]]; then
    echo -e "Overall Status: ${YELLOW}⚠️ WARNINGS DETECTED${NC}"
    echo "Some non-critical issues found. System operational but needs attention."
elif [[ $EXIT_CODE -eq 2 ]]; then
    echo -e "Overall Status: ${RED}❌ CRITICAL ISSUES${NC}"
    echo "Critical security or operational issues detected!"
fi

echo ""
echo "Next Steps:"
echo "- Review any failed checks above"
echo "- Check logs in /logs directory"
echo "- Consult Ops/Runbook.md for troubleshooting"
echo "- Monitor system performance dashboards"

echo ""
echo "Quick Access URLs:"
echo "- Health: http://localhost:8000/api/health"
echo "- Status: http://localhost:8000/api/status"
echo "- Dashboard: http://localhost:8000"

exit $EXIT_CODE 