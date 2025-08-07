import { BybitWebSocketV3 } from './server/data/bybit-websocket-v3.js'

async function testBybitWebSocketV3() {
  console.log('🚀 Testing Bybit WebSocket V3 Integration')
  
  try {
    // Initialize WebSocket V3 client
    const wsClient = new BybitWebSocketV3({
      apiKey: '3fg29yhr1a9JJ1etm3',
      secret: 'wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14',
      testnet: true, // Use testnet for testing
      symbols: ['BTCUSDT', 'ETHUSDT'],
      heartbeatInterval: 20000,
      reconnectAttempts: 3
    })
    
    // Set up event handlers
    wsClient.on('orderbook_update', (data) => {
      console.log('📊 Orderbook Update:', data.symbol, data.data.b.length, 'bids,', data.data.a.length, 'asks')
    })
    
    wsClient.on('trade_update', (data) => {
      console.log('💱 Trade Update:', data.symbol, data.data.length, 'trades')
    })
    
    wsClient.on('ticker_update', (data) => {
      console.log('📈 Ticker Update:', data.symbol, 'Price:', data.data.lastPrice, 'Change:', data.data.price24hPcnt + '%')
    })
    
    wsClient.on('position_update', (data) => {
      console.log('📋 Position Update:', data.positions.length, 'positions')
    })
    
    wsClient.on('order_update', (data) => {
      console.log('📝 Order Update:', data.orders.length, 'orders')
    })
    
    wsClient.on('wallet_update', (data) => {
      console.log('💰 Wallet Update:', 'Equity:', data.wallet.equity, 'Balance:', data.wallet.balance)
    })
    
    wsClient.on('error', (error) => {
      console.error('❌ WebSocket Error:', error)
    })
    
    wsClient.on('max_reconnect_attempts_reached', () => {
      console.error('❌ Max reconnection attempts reached')
    })
    
    // Connect to WebSocket
    console.log('🔗 Connecting to Bybit WebSocket V3...')
    await wsClient.connect()
    
    // Test data retrieval
    setTimeout(async () => {
      console.log('\n📊 Testing Data Retrieval:')
      
      const btcOrderBook = wsClient.getOrderBook('BTCUSDT')
      console.log('BTC OrderBook:', btcOrderBook ? 'Available' : 'Not available')
      
      const btcTrades = wsClient.getTrades('BTCUSDT')
      console.log('BTC Trades:', btcTrades ? 'Available' : 'Not available')
      
      const btcTicker = wsClient.getTicker('BTCUSDT')
      console.log('BTC Ticker:', btcTicker ? 'Available' : 'Not available')
      
      const positions = wsClient.getPositions()
      console.log('Positions:', positions.length)
      
      const orders = wsClient.getOrders()
      console.log('Orders:', orders.length)
      
      const wallet = wsClient.getWallet()
      console.log('Wallet:', wallet ? 'Available' : 'Not available')
      
      const status = wsClient.getStatus()
      console.log('Status:', status)
      
    }, 5000)
    
    // Test subscription management
    setTimeout(() => {
      console.log('\n📡 Testing Subscription Management:')
      wsClient.unsubscribe('orderbook.50.BTCUSDT')
    }, 10000)
    
    // Keep connection alive for 30 seconds
    setTimeout(async () => {
      console.log('\n🔌 Disconnecting...')
      await wsClient.disconnect()
      console.log('✅ Test completed')
      process.exit(0)
    }, 30000)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testBybitWebSocketV3() 