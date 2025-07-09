#!/bin/bash

echo "🔧 Setting up Python Alpha Vantage Integration..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python version: $PYTHON_VERSION"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Set up Alpha Vantage API key
if [ -z "$ALPHAVANTAGE_API_KEY" ]; then
    echo "🔑 Please set your Alpha Vantage API key:"
    echo "export ALPHAVANTAGE_API_KEY=\"your_api_key_here\""
    echo ""
    echo "Or add it to your .env file:"
    echo "ALPHAVANTAGE_API_KEY=your_api_key_here"
    echo ""
    echo "You can get a free API key from: https://www.alphavantage.co/support/#api-key"
else
    echo "✅ Alpha Vantage API key is set"
fi

# Create data directory
mkdir -p data/alpha_vantage

# Test the integration
echo "🧪 Testing Python integration..."
python3 alpha_vantage_integration.py quote AAPL

if [ $? -eq 0 ]; then
    echo "✅ Python integration test successful"
else
    echo "⚠️  Python integration test failed (this is normal if API key is not set)"
fi

echo ""
echo "🎉 Python Alpha Vantage Integration setup complete!"
echo ""
echo "Usage:"
echo "  python3 alpha_vantage_integration.py quote AAPL"
echo "  python3 alpha_vantage_integration.py daily AAPL"
echo "  python3 alpha_vantage_integration.py multiple_quotes AAPL,MSFT,GOOGL"
echo ""
echo "The Node.js trading system will automatically use this integration for Alpha Vantage data." 