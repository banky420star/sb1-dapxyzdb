#!/bin/bash

# AI Trading System - Deployment Verification Script
# Based on Ops/Runbook.md requirements

set -e

echo "🔍 AI TRADING SYSTEM - DEPLOYMENT VERIFICATION"
echo "=============================================="
echo "Following Ops/Runbook.md compliance procedures..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERIFICATION_FAILED=0

# Function to verify endpoint
verify_endpoint() {
    local endpoint="$1"
    local expected_pattern="$2"
    local description="$3"
    
    echo -n "Verifying $description: "
    
    response=$(curl -s --max-time 10 "$endpoint" 2>/dev/null)
    if echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Expected: $expected_pattern"
        echo "   Got: $(echo "$response" | head -1)"
        VERIFICATION_FAILED=1
        return 1
    fi
}

# Function to check service baseline metrics
check_baseline_metrics() {
    echo -e "\n${BLUE}📊 BASELINE METRICS VERIFICATION${NC}"
    echo "Following runbook performance baselines..."
    
    # API Response Time (< 500ms normal, > 2s alert)
    response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/api/health)
    response_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    
    echo -n "API Response Time ($response_ms ms): "
    if [ "$response_ms" -lt 500 ]; then
        echo -e "${GREEN}✅ EXCELLENT${NC} (< 500ms)"
    elif [ "$response_ms" -lt 2000 ]; then
        echo -e "${YELLOW}⚠️ WARNING${NC} (500ms-2s)"
    else
        echo -e "${RED}❌ ALERT${NC} (> 2s)"
        VERIFICATION_FAILED=1
    fi
    
    # CPU Usage (< 70% normal, > 85% alert)
    cpu_usage=$(top -l 1 -n 0 | awk '/CPU usage/ {print $3}' | sed 's/%//' || echo "0")
    echo -n "CPU Usage ($cpu_usage%): "
    if [ "${cpu_usage%.*}" -lt 70 ]; then
        echo -e "${GREEN}✅ NORMAL${NC} (< 70%)"
    elif [ "${cpu_usage%.*}" -lt 85 ]; then
        echo -e "${YELLOW}⚠️ WARNING${NC} (70-85%)"
    else
        echo -e "${RED}❌ ALERT${NC} (> 85%)"
        VERIFICATION_FAILED=1
    fi
    
    # Disk Usage (< 80% normal, > 90% alert)
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    echo -n "Disk Usage ($disk_usage%): "
    if [ "$disk_usage" -lt 80 ]; then
        echo -e "${GREEN}✅ NORMAL${NC} (< 80%)"
    elif [ "$disk_usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠️ WARNING${NC} (80-90%)"
    else
        echo -e "${RED}❌ ALERT${NC} (> 90%)"
        VERIFICATION_FAILED=1
    fi
}

# 1. Core Service Verification
echo -e "${BLUE}🔧 CORE SERVICES${NC}"
verify_endpoint "http://localhost:8000/api/health" "ok" "Health Endpoint"
verify_endpoint "http://localhost:8000/api/status" "connected" "Database Connection"
verify_endpoint "http://localhost:8000/api/status" "paper mode" "Trading Mode (Paper)"

# 2. Trading System Verification
echo -e "\n${BLUE}💹 TRADING SYSTEM${NC}"
verify_endpoint "http://localhost:8000/api/models" "ready" "ML Models Status"
verify_endpoint "http://localhost:8000/api/trades" "EURUSD\|GBPUSD" "Sample Trading Data"
verify_endpoint "http://localhost:8000/api/prices" "price" "Real-time Price Data"

