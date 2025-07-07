#!/bin/bash

echo "🏗️ Setting up AI Trading System on server..."
cd /root && mkdir -p ai-trading-system && cd ai-trading-system

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update && apt-get install -y curl wget git docker.io docker-compose nodejs npm

# Start Docker
systemctl start docker && systemctl enable docker

# Create environment
cat > .env << 'ENV_EOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MAX_DRAWDOWN=0.15
ALPHA_VANTAGE_API_KEY=1RK56LEJ7T4E4IA8
ENABLE_LIVE_DATA=true
DATA_UPDATE_INTERVAL=1000
ENV_EOF

# Create Docker Compose
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'
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
      - ALPHA_VANTAGE_API_KEY=1RK56LEJ7T4E4IA8
    working_dir: /app
    volumes:
      - ./:/app
    command: sh -c "npm install && npm start"
    deploy:
      resources:
        limits:
          cpus: '1.5'
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
          cpus: '0.3'
          memory: 512M
COMPOSE_EOF

# Create package.json
cat > package.json << 'PKG_EOF'
{
  "name": "ai-trading-system",
  "version": "1.0.0",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0"
  }
}
PKG_EOF

# Create server
mkdir -p server frontend
cat > server/index.js << 'SERVER_EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.TRADING_MODE || 'paper',
    api_key_configured: process.env.ALPHA_VANTAGE_API_KEY ? 'yes' : 'no',
    server: '45.76.136.30 (London)',
    version: '1.0.0'
  });
});

app.post('/api/command', (req, res) => {
  const { command } = req.body;
  console.log('Command received:', command);
  res.json({ 
    success: true, 
    command, 
    message: `Command "${command}" received in paper trading mode`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Trading System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://45.76.136.30:3000`);
  console.log(`🔧 API: http://45.76.136.30:8000`);
});
SERVER_EOF

# Create frontend
cat > frontend/package.json << 'FRONT_PKG_EOF'
{
  "name": "trading-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "vite": "^4.4.0"
  }
}
FRONT_PKG_EOF

cat > frontend/index.html << 'HTML_EOF'
<!DOCTYPE html>
<html>
<head>
    <title>AI Trading System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .card { background: #2a2a2a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .success { color: #28a745; }
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
            <p class="success">✅ Online - Paper Trading Mode</p>
            <p><strong>Server:</strong> 45.76.136.30 (London)</p>
            <p><strong>API:</strong> http://45.76.136.30:8000</p>
            <p><strong>MT5 Ports:</strong> 5555 (Command), 5556 (Data)</p>
        </div>
        
        <div class="card">
            <h2>Quick Actions</h2>
            <button class="btn" onclick="startTrading()">Start Paper Trading</button>
            <button class="btn" onclick="checkHealth()">Check Health</button>
        </div>
    </div>
    
    <script>
        async function startTrading() {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: 'start trading' })
            });
            const result = await response.json();
            alert('Trading started: ' + result.message);
        }
        
        async function checkHealth() {
            const response = await fetch('/api/health');
            const result = await response.json();
            alert('Health: ' + JSON.stringify(result, null, 2));
        }
    </script>
</body>
</html>
HTML_EOF

cat > frontend/vite.config.js << 'VITE_EOF'
import { defineConfig } from 'vite'
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
VITE_EOF

# Setup firewall
ufw allow 22 && ufw allow 8000 && ufw allow 3000 && ufw allow 5555 && ufw allow 5556 && ufw --force enable

# Deploy
echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services..."
sleep 30

echo ""
echo "🎉 AI TRADING SYSTEM IS LIVE!"
echo "============================="
echo "📊 Dashboard: http://45.76.136.30:3000"
echo "�� API Health: http://45.76.136.30:8000/api/health"
echo "🔌 MT5 Ports: 5555 (Command), 5556 (Data)"
echo "🚀 Ready to trade! 💰"
