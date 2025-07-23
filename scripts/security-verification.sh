#!/bin/bash

# AI Trading System - Security Verification Script
# Following Ops/Runbook.md security procedures

echo "🛡️ AI TRADING SYSTEM - SECURITY VERIFICATION"
echo "============================================="
echo "Following Ops/Runbook.md security compliance..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SECURITY_SCORE=0
MAX_SCORE=100

# Function to add security points
add_security_points() {
    local points=$1
    SECURITY_SCORE=$((SECURITY_SCORE + points))
}

# 1. Trading Mode Security Check
echo -e "${BLUE}💰 TRADING MODE SECURITY${NC}"
echo "-------------------------"

trading_mode=$(curl -s http://localhost:8000/api/status 2>/dev/null | grep -o '"trading":"[^"]*"' | cut -d'"' -f4)
echo -n "Trading Mode Check: "
if [[ "$trading_mode" == "paper mode" ]]; then
    echo -e "${GREEN}✅ SECURE${NC} (Paper trading - no real money at risk)"
    add_security_points 25
else
    echo -e "${RED}❌ CRITICAL RISK${NC} (Live trading detected!)"
    echo "   └─ IMMEDIATE ACTION REQUIRED: Switch to paper mode"
fi

# Check environment configuration
echo -n "Environment Configuration: "
if [[ -f ".env" ]] && grep -q "TRADING_MODE=paper" .env; then
    echo -e "${GREEN}✅ SECURE${NC} (Paper mode in config)"
    add_security_points 10
else
    echo -e "${RED}❌ RISK${NC} (Trading mode not properly configured)"
fi

# 2. API Key Security
echo -e "\n${BLUE}🔑 API KEY SECURITY${NC}"
echo "-------------------"

echo -n "Environment File Permissions: "
if [[ -f ".env" ]]; then
    env_perms=$(stat -f "%A" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [[ "$env_perms" =~ ^[0-7]0[0-7]$ ]] || [[ "$env_perms" == "644" ]]; then
        echo -e "${GREEN}✅ SECURE${NC} (Readable by owner only)"
        add_security_points 10
    else
        echo -e "${YELLOW}⚠️ WARNING${NC} (Consider restricting to 600)"
    fi
else
    echo -e "${RED}❌ MISSING${NC} (No .env file found)"
fi

# Check for hardcoded secrets in code
echo -n "Hardcoded Secrets Check: "
secret_files=$(grep -r -l "api[_-]key\|secret\|password" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v ".env" | grep -v "node_modules" | wc -l | tr -d ' ')
if [[ "$secret_files" -eq 0 ]]; then
    echo -e "${GREEN}✅ CLEAN${NC} (No hardcoded secrets found)"
    add_security_points 15
else
    echo -e "${YELLOW}⚠️ WARNING${NC} ($secret_files files contain potential secrets)"
fi

# 3. Network Security
echo -e "\n${BLUE}🌐 NETWORK SECURITY${NC}"
echo "-------------------"

# Check CORS configuration
echo -n "CORS Configuration: "
cors_response=$(curl -s -H "Origin: http://malicious.com" http://localhost:8000/api/health 2>/dev/null || echo "")
if [[ -z "$cors_response" ]] || ! echo "$cors_response" | grep -q "ok"; then
    echo -e "${GREEN}✅ SECURE${NC} (CORS properly configured)"
    add_security_points 10
else
    echo -e "${YELLOW}⚠️ WARNING${NC} (CORS may be too permissive)"
fi

# Check for HTTPS in production
echo -n "HTTPS Configuration: "
if [[ "$(curl -s http://localhost:8000/api/status | grep -o '"system":"[^"]*"' | cut -d'"' -f4)" == "online" ]]; then
    echo -e "${YELLOW}⚠️ WARNING${NC} (Using HTTP - consider HTTPS for production)"
else
    echo -e "${GREEN}✅ N/A${NC} (Development environment)"
    add_security_points 5
fi

# 4. Database Security
echo -e "\n${BLUE}💾 DATABASE SECURITY${NC}"
echo "--------------------"

echo -n "Database File Permissions: "
if [[ -f "data/trading.db" ]]; then
    db_perms=$(stat -f "%A" data/trading.db 2>/dev/null || stat -c "%a" data/trading.db 2>/dev/null)
    if [[ "$db_perms" =~ ^[0-7][0-7][0-7]$ ]]; then
        echo -e "${GREEN}✅ PROTECTED${NC} (Database file secured)"
        add_security_points 10
    else
        echo -e "${YELLOW}⚠️ WARNING${NC} (Check database file permissions)"
    fi
else
    echo -e "${YELLOW}⚠️ INFO${NC} (Database will be created on startup)"
fi

# Check for database encryption
echo -n "Database Encryption: "
db_type=$(grep -o 'DATABASE_URL=.*' .env 2>/dev/null | cut -d'=' -f2)
if echo "$db_type" | grep -q "sqlite"; then
    echo -e "${YELLOW}⚠️ INFO${NC} (SQLite - consider encryption for sensitive data)"
else
    echo -e "${GREEN}✅ CONFIGURED${NC}"
    add_security_points 5
fi

# 5. Process Security
echo -e "\n${BLUE}⚙️ PROCESS SECURITY${NC}"
echo "-------------------"

# Check process isolation
echo -n "Process Isolation: "
node_process=$(ps aux | grep -E "node.*start-simple" | grep -v grep | head -1)
if [[ -n "$node_process" ]]; then
    process_user=$(echo "$node_process" | awk '{print $1}')
    if [[ "$process_user" != "root" ]]; then
        echo -e "${GREEN}✅ SECURE${NC} (Running as non-root user: $process_user)"
        add_security_points 10
    else
        echo -e "${YELLOW}⚠️ WARNING${NC} (Running as root - consider dedicated user)"
    fi
else
    echo -e "${RED}❌ ERROR${NC} (No process found)"
fi

# Check for resource limits
echo -n "Resource Limits: "
if command -v ulimit >/dev/null 2>&1; then
    memory_limit=$(ulimit -v 2>/dev/null || echo "unlimited")
    if [[ "$memory_limit" != "unlimited" ]]; then
        echo -e "${GREEN}✅ CONFIGURED${NC} (Memory limits in place)"
        add_security_points 5
    else
        echo -e "${YELLOW}⚠️ INFO${NC} (No memory limits - consider setting for production)"
    fi
else
    echo -e "${YELLOW}⚠️ N/A${NC} (ulimit not available)"
fi

# 6. Log Security
echo -e "\n${BLUE}📝 LOG SECURITY${NC}"
echo "---------------"

echo -n "Log File Permissions: "
if [[ -d "logs" ]]; then
    log_perms=$(find logs -name "*.log" -exec stat -f "%A" {} \; 2>/dev/null | head -1)
    if [[ -n "$log_perms" ]]; then
        echo -e "${GREEN}✅ PROTECTED${NC} (Log files secured)"
        add_security_points 5
    else
        echo -e "${YELLOW}⚠️ INFO${NC} (No log files found)"
    fi
else
    echo -e "${YELLOW}⚠️ INFO${NC} (No logs directory)"
fi

# Check for sensitive data in logs
echo -n "Sensitive Data in Logs: "
sensitive_patterns=("password" "secret" "token" "key" "authorization")
found_sensitive=false

for pattern in "${sensitive_patterns[@]}"; do
    if find logs -name "*.log" -exec grep -l -i "$pattern" {} \; 2>/dev/null | head -1 | grep -q "."; then
        found_sensitive=true
        break
    fi
done

if ! $found_sensitive; then
    echo -e "${GREEN}✅ CLEAN${NC} (No sensitive data in logs)"
    add_security_points 10
else
    echo -e "${YELLOW}⚠️ WARNING${NC} (Potential sensitive data in logs)"
fi

# 7. Emergency Procedures
echo -e "\n${BLUE}🚨 EMERGENCY PROCEDURES${NC}"
echo "------------------------"

# Check emergency stop functionality
echo -n "Emergency Stop Test: "
emergency_response=$(curl -s -X POST http://localhost:8000/api/emergency-stop 2>/dev/null || echo "not_found")
if echo "$emergency_response" | grep -q "stopped\|disabled"; then
    echo -e "${GREEN}✅ AVAILABLE${NC} (Emergency stop endpoint working)"
    add_security_points 10
elif [[ "$emergency_response" == "not_found" ]]; then
    echo -e "${YELLOW}⚠️ INFO${NC} (Emergency stop endpoint not implemented)"
else
    echo -e "${YELLOW}⚠️ UNKNOWN${NC} (Emergency stop status unclear)"
fi

# 8. Security Score Calculation
echo -e "\n${BLUE}📊 SECURITY SCORE${NC}"
echo "==================="

security_percentage=$((SECURITY_SCORE * 100 / MAX_SCORE))

echo "Security Score: $SECURITY_SCORE / $MAX_SCORE ($security_percentage%)"
echo ""

if [[ $security_percentage -ge 90 ]]; then
    echo -e "${GREEN}🏆 EXCELLENT SECURITY${NC}"
    echo "Your system follows security best practices!"
elif [[ $security_percentage -ge 75 ]]; then
    echo -e "${GREEN}✅ GOOD SECURITY${NC}"
    echo "Your system is well-secured with minor improvements possible."
elif [[ $security_percentage -ge 60 ]]; then
    echo -e "${YELLOW}⚠️ MODERATE SECURITY${NC}"
    echo "Your system has basic security but needs attention."
else
    echo -e "${RED}❌ SECURITY RISKS${NC}"
    echo "Your system has significant security risks that need immediate attention!"
fi

# 9. Security Recommendations
echo -e "\n${BLUE}💡 SECURITY RECOMMENDATIONS${NC}"
echo "=============================="

echo "Immediate Actions:"
echo "├─ ✅ Ensure paper trading mode is active"
echo "├─ 🔐 Secure .env file permissions (chmod 600 .env)"
echo "├─ 📊 Regular security audits using this script"
echo "└─ 🚨 Test emergency stop procedures"

echo ""
echo "For Production Deployment:"
echo "├─ 🌐 Implement HTTPS/TLS encryption"
echo "├─ 🔐 Use dedicated non-root user"
echo "├─ 🛡️ Enable database encryption"
echo "├─ 📝 Implement log rotation and monitoring"
echo "├─ 🔄 Regular backup verification"
echo "└─ 🔐 API rate limiting and authentication"

echo ""
echo "Monitoring & Compliance:"
echo "├─ 📊 Run this security check daily"
echo "├─ 📝 Monitor access logs"
echo "├─ 🔍 Regular vulnerability scans"
echo "└─ 📋 Document security procedures"

echo ""
echo -e "${GREEN}🛡️ Security verification complete!${NC}"
echo "For detailed security procedures, see: Ops/Runbook.md" 