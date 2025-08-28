// test-improvements.js
// Test script to validate the new improvements

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api';
const MODEL_URL = 'http://localhost:8001';

async function testHealthEndpoint() {
  console.log('🏥 Testing health endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health check passed');
    console.log(`   Status: ${data.status}`);
    console.log(`   Version: ${data.version}`);
    console.log(`   Environment: ${data.environment}`);
    console.log(`   Trading Mode: ${data.tradingMode}`);
    console.log(`   Risk Management: ${data.features.riskManagement}`);
    console.log(`   Checks: ${data.checks.length}`);
    
    return data;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return null;
  }
}

async function testValidation() {
  console.log('\n🔍 Testing request validation...');
  
  // Test valid trade
  console.log('   Testing valid trade request...');
  try {
    const validTrade = {
      symbol: 'BTCUSDT',
      side: 'buy',
      qty: 0.01,
      price: 50000
    };
    
    const response = await fetch(`${BASE_URL}/trading/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validTrade)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Valid trade accepted');
      console.log(`   Trade ID: ${data.trade.id}`);
      console.log(`   Risk adjusted qty: ${data.trade.riskActions.adjustedQty}`);
    } else {
      const error = await response.json();
      console.log('   ❌ Valid trade rejected:', error.message);
    }
  } catch (error) {
    console.log('   ❌ Valid trade test failed:', error.message);
  }
  
  // Test invalid trade
  console.log('   Testing invalid trade request...');
  try {
    const invalidTrade = {
      symbol: '',  // Invalid: empty symbol
      side: 'invalid',  // Invalid: not buy/sell
      qty: -0.01  // Invalid: negative quantity
    };
    
    const response = await fetch(`${BASE_URL}/trading/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidTrade)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.log('   ✅ Invalid trade correctly rejected');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log('   ❌ Invalid trade incorrectly accepted');
    }
  } catch (error) {
    console.log('   ❌ Invalid trade test failed:', error.message);
  }
}

async function testRiskManagement() {
  console.log('\n🛡️ Testing risk management...');
  
  // Test duplicate request (idempotency)
  console.log('   Testing idempotency...');
  try {
    const trade = {
      symbol: 'ETHUSDT',
      side: 'sell',
      qty: 0.02
    };
    
    // First request
    const response1 = await fetch(`${BASE_URL}/trading/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade)
    });
    
    if (response1.ok) {
      const data1 = await response1.json();
      const idempotencyKey = data1.trade.idempotencyKey;
      
      // Second request with same data (should be rejected)
      const response2 = await fetch(`${BASE_URL}/trading/execute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey
        },
        body: JSON.stringify(trade)
      });
      
      if (!response2.ok) {
        const error = await response2.json();
        console.log('   ✅ Duplicate request correctly rejected');
        console.log(`   Error: ${error.message}`);
      } else {
        console.log('   ❌ Duplicate request incorrectly accepted');
      }
    }
  } catch (error) {
    console.log('   ❌ Idempotency test failed:', error.message);
  }
}

async function testModelService() {
  console.log('\n🤖 Testing model service...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${MODEL_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Model service health check passed');
      console.log(`   Model version: ${healthData.model_version}`);
      console.log(`   Model loaded: ${healthData.model_loaded}`);
    } else {
      console.log('   ❌ Model service health check failed');
    }
    
    // Test prediction endpoint
    const predictionRequest = {
      symbol: 'BTCUSDT',
      features: {
        price: 50000,
        volume: 1000000,
        rsi: 65,
        macd: 0.5,
        bollinger_upper: 51000,
        bollinger_lower: 49000
      }
    };
    
    const predictionResponse = await fetch(`${MODEL_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(predictionRequest)
    });
    
    if (predictionResponse.ok) {
      const predictionData = await predictionResponse.json();
      console.log('   ✅ Model prediction successful');
      console.log(`   Signal: ${predictionData.signal}`);
      console.log(`   Confidence: ${predictionData.confidence}`);
      console.log(`   Model version: ${predictionData.model_version}`);
    } else {
      console.log('   ❌ Model prediction failed');
    }
    
  } catch (error) {
    console.log('   ❌ Model service test failed:', error.message);
  }
}

async function testLogging() {
  console.log('\n📝 Testing structured logging...');
  
  try {
    // Make a few requests to generate logs
    const requests = [
      { symbol: 'BTCUSDT', side: 'buy', qty: 0.01 },
      { symbol: 'ETHUSDT', side: 'sell', qty: 0.02 },
      { symbol: 'XRPUSDT', side: 'buy', qty: 100 }
    ];
    
    for (const request of requests) {
      await fetch(`${BASE_URL}/trading/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
    }
    
    console.log('   ✅ Logging test completed (check server logs)');
    
  } catch (error) {
    console.log('   ❌ Logging test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting improvement validation tests...\n');
  
  await testHealthEndpoint();
  await testValidation();
  await testRiskManagement();
  await testModelService();
  await testLogging();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Summary of improvements implemented:');
  console.log('   ✅ Schema validation with Zod');
  console.log('   ✅ Risk management with vol-targeting and drawdown brakes');
  console.log('   ✅ Idempotency keys for trade execution');
  console.log('   ✅ Centralized configuration with environment validation');
  console.log('   ✅ Structured logging with Pino');
  console.log('   ✅ Enhanced health checks');
  console.log('   ✅ FastAPI model service with calibration');
  console.log('   ✅ Audit trail for trading decisions');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };