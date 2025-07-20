# Alpha Vantage Integration

This document explains the Alpha Vantage integration that bridges your Python pipeline with the Node.js trading system.

## Overview

The integration consists of:
- **`alpha_vantage_pipeline.py`**: Your original Python pipeline for Alpha Vantage data fetching
- **`alpha_vantage_integration.py`**: Bridge script that can be called from Node.js
- **Updated `server/data/manager.js`**: Node.js data manager that uses the Python integration

## Features

✅ **Rate Limiting**: Respects Alpha Vantage's free tier limits (5 req/min, 500 req/day)  
✅ **Error Handling**: Graceful fallback to mock data if API fails  
✅ **Multiple Data Types**: Real-time quotes, daily time series, bulk fetching  
✅ **File Storage**: Automatic saving to `data/alpha_vantage/` directory  
✅ **Async Processing**: Non-blocking data fetching  

## Setup

### 1. Install Python Dependencies

```bash
# Run the setup script
./setup_python_integration.sh

# Or manually install dependencies
pip3 install httpx typer
```

### 2. Set API Key

```bash
# Set environment variable
export ALPHAVANTAGE_API_KEY="your_api_key_here"

# Or add to .env file
echo "ALPHAVANTAGE_API_KEY=your_api_key_here" >> .env
```

Get your free API key from: https://www.alphavantage.co/support/#api-key

### 3. Test Integration

```bash
# Test real-time quote
python3 alpha_vantage_integration.py quote AAPL

# Test daily data
python3 alpha_vantage_integration.py daily AAPL

# Test multiple symbols
python3 alpha_vantage_integration.py multiple_quotes AAPL,MSFT,GOOGL
```

## Usage

### From Node.js (Automatic)

The trading system automatically uses the Python integration for:
- Real-time forex quotes (EURUSD, GBPUSD, etc.)
- Metal prices (XAUUSD, XAGUSD)
- Stock quotes (if configured)

### From Command Line

```bash
# Get real-time quote
python3 alpha_vantage_integration.py quote <SYMBOL>

# Get daily time series
python3 alpha_vantage_integration.py daily <SYMBOL> [compact|full]

# Get multiple quotes
python3 alpha_vantage_integration.py multiple_quotes <SYMBOL1,SYMBOL2,...>

# Get multiple daily datasets
python3 alpha_vantage_integration.py multiple_daily <SYMBOL1,SYMBOL2,...> [compact|full]

# Save data to file
python3 alpha_vantage_integration.py save <NAME> <JSON_DATA>
```

### From Python Code

```python
from alpha_vantage_integration import AlphaVantageIntegration

async def main():
    integration = AlphaVantageIntegration()
    
    # Get real-time quote
    quote = await integration.get_realtime_quote("AAPL")
    print(quote)
    
    # Get daily data
    daily = await integration.get_daily_data("AAPL", "compact")
    print(daily)
    
    # Get multiple quotes
    quotes = await integration.get_multiple_quotes(["AAPL", "MSFT", "GOOGL"])
    print(quotes)
    
    await integration.close()

# Run
import asyncio
asyncio.run(main())
```

## Data Flow

```
Node.js Trading System
         ↓
   Data Manager
         ↓
   Python Process
         ↓
   Alpha Vantage API
         ↓
   Rate Limiter
         ↓
   Data Processing
         ↓
   JSON Response
         ↓
   Node.js Processing
         ↓
   Database Storage
```

## Error Handling

The integration includes robust error handling:

1. **API Failures**: Falls back to mock data
2. **Rate Limits**: Automatic retry with delays
3. **Network Issues**: Graceful degradation
4. **Invalid Data**: Validation and fallback
5. **Python Process**: Process spawning error handling

## Configuration

### Environment Variables

```bash
ALPHAVANTAGE_API_KEY=your_api_key_here
ALPHA_VANTAGE_API_KEY=your_api_key_here  # Alternative name
```

### Rate Limiting

The integration respects Alpha Vantage's free tier limits:
- **5 requests per minute**
- **500 requests per day**

For higher limits, upgrade to a paid plan.

### Data Storage

Data is automatically saved to:
- `data/alpha_vantage/` - Raw API responses
- `data/trading.db` - Processed trading data

## Troubleshooting

### Common Issues

1. **"Python process exited with code 1"**
   - Check if Python 3 is installed: `python3 --version`
   - Install dependencies: `pip3 install -r requirements.txt`

2. **"API key not set"**
   - Set environment variable: `export ALPHAVANTAGE_API_KEY="your_key"`
   - Or add to .env file

3. **"Rate limit exceeded"**
   - Wait for rate limit reset
   - Consider upgrading to paid plan
   - System will use mock data temporarily

4. **"No data received"**
   - Check API key validity
   - Verify symbol format (e.g., "AAPL" not "AAPL.US")
   - Check Alpha Vantage service status

### Debug Mode

Enable debug logging in Node.js:

```javascript
// In server/data/manager.js
this.logger.setLevel('debug')
```

### Testing

```bash
# Test individual components
python3 alpha_vantage_pipeline.py AAPL MSFT

# Test integration
python3 alpha_vantage_integration.py quote AAPL

# Test Node.js integration
npm run dev
```

## Performance

- **Latency**: ~100-500ms per request
- **Throughput**: 5 requests/minute (free tier)
- **Memory**: Minimal overhead
- **CPU**: Low usage

## Security

- API keys are stored in environment variables
- No hardcoded credentials
- Rate limiting prevents abuse
- Error messages don't expose sensitive data

## Future Enhancements

- [ ] Caching layer for frequently requested data
- [ ] WebSocket support for real-time streaming
- [ ] Additional Alpha Vantage endpoints (options, technical indicators)
- [ ] Database integration for historical data storage
- [ ] Advanced error recovery mechanisms

## Support

For issues with:
- **Alpha Vantage API**: Contact Alpha Vantage support
- **Python Integration**: Check this documentation
- **Node.js Integration**: Check server logs and error messages

## License

This integration is part of the algorithmic trading system and follows the same license terms. 