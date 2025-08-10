#!/bin/bash

# 🔍 Railway Directory Structure Verification Script

echo "🔍 VERIFYING RAILWAY BACKEND STRUCTURE"
echo "======================================"

# Check if railway-backend directory exists
if [ ! -d "railway-backend" ]; then
    echo "❌ ERROR: railway-backend directory not found!"
    echo "Current directory: $(pwd)"
    echo "Available directories:"
    ls -la
    exit 1
fi

echo "✅ railway-backend directory found"

# Check essential files
cd railway-backend

echo "📁 Checking essential files..."

ESSENTIAL_FILES=("package.json" "server.js" "railway.json" "railway.toml")

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Found"
    else
        echo "❌ $file - Missing!"
    fi
done

# Check package.json dependencies
echo ""
echo "📦 Checking package.json dependencies..."
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    
    # Check for problematic dependencies
    if grep -q "numjs\|sharp\|tensorflow" package.json; then
        echo "❌ WARNING: Found problematic dependencies in package.json"
        grep -E "(numjs|sharp|tensorflow)" package.json
    else
        echo "✅ No problematic dependencies found"
    fi
    
    # Show current dependencies
    echo "📋 Current dependencies:"
    cat package.json | grep -A 10 '"dependencies"'
else
    echo "❌ package.json not found!"
fi

echo ""
echo "🎯 RAILWAY DEPLOYMENT DIRECTORY STRUCTURE:"
echo "=========================================="
echo "Root Directory: railway-backend"
echo "Branch: feature/futuristic-ui"
echo "Repository: sb1-dapxyzdb"
echo ""
echo "📁 Directory contents:"
ls -la

echo ""
echo "🚀 READY FOR RAILWAY DEPLOYMENT!"
echo "================================"
echo "1. Go to Railway Dashboard"
echo "2. Add service from GitHub"
echo "3. Select repository: sb1-dapxyzdb"
echo "4. Set Root Directory to: railway-backend"
echo "5. Deploy!"

cd .. 