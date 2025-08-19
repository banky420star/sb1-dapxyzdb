# Push Railway Deployment Fixes
# Copy and paste this into a NEW terminal window

Write-Host "🔧 Pushing Railway deployment fixes..." -ForegroundColor Green

# Add the updated files
git add railway-backend/server.js
git add railway-backend/package.json
git add railway-backend/railway.json

# Commit the changes
git commit -m "fix: update server for Railway compatibility - ES modules, simplified dependencies, proper port binding"

# Push to trigger Railway redeploy
Write-Host "🚀 Pushing to trigger Railway redeploy..." -ForegroundColor Yellow
git push origin railway-deployment

Write-Host "✅ Changes pushed! Railway should automatically redeploy." -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Test in 2-3 minutes:" -ForegroundColor Cyan
Write-Host "curl https://sb1-dapxyzdb-trade-shit.up.railway.app/health"
Write-Host "curl https://sb1-dapxyzdb-trade-shit.up.railway.app/api/status" 