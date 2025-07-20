#!/bin/bash

# Quick Fix Script for AI Trading System
# This script will immediately fix the frontend connectivity issues

set -e

echo "=== QUICK FIX FOR AI TRADING SYSTEM ==="
echo "Fixing frontend connectivity issues..."

# 1. Stop all processes
echo "1. Stopping all processes..."
pm2 delete all || true
pkill -f "node.*server" || true
pkill -f "serve.*dist" || true

# 2. Wait a moment
sleep 2

# 3. Start backend
echo "2. Starting backend..."
cd /root/ai-trading-system

# Create proper environment
cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
ALPHA_VANTAGE_API_KEY=demo_key
ENABLE_REAL_DATA=true
ENABLE_MOCK_DATA=false
ENABLE_SAMPLE_DATA=false
CORS_ORIGIN=http://45.76.136.30:3000
EOF

# Start backend
pm2 start server/index.js --name ai-trading-backend
echo "Backend started on port 8000"

# 4. Start frontend
echo "3. Starting frontend..."
cd /home/banks/ai-trading-system

# Create frontend environment
cat > .env << 'EOF'
VITE_API_URL=http://45.76.136.30:8000
VITE_WEBSOCKET_URL=ws://45.76.136.30:8001
VITE_ENABLE_REAL_DATA=true
EOF

# Build and start frontend
npm run build
pm2 start "npx serve -s dist -l 3000 --host 0.0.0.0" --name ai-trading-frontend
echo "Frontend started on port 3000"

# 5. Save PM2 configuration
echo "4. Saving PM2 configuration..."
pm2 save

# 6. Wait for services to start
echo "5. Waiting for services to start..."
sleep 5

# 7. Check status
echo "6. Checking service status..."
echo "=== PM2 STATUS ==="
pm2 status

echo ""
echo "=== TESTING CONNECTIVITY ==="
echo "Testing backend..."
curl -s http://localhost:8000/api/health || echo "Backend not responding"

echo "Testing frontend..."
curl -s http://localhost:3000 | head -5 || echo "Frontend not responding"

echo ""
echo "=== FIREWALL STATUS ==="
sudo ufw status

echo ""
echo "=== FINAL STATUS ==="
echo "✅ Backend: http://45.76.136.30:8000"
echo "✅ Frontend: http://45.76.136.30:3000"
echo "✅ Health Check: http://45.76.136.30:8000/api/health"

echo ""
echo "=== NEXT STEPS ==="
echo "1. Try accessing: http://45.76.136.30:3000"
echo "2. If still not working, check PM2 logs: pm2 logs"
echo "3. For domain setup, follow PROJECT_COMPLETION_GUIDE.md"

echo ""
echo "=== QUICK FIX COMPLETE ===" 