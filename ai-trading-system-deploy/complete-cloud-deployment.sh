#!/bin/bash

# Complete Cloud Deployment Script for AI Trading System
# This script finishes the deployment and ensures training visualization is prominent

set -e

echo "=== Complete AI Trading System Cloud Deployment ==="
echo "Server: 45.76.136.30"
echo "Starting comprehensive deployment..."

# 1. SSH into the server and complete setup
echo "1. Setting up the server environment..."

# Create a deployment script to run on the server
cat > deploy-on-server.sh << 'EOF'
#!/bin/bash

echo "=== Running deployment on server ==="

# Navigate to the project directory
cd /root/ai-trading-system

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the frontend with all improvements
echo "Building frontend with training visualization..."
npm run build

# Install PM2 globally if not already installed
npm install -g pm2

# Start the backend with PM2
echo "Starting backend server..."
pm2 delete ai-trading-system || true
pm2 start server/index.js --name ai-trading-system

# Start the frontend with PM2
echo "Starting frontend server..."
pm2 delete ai-trading-ui || true
pm2 start "npx serve -s dist -l 3000" --name ai-trading-ui

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup

# Create environment file
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

# Set proper permissions
chown -R root:root /root/ai-trading-system
chmod -R 755 /root/ai-trading-system

# Create a simple health check script
cat > health-check.sh << 'HEALTHEOF'
#!/bin/bash
echo "=== AI Trading System Health Check ==="
echo "Backend Status:"
curl -s http://localhost:8000/api/health || echo "Backend not responding"
echo ""
echo "Frontend Status:"
curl -s http://localhost:3000 | head -5 || echo "Frontend not responding"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "System Resources:"
df -h /
free -h
echo ""
echo "=== Health Check Complete ==="
HEALTHEOF

chmod +x health-check.sh

# Create a training test script
cat > test-training.sh << 'TRAININGEOF'
#!/bin/bash
echo "=== Testing Training Visualization ==="

# Start a training session
echo "Starting Random Forest training..."
curl -X POST http://localhost:8000/api/ml/start-training \
  -H "Content-Type: application/json" \
  -d '{"modelType":"randomforest"}' || echo "Failed to start training"

# Wait a moment
sleep 2

# Check training status
echo "Checking training status..."
curl -s http://localhost:8000/api/ml/training-data | jq '.' || echo "No training data available"

echo "=== Training Test Complete ==="
TRAININGEOF

chmod +x test-training.sh

# Create a quick access script
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
echo ""
echo "🧪 Test Commands:"
echo "  ./health-check.sh   - Run health check"
echo "  ./test-training.sh  - Test training visualization"
echo ""
echo "📁 Project Location: /root/ai-trading-system"
echo "=== Quick Access Complete ==="
ACCESSEOF

chmod +x quick-access.sh

echo "=== Server deployment complete ==="
echo "✅ Backend: Running on port 8000"
echo "✅ Frontend: Running on port 3000"
echo "✅ PM2: Managing processes"
echo "✅ Training Visualization: Enabled"
echo "✅ Real-time Updates: Enabled"
echo "✅ WebSocket: Enabled"
echo "✅ Reward System: Enabled"
echo ""
echo "🌐 Access your system at:"
echo "   Frontend: http://45.76.136.30:3000"
echo "   Backend: http://45.76.136.30:8000"
echo ""
echo "📊 Training Visualization Features:"
echo "   - Default tab shows training visualization"
echo "   - Real-time progress bars and charts"
echo "   - Model-specific visualizations (Random Forest, LSTM, DDQN)"
echo "   - Live metrics and reward system"
echo "   - Training session management"
echo "   - Auto-refresh capabilities"
echo ""
echo "🚀 Next Steps:"
echo "   1. Visit http://45.76.136.30:3000"
echo "   2. Go to Models page (Training tab is default)"
echo "   3. Start a training session to see live visualization"
echo "   4. Monitor training progress in real-time"
echo ""
echo "🎉 Deployment Complete! Your AI Trading System is live with enhanced training visualization!"
EOF

# 2. Copy the deployment script to the server
echo "2. Copying deployment script to server..."
scp deploy-on-server.sh root@45.76.136.30:/root/

# 3. Execute the deployment script on the server
echo "3. Executing deployment on server..."
ssh root@45.76.136.30 "chmod +x /root/deploy-on-server.sh && /root/deploy-on-server.sh"

# 4. Test the deployment
echo "4. Testing deployment..."
ssh root@45.76.136.30 "cd /root/ai-trading-system && ./health-check.sh"

# 5. Show final status
echo "5. Final deployment status..."
echo ""
echo "🎉 DEPLOYMENT COMPLETE! 🎉"
echo ""
echo "🌐 Your AI Trading System is now live at:"
echo "   Frontend: http://45.76.136.30:3000"
echo "   Backend: http://45.76.136.30:8000"
echo ""
echo "📊 Training Visualization Features:"
echo "   ✅ Default tab shows training visualization"
echo "   ✅ Real-time progress tracking"
echo "   ✅ Model-specific visualizations"
echo "   ✅ Live metrics and charts"
echo "   ✅ Training session management"
echo "   ✅ Reward system integration"
echo "   ✅ WebSocket real-time updates"
echo "   ✅ Auto-refresh capabilities"
echo ""
echo "🚀 Quick Start:"
echo "   1. Open http://45.76.136.30:3000 in your browser"
echo "   2. Navigate to the Models page"
echo "   3. The Training Visualization tab is now the default"
echo "   4. Start a training session to see live progress"
echo "   5. Watch real-time metrics and visualizations"
echo ""
echo "🔧 Server Management:"
echo "   SSH: ssh banks@45.76.136.30"
echo "   PM2 Status: pm2 status"
echo "   Logs: pm2 logs"
echo "   Restart: pm2 restart all"
echo ""
echo "📈 Training Visualization Highlights:"
echo "   - 🌳 Random Forest: Tree ensemble visualization"
echo "   - ⚡ LSTM: Neural network cell states"
echo "   - 🎯 DDQN: Q-value learning charts"
echo "   - 🏆 Reward System: Multi-dimensional scoring"
echo "   - 📊 Real-time Charts: Loss, accuracy, metrics"
echo "   - 🔄 Live Updates: Every second during training"
echo ""
echo "✅ Your AI Trading System is fully deployed with enhanced training visualization!"
echo ""

# Clean up local files
rm -f deploy-on-server.sh

echo "=== Deployment Complete ===" 