#!/bin/bash

# Autonomous Trading System Stop Script
# Stops all components of the autonomous trading system

set -e

echo "🛑 Stopping Autonomous Trading System..."

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

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if is_running "$pid"; then
            log "🛑 Stopping $service_name (PID: $pid)..."
            kill "$pid"
            rm -f "$pid_file"
            log "✅ $service_name stopped"
        else
            log "⚠️  $service_name not running (PID: $pid)"
            rm -f "$pid_file"
        fi
    else
        log "⚠️  PID file not found for $service_name"
    fi
}

# Stop Dashboard Server
kill_by_pid_file ".dashboard-server.pid" "Dashboard Server"

# Stop Frontend Server
kill_by_pid_file ".frontend-server.pid" "Frontend Server"

# Kill any remaining node processes for our servers
log "🛑 Stopping any remaining server processes..."
pkill -f "dashboard-server.js" || true
pkill -f "vite" || true

# Remove cron jobs
log "📅 Removing scheduled jobs..."
crontab -l 2>/dev/null | grep -v "scripts/pair_discovery_simple.js" | crontab - || true
crontab -l 2>/dev/null | grep -v "auto_dataset_builder.js" | crontab - || true
crontab -l 2>/dev/null | grep -v "continuous_training_loop.js" | crontab - || true
crontab -l 2>/dev/null | grep -v "live_shadow_deployment.js" | crontab - || true

# Clean up PID files
rm -f .dashboard-server.pid .frontend-server.pid

log "${GREEN}✅ Autonomous Trading System stopped successfully!${NC}"
echo ""
echo "📊 System Status:"
echo "  ❌ Dashboard Server: Stopped"
echo "  ❌ Frontend Server:  Stopped"
echo "  ✅ Redis:           Still running (use 'redis-cli shutdown' to stop)"
echo "  ❌ Pair Discovery:  Stopped"
echo "  ❌ Dataset Builder: Stopped"
echo "  ❌ Training Loop:   Stopped"
echo "  ❌ Shadow Deploy:   Stopped"
echo ""
echo "💡 To restart the system: ./scripts/start-autonomous-system.sh" 