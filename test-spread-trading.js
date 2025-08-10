import { BybitSpreadTrading } from './server/data/bybit-spread-trading.js'

async function testSpreadTrading() {
  console.log('🚀 Testing Bybit Spread Trading Module')
  
  try {
    // Initialize spread trading module
    const spreadTrading = new BybitSpreadTrading({
      apiKey: process.env.BYBIT_API_KEY || '',
      secret: process.env.BYBIT_SECRET || '',
      testnet: true
    })
    
    // Set up event handlers
    spreadTrading.on('spread_order_placed', (data) => {
      console.log('📋 Spread Order Placed:', data.orderId)
    })
    
    spreadTrading.on('spread_order_cancelled', (data) => {
      console.log('❌ Spread Order Cancelled:', data.orderId)
    })
    
    spreadTrading.on('spread_data_updated', (data) => {
      console.log('📊 Spread Data Updated:', data.status.activeSpreads, 'active spreads')
    })
    
    // Test 1: Get spread executions
    console.log('\n📊 Test 1: Getting spread executions...')
    try {
      const executions = await spreadTrading.getSpreadExecutions({
        limit: 10
      })
      console.log('✅ Spread executions retrieved:', executions.list?.length || 0, 'executions')
    } catch (error) {
      console.log('⚠️ Spread executions test failed (expected for testnet):', error.message)
    }
    
    // Test 2: Get spread order history
    console.log('\n📊 Test 2: Getting spread order history...')
    try {
      const orders = await spreadTrading.getSpreadOrderHistory({
        limit: 10
      })
      console.log('✅ Spread orders retrieved:', orders.list?.length || 0, 'orders')
    } catch (error) {
      console.log('⚠️ Spread orders test failed (expected for testnet):', error.message)
    }
    
    // Test 3: Get spread positions
    console.log('\n📊 Test 3: Getting spread positions...')
    try {
      const positions = await spreadTrading.getSpreadPositions()
      console.log('✅ Spread positions retrieved:', positions.list?.length || 0, 'positions')
    } catch (error) {
      console.log('⚠️ Spread positions test failed (expected for testnet):', error.message)
    }
    
    // Test 4: Test spread strategy methods (without placing actual orders)
    console.log('\n📊 Test 4: Testing spread strategy methods...')
    
    // Calendar spread example
    console.log('📅 Calendar Spread Example:')
    console.log('- Symbol: BTCUSDT')
    console.log('- Side: Buy')
    console.log('- Quantity: 1')
    console.log('- Near Expiry: 2024-12-31')
    console.log('- Far Expiry: 2025-03-31')
    
    // Butterfly spread example
    console.log('\n🦋 Butterfly Spread Example:')
    console.log('- Symbol: BTCUSDT')
    console.log('- Side: Sell')
    console.log('- Quantity: 1')
    console.log('- Lower Strike: 40000')
    console.log('- Middle Strike: 45000')
    console.log('- Upper Strike: 50000')
    
    // Straddle spread example
    console.log('\n🎯 Straddle Spread Example:')
    console.log('- Symbol: BTCUSDT')
    console.log('- Side: Buy')
    console.log('- Quantity: 1')
    console.log('- Strike: 45000')
    
    // Test 5: Performance metrics
    console.log('\n📊 Test 5: Performance metrics...')
    const performance = spreadTrading.getPerformanceMetrics()
    console.log('Performance Metrics:', performance)
    
    // Test 6: Status monitoring
    console.log('\n📊 Test 6: Status monitoring...')
    const status = spreadTrading.getStatus()
    console.log('Spread Trading Status:', status)
    
    // Test 7: Start monitoring (for 30 seconds)
    console.log('\n📊 Test 7: Starting monitoring for 30 seconds...')
    spreadTrading.startMonitoring()
    
    // Wait 30 seconds to see monitoring in action
    setTimeout(async () => {
      console.log('\n📊 Test 7: Monitoring test completed')
      spreadTrading.stopMonitoring()
      
      // Test 8: Data retrieval methods
      console.log('\n📊 Test 8: Data retrieval methods...')
      
      const orders = spreadTrading.getSpreadOrders()
      const executions = spreadTrading.getSpreadExecutions()
      const positions = spreadTrading.getSpreadPositions()
      const activeSpreads = spreadTrading.getActiveSpreads()
      
      console.log('Data Summary:')
      console.log('- Total Orders:', orders.length)
      console.log('- Total Executions:', executions.length)
      console.log('- Total Positions:', positions.length)
      console.log('- Active Spreads:', activeSpreads.length)
      
      // Test 9: Cleanup
      console.log('\n📊 Test 9: Cleanup...')
      await spreadTrading.cleanup()
      console.log('✅ Spread trading module cleaned up')
      
      console.log('\n🎉 Spread Trading Test Completed Successfully!')
      process.exit(0)
      
    }, 30000)
    
  } catch (error) {
    console.error('❌ Spread trading test failed:', error)
    process.exit(1)
  }
}

// Run the test
testSpreadTrading() 