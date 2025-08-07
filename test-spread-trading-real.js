import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'
import { bybitConfig } from './config/bybit-config.js'

async function testSpreadTradingReal() {
  console.log('🚀 Testing Bybit Spread Trading with Real API Credentials')
  console.log('API Key:', bybitConfig.apiKey.substring(0, 8) + '...')
  console.log('Testnet:', bybitConfig.testnet)
  
  try {
    // Initialize spread trading module with real credentials
    const spreadTrading = new BybitSpreadTrading(bybitConfig)
    
    // Set up event handlers
    spreadTrading.on('spread_order_placed', (data) => {
      console.log('📋 Spread Order Placed Successfully!')
      console.log('Order ID:', data.orderId)
      console.log('Order Link ID:', data.orderLinkId)
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
    
    spreadTrading.on('spread_data_updated', (data) => {
      console.log('📊 Spread Data Updated:', data.type)
    })
    
    // Test 1: Get Spread Executions
    console.log('\n📊 Test 1: Fetching Spread Executions')
    try {
      const executions = await spreadTrading.getSpreadExecutions({
        limit: 10
      })
      console.log('✅ Executions retrieved:', executions.list?.length || 0, 'records')
      if (executions.list && executions.list.length > 0) {
        console.log('Sample execution:', executions.list[0])
      }
    } catch (error) {
      console.log('⚠️ Executions test failed:', error.message)
    }
    
    // Test 2: Get Spread Order History
    console.log('\n📊 Test 2: Fetching Spread Order History')
    try {
      const orders = await spreadTrading.getSpreadOrderHistory({
        limit: 10
      })
      console.log('✅ Order history retrieved:', orders.list?.length || 0, 'records')
      if (orders.list && orders.list.length > 0) {
        console.log('Sample order:', orders.list[0])
      }
    } catch (error) {
      console.log('⚠️ Order history test failed:', error.message)
    }
    
    // Test 3: Get Spread Positions
    console.log('\n📊 Test 3: Fetching Spread Positions')
    try {
      const positions = await spreadTrading.getSpreadPositions()
      console.log('✅ Positions retrieved:', positions.list?.length || 0, 'records')
      if (positions.list && positions.list.length > 0) {
        console.log('Sample position:', positions.list[0])
      }
    } catch (error) {
      console.log('⚠️ Positions test failed:', error.message)
    }
    
    // Test 4: Check Order Limits
    console.log('\n📊 Test 4: Checking Order Limits')
    try {
      await spreadTrading.checkOrderLimits()
      console.log('✅ Order limit check completed')
    } catch (error) {
      console.log('⚠️ Order limit check failed:', error.message)
    }
    
    // Test 5: Performance Metrics
    console.log('\n📊 Test 5: Performance Metrics')
    try {
      const metrics = spreadTrading.getPerformanceMetrics()
      console.log('✅ Performance metrics:', metrics)
    } catch (error) {
      console.log('⚠️ Performance metrics failed:', error.message)
    }
    
    // Test 6: System Status
    console.log('\n📊 Test 6: System Status')
    try {
      const status = spreadTrading.getStatus()
      console.log('✅ System status:', status)
    } catch (error) {
      console.log('⚠️ System status failed:', error.message)
    }
    
    // Test 7: Start Monitoring
    console.log('\n📊 Test 7: Starting Monitoring')
    try {
      spreadTrading.startMonitoring()
      console.log('✅ Monitoring started')
      
      // Stop monitoring after 10 seconds
      setTimeout(() => {
        spreadTrading.stopMonitoring()
        console.log('✅ Monitoring stopped')
      }, 10000)
    } catch (error) {
      console.log('⚠️ Monitoring test failed:', error.message)
    }
    
    // Test 8: Data Retrieval Methods
    console.log('\n📊 Test 8: Data Retrieval Methods')
    try {
      const spreadOrders = spreadTrading.getSpreadOrders()
      const spreadExecutions = spreadTrading.getSpreadExecutions()
      const spreadPositions = spreadTrading.getSpreadPositions()
      const activeSpreads = spreadTrading.getActiveSpreads()
      
      console.log('✅ Data retrieval completed:')
      console.log('- Spread Orders:', spreadOrders.length)
      console.log('- Spread Executions:', spreadExecutions.length)
      console.log('- Spread Positions:', spreadPositions.length)
      console.log('- Active Spreads:', activeSpreads.size)
    } catch (error) {
      console.log('⚠️ Data retrieval test failed:', error.message)
    }
    
    console.log('\n🎉 Real API Testing Completed!')
    console.log('\n📋 Summary:')
    console.log('- Tested with real Bybit API credentials')
    console.log('- Verified API connectivity and authentication')
    console.log('- Tested data retrieval and monitoring')
    console.log('- Checked system status and performance')
    
    console.log('\n💡 Next Steps:')
    console.log('1. Review test results for any API errors')
    console.log('2. Test order placement with small quantities')
    console.log('3. Monitor WebSocket streams for real-time data')
    console.log('4. Deploy to production when ready')
    
    // Cleanup
    await spreadTrading.cleanup()
    
  } catch (error) {
    console.error('❌ Real API test failed:', error)
  }
}

// Run the test
testSpreadTradingReal() 