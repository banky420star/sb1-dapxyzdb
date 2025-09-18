#!/usr/bin/env node

/**
 * Simple Trading Bot - Bybit Testnet
 * Runs basic trading operations with your testnet account
 */

const https = require('https');
const crypto = require('crypto');

console.log('🤖 Starting Trading Bot on Bybit Testnet...\n');

// Load configuration from environment
const config = {
  apiKey: process.env.BYBIT_API_KEY || 'your_testnet_api_key',
  apiSecret: process.env.BYBIT_API_SECRET || 'your_testnet_api_secret',
  testnet: process.env.BYBIT_TESTNET !== 'false',
  baseUrl: process.env.BYBIT_TESTNET === 'false' ? 'api.bybit.com' : 'api-testnet.bybit.com'
};

if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
  console.warn('⚠️  BYBIT_API_KEY or BYBIT_API_SECRET not set. Using placeholder values.');
  console.warn('    Update your environment before attempting live trades.\n');
}

// Trading parameters
const TRADING_PAIR = 'BTCUSDT';
const TRADE_AMOUNT = 0.001; // Small amount for testing
const CHECK_INTERVAL = 5000; // Check every 5 seconds

// Helper function to make signed API requests
function apiRequest(path, method = 'GET', data = null, requiresAuth = false) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';

    const queryParams = new URLSearchParams();
    if (data && method === 'GET') {
      Object.entries(data).forEach(([key, value]) => queryParams.append(key, value));
    }

    if (requiresAuth) {
      queryParams.append('api_key', config.apiKey);
      queryParams.append('timestamp', timestamp);
      queryParams.append('recv_window', recvWindow);

      const signature = crypto
        .createHmac('sha256', config.apiSecret)
        .update(queryParams.toString())
        .digest('hex');

      queryParams.append('sign', signature);
    }

    const options = {
      hostname: config.baseUrl,
      path: `${path}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);

    if (method === 'POST' && data && !requiresAuth) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Get current market price
async function getMarketPrice() {
  try {
    const response = await apiRequest(`/v5/market/tickers`, 'GET', { category: 'spot', symbol: TRADING_PAIR });
    if (response.retCode === 0 && response.result?.list?.[0]) {
      return parseFloat(response.result.list[0].lastPrice);
    }
    return null;
  } catch (error) {
    console.error('Error getting market price:', error.message);
    return null;
  }
}

// Get 24h price change
async function get24hChange() {
  try {
    const response = await apiRequest(`/v5/market/tickers`, 'GET', { category: 'spot', symbol: TRADING_PAIR });
    if (response.retCode === 0 && response.result?.list?.[0]) {
      const data = response.result.list[0];
      return {
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.price24hPcnt) * 100,
        volume24h: parseFloat(data.volume24h),
        high24h: parseFloat(data.highPrice24h),
        low24h: parseFloat(data.lowPrice24h)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting 24h change:', error.message);
    return null;
  }
}

// Simple trading strategy
function analyzeTrade(marketData) {
  const signals = {
    buy: false,
    sell: false,
    hold: true,
    reason: ''
  };

  if (marketData.change24h < -2) {
    signals.buy = true;
    signals.hold = false;
    signals.reason = 'Oversold - 24h drop > 2%';
  } else if (marketData.change24h > 3) {
    signals.sell = true;
    signals.hold = false;
    signals.reason = 'Overbought - 24h gain > 3%';
  } else {
    signals.reason = 'Market stable - holding position';
  }

  return signals;
}

// Display market data
function displayMarketData(data) {
  console.log('📊 Market Analysis:');
  console.log(`   Pair: ${TRADING_PAIR}`);
  console.log(`   Price: $${data.price.toLocaleString()}`);
  console.log(`   24h Change: ${data.change24h >= 0 ? '📈' : '📉'} ${data.change24h.toFixed(2)}%`);
  console.log(`   24h Volume: ${(data.volume24h / 1000000).toFixed(2)}M`);
  console.log(`   24h High: $${data.high24h.toLocaleString()}`);
  console.log(`   24h Low: $${data.low24h.toLocaleString()}`);
  console.log('');
}

// Main trading loop
async function runTradingBot() {
  console.log('📡 Connecting to Bybit...');
  console.log(`   URL: https://${config.baseUrl}`);
  console.log(`   Mode: ${config.testnet ? '🧪 Testnet (Safe)' : '💰 Live (Real Money)'}`);
  console.log('');

  if (config.apiKey === 'your_testnet_api_key') {
    console.warn('⚠️  API credentials are not configured. Set BYBIT_API_KEY/BYBIT_API_SECRET to enable trading.');
    return;
  }

  let iteration = 0;

  const tradingLoop = async () => {
    iteration++;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⏰ Iteration #${iteration} - ${new Date().toLocaleTimeString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const marketData = await get24hChange();
      if (!marketData) {
        console.log('⚠️  Unable to fetch market data. Retrying...');
        return;
      }

      displayMarketData(marketData);
      const signals = analyzeTrade(marketData);

      if (signals.buy) {
        console.log('🟢 Buy signal triggered:', signals.reason);
      } else if (signals.sell) {
        console.log('🔴 Sell signal triggered:', signals.reason);
      } else {
        console.log('🟡 Hold signal:', signals.reason);
      }

    } catch (error) {
      console.error('❌ Error in trading loop:', error.message);
    }
  };

  tradingLoop();
  setInterval(tradingLoop, CHECK_INTERVAL);
}

runTradingBot();
