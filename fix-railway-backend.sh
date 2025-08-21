#!/bin/bash

echo "🔧 Fixing Railway Backend Deployment"
echo "====================================="

# Navigate to railway backend directory
cd railway-backend

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found. Make sure you're in the railway-backend directory."
    exit 1
fi

echo "✅ Found server.js - Railway backend is ready for deployment"

echo ""
echo "🚀 To deploy the fixed backend:"
echo "1. Commit and push your changes:"
echo "   git add ."
echo "   git commit -m 'Fix Railway backend: remove frontend serving, add trust proxy'"
echo "   git push"
echo ""
echo "2. Or if using Railway CLI:"
echo "   railway up"
echo ""
echo "✅ The backend will now:"
echo "   - Trust proxy headers (fixes rate limit error)"
echo "   - Serve only API endpoints (no frontend files)"
echo "   - Return proper 404 for unknown routes"
echo "   - Work correctly with Railway's load balancer"

echo ""
echo "🔍 Test the deployment with:"
echo "   curl https://your-railway-url.railway.app/health"
echo "   curl https://your-railway-url.railway.app/api/status"
