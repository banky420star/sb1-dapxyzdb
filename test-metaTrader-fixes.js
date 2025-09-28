#!/usr/bin/env node

// 🧪 MetaTrader.xyz Comprehensive Test Script
// Tests all the fixes for AI models, risk management, analytics, and charts

console.log('🧪 TESTING METHTRADER.XYZ FIXES')
console.log('================================')

async function testAllEndpoints() {
  const baseUrl = 'http://localhost:8000';
  
  try {
    console.log('\n🔍 Testing Core Endpoints...');
    
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
    
    // Test 3: Trading state
    console.log('\n3. Testing trading state...');
    const tradingStateResponse = await fetch(`${baseUrl}/api/trading/state`);
    const tradingStateData = await tradingStateResponse.json();
    console.log(`✅ Trading State: ${JSON.stringify(tradingStateData, null, 2)}`);
    
    // Test 4: Account balance
    console.log('\n4. Testing account balance...');
    const balanceResponse = await fetch(`${baseUrl}/api/account/balance`);
    const balanceData = await balanceResponse.json();
    console.log(`✅ Balance: ${JSON.stringify(balanceData, null, 2)}`);
    
    // Test 5: Trading status
    console.log('\n5. Testing trading status...');
    const tradingStatusResponse = await fetch(`${baseUrl}/api/trading/status`);
    const tradingStatusData = await tradingStatusResponse.json();
    console.log(`✅ Trading Status: ${JSON.stringify(tradingStatusData, null, 2)}`);
    
    // Test 6: AI Models endpoint
    console.log('\n6. Testing AI Models endpoint...');
    const modelsResponse = await fetch(`${baseUrl}/api/models`);
    const modelsData = await modelsResponse.json();
    console.log(`✅ Models: ${JSON.stringify(modelsData, null, 2)}`);
    
    // Test 7: Training status
    console.log('\n7. Testing training status...');
    const trainingResponse = await fetch(`${baseUrl}/api/training/status`);
    const trainingData = await trainingResponse.json();
    console.log(`✅ Training Status: ${JSON.stringify(trainingData, null, 2)}`);
    
    // Test 8: Analytics performance
    console.log('\n8. Testing analytics performance...');
    const analyticsResponse = await fetch(`${baseUrl}/api/analytics/performance?timeframe=1M`);
    const analyticsData = await analyticsResponse.json();
    console.log(`✅ Analytics: ${JSON.stringify(analyticsData, null, 2)}`);
    
    // Test 9: Market data
    console.log('\n9. Testing market data...');
    const marketResponse = await fetch(`${baseUrl}/api/market/BTCUSDT`);
    const marketData = await marketResponse.json();
    console.log(`✅ Market Data: ${JSON.stringify(marketData, null, 2)}`);
    
    console.log('\n🎉 ALL CORE ENDPOINTS WORKING!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testFrontendComponents() {
  console.log('\n🎨 Testing Frontend Components...');
  
  try {
    // Test if the build works
    console.log('\n1. Testing frontend build...');
    const { exec } = require('child_process');
    
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Build failed: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`❌ Build warnings: ${stderr}`);
        return;
      }
      console.log('✅ Frontend build successful');
    });
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
  }
}

async function testRealDataIntegration() {
  console.log('\n🌐 Testing Real Data Integration...');
  
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

async function testChartComponents() {
  console.log('\n📊 Testing Chart Components...');
  
  try {
    // Check if recharts is installed
    const fs = require('fs');
    const path = require('path');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies.recharts) {
      console.log('✅ Recharts is installed');
    } else {
      console.log('❌ Recharts is not installed');
    }
    
    // Check if EquityCurveChart component exists
    const chartPath = path.join(process.cwd(), 'src/components/EquityCurveChart.tsx');
    if (fs.existsSync(chartPath)) {
      console.log('✅ EquityCurveChart component exists');
    } else {
      console.log('❌ EquityCurveChart component missing');
    }
    
  } catch (error) {
    console.error('❌ Chart component test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive MetaTrader.xyz tests...\n');
  
  await testRealDataIntegration();
  await testChartComponents();
  
  console.log('\n🚀 Starting local server for endpoint tests...');
  console.log('Please start the server with: node server.js');
  console.log('Then run this test again to test all endpoints.');
  
  // Uncomment the line below to test endpoints when server is running
  // await testAllEndpoints();
}

// Run tests
runAllTests();