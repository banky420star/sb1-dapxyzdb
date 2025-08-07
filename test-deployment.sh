#!/bin/bash

echo "🧪 Testing MethTrader.xyz Deployment..."

echo "1. Testing DNS resolution..."
nslookup methtrader.xyz

echo -e "\n2. Testing frontend accessibility..."
curl -s -I http://methtrader.xyz | head -5

echo -e "\n3. Testing API health endpoint..."
curl -s http://methtrader.xyz/api/health

echo -e "\n4. Testing training endpoint..."
curl -X POST http://methtrader.xyz/api/models/train \
  -d '{"model":"lstm"}' \
  -H "Content-Type: application/json" \
  --max-time 10

echo -e "\n5. Testing ML signals enable endpoint..."
curl -X POST http://methtrader.xyz/api/signals/enable-ml \
  -H "Content-Type: application/json" \
  --max-time 10

echo -e "\n6. Checking server status..."
ssh root@45.76.136.30 "pm2 status --no-daemon"

echo -e "\n✅ Deployment test complete!"
echo "🌐 Visit: http://methtrader.xyz"
echo "📊 Dashboard: http://methtrader.xyz/dashboard"
echo "💹 Trading: http://methtrader.xyz/trading" 