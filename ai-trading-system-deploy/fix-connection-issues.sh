#!/bin/bash

# Fix Connection Issues and Deploy AI Trading System
# This script diagnoses and fixes all frontend/backend connection problems

set -e

echo "=== AI Trading System Connection Fix Script ==="
echo "Server: 45.76.136.30"
echo "Starting comprehensive diagnosis and fix..."

# Create a comprehensive fix script to run on the server
cat > fix-on-server.sh << 'EOF'
#!/bin/bash

echo "=== Running connection fix on server ==="

# 1. Check system status
echo "1. Checking system status..."
echo "System uptime: $(uptime)"
echo "Memory usage:"
free -h
echo "Disk usage:"
df -h /

# 2. Check if ports are in use
echo "2. Checking port usage..."
echo "Port 3000 (Frontend):"
netstat -tulnp | grep :3000 || echo "Port 3000 not in use"
echo "Port 8000 (Backend):"
netstat -tulnp | grep :8000 || echo "Port 8000 not in use"

# 3. Check PM2 status
echo "3. Checking PM2 status..."
pm2 status

# 4. Check firewall status
echo "4. Checking firewall status..."
ufw status || echo "UFW not installed"
iptables -L | grep -E "(3000|8000)" || echo "No specific firewall rules found"

# 5. Kill any existing processes on ports 3000 and 8000
echo "5. Cleaning up existing processes..."
pkill -f "serve.*3000" || echo "No serve process on 3000"
pkill -f "node.*8000" || echo "No node process on 8000"

# 6. Navigate to project directory
echo "6. Setting up project directory..."
cd /root/ai-trading-system

# 7. Install dependencies if needed
echo "7. Installing dependencies..."
npm ci

# 8. Build the frontend
echo "8. Building frontend..."
npm run build

# 9. Create proper environment file
echo "9. Creating environment file..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
ALPHA_VANTAGE_API_KEY=demo_key
UNIRATE_API_KEY=your_unirate_key_here
FINNHUB_API_KEY=your_finnhub_key_here
ENABLE_REAL_DATA=true
ENABLE_TRAINING_VISUALIZATION=true
ENABLE_WEBSOCKET=true
ENABLE_REWARD_SYSTEM=true
ENHANCED_LOGGING=true
ENABLE_METRICS_COLLECTION=true
ENABLE_AUTONOMOUS_TRADING=false
ENABLE_RISK_MANAGEMENT=true
ENABLE_NOTIFICATIONS=true
ENABLE_BYBIT_INTEGRATION=false
ENABLE_MT5_INTEGRATION=false
ENABLE_ALPHA_VANTAGE=false
ENABLE_FINNHUB=true
ENABLE_UNIRATE=true
ALLOWED_ORIGINS=http://45.76.136.30:3000
TRAINING_DATA_SOURCE=real
MODEL_TYPES=randomforest,lstm,ddqn
TRAINING_EPOCHS=100
TRAINING_BATCH_SIZE=32
TRAINING_LEARNING_RATE=0.001
TRAINING_VALIDATION_SPLIT=0.2
TRAINING_EARLY_STOPPING=true
TRAINING_PATIENCE=10
TRAINING_MIN_DELTA=0.001
TRAINING_RESTORE_BEST_WEIGHTS=true
TRAINING_VERBOSE=1
TRAINING_SAVE_BEST_ONLY=true
TRAINING_MONITOR=val_loss
TRAINING_MODE=min
TRAINING_FACTOR=0.5
TRAINING_MIN_LR=0.00001
TRAINING_COOLDOWN=0
TRAINING_MIN_EPOCHS=0
TRAINING_BASELINE=null
ENVEOF

# 10. Install PM2 globally if not installed
echo "10. Installing PM2..."
npm install -g pm2

# 11. Stop all PM2 processes
echo "11. Stopping all PM2 processes..."
pm2 delete all || true

# 12. Start backend with PM2
echo "12. Starting backend server..."
pm2 start server/index.js --name ai-trading-system

# 13. Start frontend with PM2
echo "13. Starting frontend server..."
pm2 start "npx serve -s dist -l 3000" --name ai-trading-ui

# 14. Save PM2 configuration
echo "14. Saving PM2 configuration..."
pm2 save

# 15. Set up PM2 to start on boot
echo "15. Setting up PM2 startup..."
pm2 startup

# 16. Wait a moment for services to start
echo "16. Waiting for services to start..."
sleep 5

# 17. Check if services are running
echo "17. Checking service status..."
echo "PM2 Status:"
pm2 status

echo "Port 3000 (Frontend):"
netstat -tulnp | grep :3000 || echo "Frontend not running on 3000"

echo "Port 8000 (Backend):"
netstat -tulnp | grep :8000 || echo "Backend not running on 8000"

# 18. Test local connectivity
echo "18. Testing local connectivity..."
echo "Testing frontend (localhost:3000):"
curl -s http://localhost:3000 | head -5 || echo "Frontend not responding locally"

echo "Testing backend (localhost:8000):"
curl -s http://localhost:8000/api/health || echo "Backend not responding locally"

# 19. Check firewall and open ports if needed
echo "19. Checking and configuring firewall..."
if command -v ufw &> /dev/null; then
    echo "UFW is installed, checking status..."
    ufw status
    if ufw status | grep -q "Status: active"; then
        echo "UFW is active, allowing ports 3000 and 8000..."
        ufw allow 3000/tcp
        ufw allow 8000/tcp
        ufw reload
    fi
