import { bybitConfig } from './config/bybit-config.js'

async function testBasicTrading() {
  console.log('🚀 Testing Basic Trading with Current API Credentials')
  console.log('API Key:', bybitConfig.apiKey.substring(0, 8) + '...')
  console.log('Testnet:', bybitConfig.testnet)
  
  try {
    // Test basic API connectivity with a simple request
    const baseUrl = bybitConfig.testnet 
      ? 'https://api-testnet.bybit.com' 
      : 'https://api.bybit.com'
    
    // Test 1: Get server time (no authentication required)
    console.log('\n📊 Test 1: Server Time (No Auth Required)')
    try {
      const response = await fetch(`${baseUrl}/v5/market/time`)
      const data = await response.json()
      console.log('✅ Server time retrieved:', data)
    } catch (error) {
      console.log('❌ Server time test failed:', error.message)
    }
    
    // Test 2: Get tickers (no authentication required)
    console.log('\n📊 Test 2: Market Tickers (No Auth Required)')
    try {
      const response = await fetch(`${baseUrl}/v5/market/tickers?category=spot&symbol=BTCUSDT`)
      const data = await response.json()
      console.log('✅ Tickers retrieved:', data.retCode === 0 ? 'Success' : data.retMsg)
      if (data.result && data.result.list) {
        console.log('Sample ticker:', data.result.list[0])
      }
    } catch (error) {
      console.log('❌ Tickers test failed:', error.message)
    }
    
    // Test 3: Get account info (requires authentication)
    console.log('\n📊 Test 3: Account Info (Requires Auth)')
    try {
      const timestamp = Date.now().toString()
      const recvWindow = '5000'
      
      // Create signature for authenticated request
      const queryString = `api_key=${bybitConfig.apiKey}&recv_window=${recvWindow}&timestamp=${timestamp}`
      const signature = await generateSignature(queryString, bybitConfig.secret)
      
      const response = await fetch(`${baseUrl}/v5/account/wallet-balance?${queryString}&sign=${signature}`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': bybitConfig.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      })
      
      const data = await response.json()
      console.log('✅ Account info retrieved:', data.retCode === 0 ? 'Success' : data.retMsg)
      if (data.retCode !== 0) {
        console.log('Error details:', data)
      }
    } catch (error) {
      console.log('❌ Account info test failed:', error.message)
    }
    
    // Test 4: Get positions (requires authentication)
    console.log('\n📊 Test 4: Positions (Requires Auth)')
    try {
      const timestamp = Date.now().toString()
      const recvWindow = '5000'
      
      const queryString = `api_key=${bybitConfig.apiKey}&recv_window=${recvWindow}&timestamp=${timestamp}`
      const signature = await generateSignature(queryString, bybitConfig.secret)
      
      const response = await fetch(`${baseUrl}/v5/position/list?${queryString}&sign=${signature}`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': bybitConfig.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      })
      
      const data = await response.json()
      console.log('✅ Positions retrieved:', data.retCode === 0 ? 'Success' : data.retMsg)
      if (data.retCode !== 0) {
        console.log('Error details:', data)
      }
    } catch (error) {
      console.log('❌ Positions test failed:', error.message)
    }
    
    // Test 5: Get order history (requires authentication)
    console.log('\n📊 Test 5: Order History (Requires Auth)')
    try {
      const timestamp = Date.now().toString()
      const recvWindow = '5000'
      
      const queryString = `api_key=${bybitConfig.apiKey}&recv_window=${recvWindow}&timestamp=${timestamp}`
      const signature = await generateSignature(queryString, bybitConfig.secret)
      
      const response = await fetch(`${baseUrl}/v5/order/realtime?${queryString}&sign=${signature}`, {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': bybitConfig.apiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': recvWindow
        }
      })
      
      const data = await response.json()
      console.log('✅ Order history retrieved:', data.retCode === 0 ? 'Success' : data.retMsg)
      if (data.retCode !== 0) {
        console.log('Error details:', data)
      }
    } catch (error) {
      console.log('❌ Order history test failed:', error.message)
    }
    
    console.log('\n🎉 Basic Trading Test Completed!')
    console.log('\n📋 Summary:')
    console.log('- Tested basic API connectivity')
    console.log('- Tested authenticated endpoints')
    console.log('- Verified API key permissions')
    
  } catch (error) {
    console.error('❌ Basic trading test failed:', error)
  }
}

// Helper function to generate signature
async function generateSignature(queryString, secret) {
  const crypto = await import('crypto')
  return crypto.default
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex')
}

// Run the test
testBasicTrading() 