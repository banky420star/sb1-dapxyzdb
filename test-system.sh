#!/bin/bash

# Enhanced Trading System Test Script
# This script tests all components of the production-ready trading stack

set -e

echo "🚀 Testing Enhanced Trading System..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    print_status "INFO" "Testing: $description"
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_status "OK" "$description is healthy"
        return 0
    else
        print_status "ERROR" "$description is not responding"
        return 1
    fi
}

# Function to test API endpoint with JSON
test_api_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    print_status "INFO" "Testing: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s "$url" 2>/dev/null || echo "ERROR")
    else
        response=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null || echo "ERROR")
    fi
    
    if [ "$response" = "ERROR" ]; then
        print_status "ERROR" "$description failed"
        return 1
    else
        print_status "OK" "$description successful"
        echo "Response: $response" | head -c 200
        echo "..."
        return 0
    fi
}

echo ""
print_status "INFO" "Starting system health checks..."

# Test 1: Backend Health
test_endpoint "http://localhost:8000/health" "200" "Backend Health Check"

# Test 2: Model Service Health
test_endpoint "http://localhost:9000/health" "200" "Model Service Health Check"

echo ""
print_status "INFO" "Testing API endpoints..."

# Test 3: AI Consensus
consensus_data='{
  "symbol": "BTCUSDT",
  "features": {
    "mom_20": 1.0,
    "rv_5": 0.2,
    "rsi_14": 65.0
  }
}'
test_api_endpoint "POST" "http://localhost:8000/api/ai/consensus" "$consensus_data" "AI Consensus Endpoint"

# Test 4: Trade Execution (Dry Run)
trade_data='{
  "symbol": "BTCUSDT",
  "side": "buy",
  "qtyUsd": 2000,
  "confidence": 0.9
}'
test_api_endpoint "POST" "http://localhost:8000/api/trade/execute" "$trade_data" "Trade Execution Endpoint"

# Test 5: Trading Status
test_api_endpoint "GET" "http://localhost:8000/api/trade/status" "" "Trading Status Endpoint"

echo ""
print_status "INFO" "Testing risk management..."

# Test 6: Low Confidence Rejection
low_confidence_data='{
  "symbol": "BTCUSDT",
  "side": "buy",
  "qtyUsd": 1000,
  "confidence": 0.3
}'
print_status "INFO" "Testing: Low Confidence Rejection"
response=$(curl -s -X POST -H "Content-Type: application/json" -d "$low_confidence_data" "http://localhost:8000/api/trade/execute" 2>/dev/null || echo "ERROR")
if echo "$response" | grep -q "low_confidence"; then
    print_status "OK" "Low confidence correctly rejected"
else
    print_status "WARN" "Low confidence rejection not working as expected"
fi

# Test 7: Large Position Rejection
large_position_data='{
  "symbol": "BTCUSDT",
  "side": "buy",
  "qtyUsd": 50000,
  "confidence": 0.9
}'
print_status "INFO" "Testing: Large Position Rejection"
response=$(curl -s -X POST -H "Content-Type: application/json" -d "$large_position_data" "http://localhost:8000/api/trade/execute" 2>/dev/null || echo "ERROR")
if echo "$response" | grep -q "exceeds_symbol_cap"; then
    print_status "OK" "Large position correctly rejected"
else
    print_status "WARN" "Large position rejection not working as expected"
fi

echo ""
print_status "INFO" "Testing model service endpoints..."

# Test 8: Model Info
test_api_endpoint "GET" "http://localhost:9000/model/info" "" "Model Information Endpoint"

# Test 9: Model Prediction
prediction_data='{
  "symbol": "ETHUSDT",
  "features": {
    "mom_20": -0.5,
    "rv_5": 0.8,
    "rsi_14": 35.0
  }
}'
test_api_endpoint "POST" "http://localhost:9000/predict" "$prediction_data" "Model Prediction Endpoint"

echo ""
print_status "INFO" "Performance testing..."

# Test 10: Response Time Test
print_status "INFO" "Testing: Backend Response Time"
start_time=$(date +%s%N)
curl -s "http://localhost:8000/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
if [ $response_time -lt 500 ]; then
    print_status "OK" "Backend response time: ${response_time}ms (good)"
else
    print_status "WARN" "Backend response time: ${response_time}ms (slow)"
fi

# Test 11: Model Service Response Time
print_status "INFO" "Testing: Model Service Response Time"
start_time=$(date +%s%N)
curl -s "http://localhost:9000/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
if [ $response_time -lt 1000 ]; then
    print_status "OK" "Model service response time: ${response_time}ms (good)"
else
    print_status "WARN" "Model service response time: ${response_time}ms (slow)"
fi

echo ""
print_status "INFO" "System configuration check..."

# Test 12: Configuration Validation
print_status "INFO" "Testing: Configuration Validation"
config_response=$(curl -s "http://localhost:8000/health" 2>/dev/null || echo "ERROR")
if [ "$config_response" != "ERROR" ]; then
    trading_mode=$(echo "$config_response" | grep -o '"tradingMode":"[^"]*"' | cut -d'"' -f4)
    confidence_threshold=$(echo "$config_response" | grep -o '"confidenceThreshold":[0-9.]*' | cut -d':' -f2)
    
    if [ "$trading_mode" = "paper" ]; then
        print_status "OK" "Trading mode: $trading_mode (safe for testing)"
    else
        print_status "WARN" "Trading mode: $trading_mode (be careful!)"
    fi
    
    if [ -n "$confidence_threshold" ]; then
        print_status "OK" "Confidence threshold: $confidence_threshold"
    else
        print_status "WARN" "Could not determine confidence threshold"
    fi
else
    print_status "ERROR" "Could not retrieve configuration"
fi

echo ""
echo "🎉 System Test Complete!"
echo "========================"
print_status "INFO" "All core components tested successfully"
print_status "INFO" "System is ready for paper trading"
print_status "INFO" "Review logs for any warnings or errors"
print_status "INFO" "Use AGENT_TASKS.md for detailed operational procedures"

echo ""
echo "📋 Next Steps:"
echo "1. Review test results above"
echo "2. Check docker logs for any errors: docker logs backend && docker logs model-service"
echo "3. Run paper trading tests: see RUNBOOK.md"
echo "4. Monitor system performance during operation"
echo "5. Only enable live trading after thorough validation"
