# 🚀 Real-Time Data System for Trading Models

## Overview

Your trading system has been upgraded to use **real-time financial data** instead of mock data. This comprehensive system collects, processes, and distributes live market data for your ML trading models.

## 🏗️ System Architecture

### Core Components

1. **RealTimeDataCollector** - Collects live data from multiple exchanges
2. **DataPipeline** - Processes and prepares data for ML models
3. **TradingDataManager** - Main interface for data access and distribution

### Data Sources

- **Bybit** - Cryptocurrency data (BTC/USDT, ETH/USDT, etc.)
- **Binance** - Additional crypto data
- **Coinbase** - Crypto data backup
- **Yahoo Finance** - Forex and stock data
- **CoinGecko** - Crypto price data (no API key required)

## 📊 Supported Data Types

### Trading Symbols
- **Cryptocurrency**: BTC/USDT, ETH/USDT, SOL/USDT, ADA/USDT, DOT/USDT, LINK/USDT
- **Forex**: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF
- **Indices**: SPX, NDX, DXY
- **Commodities**: XAU/USD, XAG/USD, WTI/USD, BRN/USD

### Timeframes
- **Scalping**: 1m, 5m
- **Day Trading**: 15m, 1h
- **Swing Trading**: 4h, 1d
- **Position Trading**: 1d, 1w

### Data Types
- **Ticker Data**: Price, bid/ask, volume, change
- **Orderbook**: Bid/ask levels and volumes
- **OHLCV**: Open, High, Low, Close, Volume
- **Technical Indicators**: RSI, MACD, SMA, EMA, Bollinger Bands, ATR
- **Trading Signals**: Buy/Sell signals with confidence scores

## 🔧 Configuration

### Environment Variables

```bash
# Exchange API Keys
BYBIT_API_KEY=your_bybit_api_key
BYBIT_SECRET=your_bybit_secret
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET=your_binance_secret
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_SECRET=your_coinbase_secret

# Data Sources
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
```

### Data Collection Settings

```javascript
// Update frequency: 1 second for real-time data
updateFrequency: 1000

// Data quality threshold: 95% required
qualityThreshold: 0.95

// Maximum retries for failed requests
maxRetries: 3

// Data retention: 7 days
dataRetention: 7 * 24 * 60 * 60 * 1000
```

## 🌐 API Endpoints

### Market Data
```bash
# Get all market data
GET /api/data/all

# Get specific symbol data
GET /api/data/market/:symbol

# Get technical indicators
GET /api/data/indicators/:symbol?timeframe=1h

# Get trading signals
GET /api/data/signals

# Get data quality report
GET /api/data/quality
```

### Model Data
```bash
# Get LSTM training data
GET /api/data/model/lstm

# Get Random Forest data
GET /api/data/model/randomforest

# Get DDQN state data
GET /api/data/model/ddqn

# Get ensemble data
GET /api/data/model/ensemble
```

## 🤖 Model-Specific Data Formats

### LSTM Data
```javascript
{
  symbol: "BTC/USDT",
  sequence: [
    [open, high, low, close, volume],
    // ... 50 data points
  ],
  target: 50000.0,
  features: [normalized_features],
  timestamp: 1640995200000
}
```

### Random Forest Data
```javascript
{
  symbol: "BTC/USDT",
  features: {
    sma20: 0.5,
    sma50: 0.3,
    rsi: 0.7,
    macd: 0.2,
    bb_position: 0.8,
    volume_ratio: 1.2
  },
  target: 1, // 1 for buy, 0 for sell
  timestamp: 1640995200000
}
```

### DDQN Data
```javascript
{
  symbol: "BTC/USDT",
  state: [0.5, 0.3, 0.7, 0.2, 0.8, 1.2, ...], // 20 features
  action: 0, // Will be determined by model
  reward: 0, // Will be calculated based on trading results
  done: false,
  timestamp: 1640995200000
}
```

## 📈 Technical Indicators

### Price-Based Indicators
- **SMA (Simple Moving Average)**: 20, 50 periods
- **EMA (Exponential Moving Average)**: 12, 26 periods
- **Bollinger Bands**: 20 period, 2 standard deviations
- **ATR (Average True Range)**: 14 period

