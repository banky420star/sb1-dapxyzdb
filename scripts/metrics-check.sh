#!/usr/bin/env bash
set -e

# 🧪 Repository Metrics Validation Script
# Validates code metrics against baseline to prevent silent feature creep
# Usage: ./scripts/metrics-check.sh
# CI Integration: npm run metrics

echo "🔍 Starting repository metrics validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if value exceeds threshold
check_threshold() {
    local expected=$1
    local actual=$2
    local file=$3
    local threshold=15  # 15% threshold
    
    local max_allowed=$((expected * (100 + threshold) / 100))
    
    if (( actual > max_allowed )); then
        echo -e "${RED}❌ $file grew by >${threshold}% (expected: $expected, actual: $actual, max: $max_allowed)${NC}"
        return 1
    elif (( actual < expected * (100 - threshold) / 100 )); then
        echo -e "${YELLOW}⚠️  $file shrunk by >${threshold}% (expected: $expected, actual: $actual)${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $file within acceptable range (expected: $expected, actual: $actual)${NC}"
        return 0
    fi
}

# Function to check exact match
check_exact() {
    local expected=$1
    local actual=$2
    local file=$3
    
    if (( actual == expected )); then
        echo -e "${GREEN}✅ $file exact match (expected: $expected, actual: $actual)${NC}"
        return 0
    else
        echo -e "${RED}❌ $file mismatch (expected: $expected, actual: $actual)${NC}"
        return 1
    fi
}

# Initialize error counter
errors=0

echo -e "\n${BLUE}📊 Frontend Metrics Validation${NC}"
echo "=================================="

# Frontend checks
expected_app=38
actual_app=$(wc -l < src/App.tsx)
if ! check_threshold $expected_app $actual_app "src/App.tsx"; then ((errors++)); fi

expected_main=9
actual_main=$(wc -l < src/main.tsx)
if ! check_threshold $expected_main $actual_main "src/main.tsx"; then ((errors++)); fi

expected_context=181
actual_context=$(wc -l < src/contexts/TradingContext.tsx)
if ! check_threshold $expected_context $actual_context "src/contexts/TradingContext.tsx"; then ((errors++)); fi

echo -e "\n${BLUE}🔧 Backend API Metrics Validation${NC}"
echo "====================================="

# Backend checks
expected_index=843
actual_index=$(wc -l < server/index.js)
if ! check_threshold $expected_index $actual_index "server/index.js"; then ((errors++)); fi

expected_enhanced=777
actual_enhanced=$(wc -l < server/enhanced-server.js)
if ! check_threshold $expected_enhanced $actual_enhanced "server/enhanced-server.js"; then ((errors++)); fi

expected_simple=207
actual_simple=$(wc -l < server/simple-index-enhanced.js)
if ! check_threshold $expected_simple $actual_simple "server/simple-index-enhanced.js"; then ((errors++)); fi

expected_api=148
actual_api=$(wc -l < server/real-data-api.js)
if ! check_threshold $expected_api $actual_api "server/real-data-api.js"; then ((errors++)); fi

echo -e "\n${BLUE}🤖 Machine Learning Metrics Validation${NC}"
echo "=========================================="

# ML checks
expected_rf=578
actual_rf=$(wc -l < server/ml/models/randomforest.js)
if ! check_threshold $expected_rf $actual_rf "server/ml/models/randomforest.js"; then ((errors++)); fi

expected_lstm=602
actual_lstm=$(wc -l < server/ml/models/lstm.js)
if ! check_threshold $expected_lstm $actual_lstm "server/ml/models/lstm.js"; then ((errors++)); fi

expected_ddqn=623
actual_ddqn=$(wc -l < server/ml/models/ddqn.js)
if ! check_threshold $expected_ddqn $actual_ddqn "server/ml/models/ddqn.js"; then ((errors++)); fi

expected_manager=1235
actual_manager=$(wc -l < server/ml/manager.js)
if ! check_threshold $expected_manager $actual_manager "server/ml/manager.js"; then ((errors++)); fi

echo -e "\n${BLUE}💰 Trading Engine Metrics Validation${NC}"
echo "====================================="

# Trading checks
expected_engine=1226
actual_engine=$(wc -l < server/trading/engine.js)
if ! check_threshold $expected_engine $actual_engine "server/trading/engine.js"; then ((errors++)); fi

expected_risk=804
actual_risk=$(wc -l < server/risk/manager.js)
if ! check_threshold $expected_risk $actual_risk "server/risk/manager.js"; then ((errors++)); fi

echo -e "\n${BLUE}🧪 Testing & Scripts Validation${NC}"
echo "================================"

# Test files count
expected_tests=7
actual_tests=$(find tests/ -name '*.js' -o -name '*.ts' | wc -l)
if ! check_exact $expected_tests $actual_tests "test files count"; then ((errors++)); fi

# Scripts count
expected_scripts=13
actual_scripts=$(ls -1 scripts/ | wc -l)
if ! check_exact $expected_scripts $actual_scripts "scripts count"; then ((errors++)); fi

echo -e "\n${BLUE}📦 Dependencies Validation${NC}"
echo "============================"

# Dependencies count
expected_deps=51
actual_deps=$(grep -A50 '"dependencies"' package.json | grep -c '^\s*".*":')
if ! check_exact $expected_deps $actual_deps "dependencies count"; then ((errors++)); fi

# Dependencies section count
expected_deps_sections=1
actual_deps_sections=$(grep -c '"dependencies"' package.json)
if ! check_exact $expected_deps_sections $actual_deps_sections "dependencies sections"; then ((errors++)); fi

echo -e "\n${BLUE}📊 Overall Code Metrics${NC}"
echo "========================"

# Calculate total lines manually
echo "Generating comprehensive code analysis..."
total_lines=$((actual_app + actual_main + actual_context + actual_index + actual_enhanced + actual_simple + actual_api + actual_rf + actual_lstm + actual_ddqn + actual_manager + actual_engine + actual_risk))

expected_total=7263
if ! check_threshold $expected_total $total_lines "total code lines"; then ((errors++)); fi

echo -e "\n${BLUE}📋 Summary Report${NC}"
echo "=================="

echo "📈 Metrics Summary:"
echo "- Frontend: $((actual_app + actual_main + actual_context)) lines"
echo "- Backend API: $((actual_index + actual_enhanced + actual_simple + actual_api)) lines"
echo "- ML Components: $((actual_rf + actual_lstm + actual_ddqn + actual_manager)) lines"
echo "- Trading Engine: $((actual_engine + actual_risk)) lines"
echo "- Test Files: $actual_tests files"
echo "- Scripts: $actual_scripts files"
echo "- Dependencies: $actual_deps packages"
echo "- Total Code: $total_lines lines"

# Final result
if (( errors == 0 )); then
    echo -e "\n${GREEN}🎉 All metrics validation passed!${NC}"
    echo -e "${GREEN}✅ Repository is within acceptable quality thresholds${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Metrics validation failed with $errors error(s)${NC}"
    echo -e "${YELLOW}💡 Review the changes above and update baseline metrics if appropriate${NC}"
    echo -e "${YELLOW}📚 See REPO_METRICS_VALIDATION.md for detailed analysis${NC}"
    exit 1
fi 