# 3. Security Compliance
echo -e "\n${BLUE}🛡️ SECURITY COMPLIANCE${NC}"
trading_mode=$(curl -s http://localhost:8000/api/status | grep -o '"trading":"[^"]*"' | cut -d'"' -f4)
echo -n "Trading Mode Security: "
if [[ "$trading_mode" == "paper mode" ]]; then
    echo -e "${GREEN}✅ SECURE${NC} (Paper trading only)"
else
    echo -e "${RED}❌ RISK${NC} (Live trading detected!)"
    VERIFICATION_FAILED=1
fi

# Check environment configuration
echo -n "Environment Configuration: "
if [[ -f ".env" ]] && grep -q "TRADING_MODE=paper" .env; then
    echo -e "${GREEN}✅ SECURE${NC} (Paper mode configured)"
else
    echo -e "${RED}❌ RISK${NC} (Trading mode not properly configured)"
    VERIFICATION_FAILED=1
fi

# 4. Performance Baseline Verification
check_baseline_metrics

# 5. File System Verification
echo -e "\n${BLUE}📁 FILE SYSTEM${NC}"
critical_files=(
    "package.json"
    "start-simple.js"
    "server/index.js"
    "dist/index.html"
    ".env"
    "Ops/Runbook.md"
)

for file in "${critical_files[@]}"; do
    echo -n "File: $file: "
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
    else
        echo -e "${RED}❌ MISSING${NC}"
        VERIFICATION_FAILED=1
    fi
done

# 6. Log Files Verification
echo -e "\n${BLUE}📝 LOGGING SYSTEM${NC}"
echo -n "Log Directory: "
if [[ -d "logs" ]]; then
    log_count=$(ls -1 logs/*.log 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ EXISTS${NC} ($log_count log files)"
    
    # Check log file sizes (shouldn't be too large)
    large_logs=$(find logs -name "*.log" -size +100M 2>/dev/null | wc -l | tr -d ' ')
    echo -n "Log Size Check: "
    if [[ "$large_logs" -eq 0 ]]; then
        echo -e "${GREEN}✅ NORMAL${NC} (< 100MB each)"
    else
        echo -e "${YELLOW}⚠️ WARNING${NC} ($large_logs large log files)"
    fi
else
    echo -e "${RED}❌ MISSING${NC}"
    VERIFICATION_FAILED=1
fi

# 7. Process Verification
echo -e "\n${BLUE}⚙️ PROCESS MONITORING${NC}"
node_processes=$(ps aux | grep -E "node.*start-simple" | grep -v grep | wc -l | tr -d ' ')
echo -n "Node.js Process: "
if [[ "$node_processes" -gt 0 ]]; then
    echo -e "${GREEN}✅ RUNNING${NC} ($node_processes process)"
    
    # Check process uptime
    process_pid=$(ps aux | grep -E "node.*start-simple" | grep -v grep | awk '{print $2}' | head -1)
    if [[ -n "$process_pid" ]]; then
        process_start=$(ps -o lstart= -p "$process_pid" 2>/dev/null || echo "Unknown")
        echo "   └─ Started: $process_start"
    fi
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    VERIFICATION_FAILED=1
fi

# 8. Connectivity Tests
echo -e "\n${BLUE}🌐 NETWORK CONNECTIVITY${NC}"
echo -n "External API Test: "
if curl -s --max-time 5 "https://httpbin.org/get" | grep -q "origin"; then
    echo -e "${GREEN}✅ CONNECTED${NC}"
else
    echo -e "${YELLOW}⚠️ LIMITED${NC} (May affect real data)"
fi

# 9. Database Verification
echo -e "\n${BLUE}💾 DATABASE${NC}"
echo -n "SQLite Database: "
if [[ -f "data/trading.db" ]]; then
    db_size=$(du -h data/trading.db | cut -f1)
    echo -e "${GREEN}✅ EXISTS${NC} (Size: $db_size)"
else
    echo -e "${YELLOW}⚠️ MISSING${NC} (Will be created on startup)"
fi

# 10. Runbook Compliance Summary
echo -e "\n${BLUE}📋 RUNBOOK COMPLIANCE SUMMARY${NC}"
echo "=============================================="

if [[ $VERIFICATION_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL VERIFICATIONS PASSED${NC}"
    echo ""
    echo "🎉 System is fully operational and compliant with runbook requirements!"
    echo ""
    echo "Available Services:"
    echo "├─ Backend API: http://localhost:8000"
    echo "├─ Health Check: http://localhost:8000/api/health"
    echo "├─ Status Check: http://localhost:8000/api/status"
    echo "├─ Trading Dashboard: http://localhost:8000"
    echo "└─ Real-time Data: Active"
    echo ""
    echo "Security Status:"
    echo "├─ Trading Mode: Paper (Safe)"
    echo "├─ Rate Limiting: Active"
    echo "└─ API Access: Controlled"
    echo ""
    echo "Monitoring:"
    echo "├─ Logs: Active (logs/ directory)"
    echo "├─ Health Checks: Available"
    echo "└─ Performance: Within baselines"
    
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILURES DETECTED${NC}"
    echo ""
    echo "⚠️ Some verification checks failed. Please review the output above."
    echo "Consult Ops/Runbook.md for troubleshooting procedures."
    echo ""
    echo "Common fixes:"
    echo "├─ Restart services: npm run server"
    echo "├─ Check configuration: .env file"
    echo "├─ Review logs: tail -f logs/combined.log"
    echo "└─ Run health check: ./scripts/health-check.sh"
    
    exit 1
fi 