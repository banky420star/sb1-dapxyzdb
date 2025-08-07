#!/bin/bash

# Autonomous Trading System Startup Script
# Starts all components of the autonomous trading system

set -e

echo "🚀 Starting Autonomous Trading System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if a process is running
is_running() {
    pgrep -f "$1" > /dev/null
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            log "✅ $service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check if Redis is running
if ! is_running "redis-server"; then
    log "${YELLOW}⚠️  Redis not running, starting Redis...${NC}"
    redis-server --daemonize yes
    sleep 2
fi

# Test Redis connection
if redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis is running"
else
    log "${RED}❌ Redis connection failed${NC}"
    exit 1
fi

# Start Dashboard Server (if not already running)
if ! is_running "dashboard-server.js"; then
    log "🚀 Starting Dashboard Server..."
    node server/dashboard-server.js > logs/dashboard-server.log 2>&1 &
    DASHBOARD_PID=$!
    echo $DASHBOARD_PID > .dashboard-server.pid
    log "📊 Dashboard Server started with PID: $DASHBOARD_PID"
else
    log "✅ Dashboard Server already running"
fi

# Wait for dashboard server
wait_for_service "http://localhost:8000/health" "Dashboard Server"

# Start Frontend Development Server (if not already running)
if ! is_running "vite"; then
    log "🚀 Starting Frontend Development Server..."
    npm run dev > logs/frontend-server.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .frontend-server.pid
    log "🌐 Frontend Server started with PID: $FRONTEND_PID"
else
    log "✅ Frontend Server already running"
fi

# Wait for frontend server
wait_for_service "http://localhost:3000" "Frontend Server"

# Run initial pair discovery
log "🔍 Running initial pair discovery..."
node scripts/pair_discovery_simple.js

# Start autonomous components
log "🤖 Starting autonomous trading components..."

# Start pair discovery cron job (every 15 minutes)
log "📅 Scheduling pair discovery (every 15 minutes)..."
(crontab -l 2>/dev/null; echo "*/15 * * * * cd $(pwd) && node scripts/pair_discovery_simple.js >> logs/pair-discovery.log 2>&1") | crontab -

# Start dataset builder (every hour)
log "📅 Scheduling dataset builder (every hour)..."
(crontab -l 2>/dev/null; echo "0 * * * * cd $(pwd) && node server/data/auto_dataset_builder.js >> logs/dataset-builder.log 2>&1") | crontab -

# Start training loop (daily at 3 AM)
log "📅 Scheduling training loop (daily at 3 AM)..."
(crontab -l 2>/dev/null; echo "0 3 * * * cd $(pwd) && node server/ml/continuous_training_loop.js >> logs/training-loop.log 2>&1") | crontab -

# Start shadow deployment (daily at 4 AM)
log "📅 Scheduling shadow deployment (daily at 4 AM)..."
(crontab -l 2>/dev/null; echo "0 4 * * * cd $(pwd) && node server/trading/live_shadow_deployment.js >> logs/shadow-deployment.log 2>&1") | crontab -

# Display system status
echo ""
log "${GREEN}🎉 Autonomous Trading System Started Successfully!${NC}"
echo ""
echo "📊 System Status:"
echo "  ✅ Dashboard Server: http://localhost:8000"
echo "  ✅ Frontend Server:  http://localhost:3000"
echo "  ✅ Redis:           Running"
echo "  ✅ Pair Discovery:  Scheduled (every 15 min)"
echo "  ✅ Dataset Builder: Scheduled (hourly)"
echo "  ✅ Training Loop:   Scheduled (daily 3 AM)"
echo "  ✅ Shadow Deploy:   Scheduled (daily 4 AM)"
echo ""
echo "🔗 Access Points:"
echo "  🌐 Dashboard:       http://localhost:3000"
echo "  📊 Health Check:    http://localhost:8000/health"
echo "  📈 System Metrics:  http://localhost:8000/api/system-metrics"
echo "  📋 Recent Trades:   http://localhost:8000/api/trades"
echo ""
echo "📝 Log Files:"
echo "  📄 Dashboard:       logs/dashboard-server.log"
echo "  📄 Frontend:        logs/frontend-server.log"
echo "  📄 Pair Discovery:  logs/pair-discovery.log"
echo "  📄 Dataset Builder: logs/dataset-builder.log"
echo "  📄 Training Loop:   logs/training-loop.log"
echo "  📄 Shadow Deploy:   logs/shadow-deployment.log"
echo ""
log "${GREEN}🚀 Your autonomous trading system is now LIVE!${NC}"
echo ""
echo "💡 Next Steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Navigate to the Dashboard page"
echo "  3. Monitor real-time trading data"
echo "  4. Watch the autonomous system discover pairs and execute trades"
echo ""
echo "🛑 To stop the system: ./scripts/stop-autonomous-system.sh" 