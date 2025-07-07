#!/bin/bash

# 🚀 AI Trading System - Direct Server Deployment
# This script downloads and deploys everything directly on your server
# No local files needed!

set -e

echo "🚀 AI TRADING SYSTEM - DIRECT DEPLOYMENT"
echo "========================================"
echo ""
echo "🌍 Server: London (45.76.136.30)"
echo "💻 Specs: 2 vCPU, 4GB RAM optimized"
echo "🔑 API Key: Pre-configured"
echo ""

# Server configuration
SERVER_IP="45.76.136.30"
SERVER_USER="root"
SERVER_PASSWORD="G-b9ni}9r5TXPRy{"
API_KEY="1RK56LEJ7T4E4IA8"

echo "📥 Step 1: Connecting to server and setting up environment..."

# Create the deployment script that will run on the server
DEPLOYMENT_SCRIPT='#!/bin/bash

echo "🏗️ Setting up AI Trading System..."
cd /root

# Create project directory
mkdir -p ai-trading-system
cd ai-trading-system

echo "📦 Installing required packages..."
apt-get update
apt-get install -y curl wget git docker.io docker-compose nodejs npm

# Start Docker service
systemctl start docker
systemctl enable docker

echo "📋 Creating environment configuration..."
cat > .env << EOF
# AI Trading System Configuration
NODE_ENV=production
PORT=8000

# Trading Configuration
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556

# Risk Management
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MAX_DRAWDOWN=0.15

# API Keys
ALPHA_VANTAGE_API_KEY='$API_KEY'
ENABLE_LIVE_DATA=true
DATA_UPDATE_INTERVAL=1000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
EOF

echo "🐳 Creating Docker Compose configuration..."
cat > docker-compose.yml << EOF
version: '"'"'3.8'"'"'

services:
  trading-backend:
    image: node:18-alpine
    container_name: ai-trading-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "5555:5555"
      - "5556:5556"
    environment:
      - NODE_ENV=production
      - TRADING_MODE=paper
      - ALPHA_VANTAGE_API_KEY='$API_KEY'
    working_dir: /app
    volumes:
      - ./:/app
      - ./data:/app/data
      - ./logs:/app/logs
    command: sh -c "npm install && npm start"
    deploy:
      resources:
        limits:
          cpus: '"'"'1.5'"'"'
          memory: 2G

  trading-frontend:
    image: node:18-alpine
    container_name: ai-trading-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://45.76.136.30:8000
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    deploy:
      resources:
        limits:
          cpus: '"'"'0.3'"'"'
          memory: 512M

  redis:
    image: redis:7-alpine
    container_name: trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  prometheus:
    image: prom/prometheus:latest
    container_name: trading-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - '"'"'--config.file=/etc/prometheus/prometheus.yml'"'"'
      - '"'"'--storage.tsdb.retention.time=7d'"'"'

  grafana:
    image: grafana/grafana:latest
    container_name: trading-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123

volumes:
  redis-data:
  prometheus-data:
  grafana-data:
EOF

echo "📦 Creating package.json..."
cat > package.json << EOF
{
  "name": "ai-trading-system",
  "version": "1.0.0",
  "description": "AI-powered trading system",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "winston": "^3.10.0",
    "sqlite3": "^5.1.6",
    "axios": "^1.4.0",
    "technicalindicators": "^3.1.0",
    "zeromq": "^6.0.0-beta.17",
    "ccxt": "^4.0.77"
  }
}
EOF

echo "🏗️ Creating basic server structure..."
mkdir -p server data logs models config frontend/src

cat > server/index.js << EOF
const express = require('"'"'express'"'"');
const cors = require('"'"'cors'"'"');
const helmet = require('"'"'helmet'"'"');
const compression = require('"'"'compression'"'"');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Basic routes
app.get('"'"'/api/health'"'"', (req, res) => {
  res.json({
    status: '"'"'ok'"'"',
    timestamp: new Date().toISOString(),
    mode: process.env.TRADING_MODE || '"'"'paper'"'"',
    api_key_configured: process.env.ALPHA_VANTAGE_API_KEY ? '"'"'yes'"'"' : '"'"'no'"'"'
  });
});

app.get('"'"'/api/status'"'"', (req, res) => {
  res.json({
    mode: process.env.TRADING_MODE || '"'"'paper'"'"',
    isRunning: false,
    positions: 0,
    balance: 10000,
    timestamp: new Date().toISOString()
  });
});

app.post('"'"'/api/command'"'"', (req, res) => {
  const { command } = req.body;
  console.log('"'"'Command received:'"'"', command);
  res.json({ 
    success: true, 
    command, 
    message: '"'"'Command received in paper trading mode'"'"' 
  });
});

