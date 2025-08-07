#!/bin/bash

# Chaos Engineering Test Suite
# Tests system resilience by killing critical services and measuring recovery time

set -e

echo "🧪 Starting Chaos Engineering Tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
INCIDENT_LOG_FILE="/tmp/chaos_incident.log"
MTTR_THRESHOLD=300 # 5 minutes in seconds
TEST_TIMEOUT=600 # 10 minutes total timeout

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$INCIDENT_LOG_FILE"
}

# Function to send Slack notification
send_slack_notification() {
    local message="$1"
    local color="$2"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$message\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"fields\": [{
                        \"title\": \"Test Time\",
                        \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Function to check service health
check_service_health() {
    local service="$1"
    local endpoint="$2"
    
    if curl -s -f "$endpoint" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to measure recovery time
measure_recovery_time() {
    local service="$1"
    local start_time=$(date +%s)
    local max_wait=300 # 5 minutes
    
    log "Waiting for $service to recover..."
    
    while [ $(($(date +%s) - start_time)) -lt $max_wait ]; do
        if check_service_health "$service" "http://localhost:8000/health"; then
            local recovery_time=$(($(date +%s) - start_time))
            log "${GREEN}✅ $service recovered in ${recovery_time}s${NC}"
            return $recovery_time
        fi
        sleep 5
    done
    
    log "${RED}❌ $service failed to recover within ${max_wait}s${NC}"
    return $max_wait
}

# Function to kill Redis
chaos_test_redis() {
    log "${BLUE}🧪 Chaos Test: Killing Redis...${NC}"
    
    # Find Redis process
    local redis_pid=$(pgrep redis-server || echo "")
    if [ -z "$redis_pid" ]; then
        log "${YELLOW}⚠️  Redis not running, skipping test${NC}"
        return 0
    fi
    
    # Kill Redis
    log "Killing Redis process $redis_pid"
    kill -9 "$redis_pid" 2>/dev/null || true
    
    # Measure recovery time
    local start_time=$(date +%s)
    local recovery_time=$(measure_recovery_time "Redis")
    
    # Restart Redis if needed
    if [ $recovery_time -eq 300 ]; then
        log "Manually restarting Redis..."
        systemctl start redis-server 2>/dev/null || true
        docker-compose up -d redis 2>/dev/null || true
    fi
    
    return $recovery_time
}

# Function to kill Postgres
chaos_test_postgres() {
    log "${BLUE}🧪 Chaos Test: Killing Postgres...${NC}"
    
    # Find Postgres process
    local postgres_pid=$(pgrep postgres || echo "")
    if [ -z "$postgres_pid" ]; then
        log "${YELLOW}⚠️  Postgres not running, skipping test${NC}"
        return 0
    fi
    
    # Kill Postgres
    log "Killing Postgres process $postgres_pid"
    kill -9 "$postgres_pid" 2>/dev/null || true
    
    # Measure recovery time
    local start_time=$(date +%s)
    local recovery_time=$(measure_recovery_time "Postgres")
    
    # Restart Postgres if needed
    if [ $recovery_time -eq 300 ]; then
        log "Manually restarting Postgres..."
        systemctl start postgresql 2>/dev/null || true
        docker-compose up -d postgres 2>/dev/null || true
    fi
    
    return $recovery_time
}

# Function to kill Bybit socket connection
chaos_test_bybit_socket() {
    log "${BLUE}🧪 Chaos Test: Killing Bybit Socket...${NC}"
    
    # Find Node.js processes that might be handling Bybit connections
    local node_pids=$(pgrep -f "node.*bybit" || echo "")
    if [ -z "$node_pids" ]; then
        log "${YELLOW}⚠️  Bybit socket processes not found, skipping test${NC}"
        return 0
    fi
    
    # Kill Bybit socket processes
    for pid in $node_pids; do
        log "Killing Bybit socket process $pid"
        kill -9 "$pid" 2>/dev/null || true
    done
    
    # Measure recovery time
    local start_time=$(date +%s)
    local recovery_time=$(measure_recovery_time "Bybit Socket")
    
    # Restart services if needed
    if [ $recovery_time -eq 300 ]; then
        log "Manually restarting trading services..."
        docker-compose up -d 2>/dev/null || true
        npm start 2>/dev/null || true
    fi
    
    return $recovery_time
}

# Function to test network connectivity
chaos_test_network() {
    log "${BLUE}🧪 Chaos Test: Network Connectivity...${NC}"
    
    # Test external connectivity
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        log "${GREEN}✅ External network connectivity OK${NC}"
    else
        log "${RED}❌ External network connectivity failed${NC}"
        return 1
    fi
    
    # Test DNS resolution
    if nslookup methtrader.xyz > /dev/null 2>&1; then
        log "${GREEN}✅ DNS resolution OK${NC}"
    else
        log "${RED}❌ DNS resolution failed${NC}"
        return 1
    fi
    
    return 0
}

# Function to test disk space
chaos_test_disk() {
    log "${BLUE}🧪 Chaos Test: Disk Space...${NC}"
    
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 90 ]; then
        log "${GREEN}✅ Disk usage: ${disk_usage}%${NC}"
        return 0
    else
        log "${RED}❌ Disk usage critical: ${disk_usage}%${NC}"
        return 1
    fi
}

# Function to test memory usage
chaos_test_memory() {
    log "${BLUE}🧪 Chaos Test: Memory Usage...${NC}"
    
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$mem_usage" -lt 90 ]; then
        log "${GREEN}✅ Memory usage: ${mem_usage}%${NC}"
        return 0
    else
        log "${RED}❌ Memory usage critical: ${mem_usage}%${NC}"
        return 1
    fi
}

# Function to run all chaos tests
run_chaos_tests() {
    local start_time=$(date +%s)
    local total_failures=0
    local max_mttr=0
    
    log "🚀 Starting Chaos Engineering Test Suite..."
    send_slack_notification "🧪 Chaos Engineering tests started" "warning"
    
    # Pre-test health check
    log "📊 Pre-test health check..."
    if ! check_service_health "Main App" "http://localhost:8000/health"; then
        log "${RED}❌ System not healthy before tests${NC}"
        return 1
    fi
    
    # Run chaos tests
    log "🔥 Running chaos tests..."
    
    # Test 1: Redis failure
    if chaos_test_redis; then
        local redis_mttr=$?
        max_mttr=$((max_mttr > redis_mttr ? max_mttr : redis_mttr))
        if [ $redis_mttr -gt $MTTR_THRESHOLD ]; then
            total_failures=$((total_failures + 1))
        fi
    else
        total_failures=$((total_failures + 1))
    fi
    
    # Wait between tests
    sleep 30
    
    # Test 2: Postgres failure
    if chaos_test_postgres; then
        local postgres_mttr=$?
        max_mttr=$((max_mttr > postgres_mttr ? max_mttr : postgres_mttr))
        if [ $postgres_mttr -gt $MTTR_THRESHOLD ]; then
            total_failures=$((total_failures + 1))
        fi
    else
        total_failures=$((total_failures + 1))
    fi
    
    # Wait between tests
    sleep 30
    
    # Test 3: Bybit socket failure
    if chaos_test_bybit_socket; then
        local bybit_mttr=$?
        max_mttr=$((max_mttr > bybit_mttr ? max_mttr : bybit_mttr))
        if [ $bybit_mttr -gt $MTTR_THRESHOLD ]; then
            total_failures=$((total_failures + 1))
        fi
    else
        total_failures=$((total_failures + 1))
    fi
    
    # Test 4: Network connectivity
    if ! chaos_test_network; then
        total_failures=$((total_failures + 1))
    fi
    
    # Test 5: Disk space
    if ! chaos_test_disk; then
        total_failures=$((total_failures + 1))
    fi
    
    # Test 6: Memory usage
    if ! chaos_test_memory; then
        total_failures=$((total_failures + 1))
    fi
    
    # Final health check
    log "📊 Post-test health check..."
    if check_service_health "Main App" "http://localhost:8000/health"; then
        log "${GREEN}✅ System healthy after tests${NC}"
    else
        log "${RED}❌ System unhealthy after tests${NC}"
        total_failures=$((total_failures + 1))
    fi
    
    # Calculate total test time
    local total_time=$(($(date +%s) - start_time))
    
    # Generate test report
    log "📋 Chaos Test Report:"
    log "   Total Failures: $total_failures"
    log "   Max MTTR: ${max_mttr}s"
    log "   Total Test Time: ${total_time}s"
    log "   MTTR Threshold: ${MTTR_THRESHOLD}s"
    
    # Send results to Slack
    if [ $total_failures -eq 0 ] && [ $max_mttr -le $MTTR_THRESHOLD ]; then
        send_slack_notification "🎉 Chaos tests PASSED! All services recovered within ${MTTR_THRESHOLD}s" "good"
        log "${GREEN}🎉 All chaos tests passed!${NC}"
        return 0
    else
        send_slack_notification "❌ Chaos tests FAILED! $total_failures failures, max MTTR: ${max_mttr}s" "danger"
        log "${RED}❌ Chaos tests failed!${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Create incident log file
    echo "Chaos Engineering Test Log - $(date)" > "$INCIDENT_LOG_FILE"
    
    # Run tests with timeout
    timeout $TEST_TIMEOUT bash -c 'run_chaos_tests' || {
        log "${RED}❌ Tests timed out after ${TEST_TIMEOUT}s${NC}"
        send_slack_notification "⏰ Chaos tests timed out after ${TEST_TIMEOUT}s" "danger"
        exit 1
    }
    
    # Cleanup
    rm -f "$INCIDENT_LOG_FILE"
}

# Run main function
main "$@" 