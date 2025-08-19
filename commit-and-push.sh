#!/bin/bash

echo "🔧 Committing Railway deployment fixes..."

# Add the updated files
git add railway-backend/server.js
git add railway-backend/package.json
git add railway-backend/railway.json

# Commit the changes
git commit -m "fix: update server for Railway compatibility - ES modules, simplified dependencies, proper port binding"

# Push to trigger Railway redeploy
echo "🚀 Pushing to trigger Railway redeploy..."
git push origin railway-deployment

echo "✅ Changes pushed! Railway should automatically redeploy."
echo ""
echo "🧪 Test in 2-3 minutes:"
echo "curl https://sb1-dapxyzdb-trade-shit.up.railway.app/health"
echo "curl https://sb1-dapxyzdb-trade-shit.up.railway.app/api/status" 