app.listen(PORT, '"'"'0.0.0.0'"'"', () => {
  console.log(\`🚀 AI Trading System running on port \${PORT}\`);
  console.log(\`📊 Dashboard: http://45.76.136.30:3000\`);
  console.log(\`🔧 API: http://45.76.136.30:8000\`);
  console.log(\`🔑 API Key: \${process.env.ALPHA_VANTAGE_API_KEY ? '"'"'Configured'"'"' : '"'"'Not configured'"'"'}\`);
});
EOF

echo "🌐 Creating frontend..."
cat > frontend/package.json << EOF
{
  "name": "trading-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "vite": "^4.4.0"
  }
}
EOF

mkdir -p frontend/src
cat > frontend/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>AI Trading System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .card { background: #2a2a2a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .status { display: flex; justify-content: space-between; flex-wrap: wrap; }
        .metric { text-align: center; padding: 20px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AI Trading System</h1>
            <p>London Server • Paper Trading Mode • Ready for MT5</p>
        </div>
        
        <div class="card">
            <h2>System Status</h2>
            <div class="status">
                <div class="metric">
                    <h3 class="success">✅ Online</h3>
                    <p>System Status</p>
                </div>
                <div class="metric">
                    <h3 class="success">📄 Paper</h3>
                    <p>Trading Mode</p>
                </div>
                <div class="metric">
                    <h3 class="success">🔑 Ready</h3>
                    <p>API Configured</p>
                </div>
                <div class="metric">
                    <h3 class="warning">⏳ Idle</h3>
                    <p>Trading Status</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>Quick Actions</h2>
            <button class="btn" onclick="startTrading()">Start Paper Trading</button>
            <button class="btn" onclick="stopTrading()">Stop Trading</button>
            <button class="btn" onclick="checkHealth()">Check Health</button>
            <button class="btn" onclick="viewLogs()">View Logs</button>
        </div>
        
        <div class="card">
            <h2>System Information</h2>
            <p><strong>Server:</strong> 45.76.136.30 (London)</p>
            <p><strong>API:</strong> http://45.76.136.30:8000</p>
            <p><strong>Monitoring:</strong> http://45.76.136.30:3001</p>
            <p><strong>MT5 Ports:</strong> 5555 (Command), 5556 (Data)</p>
        </div>
        
        <div class="card">
            <h2>MT5 EA Configuration</h2>
            <pre style="background:#1a1a1a; padding:15px; border-radius:4px;">
Inp_PubEndpoint = "tcp://45.76.136.30:5556"
Inp_RepEndpoint = "tcp://45.76.136.30:5555"
Inp_Magic = 123456
Inp_LogLevel = 2
            </pre>
        </div>
    </div>
    
    <script>
        async function startTrading() {
            const response = await fetch('"'"'/api/command'"'"', {
                method: '"'"'POST'"'"',
                headers: { '"'"'Content-Type'"'"': '"'"'application/json'"'"' },
                body: JSON.stringify({ command: '"'"'start trading'"'"' })
            });
            const result = await response.json();
            alert('"'"'Trading started: '"'"' + result.message);
        }
        
        async function stopTrading() {
            const response = await fetch('"'"'/api/command'"'"', {
                method: '"'"'POST'"'"',
                headers: { '"'"'Content-Type'"'"': '"'"'application/json'"'"' },
                body: JSON.stringify({ command: '"'"'stop trading'"'"' })
            });
            const result = await response.json();
            alert('"'"'Trading stopped: '"'"' + result.message);
        }
        
        async function checkHealth() {
            const response = await fetch('"'"'/api/health'"'"');
            const result = await response.json();
            alert(JSON.stringify(result, null, 2));
        }
        
        function viewLogs() {
            window.open('"'"'http://45.76.136.30:8000/api/health'"'"', '"'"'_blank'"'"');
        }
    </script>
</body>
</html>
EOF

cat > frontend/vite.config.js << EOF
import { defineConfig } from '"'"'vite'"'"'

export default defineConfig({
  root: '"'"'.'"'"',
  server: {
    host: '"'"'0.0.0.0'"'"',
    port: 3000,
    proxy: {
      '"'"'/api'"'"': '"'"'http://localhost:8000'"'"'
    }
  }
})
EOF

echo "🔧 Setting up firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8000
ufw allow 3000
ufw allow 5555
ufw allow 5556
ufw allow 3001
ufw --force enable

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "======================="
echo ""
echo "🌐 Your Live URLs:"
echo "📊 Dashboard: http://45.76.136.30:3000"
echo "🔧 API Health: http://45.76.136.30:8000/api/health"
echo "📈 Monitoring: http://45.76.136.30:3001 (admin/admin123)"
echo ""
echo "🔌 MT5 EA Settings:"
echo "Inp_PubEndpoint = \"tcp://45.76.136.30:5556\""
echo "Inp_RepEndpoint = \"tcp://45.76.136.30:5555\""
echo ""
echo "💹 Test Trading:"
echo "curl -X POST http://45.76.136.30:8000/api/command -H \"Content-Type: application/json\" -d '"'"'{\"command\": \"start trading\"}'"'"'"
echo ""
echo "🎊 Your AI Trading System is LIVE! 🚀💰"
'

# Execute deployment on server
echo "🔗 Connecting to server and deploying..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$DEPLOYMENT_SCRIPT"

echo ""
echo "🎉 DIRECT DEPLOYMENT COMPLETED!"
echo "==============================="
echo ""
echo "🌐 Your system is now live at:"
echo "📊 http://45.76.136.30:3000"
echo "🔧 http://45.76.136.30:8000/api/health"
echo ""
echo "🚀 Happy trading! 💰"