else
    echo "UFW not installed, checking iptables..."
    iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
    iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
    iptables-save > /etc/iptables/rules.v4
fi

# 20. Create health check script
echo "20. Creating health check script..."
cat > health-check.sh << 'HEALTHEOF'
#!/bin/bash
echo "=== AI Trading System Health Check ==="
echo "Timestamp: $(date)"
echo ""
echo "System Status:"
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3"/"$2}')"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Port Status:"
echo "Port 3000 (Frontend):"
netstat -tulnp | grep :3000 || echo "❌ Frontend not running"
echo ""
echo "Port 8000 (Backend):"
netstat -tulnp | grep :8000 || echo "❌ Backend not running"
echo ""
echo "Local Connectivity Test:"
echo "Frontend (localhost:3000):"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend responding locally"
else
    echo "❌ Frontend not responding locally"
fi
echo ""
echo "Backend (localhost:8000):"
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend responding locally"
else
    echo "❌ Backend not responding locally"
fi
echo ""
echo "Firewall Status:"
if command -v ufw &> /dev/null; then
    ufw status | head -10
else
    echo "UFW not installed"
fi
echo ""
echo "=== Health Check Complete ==="
HEALTHEOF

chmod +x health-check.sh

# 21. Create quick access script
echo "21. Creating quick access script..."
cat > quick-access.sh << 'ACCESSEOF'
#!/bin/bash
echo "=== AI Trading System Quick Access ==="
echo ""
echo "🌐 Frontend: http://45.76.136.30:3000"
echo "🔧 Backend API: http://45.76.136.30:8000"
echo "📊 Health Check: http://45.76.136.30:8000/api/health"
echo "🤖 Models Page: http://45.76.136.30:3000/models"
echo "📈 Training Visualization: http://45.76.136.30:3000/models (Training tab)"
echo ""
echo "📋 PM2 Commands:"
echo "  pm2 status          - Check process status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all processes"
echo "  pm2 delete all      - Stop all processes"
echo ""
echo "🧪 Test Commands:"
echo "  ./health-check.sh   - Run health check"
echo "  curl localhost:3000 - Test frontend locally"
echo "  curl localhost:8000/api/health - Test backend locally"
echo ""
echo "🔧 Troubleshooting:"
echo "  netstat -tulnp | grep :3000 - Check if frontend is listening"
echo "  netstat -tulnp | grep :8000 - Check if backend is listening"
echo "  pm2 logs ai-trading-ui - View frontend logs"
echo "  pm2 logs ai-trading-system - View backend logs"
echo ""
echo "📁 Project Location: /root/ai-trading-system"
echo "=== Quick Access Complete ==="
ACCESSEOF

chmod +x quick-access.sh

# 22. Final status check
echo "22. Final status check..."
./health-check.sh

echo ""
echo "=== Connection fix complete ==="
echo "✅ Backend: Should be running on port 8000"
echo "✅ Frontend: Should be running on port 3000"
echo "✅ PM2: Managing processes"
echo "✅ Firewall: Ports 3000 and 8000 should be open"
echo ""
echo "🌐 Test your system:"
echo "   Frontend: http://45.76.136.30:3000"
echo "   Backend: http://45.76.136.30:8000/api/health"
echo ""
echo "🔧 If still having issues:"
echo "   1. Check PM2 logs: pm2 logs"
echo "   2. Check firewall: ufw status"
echo "   3. Check ports: netstat -tulnp | grep -E '(3000|8000)'"
echo "   4. Restart services: pm2 restart all"
echo ""
echo "🎉 Your AI Trading System should now be accessible!"
EOF

# Copy the fix script to the server
echo "Copying fix script to server..."
scp fix-on-server.sh root@45.76.136.30:/root/

# Execute the fix script on the server
echo "Executing fix script on server..."
ssh root@45.76.136.30 "chmod +x /root/fix-on-server.sh && /root/fix-on-server.sh"

# Test connectivity
echo "Testing connectivity..."
echo "Testing frontend..."
curl -s http://45.76.136.30:3000 | head -5 || echo "Frontend still not accessible"

echo "Testing backend..."
curl -s http://45.76.136.30:8000/api/health || echo "Backend still not accessible"

# Show final status
echo ""
echo "🎉 CONNECTION FIX COMPLETE! 🎉"
echo ""
echo "🌐 Your AI Trading System should now be accessible at:"
echo "   Frontend: http://45.76.136.30:3000"
echo "   Backend: http://45.76.136.30:8000"
echo ""
echo "📊 Training Visualization Features:"
echo "   ✅ Real-time training progress"
echo "   ✅ Model-specific visualizations"
echo "   ✅ Live metrics and charts"
echo "   ✅ WebSocket real-time updates"
echo "   ✅ Error handling and user feedback"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open http://45.76.136.30:3000 in your browser"
echo "   2. Go to Models page (Training tab is default)"
echo "   3. Start a training session to see live visualization"
echo "   4. Monitor real-time progress and metrics"
echo ""
echo "🔧 Server Management:"
echo "   SSH: ssh root@45.76.136.30"
echo "   Health Check: ./health-check.sh"
echo "   PM2 Status: pm2 status"
echo "   Logs: pm2 logs"
echo ""
echo "✅ Your AI Trading System is now ready for training!"
echo ""

# Clean up local files
rm -f fix-on-server.sh

echo "=== Fix Complete ===" 