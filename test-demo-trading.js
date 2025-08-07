import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'
import { BybitWebSocketV3 } from './server/data/bybit-websocket-v3.js'
import { bybitConfig } from './config/bybit-config.js'

async function testDemoTrading() {
  console.log('🚀 Testing Bybit Demo Trading Service')
  console.log('API Key:', bybitConfig.apiKey.substring(0, 8) + '...')
  console.log('Demo Mode:', bybitConfig.demo)
  console.log('Base URL: https://api-demo.bybit.com')
  
  try {
    // Test 1: Basic API connectivity with demo trading
    console.log('\n📊 Test 1: Demo Trading API Connectivity')
    
    const spreadTrading = new BybitSpreadTrading({
      apiKey: bybitConfig.apiKey,
      secret: bybitConfig.secret,
      demo: true,
      testnet: false
    })
    
    // Test 2: Get wallet balance (demo trading)
    console.log('\n📊 Test 2: Demo Wallet Balance')
    try {
      const balance = await spreadTrading.makeRequest('/v5/account/wallet-balance', 'GET', {})
      console.log('✅ Demo wallet balance retrieved:', balance)
    } catch (error) {
      console.log('⚠️ Demo wallet balance failed:', error.message)
    }
    
    // Test 3: Get account info (demo trading)
    console.log('\n📊 Test 3: Demo Account Info')
    try {
      const accountInfo = await spreadTrading.makeRequest('/v5/account/info', 'GET', {})
      console.log('✅ Demo account info retrieved:', accountInfo)
    } catch (error) {
      console.log('⚠️ Demo account info failed:', error.message)
    }
    
    // Test 4: Get positions (demo trading)
    console.log('\n📊 Test 4: Demo Positions')
    try {
      const positions = await spreadTrading.makeRequest('/v5/position/list', 'GET', {})
      console.log('✅ Demo positions retrieved:', positions)
    } catch (error) {
      console.log('⚠️ Demo positions failed:', error.message)
    }
    
    // Test 5: Get order history (demo trading)
    console.log('\n📊 Test 5: Demo Order History')
    try {
      const orders = await spreadTrading.makeRequest('/v5/order/realtime', 'GET', {})
      console.log('✅ Demo order history retrieved:', orders)
    } catch (error) {
      console.log('⚠️ Demo order history failed:', error.message)
    }
    
    // Test 6: Place a demo order
    console.log('\n📊 Test 6: Demo Order Placement')
    try {
      const orderParams = {
        category: 'linear',
        symbol: 'BTCUSDT',
        side: 'Buy',
        orderType: 'Limit',
        qty: '0.001',
        price: '50000', // Very low price to avoid execution
        timeInForce: 'PostOnly',
        orderLinkId: 'demo_test_' + Date.now()
      }
      
      const order = await spreadTrading.makeRequest('/v5/order/create', 'POST', orderParams)
      console.log('✅ Demo order placed successfully:', order)
      
      // Test 7: Cancel the demo order
      console.log('\n📊 Test 7: Demo Order Cancellation')
      try {
        const cancelParams = {
          category: 'linear',
          symbol: 'BTCUSDT',
          orderId: order.orderId
        }
        
        const cancelled = await spreadTrading.makeRequest('/v5/order/cancel', 'POST', cancelParams)
        console.log('✅ Demo order cancelled successfully:', cancelled)
      } catch (error) {
        console.log('⚠️ Demo order cancellation failed:', error.message)
      }
      
    } catch (error) {
      console.log('⚠️ Demo order placement failed:', error.message)
    }
    
    // Test 8: WebSocket Demo Connection
    console.log('\n📊 Test 8: Demo WebSocket Connection')
    try {
      const wsClient = new BybitWebSocketV3({
        apiKey: bybitConfig.apiKey,
        secret: bybitConfig.secret,
        demo: true,
        testnet: false,
        symbols: ['BTCUSDT', 'ETHUSDT']
      })
      
      wsClient.on('orderbook_update', (data) => {
        console.log('📊 Demo orderbook update:', data.symbol)
      })
      
      wsClient.on('ticker_update', (data) => {
        console.log('📊 Demo ticker update:', data.symbol)
      })
      
      wsClient.on('error', (error) => {
        console.log('❌ Demo WebSocket error:', error)
      })
      
      await wsClient.connect()
      console.log('✅ Demo WebSocket connected successfully')
      
      // Disconnect after 5 seconds
      setTimeout(async () => {
        await wsClient.disconnect()
        console.log('✅ Demo WebSocket disconnected')
      }, 5000)
      
    } catch (error) {
      console.log('⚠️ Demo WebSocket connection failed:', error.message)
    }
    
    // Test 9: Request Demo Funds
    console.log('\n📊 Test 9: Request Demo Funds')
    try {
      const fundParams = {
        adjustType: 0, // Add funds
        utaDemoApplyMoney: [
          {
            coin: 'USDT',
            amountStr: '10000'
          },
          {
            coin: 'BTC',
            amountStr: '1'
          }
        ]
      }
      
      const funds = await spreadTrading.makeRequest('/v5/account/demo-apply-money', 'POST', fundParams)
      console.log('✅ Demo funds requested successfully:', funds)
    } catch (error) {
      console.log('⚠️ Demo funds request failed:', error.message)
    }
    
    console.log('\n🎉 Demo Trading Test Completed!')
    console.log('\n📋 Summary:')
    console.log('- Tested demo trading API connectivity')
    console.log('- Tested demo account operations')
    console.log('- Tested demo order placement and cancellation')
    console.log('- Tested demo WebSocket connection')
    console.log('- Tested demo funds request')
    
    console.log('\n💡 Demo Trading Benefits:')
    console.log('✅ Real trading experience without real money')
    console.log('✅ All trading features available')
    console.log('✅ Orders kept for 7 days')
    console.log('✅ Perfect for testing and development')
    
    // Cleanup
    await spreadTrading.cleanup()
    
  } catch (error) {
    console.error('❌ Demo trading test failed:', error)
  }
}

// Run the test
testDemoTrading() 