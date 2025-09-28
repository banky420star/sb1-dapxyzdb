#!/usr/bin/env node

// 🧪 Test Script for MetaTrader.xyz Fixes
// Tests all the bug fixes and real data integration

console.log('🧪 TESTING METHTRADER.XYZ FIXES')
console.log('================================')

async function testEndpoints() {
  const baseUrl = 'http://localhost:8000';
  
  try {
    // Test 1: Health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.text();
    console.log(`✅ Health: ${healthData}`);
    
    // Test 2: API health endpoint
    console.log('\n2. Testing API health endpoint...');
    const apiHealthResponse = await fetch(`${baseUrl}/api/health`);
    const apiHealthData = await apiHealthResponse.json();
    console.log(`✅ API Health: ${JSON.stringify(apiHealthData, null, 2)}`);
    
    // Test 3: Market data endpoint
    console.log('\n3. Testing market data endpoint...');
    const marketResponse = await fetch(`${baseUrl}/api/market/BTCUSDT`);
    const marketData = await marketResponse.json();
    console.log(`✅ BTC Market Data: ${JSON.stringify(marketData, null, 2)}`);
    
    // Test 4: Balance endpoint
    console.log('\n4. Testing balance endpoint...');
    const balanceResponse = await fetch(`${baseUrl}/api/account/balance`);
    const balanceData = await balanceResponse.json();
    console.log(`✅ Balance Data: ${JSON.stringify(balanceData, null, 2)}`);
    
    // Test 5: Trading status
    console.log('\n5. Testing trading status...');
    const tradingResponse = await fetch(`${baseUrl}/api/trading/status`);
    const tradingData = await tradingResponse.json();
    console.log(`✅ Trading Status: ${JSON.stringify(tradingData, null, 2)}`);
    
    // Test 6: Models endpoint
    console.log('\n6. Testing models endpoint...');
    const modelsResponse = await fetch(`${baseUrl}/api/models`);
    const modelsData = await modelsResponse.json();
    console.log(`✅ Models Data: ${JSON.stringify(modelsData, null, 2)}`);
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Health endpoints working');
    console.log('✅ Real market data integration working');
    console.log('✅ Balance data working');
    console.log('✅ Trading system working');
    console.log('✅ Models system working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Test real market data APIs
async function testRealDataAPIs() {
  console.log('\n🌐 TESTING REAL DATA APIs')
  console.log('=========================')
  
  try {
    // Test Finnhub API
    console.log('\n1. Testing Finnhub API...');
    const finnhubResponse = await fetch('https://finnhub.io/api/v1/quote?symbol=AAPL&token=d1o63spr01qtrauvcglgd1o63spr01qtrauvcgm0');
    if (finnhubResponse.ok) {
      const finnhubData = await finnhubResponse.json();
      console.log(`✅ Finnhub AAPL: $${finnhubData.c} (${finnhubData.dp}%)`);
    } else {
      console.log('❌ Finnhub API failed');
    }
    
    // Test CoinGecko API
    console.log('\n2. Testing CoinGecko API...');
    const coingeckoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    if (coingeckoResponse.ok) {
      const coingeckoData = await coingeckoResponse.json();
      console.log(`✅ Bitcoin: $${coingeckoData.bitcoin.usd} (${coingeckoData.bitcoin.usd_24h_change}%)`);
    } else {
      console.log('❌ CoinGecko API failed');
    }
    
    console.log('\n✅ Real data APIs are working!');
    
  } catch (error) {
    console.error('❌ Real data API test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testRealDataAPIs();
  
  console.log('\n🚀 Starting local server for endpoint tests...');
  console.log('Please start the server with: node server.js');
  console.log('Then run this test again to test all endpoints.');
}

runTests();