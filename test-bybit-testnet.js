#!/usr/bin/env node

/**
 * Bybit Testnet Connection Test
 * Tests your API credentials and connection to Bybit Testnet
 */

console.log('🚀 Testing Bybit Testnet Connection...\n');

// Load credentials from environment
const config = {
  apiKey: process.env.BYBIT_API_KEY || 'your_testnet_api_key',
  apiSecret: process.env.BYBIT_API_SECRET || 'your_testnet_api_secret',
  testnet: process.env.BYBIT_TESTNET !== 'false' // default true
};

if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
  console.warn('⚠️  BYBIT_API_KEY or BYBIT_API_SECRET not set. Using placeholder values.');
  console.warn('    Update your environment before running live tests.\n');
}

const crypto = require('crypto');
const https = require('https');

// Generate signature for Bybit API
function generateSignature(queryString, apiSecret) {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

// Test API connection
async function testConnection() {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  const queryString = `api_key=${config.apiKey}&recv_window=${recvWindow}&timestamp=${timestamp}`;
  const signature = generateSignature(queryString, config.apiSecret);
  
  const options = {
    hostname: 'api-testnet.bybit.com',
    path: `/v5/account/wallet-balance?${queryString}&sign=${signature}`,
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': config.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Get market price
async function getMarketPrice(symbol = 'BTCUSDT') {
  const options = {
    hostname: 'api-testnet.bybit.com',
    path: `/v5/market/tickers?category=spot&symbol=${symbol}`,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Main test function
async function runTests() {
  console.log('📊 Configuration:');
  console.log('   API Key:', config.apiKey === 'your_testnet_api_key' ? 'not set' : 'loaded from env');
  console.log('   Testnet:', config.testnet ? '✅ Enabled' : '❌ Disabled');
  console.log('   URL: https://api-testnet.bybit.com');
  console.log('');
  
  try {
    console.log('1️⃣ Testing Market Data Access...');
    const marketData = await getMarketPrice('BTCUSDT');
    
    if (marketData.retCode === 0) {
      const price = marketData.result?.list?.[0]?.lastPrice;
      console.log('   ✅ Market data working!');
      console.log(`   📈 BTC/USDT Price: $${price || 'N/A'}`);
    } else {
      console.log('   ❌ Market data error:', marketData.retMsg);
    }
    console.log('');
    
    if (config.apiKey === 'your_testnet_api_key') {
      console.log('⚠️  Skipping authenticated tests because API keys are not configured.');
      return;
    }

    console.log('2️⃣ Testing Authenticated API Access...');
    const walletData = await testConnection();
    
    if (walletData.retCode === 0) {
      console.log('   ✅ Authentication successful!');
      console.log('   💰 Testnet Account Connected');
      
      const balance = walletData.result?.list?.[0]?.coin?.find(c => c.coin === 'USDT');
      if (balance) {
        console.log(`   💵 USDT Balance: ${balance.walletBalance || '0'}`);
      }
    } else {
      console.log('   ❌ Authentication failed:', walletData.retMsg);
      console.log('   Please check your API keys');
    }
    console.log('');
    
    console.log('📋 Test Summary:');
    if (marketData.retCode === 0 && walletData.retCode === 0) {
      console.log('   🎉 All tests passed! Your testnet is ready.');
      console.log('   💡 You can now start trading with fake money!');
    } else {
      console.log('   ⚠️ Some tests failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure you have internet connection');
    console.log('   2. Check if your API keys are from testnet.bybit.com');
    console.log('   3. Ensure API keys have correct permissions');
  }
}

runTests();
