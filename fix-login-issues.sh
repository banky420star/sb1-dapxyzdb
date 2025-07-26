#!/bin/bash

echo "🔧 Fixing Login Issues for AI Trading System"
echo "============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp vultr-production.env .env
fi

echo ""
echo "📋 Current Issues Found:"
echo "1. ❌ Bybit API key is invalid"
echo "2. ❌ Alpha Vantage API key issues"
echo "3. ❌ MT5 connection timeout"
echo "4. ❌ Rate limiting on API calls"
echo ""

echo "🔑 Required API Keys to Update in .env file:"
echo ""
echo "BYBIT_API_KEY=YOUR_ACTUAL_BYBIT_API_KEY"
echo "BYBIT_SECRET_KEY=YOUR_ACTUAL_BYBIT_SECRET"
echo "ALPHAVANTAGE_API_KEY=YOUR_ACTUAL_ALPHA_VANTAGE_KEY"
echo "MT5_LOGIN=your_mt5_login"
echo "MT5_PASSWORD=your_mt5_password"
echo "MT5_SERVER=your_mt5_server"
echo ""

echo "📝 Instructions:"
echo "1. Edit .env file with your actual API keys"
echo "2. Get Bybit API keys from: https://www.bybit.com/app/user/api-management"
echo "3. Get Alpha Vantage key from: https://www.alphavantage.co/support/#api-key"
echo "4. Configure MT5 credentials for your broker"
echo ""

echo "🔄 After updating API keys, restart the system:"
echo "npm run dev"
echo ""

echo "✅ Quick Status Check:"
if [ -f .env ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing"
fi

if [ -f logs/error.log ]; then
    echo "✅ Error logs available"
    echo "📊 Recent errors:"
    tail -5 logs/error.log | grep -E "(AuthenticationError|API key|invalid)" || echo "No recent auth errors"
else
    echo "❌ Error logs not found"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Update API keys in .env"
echo "2. Test API connections"
echo "3. Restart trading system"
echo "4. Monitor logs for success" 