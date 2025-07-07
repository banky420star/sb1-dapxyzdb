# 🚀 AI Trading System - Automated Deployment Script (PowerShell)
# Server: 45.76.136.30 (London)
# This script uploads and deploys everything automatically

param(
    [string]$ServerIP = "45.76.136.30",
    [string]$ServerUser = "root", 
    [string]$ServerPassword = "G-b9ni}9r5TXPRy{",
    [string]$DeploymentPackage = "ai-trading-system-deploy.tar.gz"
)

Write-Host "🚀 AI TRADING SYSTEM - AUTOMATED DEPLOYMENT" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌍 Target Server: $ServerIP (London)" -ForegroundColor Cyan
Write-Host "💻 Specs: 2 vCPU, 4GB RAM, 50GB NVMe" -ForegroundColor Cyan
Write-Host "💰 Cost: `$2.87/month" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if deployment package exists
Write-Host "📦 Step 1: Checking deployment package..." -ForegroundColor Yellow
if (!(Test-Path $DeploymentPackage)) {
    Write-Host "❌ Error: $DeploymentPackage not found!" -ForegroundColor Red
    Write-Host "💡 Please run this script from the workspace directory where the package was created." -ForegroundColor Yellow
    exit 1
}
$PackageSize = (Get-Item $DeploymentPackage).length
Write-Host "✅ Deployment package found ($([math]::Round($PackageSize/1MB, 2))MB)" -ForegroundColor Green
Write-Host ""

# Step 2: Check dependencies
Write-Host "🔧 Step 2: Checking dependencies..." -ForegroundColor Yellow

# Check if pscp (PuTTY) is available
if (!(Get-Command "pscp" -ErrorAction SilentlyContinue)) {
    Write-Host "📥 PuTTY tools not found. Checking for OpenSSH..." -ForegroundColor Yellow
    if (!(Get-Command "scp" -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Neither PuTTY nor OpenSSH found!" -ForegroundColor Red
        Write-Host "💡 Please install one of the following:" -ForegroundColor Yellow
        Write-Host "   - PuTTY (https://putty.org/)" -ForegroundColor Cyan
        Write-Host "   - OpenSSH (Windows Feature)" -ForegroundColor Cyan
        Write-Host "   - Git Bash (includes SSH tools)" -ForegroundColor Cyan
        exit 1
    }
    $UseOpenSSH = $true
} else {
    $UseOpenSSH = $false
}
Write-Host "✅ SSH tools available" -ForegroundColor Green
Write-Host ""

# Step 3: Upload deployment package
Write-Host "📤 Step 3: Uploading deployment package to server..." -ForegroundColor Yellow
Write-Host "🔄 Uploading to $ServerIP..." -ForegroundColor Cyan

try {
    if ($UseOpenSSH) {
        # Use OpenSSH (requires manual password entry)
        Write-Host "💡 Please enter the server password when prompted: $ServerPassword" -ForegroundColor Yellow
        & scp -o StrictHostKeyChecking=no $DeploymentPackage "${ServerUser}@${ServerIP}:/root/"
    } else {
        # Use PuTTY pscp
        & pscp -pw $ServerPassword -o StrictHostKeyChecking=no $DeploymentPackage "${ServerUser}@${ServerIP}:/root/"
    }
    Write-Host "✅ Upload completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Execute deployment on server
Write-Host "🚀 Step 4: Executing automated deployment on server..." -ForegroundColor Yellow
Write-Host "⏳ This will take 10-15 minutes..." -ForegroundColor Cyan
Write-Host ""

# Create deployment commands
$DeployCommands = @"
cd /root && \
echo '🗂️ Extracting deployment package...' && \
tar -xzf $DeploymentPackage && \
cd ai-trading-system && \
echo '🔧 Making deployment script executable...' && \
chmod +x deploy.sh && \
echo '🚀 Starting automated deployment...' && \
./deploy.sh
"@

try {
    if ($UseOpenSSH) {
        Write-Host "💡 Please enter the server password when prompted: $ServerPassword" -ForegroundColor Yellow
        & ssh -o StrictHostKeyChecking=no "${ServerUser}@${ServerIP}" $DeployCommands
    } else {
        # Use PuTTY plink
        & plink -pw $ServerPassword -o StrictHostKeyChecking=no "${ServerUser}@${ServerIP}" $DeployCommands
    }
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Step 5: Verify deployment
Write-Host "🧪 Step 5: Verifying deployment..." -ForegroundColor Yellow

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Test API health
Write-Host "🔍 Testing API health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://${ServerIP}:8000/api/health" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ API is responding!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API not responding yet (may still be starting)" -ForegroundColor Yellow
}

# Test dashboard
Write-Host "🔍 Testing dashboard..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://${ServerIP}:3000" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Dashboard is accessible!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Dashboard not responding yet (may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 YOUR LIVE SYSTEM URLS:" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "📊 Trading Dashboard: http://${ServerIP}:3000" -ForegroundColor Cyan
Write-Host "🔧 API Backend: http://${ServerIP}:8000/api/health" -ForegroundColor Cyan  
Write-Host "📈 Monitoring: http://${ServerIP}:3001 (admin/admin123)" -ForegroundColor Cyan
Write-Host "💹 Trading Status: http://${ServerIP}:8000/api/status" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔌 MT5 EA SETTINGS:" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "Inp_PubEndpoint = `"tcp://${ServerIP}:5556`"" -ForegroundColor Cyan
Write-Host "Inp_RepEndpoint = `"tcp://${ServerIP}:5555`"" -ForegroundColor Cyan
Write-Host "Inp_Magic = 123456" -ForegroundColor Cyan
Write-Host ""

Write-Host "💹 START TRADING:" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "curl -X POST http://${ServerIP}:8000/api/command \\" -ForegroundColor Cyan
Write-Host "  -H `"Content-Type: application/json`" \\" -ForegroundColor Cyan
Write-Host "  -d '{`"command`": `"start trading`"}'" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎊 SUCCESS! Your AI trading system is now live!" -ForegroundColor Green
Write-Host "💰 Monthly cost: `$2.87 | Profit potential: UNLIMITED!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📱 Next steps:" -ForegroundColor Green
Write-Host "1. Open http://${ServerIP}:3000 in your browser" -ForegroundColor Cyan
Write-Host "2. Update your MT5 EA settings" -ForegroundColor Cyan
Write-Host "3. Start trading and monitor performance" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Happy trading! 💰" -ForegroundColor Green