#!/bin/bash

# 🚀 Autonomous Trading System Startup Script
# This script starts the fully autonomous AI trading system

echo "🤖 Starting Autonomous Trading System..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one from env.example"
    exit 1
fi

# Check if autonomous config exists
if [ ! -f "autonomous-config.json" ]; then
    echo "❌ Error: autonomous-config.json not found"
    exit 1
fi

# Check disk space
DISK_SPACE=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_SPACE" -gt 90 ]; then
    echo "⚠️  Warning: Low disk space ($DISK_SPACE%). Consider cleaning up."
fi

# Kill any existing processes
echo "🔄 Stopping any existing processes..."
pkill -f "node server/index.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Clean up old logs
echo "🧹 Cleaning up old logs..."
rm -f logs/*.log
mkdir -p logs

# Check dependencies
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Start the autonomous system
echo "🚀 Starting autonomous trading system..."
echo "========================================"
echo "🤖 System will be fully autonomous once started"
echo "📊 Dashboard will be available at: http://localhost:4173"
echo "🔧 API will be available at: http://localhost:8000"
echo "📱 MT5 Integration: Enabled (if MT5 is running)"
echo "========================================"

# Start the server in the background
npm run server &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Server is running successfully"
else
    echo "❌ Server failed to start"
    exit 1
fi

# Start frontend preview
echo "🌐 Starting frontend..."
npm run preview &
PREVIEW_PID=$!

# Wait for frontend to start
sleep 5

# Check if frontend is running
if curl -s http://localhost:4173 > /dev/null; then
    echo "✅ Frontend is running successfully"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 AUTONOMOUS TRADING SYSTEM IS NOW RUNNING!"
echo "============================================="
echo "🤖 Status: FULLY AUTONOMOUS"
echo "📊 Dashboard: http://localhost:4173"
echo "🔧 API: http://localhost:8000"
echo "📈 Trading: AUTOMATED"
echo "🧠 AI Models: TRAINING AUTOMATICALLY"
echo "📊 Data: FETCHING AUTOMATICALLY"
echo "⚠️  Risk Management: ACTIVE"
echo "============================================="
echo ""
echo "📋 System Features:"
echo "• 🤖 Fully autonomous trading"
echo "• 🧠 AI model training and retraining"
echo "• 📊 Real-time market data"
echo "• ⚠️  Risk management and monitoring"
echo "• 🔄 Automatic system health checks"
echo "• 🚨 Emergency stop protection"
echo "• 📱 MT5 integration (if available)"
echo ""
echo "🛑 To stop the system:"
echo "   Press Ctrl+C or run: pkill -f 'node server/index.js'"
echo ""
echo "📊 Monitor the system:"
echo "   • Check logs: tail -f logs/combined.log"
echo "   • View status: curl http://localhost:8000/api/status"
echo "   • Dashboard: http://localhost:4173"
echo ""

# Function to handle shutdown
cleanup() {
    echo ""
    echo "🔄 Shutting down autonomous trading system..."
    
    # Stop the server
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    
    # Stop the preview
    if [ ! -z "$PREVIEW_PID" ]; then
        kill $PREVIEW_PID 2>/dev/null
    fi
    
    # Kill any remaining processes
    pkill -f "node server/index.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    
    echo "✅ Autonomous trading system stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
echo "🔄 System is running. Press Ctrl+C to stop."
while true; do
    sleep 60
    
    # Check if server is still running
    if ! curl -s http://localhost:8000/api/health > /dev/null; then
        echo "❌ Server has stopped unexpectedly"
        break
    fi
    
    # Check if frontend is still running
    if ! curl -s http://localhost:4173 > /dev/null; then
        echo "❌ Frontend has stopped unexpectedly"
        break
    fi
    
    echo "✅ System health check passed - $(date)"
done

cleanup 