### Momentum Indicators
- **RSI (Relative Strength Index)**: 14 period
- **MACD**: 12, 26, 9 periods
- **Momentum**: 10 period price change
- **Acceleration**: Rate of momentum change

### Volume Indicators
- **Volume SMA**: 20 period average
- **Volume Ratio**: Current vs average volume
- **Orderbook Imbalance**: Bid vs ask volume ratio

## 🎯 Trading Signals

The system generates trading signals based on multiple technical indicators:

### Signal Generation Logic
```javascript
// RSI-based signals
if (rsi < 30) signal = 'BUY', confidence += 0.3
if (rsi > 70) signal = 'SELL', confidence += 0.3

// MACD signals
if (macd > signal) confidence += 0.2
if (macd < signal) confidence += 0.2

// Bollinger Bands signals
if (price <= bb_lower) confidence += 0.2
if (price >= bb_upper) confidence += 0.2

// Moving average signals
if (sma20 > sma50) confidence += 0.1
if (sma20 < sma50) confidence += 0.1
```

### Signal Format
```javascript
{
  symbol: "BTC/USDT",
  signal: "BUY", // or "SELL"
  confidence: 0.85, // 0-1 scale
  price: 50000.0,
  timestamp: 1640995200000,
  indicators: {
    rsi: 25.5,
    macd: { macd: 0.02, signal: 0.01, histogram: 0.01 },
    bollinger: { upper: 52000, middle: 50000, lower: 48000 },
    sma20: 50100,
    sma50: 49900
  }
}
```

## 🔍 Data Quality Monitoring

### Quality Metrics
- **Data Completeness**: Percentage of successful data updates
- **Average Latency**: Time between data collection and processing
- **Data Freshness**: Age of the most recent data point
- **Source Reliability**: Success rate per data source

### Quality Thresholds
- **Minimum Quality**: 95% data completeness required
- **Maximum Age**: 60 seconds for real-time data
- **Retry Logic**: 3 attempts with 5-second delays
- **Fallback Sources**: Automatic switching to backup data sources

## 🚀 Getting Started

### 1. Start the Server
```bash
npm run server
```

### 2. Test the System
```bash
node test-real-data-system.js
```

### 3. Access Real-Time Data
```bash
# Get all market data
curl http://localhost:8000/api/data/all

# Get BTC/USDT data
curl http://localhost:8000/api/data/market/BTC/USDT

# Get trading signals
curl http://localhost:8000/api/data/signals
```

## 📊 Data Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Exchanges     │───▶│  Data Collector  │───▶│  Data Pipeline  │
│  (Bybit, etc.)  │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ML Models     │◀───│ Trading Data     │◀───│  Data Manager   │
│  (LSTM, RF,     │    │ Manager          │    │                 │
│   DDQN)         │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Troubleshooting

### Common Issues

1. **No Data Available**
   - Check API keys are configured
   - Verify network connectivity
   - Check exchange API status

2. **Low Data Quality**
   - Monitor data quality report: `/api/data/quality`
   - Check for rate limiting
   - Verify data source availability

3. **Slow Performance**
   - Reduce update frequency
   - Check system resources
   - Monitor data pipeline metrics

### Debug Commands
```bash
# Check data quality
curl http://localhost:8000/api/data/quality

# Test specific symbol
curl http://localhost:8000/api/data/market/BTC/USDT

# Check server health
curl http://localhost:8000/api/health
```

## 📈 Performance Optimization

### Recommended Settings
- **Update Frequency**: 1 second for real-time trading
- **Batch Size**: 1000 data points per batch
- **Window Size**: 50 for LSTM sequences
- **Feature Count**: 20 for DDQN states

### Monitoring
- Monitor data quality metrics
- Track processing latency
- Watch for failed data updates
- Monitor memory usage

## 🎯 Next Steps

1. **Configure API Keys**: Set up your exchange API credentials
2. **Test Data Quality**: Run the test script to verify everything works
3. **Monitor Performance**: Use the quality endpoints to track system health
4. **Train Models**: Use the prepared data to train your ML models
5. **Deploy Trading**: Start using real data for live trading

## 📞 Support

If you encounter any issues:
1. Check the server logs for error messages
2. Verify your API keys are correct
3. Test individual endpoints
4. Monitor data quality metrics
5. Check network connectivity to data sources

---

**🎉 Your trading system is now ready for real-time data collection and ML model training!**