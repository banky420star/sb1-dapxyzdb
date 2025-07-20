import fetch from 'node-fetch'

async function testAnalytics() {
  const baseUrl = 'http://localhost:8000'
  
  try {
    console.log('Testing Analytics API endpoints...\n')
    
    // Test health endpoint
    console.log('1. Testing health endpoint...')
    const health = await fetch(`${baseUrl}/api/health`)
    console.log('Health status:', health.status)
    
    // Test trades endpoint
    console.log('\n2. Testing trades endpoint...')
    const trades = await fetch(`${baseUrl}/api/analytics/trades`)
    const tradesData = await trades.json()
    console.log('Trades endpoint status:', trades.status)
    console.log('Number of trades:', tradesData.trades ? tradesData.trades.length : 'No trades data')
    
    // Test performance endpoint
    console.log('\n3. Testing performance endpoint...')
    const performance = await fetch(`${baseUrl}/api/analytics/performance`)
    const performanceData = await performance.json()
    console.log('Performance endpoint status:', performance.status)
    console.log('Performance data:', performanceData.performance ? 'Available' : 'No performance data')
    
    // Test models endpoint
    console.log('\n4. Testing models endpoint...')
    const models = await fetch(`${baseUrl}/api/analytics/models`)
    const modelsData = await models.json()
    console.log('Models endpoint status:', models.status)
    console.log('Number of models:', modelsData.models ? modelsData.models.length : 'No models data')
    
    // Test risk endpoint
    console.log('\n5. Testing risk endpoint...')
    const risk = await fetch(`${baseUrl}/api/analytics/risk`)
    const riskData = await risk.json()
    console.log('Risk endpoint status:', risk.status)
    console.log('Risk data:', riskData.config ? 'Available' : 'No risk data')
    
    console.log('\n✅ All analytics endpoints tested successfully!')
    
  } catch (error) {
    console.error('❌ Error testing analytics endpoints:', error.message)
  }
}

testAnalytics() 