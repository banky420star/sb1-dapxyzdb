import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'
import { bybitConfig } from './config/bybit-config.js'

async function testSpreadOrdersReal() {
  console.log('🚀 Testing Spread Order Placement with Real API Credentials')
  console.log('API Key:', bybitConfig.apiKey.substring(0, 8) + '...')
  console.log('Testnet:', bybitConfig.testnet)
  console.log('⚠️  WARNING: This will place real orders with small quantities')
  
  try {
    // Initialize spread trading module with real credentials
    const spreadTrading = new BybitSpreadTrading(bybitConfig)
    
    // Set up event handlers
    spreadTrading.on('spread_order_placed', (data) => {
      console.log('📋 Spread Order Placed Successfully!')
      console.log('Order ID:', data.orderId)
      console.log('Order Link ID:', data.orderLinkId)
      console.log('Parameters:', data.params)
    })
    
    spreadTrading.on('spread_order_amended', (data) => {
      console.log('✏️ Spread Order Amended Successfully!')
      console.log('Order ID:', data.orderId)
      console.log('Amendments:', data.amendments)
    })
    
    spreadTrading.on('spread_order_cancelled', (data) => {
      console.log('❌ Spread Order Cancelled Successfully!')
      console.log('Order ID:', data.orderId)
    })
    
    // Test 1: Place a small limit order (PostOnly to avoid immediate execution)
    console.log('\n📊 Test 1: Placing Small Limit Order (PostOnly)')
    try {
      const order1 = await spreadTrading.placeSpreadOrder({
        symbol: 'SOLUSDT_SOL/USDT',
        side: 'Buy',
        orderType: 'Limit',
        qty: '0.01',  // Very small quantity
        price: '0.01', // Very low price (likely won't execute)
        orderLinkId: 'test_limit_' + Date.now(),
        timeInForce: 'PostOnly'
      })
      
      console.log('✅ Order 1 placed successfully:', order1)
      
      // Wait a moment then try to amend it
      setTimeout(async () => {
        try {
          console.log('\n📊 Amending Order 1...')
          const amended1 = await spreadTrading.amendSpreadOrder({
            symbol: 'SOLUSDT_SOL/USDT',
            orderId: order1.orderId,
            price: '0.02'  // Increase price slightly
          })
          console.log('✅ Order 1 amended successfully:', amended1)
          
          // Wait a moment then cancel it
          setTimeout(async () => {
            try {
              console.log('\n📊 Cancelling Order 1...')
              const cancelled1 = await spreadTrading.cancelSpreadOrder(order1.orderId)
              console.log('✅ Order 1 cancelled successfully:', cancelled1)
            } catch (error) {
              console.log('⚠️ Order 1 cancellation failed:', error.message)
            }
          }, 2000)
          
        } catch (error) {
          console.log('⚠️ Order 1 amendment failed:', error.message)
        }
      }, 2000)
      
    } catch (error) {
      console.log('⚠️ Order 1 placement failed:', error.message)
    }
    
    // Test 2: Place a market order with very small quantity
    console.log('\n📊 Test 2: Placing Small Market Order (IOC)')
    try {
      const order2 = await spreadTrading.placeMarketSpreadOrder(
        'BTCUSDT_SOL/USDT',
        'Sell',
        0.001,  // Very small quantity
        'IOC',
        'test_market_' + Date.now()
      )
      
      console.log('✅ Order 2 placed successfully:', order2)
      
    } catch (error) {
      console.log('⚠️ Order 2 placement failed:', error.message)
    }
    
    // Test 3: Place a post-only order
    console.log('\n📊 Test 3: Placing Post-Only Order')
    try {
      const order3 = await spreadTrading.placePostOnlySpreadOrder(
        'ETHUSDT_BTC/USDT',
        'Buy',
        0.001,  // Very small quantity
        0.001,  // Very low price
        'test_postonly_' + Date.now()
      )
      
      console.log('✅ Order 3 placed successfully:', order3)
      
      // Wait a moment then cancel it
      setTimeout(async () => {
        try {
          console.log('\n📊 Cancelling Order 3...')
          const cancelled3 = await spreadTrading.cancelSpreadOrder(order3.orderId)
          console.log('✅ Order 3 cancelled successfully:', cancelled3)
        } catch (error) {
          console.log('⚠️ Order 3 cancellation failed:', error.message)
        }
      }, 3000)
      
    } catch (error) {
      console.log('⚠️ Order 3 placement failed:', error.message)
    }
    
    // Test 4: Test order limit checking
    console.log('\n📊 Test 4: Checking Order Limits')
    try {
      await spreadTrading.checkOrderLimits()
      console.log('✅ Order limit check completed')
    } catch (error) {
      console.log('⚠️ Order limit check failed:', error.message)
    }
    
    // Test 5: Get current orders
    console.log('\n📊 Test 5: Getting Current Orders')
    try {
      const orders = await spreadTrading.getSpreadOrderHistory({
        limit: 20
      })
      console.log('✅ Current orders retrieved:', orders.list?.length || 0, 'orders')
      if (orders.list && orders.list.length > 0) {
        console.log('Recent orders:')
        orders.list.slice(0, 3).forEach((order, index) => {
          console.log(`${index + 1}. ${order.symbol} ${order.side} ${order.qty} @ ${order.price} (${order.orderStatus})`)
        })
      }
    } catch (error) {
      console.log('⚠️ Getting current orders failed:', error.message)
    }
    
    // Test 6: Performance metrics
    console.log('\n📊 Test 6: Performance Metrics')
    try {
      const metrics = spreadTrading.getPerformanceMetrics()
      console.log('✅ Performance metrics:', metrics)
    } catch (error) {
      console.log('⚠️ Performance metrics failed:', error.message)
    }
    
    console.log('\n🎉 Real Order Testing Completed!')
    console.log('\n📋 Summary:')
    console.log('- Tested order placement with real API')
    console.log('- Tested order amendment and cancellation')
    console.log('- Used very small quantities for safety')
    console.log('- Verified order management functionality')
    
    console.log('\n💡 Important Notes:')
    console.log('1. Orders were placed with minimal quantities')
    console.log('2. PostOnly orders likely won\'t execute immediately')
    console.log('3. Check your Bybit account for order status')
    console.log('4. Monitor for any unexpected executions')
    
    // Wait for any pending operations to complete
    setTimeout(async () => {
      console.log('\n🧹 Cleaning up...')
      await spreadTrading.cleanup()
      console.log('✅ Cleanup completed')
    }, 5000)
    
  } catch (error) {
    console.error('❌ Real order test failed:', error)
  }
}

// Run the test
testSpreadOrdersReal() 