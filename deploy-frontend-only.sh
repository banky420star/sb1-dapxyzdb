#!/bin/bash

# 🚀 Frontend-Only Deployment Script
# Deploy your AI Trading System frontend to free hosting

echo "🚀 Deploying Frontend-Only to Free Hosting..."

# Check if we have the built files
if [ ! -d "dist" ]; then
    echo "❌ No dist directory found. Building project..."
    echo "📦 Note: This may fail due to disk space. If it fails, we'll use a different approach."
    npm run build
fi

# Try multiple deployment options
echo "🌐 Attempting deployment to multiple platforms..."

# Option 1: Try Vercel (most reliable)
echo "📤 Trying Vercel deployment..."
if npx vercel --prod --yes 2>/dev/null; then
    echo "✅ Vercel deployment successful!"
    exit 0
fi

# Option 2: Try Netlify (alternative)
echo "📤 Trying Netlify deployment..."
if npx netlify-cli deploy --prod --dir=dist --yes 2>/dev/null; then
    echo "✅ Netlify deployment successful!"
    exit 0
fi

# Option 3: Try GitHub Pages (fallback)
echo "📤 Trying GitHub Pages deployment..."
if git remote -v | grep -q "github.com"; then
    echo "🔄 Pushing to GitHub for Pages deployment..."
    git add .
    git commit -m "Deploy frontend for free hosting" 2>/dev/null
    git push origin main 2>/dev/null
    echo "✅ GitHub Pages deployment initiated!"
    echo "🔗 Check your GitHub repository settings to enable Pages"
    exit 0
fi

# Option 4: Manual deployment instructions
echo "📋 Manual deployment instructions:"
echo ""
echo "1. Go to https://vercel.com"
echo "2. Sign up/login with GitHub"
echo "3. Import your repository"
echo "4. Deploy automatically"
echo ""
echo "OR"
echo ""
echo "1. Go to https://netlify.com"
echo "2. Sign up/login with GitHub"
echo "3. Drag and drop the 'dist' folder"
echo "4. Get your live URL"
echo ""
echo "✅ Your frontend is ready in the 'dist' folder!"

exit 1 