#!/bin/bash

echo "🧪 Testing server locally before Railway deployment..."
echo ""

# Change to railway-backend directory
cd railway-backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start server in background
echo "🚀 Starting server..."
node server.js &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Test health endpoint
echo "🔍 Testing /health endpoint..."
curl -s http://localhost:8000/health | jq . || echo "Health check failed"

# Test status endpoint
echo "🔍 Testing /api/status endpoint..."
curl -s http://localhost:8000/api/status | jq . || echo "Status check failed"

# Test trade execution
echo "🔍 Testing /api/trade/execute endpoint..."
curl -s -X POST http://localhost:8000/api/trade/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"buy","confidence":0.9}' | jq . || echo "Trade execution failed"

# Stop server
echo "🛑 Stopping server..."
kill $SERVER_PID

echo ""
echo "✅ Local test complete!"
echo "🚀 Ready to deploy to Railway." 