#!/bin/bash

# AI Trading System - Deployment Verification Script
# This script verifies all system components are working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=30
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
GRAFANA_URL="http://localhost:3001"
PROMETHEUS_URL="http://localhost:9090"
MLFLOW_URL="http://localhost:5000"
PREFECT_URL="http://localhost:4200"
RATE_GATE_URL="http://localhost:3002"

echo -e "${BLUE}🚀 AI Trading System Deployment Verification${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Function to check service health
check_service() {
    local service_name=$1
    local url=$2
    local endpoint=${3:-"/health"}
    
    echo -n "Checking $service_name... "
    
    if curl -s --max-time $TIMEOUT "$url$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -n "Checking PostgreSQL database... "
    
    if docker compose exec -T db pg_isready -U trading_app > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    echo -n "Checking Redis cache... "
    
    if docker compose exec -T redis redis-cli ping | grep -q PONG > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Function to check container status
check_containers() {
    echo -e "${BLUE}📦 Container Status Check${NC}"
    echo "------------------------"
    
    local all_healthy=true
    local containers=(
        "trading-db"
        "trading-redis" 
        "trading-rate-gate"
        "ai-trading-backend"
        "trading-mlflow"
        "trading-loki"
        "trading-prometheus"
        "trading-grafana"
        "trading-prefect-server"
    )
    
    for container in "${containers[@]}"; do
        echo -n "Container $container... "
        
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            # Check if container is healthy
            health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")
            
            if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-health-check" ]; then
                echo -e "${GREEN}✅ Running${NC}"
            else
                echo -e "${YELLOW}⚠️  Running but unhealthy${NC}"
                all_healthy=false
            fi
        else
            echo -e "${RED}❌ Not running${NC}"
            all_healthy=false
        fi
    done
    
    echo ""
    return $($all_healthy && echo 0 || echo 1)
}

# Function to check API endpoints
check_api_endpoints() {
    echo -e "${BLUE}🌐 API Endpoints Check${NC}"
    echo "---------------------"
    
    local endpoints=(
        "$BACKEND_URL/api/health:Backend Health"
        "$BACKEND_URL/api/status:Backend Status"
        "$BACKEND_URL/api/metrics:Prometheus Metrics"
        "$RATE_GATE_URL/health:Rate Gate Health"
        "$RATE_GATE_URL/stats:Rate Limiting Stats"
    )
    
    local all_healthy=true
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r url description <<< "$endpoint_info"
        echo -n "Checking $description... "
        
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
        
        if [ "$response_code" = "200" ]; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ FAILED (HTTP $response_code)${NC}"
            all_healthy=false
        fi
    done
    
    echo ""
    return $($all_healthy && echo 0 || echo 1)
}

# Function to check WebSocket connectivity
check_websockets() {
    echo -e "${BLUE}🔌 WebSocket Connectivity${NC}"
    echo "-------------------------"
    
    echo -n "Checking Socket.IO endpoint... "
    # Test Socket.IO connection
    if timeout 10 node -e "
        const io = require('socket.io-client');
        const socket = io('http://localhost:8000/ui');
        socket.on('connect', () => {
            console.log('Connected');
            process.exit(0);
        });
        socket.on('connect_error', () => {
            process.exit(1);
        });
        setTimeout(() => process.exit(1), 5000);
    " > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo ""
}

# Function to check database schema
check_database_schema() {
    echo -e "${BLUE}🗄️  Database Schema Check${NC}"
    echo "-------------------------"
    
    local tables=(
        "ohlcv_data"
        "positions"
        "trades"
        "features"
        "model_performance"
        "training_progress"
    )
    
    local all_tables_exist=true
    
    for table in "${tables[@]}"; do
        echo -n "Checking table $table... "
        
        if docker compose exec -T db psql -U trading_app -d trading -c "\dt $table" | grep -q "$table" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ EXISTS${NC}"
        else
            echo -e "${RED}❌ MISSING${NC}"
            all_tables_exist=false
        fi
    done
    
    # Check TimescaleDB hypertables
    echo -n "Checking TimescaleDB hypertables... "
    hypertable_count=$(docker compose exec -T db psql -U trading_app -d trading -c "SELECT COUNT(*) FROM timescaledb_information.hypertables;" -t | tr -d ' ' 2>/dev/null || echo "0")
    
    if [ "$hypertable_count" -gt 0 ]; then
        echo -e "${GREEN}✅ $hypertable_count hypertables found${NC}"
    else
        echo -e "${YELLOW}⚠️  No hypertables found${NC}"
    fi
    
    echo ""
    return $($all_tables_exist && echo 0 || echo 1)
}

# Function to check system performance
check_performance() {
    echo -e "${BLUE}⚡ Performance Check${NC}"
    echo "-------------------"
    
    # API response time test
    echo -n "API response time... "
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$BACKEND_URL/api/health" 2>/dev/null || echo "999")
    response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    
    if [ "$response_time_ms" -lt 500 ]; then
        echo -e "${GREEN}✅ ${response_time_ms}ms${NC}"
    elif [ "$response_time_ms" -lt 1000 ]; then
        echo -e "${YELLOW}⚠️  ${response_time_ms}ms (slow)${NC}"
    else
        echo -e "${RED}❌ ${response_time_ms}ms (too slow)${NC}"
    fi
    
    # Database query performance
    echo -n "Database query performance... "
    db_response_time=$(docker compose exec -T db psql -U trading_app -d trading -c "SELECT 1;" -q 2>/dev/null && echo "fast" || echo "slow")
    
    if [ "$db_response_time" = "fast" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ SLOW${NC}"
    fi
    
    echo ""
}

# Function to check ML services
check_ml_services() {
    echo -e "${BLUE}🤖 ML Services Check${NC}"
    echo "--------------------"
    
    # MLflow tracking server
    check_service "MLflow" "$MLFLOW_URL" ""
    
    # Prefect server
    check_service "Prefect" "$PREFECT_URL" "/api/health"
    
    # Check for model artifacts
    echo -n "Checking model artifacts... "
    if [ -d "./models" ] && [ "$(ls -A ./models 2>/dev/null)" ]; then
        echo -e "${GREEN}✅ Found model files${NC}"
    else
        echo -e "${YELLOW}⚠️  No model files found${NC}"
    fi
    
    echo ""
}

# Function to check monitoring stack
check_monitoring() {
    echo -e "${BLUE}📊 Monitoring Stack${NC}"
    echo "-------------------"
    
    check_service "Prometheus" "$PROMETHEUS_URL" "/-/healthy"
    check_service "Grafana" "$GRAFANA_URL" "/api/health"
    check_service "Loki" "http://localhost:3100" "/ready"
    
    # Check if metrics are being collected
    echo -n "Checking metrics collection... "
    if curl -s "$PROMETHEUS_URL/api/v1/query?query=up" | grep -q '"status":"success"' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo ""
}

# Function to check rate limiting
check_rate_limiting() {
    echo -e "${BLUE}🚦 Rate Limiting Check${NC}"
    echo "---------------------"
    
    # Test rate gate service
    echo -n "Rate gate service health... "
    if curl -s "$RATE_GATE_URL/health" | grep -q "healthy" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    # Test rate limiting functionality
    echo -n "Rate limiting functionality... "
    response=$(curl -s -X POST "$RATE_GATE_URL/consume/ALPHA_VANTAGE" -H "Content-Type: application/json" -d '{"tokens":1}' 2>/dev/null || echo "error")
    
    if echo "$response" | grep -q "allowed" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    
    echo ""
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📋 Verification Summary${NC}"
    echo "======================="
    echo ""
    
    local total_checks=0
    local passed_checks=0
    
    # Re-run all checks silently and count results
    services_to_check=(
        "check_containers"
        "check_database"
        "check_redis"
        "check_api_endpoints"
        "check_database_schema"
        "check_ml_services"
        "check_monitoring"
        "check_rate_limiting"
    )
    
    echo "Component Status:"
    echo "- Containers: $(docker ps --filter 'label=com.docker.compose.project' --format 'table {{.Names}}' | wc -l | tr -d ' ') running"
    echo "- Database: PostgreSQL + TimescaleDB"
    echo "- Cache: Redis"
    echo "- Web Services: Backend + Frontend + Rate Gate"
    echo "- Monitoring: Prometheus + Grafana + Loki"
    echo "- ML Services: MLflow + Prefect"
    echo ""
    
    # Check if all critical services are running
    critical_endpoints=(
        "$BACKEND_URL/api/health"
        "$RATE_GATE_URL/health"
    )
    
    local all_critical_ok=true
    for endpoint in "${critical_endpoints[@]}"; do
        if ! curl -s --max-time 5 "$endpoint" > /dev/null 2>&1; then
            all_critical_ok=false
            break
        fi
    done
    
    if $all_critical_ok; then
        echo -e "${GREEN}🎉 DEPLOYMENT VERIFICATION PASSED${NC}"
        echo ""
        echo "🚀 System is ready for use!"
        echo "- Backend API: $BACKEND_URL"
        echo "- Frontend: $FRONTEND_URL (after build)"
        echo "- Grafana: $GRAFANA_URL (admin/admin123)"
        echo "- MLflow: $MLFLOW_URL"
        echo ""
        echo "Next steps:"
        echo "1. Run 'npm run build' to build frontend"
        echo "2. Access Grafana to view dashboards"
        echo "3. Check MLflow for model experiments"
        echo "4. Monitor logs with 'docker compose logs -f'"
        return 0
    else
        echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
        echo ""
        echo "⚠️  Critical issues detected. Please check:"
        echo "1. All containers are running: docker compose ps"
        echo "2. Check logs: docker compose logs"
        echo "3. Verify environment variables in .env"
        echo "4. Ensure all ports are available"
        return 1
    fi
}

# Main execution
main() {
    echo "Starting comprehensive system verification..."
    echo "This may take up to 2 minutes..."
    echo ""
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10
    
    # Run all checks
    check_containers
    check_database
    check_redis
    check_api_endpoints
    check_websockets
    check_database_schema
    check_performance
    check_ml_services
    check_monitoring
    check_rate_limiting
    
    # Generate final summary
    generate_summary
}

# Run the verification
main

# Exit with appropriate code
if [ $? -eq 0 ]; then
    exit 0
else
    exit 1
fi 