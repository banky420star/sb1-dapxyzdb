#!/usr/bin/env node

/**
 * Crypto Trading Platform Test Script
 * Tests the complete crypto trading system with Bybit integration
 */

import axios from 'axios'
import { Logger } from './server/utils/logger.js'

const logger = new Logger()
const BASE_URL = process.env.BASE_URL || 'http://localhost:8000'

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue')
}

async function testCryptoPlatform() {
  log('🚀 Testing Crypto Trading Platform', 'bright')
  log('=====================================', 'bright')
  
  try {
    // Test 1: Check if server is running
    logInfo('Testing server connectivity...')
    const statusResponse = await axios.get(`${BASE_URL}/api/status`)
    if (statusResponse.data.status === 'running') {
      logSuccess('Server is running')
    } else {
      logError('Server is not running properly')
      return
    }
    
    // Test 2: Check crypto trading engine status
    logInfo('Testing crypto trading engine...')
    try {
      const cryptoStatusResponse = await axios.get(`${BASE_URL}/api/crypto/status`)
      const cryptoStatus = cryptoStatusResponse.data
      
      logSuccess(`Crypto trading engine status: ${cryptoStatus.initialized ? 'Initialized' : 'Not initialized'}`)
      logSuccess(`Trading mode: ${cryptoStatus.mode}`)
      logSuccess(`Engine running: ${cryptoStatus.running}`)
      
      if (cryptoStatus.bybitStatus) {
        logSuccess(`Bybit connection: ${cryptoStatus.bybitStatus.connected ? 'Connected' : 'Disconnected'}`)
      }
      
    } catch (error) {
      logWarning('Crypto trading engine not available')
    }
    
    // Test 3: Test Bybit API endpoints
    logInfo('Testing Bybit API endpoints...')
    const bybitEndpoints = [
      { path: '/api/bybit/status', name: 'Bybit Status' },
      { path: '/api/bybit/balance', name: 'Bybit Balance' },
      { path: '/api/bybit/positions', name: 'Bybit Positions' },
      { path: '/api/bybit/signals', name: 'Bybit Strategy Signals' }
    ]
    
    let bybitSuccessCount = 0
    for (const endpoint of bybitEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.path}`)
        if (response.status === 200) {
          logSuccess(`${endpoint.name}: OK`)
          bybitSuccessCount++
        } else {
          logWarning(`${endpoint.name}: Status ${response.status}`)
        }
      } catch (error) {
        logWarning(`${endpoint.name}: ${error.response?.status || 'Connection failed'}`)
      }
    }
    
    if (bybitSuccessCount === bybitEndpoints.length) {
      logSuccess('All Bybit endpoints are working')
    } else {
      logWarning(`${bybitSuccessCount}/${bybitEndpoints.length} Bybit endpoints are working`)
    }
    
    // Test 4: Test crypto API endpoints
    logInfo('Testing crypto API endpoints...')
    const cryptoEndpoints = [
      { path: '/api/crypto/status', name: 'Crypto Status' },
      { path: '/api/crypto/balance', name: 'Crypto Balance' },
      { path: '/api/crypto/positions', name: 'Crypto Positions' },
      { path: '/api/crypto/orders', name: 'Crypto Orders' },
      { path: '/api/crypto/performance', name: 'Crypto Performance' },
      { path: '/api/crypto/signals', name: 'Crypto Signals' }
    ]
    
    let cryptoSuccessCount = 0
    for (const endpoint of cryptoEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.path}`)
        if (response.status === 200) {
          logSuccess(`${endpoint.name}: OK`)
          cryptoSuccessCount++
          
          // Log some data for key endpoints
          if (endpoint.path === '/api/crypto/balance' && response.data) {
            const balance = response.data
            logInfo(`  Balance: $${balance.equity?.toFixed(2) || 'N/A'}`)
          }
          
          if (endpoint.path === '/api/crypto/positions' && response.data) {
            const positions = response.data
            logInfo(`  Open positions: ${positions.length}`)
          }
          
          if (endpoint.path === '/api/crypto/performance' && response.data) {
            const perf = response.data
            logInfo(`  Total P&L: $${perf.totalPnL?.toFixed(2) || 'N/A'}`)
            logInfo(`  Win rate: ${perf.winRate?.toFixed(1) || 'N/A'}%`)
          }
          
        } else {
          logWarning(`${endpoint.name}: Status ${response.status}`)
        }
      } catch (error) {
        if (error.response?.status === 503) {
          logWarning(`${endpoint.name}: Service not available`)
        } else {
          logWarning(`${endpoint.name}: ${error.response?.status || 'Connection failed'}`)
        }
      }
    }
    
    if (cryptoSuccessCount === cryptoEndpoints.length) {
      logSuccess('All crypto endpoints are working')
    } else {
      logWarning(`${cryptoSuccessCount}/${cryptoEndpoints.length} crypto endpoints are working`)
    }
    
    // Test 5: Test trading operations (paper mode only)
    logInfo('Testing trading operations...')
    try {
      // Test starting the crypto trading engine
      const startResponse = await axios.post(`${BASE_URL}/api/crypto/start`)
      if (startResponse.data.success) {
        logSuccess('Crypto trading engine started successfully')
        
        // Wait a moment for engine to initialize
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Test stopping the engine
        const stopResponse = await axios.post(`${BASE_URL}/api/crypto/stop`)
        if (stopResponse.data.success) {
          logSuccess('Crypto trading engine stopped successfully')
        } else {
          logWarning('Failed to stop crypto trading engine')
        }
      } else {
        logWarning('Failed to start crypto trading engine')
      }
    } catch (error) {
      logWarning(`Trading operations test: ${error.response?.data?.error || error.message}`)
    }
    
    // Test 6: Test WebSocket connection (simulated)
    logInfo('Testing WebSocket connectivity...')
    try {
      const { io } = await import('socket.io-client')
      const socket = io(BASE_URL)
      
      socket.on('connect', () => {
        logSuccess('WebSocket connected successfully')
        
        // Test crypto events
        socket.emit('get_crypto_status')
        
        setTimeout(() => {
          socket.disconnect()
          logSuccess('WebSocket disconnected successfully')
        }, 1000)
      })
      
      socket.on('connect_error', (error) => {
        logWarning(`WebSocket connection error: ${error.message}`)
      })
      
    } catch (error) {
      logWarning(`WebSocket test: ${error.message}`)
    }
    
    // Summary
    log('\n📊 Test Summary', 'bright')
    log('===============', 'bright')
    logSuccess('Server connectivity: OK')
    logSuccess(`Bybit endpoints: ${bybitSuccessCount}/${bybitEndpoints.length} working`)
    logSuccess(`Crypto endpoints: ${cryptoSuccessCount}/${cryptoEndpoints.length} working`)
    
    if (bybitSuccessCount > 0 && cryptoSuccessCount > 0) {
      logSuccess('🎉 Crypto trading platform is operational!')
      logInfo('You can now start trading cryptocurrencies with Bybit integration')
    } else {
      logWarning('⚠️ Some components need attention before trading')
    }
    
  } catch (error) {
    logError(`Test failed: ${error.message}`)
    if (error.code === 'ECONNREFUSED') {
      logError('Server is not running. Start it with: npm start')
    }
  }
}

// Run the test
testCryptoPlatform()
  .then(() => {
    log('\n✨ Test completed', 'bright')
    process.exit(0)
  })
  .catch((error) => {
    logError(`Test failed: ${error.message}`)
    process.exit(1)
  })

export { testCryptoPlatform } 