# 🧪 Repository Metrics Validation Script (PowerShell)
# Validates code metrics against baseline to prevent silent feature creep
# Usage: .\scripts\metrics-check.ps1
# CI Integration: npm run metrics:windows

param(
    [switch]$Verbose
)

Write-Host "🔍 Starting repository metrics validation..." -ForegroundColor Blue

# Initialize error counter
$errors = 0

# Function to check if value exceeds threshold
function Test-Threshold {
    param(
        [int]$Expected,
        [int]$Actual,
        [string]$File,
        [int]$Threshold = 15
    )
    
    $maxAllowed = [math]::Round($Expected * (100 + $Threshold) / 100)
    $minAllowed = [math]::Round($Expected * (100 - $Threshold) / 100)
    
    if ($Actual -gt $maxAllowed) {
        Write-Host "❌ $File grew by >${Threshold}% (expected: $Expected, actual: $Actual, max: $maxAllowed)" -ForegroundColor Red
        return $false
    }
    elseif ($Actual -lt $minAllowed) {
        Write-Host "⚠️  $File shrunk by >${Threshold}% (expected: $Expected, actual: $Actual)" -ForegroundColor Yellow
        return $false
    }
    else {
        Write-Host "✅ $File within acceptable range (expected: $Expected, actual: $Actual)" -ForegroundColor Green
        return $true
    }
}

# Function to check exact match
function Test-Exact {
    param(
        [int]$Expected,
        [int]$Actual,
        [string]$File
    )
    
    if ($Actual -eq $Expected) {
        Write-Host "✅ $File exact match (expected: $Expected, actual: $Actual)" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ $File mismatch (expected: $Expected, actual: $Actual)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n📊 Frontend Metrics Validation" -ForegroundColor Blue
Write-Host "==================================" -ForegroundColor Blue

# Frontend checks
$expectedApp = 38
$actualApp = (Get-Content "src/App.tsx").Length
if (-not (Test-Threshold $expectedApp $actualApp "src/App.tsx")) { $errors++ }

$expectedMain = 9
$actualMain = (Get-Content "src/main.tsx").Length
if (-not (Test-Threshold $expectedMain $actualMain "src/main.tsx")) { $errors++ }

$expectedContext = 181
$actualContext = (Get-Content "src/contexts/TradingContext.tsx").Length
if (-not (Test-Threshold $expectedContext $actualContext "src/contexts/TradingContext.tsx")) { $errors++ }

Write-Host "`n🔧 Backend API Metrics Validation" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Backend checks
$expectedIndex = 843
$actualIndex = (Get-Content "server/index.js").Length
if (-not (Test-Threshold $expectedIndex $actualIndex "server/index.js")) { $errors++ }

$expectedEnhanced = 777
$actualEnhanced = (Get-Content "server/enhanced-server.js").Length
if (-not (Test-Threshold $expectedEnhanced $actualEnhanced "server/enhanced-server.js")) { $errors++ }

$expectedSimple = 207
$actualSimple = (Get-Content "server/simple-index-enhanced.js").Length
if (-not (Test-Threshold $expectedSimple $actualSimple "server/simple-index-enhanced.js")) { $errors++ }

$expectedApi = 148
$actualApi = (Get-Content "server/real-data-api.js").Length
if (-not (Test-Threshold $expectedApi $actualApi "server/real-data-api.js")) { $errors++ }

Write-Host "`n🤖 Machine Learning Metrics Validation" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue

# ML checks
$expectedRf = 578
$actualRf = (Get-Content "server/ml/models/randomforest.js").Length
if (-not (Test-Threshold $expectedRf $actualRf "server/ml/models/randomforest.js")) { $errors++ }

$expectedLstm = 602
$actualLstm = (Get-Content "server/ml/models/lstm.js").Length
if (-not (Test-Threshold $expectedLstm $actualLstm "server/ml/models/lstm.js")) { $errors++ }

$expectedDdqn = 623
$actualDdqn = (Get-Content "server/ml/models/ddqn.js").Length
if (-not (Test-Threshold $expectedDdqn $actualDdqn "server/ml/models/ddqn.js")) { $errors++ }

$expectedManager = 1235
$actualManager = (Get-Content "server/ml/manager.js").Length
if (-not (Test-Threshold $expectedManager $actualManager "server/ml/manager.js")) { $errors++ }

Write-Host "`n💰 Trading Engine Metrics Validation" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue

# Trading checks
$expectedEngine = 1226
$actualEngine = (Get-Content "server/trading/engine.js").Length
if (-not (Test-Threshold $expectedEngine $actualEngine "server/trading/engine.js")) { $errors++ }

$expectedRisk = 804
$actualRisk = (Get-Content "server/risk/manager.js").Length
if (-not (Test-Threshold $expectedRisk $actualRisk "server/risk/manager.js")) { $errors++ }

Write-Host "`n🧪 Testing & Scripts Validation" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Test files count
$expectedTests = 7
$actualTests = (Get-ChildItem -Path "tests" -Recurse -Include "*.js", "*.ts").Count
if (-not (Test-Exact $expectedTests $actualTests "test files count")) { $errors++ }

# Scripts count
$expectedScripts = 12
$actualScripts = (Get-ChildItem -Path "scripts").Count
if (-not (Test-Exact $expectedScripts $actualScripts "scripts count")) { $errors++ }

Write-Host "`n📦 Dependencies Validation" -ForegroundColor Blue
Write-Host "============================" -ForegroundColor Blue

# Dependencies count
$expectedDeps = 51
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$actualDeps = $packageJson.dependencies.PSObject.Properties.Count
if (-not (Test-Exact $expectedDeps $actualDeps "dependencies count")) { $errors++ }

Write-Host "`n📊 Overall Code Metrics" -ForegroundColor Blue
Write-Host "========================" -ForegroundColor Blue

# Calculate total lines manually
Write-Host "Generating comprehensive code analysis..." -ForegroundColor Yellow
$totalLines = $actualApp + $actualMain + $actualContext + $actualIndex + $actualEnhanced + $actualSimple + $actualApi + $actualRf + $actualLstm + $actualDdqn + $actualManager + $actualEngine + $actualRisk

$expectedTotal = 7263
if (-not (Test-Threshold $expectedTotal $totalLines "total code lines")) { $errors++ }

Write-Host "`n📋 Summary Report" -ForegroundColor Blue
Write-Host "==================" -ForegroundColor Blue

Write-Host "📈 Metrics Summary:" -ForegroundColor Cyan
Write-Host "- Frontend: $($actualApp + $actualMain + $actualContext) lines"
Write-Host "- Backend API: $($actualIndex + $actualEnhanced + $actualSimple + $actualApi) lines"
Write-Host "- ML Components: $($actualRf + $actualLstm + $actualDdqn + $actualManager) lines"
Write-Host "- Trading Engine: $($actualEngine + $actualRisk) lines"
Write-Host "- Test Files: $actualTests files"
Write-Host "- Scripts: $actualScripts files"
Write-Host "- Dependencies: $actualDeps packages"
Write-Host "- Total Code: $totalLines lines"

# Final result
if ($errors -eq 0) {
    Write-Host "`n🎉 All metrics validation passed!" -ForegroundColor Green
    Write-Host "✅ Repository is within acceptable quality thresholds" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n❌ Metrics validation failed with $errors error(s)" -ForegroundColor Red
    Write-Host "💡 Review the changes above and update baseline metrics if appropriate" -ForegroundColor Yellow
    Write-Host "📚 See REPO_METRICS_VALIDATION.md for detailed analysis" -ForegroundColor Yellow
    exit 1
} 