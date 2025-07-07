#!/bin/bash

echo "🔧 Docker Troubleshooting & Fix Script"
echo "====================================="
echo ""

# Check disk space
echo "📊 Checking disk space..."
df -h /var/lib/docker 2>/dev/null || df -h .

echo ""
echo "🐳 Docker Cleanup Commands:"
echo ""

# Clean Docker
echo "1. Clean up Docker system (removes unused data):"
echo "   docker system prune -a --volumes"
echo ""

echo "2. Reset Docker Desktop (if using Docker Desktop):"
echo "   - Open Docker Desktop"
echo "   - Go to Settings → Troubleshoot"
echo "   - Click 'Clean / Purge data'"
echo "   - Or click 'Reset to factory defaults'"
echo ""

echo "3. Alternative: Build without cache:"
echo "   docker-compose build --no-cache --parallel"
echo ""

echo "🚀 QUICK FIX - Deploy WITHOUT Docker:"
echo "======================================"
echo ""
echo "Since you're having Docker issues, let's deploy directly:"
echo ""
echo "Option 1: Use the Node.js deployment we prepared:"
echo "   ./deploy-node.sh"
echo ""
echo "Option 2: Deploy to Railway (no Docker needed):"
echo "   npm install -g @railway/cli"
echo "   railway login"
echo "   railway up"
echo ""
echo "Option 3: Deploy to Render.com:"
echo "   - Push your code to GitHub"
echo "   - Connect at render.com"
echo "   - It will build and deploy automatically"
echo ""

# Create a minimal Dockerfile as alternative
cat > Dockerfile.minimal << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy only essential files first
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# Copy application files
COPY server ./server
COPY dist ./dist
COPY .env .env

# Create directories
RUN mkdir -p data logs models

# Start the application
CMD ["node", "server/index.js"]
EOF

echo "✅ Created Dockerfile.minimal for a lighter build"
echo ""
echo "Try: docker build -f Dockerfile.minimal -t trading-app ."