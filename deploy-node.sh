#!/bin/bash

# AI Trading System - Node.js Deployment Script
# For platforms like Heroku, Railway, Render, or VPS

set -e

echo "🚀 AI Trading System - Node.js Deployment"
echo "========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file from production template..."
    cat > .env << EOF
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
POSITION_SIZE_LIMIT=0.01
MAX_DAILY_LOSS=0.005
MT5_INTEGRATION=true
ZMQ_COMMAND_PORT=5555
ZMQ_DATA_PORT=5556
ALPHA_VANTAGE_API_KEY=${ALPHA_VANTAGE_API_KEY:-demo}
DATABASE_URL=sqlite://./data/trading.db
ALLOWED_ORIGINS=*
REDIS_URL=${REDIS_URL:-redis://localhost:6379}
EOF
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data logs models config dist

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Create start script for production
echo "📝 Creating production start script..."
cat > start-production.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import backend server
import('./server/index.js');

// Serve frontend from dist
const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(FRONTEND_PORT, () => {
  console.log(`🌐 Frontend running on port ${FRONTEND_PORT}`);
});
EOF

# Create Procfile for Heroku
echo "📝 Creating Procfile..."
echo "web: node start-production.js" > Procfile

# Create Railway configuration
echo "📝 Creating Railway configuration..."
cat > railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node start-production.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Create Render configuration
echo "📝 Creating Render configuration..."
cat > render.yaml << EOF
services:
  - type: web
    name: ai-trading-system
    env: node
    buildCommand: npm install && npm run build
    startCommand: node start-production.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8000
EOF

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "🚀 DEPLOYMENT OPTIONS:"
echo ""
echo "1️⃣ Railway (Recommended - Easy & Free tier):"
echo "   - Install Railway CLI: npm install -g @railway/cli"
echo "   - Login: railway login"
echo "   - Deploy: railway up"
echo ""
echo "2️⃣ Render (Easy with free tier):"
echo "   - Connect GitHub repo at https://render.com"
echo "   - Select 'Web Service'"
echo "   - It will auto-detect render.yaml"
echo ""
echo "3️⃣ Heroku (Professional):"
echo "   - heroku create your-app-name"
echo "   - git push heroku main"
echo ""
echo "4️⃣ VPS (Full control):"
echo "   - scp -r . user@your-server:/path/to/app"
echo "   - ssh user@your-server"
echo "   - cd /path/to/app && npm install"
echo "   - pm2 start start-production.js"
echo ""
echo "📋 IMPORTANT: After deployment, update your .env with:"
echo "   - ALPHA_VANTAGE_API_KEY (get free at alphavantage.co)"
echo "   - Update ALLOWED_ORIGINS with your domain"
echo ""
echo "🔗 Your app will be available at:"
echo "   - Backend API: https://your-domain.com:8000"
echo "   - Frontend: https://your-domain.com:3000"