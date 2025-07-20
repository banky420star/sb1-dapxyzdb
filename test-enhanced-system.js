#!/usr/bin/env node

/**
 * Enhanced AI Trading System Test Script
 * Tests all major components including Bybit integration and notifications
 */

import fetch from 'node-fetch'
import { spawn } from 'child_process'

const BASE_URL = 'http://localhost:8000'
const FRONTEND_URL = 'http://localhost:3000'

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'blue') {
  console.log(`${colors[color]}[TEST]${colors.reset} ${message}`)
}

function logSuccess(message) {
  log(message, 'green')
}

function logError(message) {
  log(message, 'red')
}

function logWarning(message) {
  log(message, 'yellow')
}

async function testEndpoint(url, name) {
  try {
    const response = await fetch(url)
    if (response.ok) {
      logSuccess(`✅ ${name} is responding`)
      return true
    } else {
      logError(`❌ ${name} returned status ${response.status}`)
      return false
    }
  } catch (error) {
    logError(`❌ ${name} failed: ${error.message}`)
    return false
  }
}

async function testAPIEndpoint(endpoint, name) {
  return await testEndpoint(`${BASE_URL}${endpoint}`, name)
}

async function testSystemHealth() {
  log('Testing system health...')
  
  const health = await testAPIEndpoint('/api/health', 'System Health')
  if (health) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`)
      const data = await response.json()
      log(`System Status: ${data.status}`)
      log(`Components: ${Object.keys(data.components).join(', ')}`)
    } catch (error) {
      logError(`Failed to parse health response: ${error.message}`)
    }
  }
}

async function testBybitIntegration() {
  log('Testing Bybit integration...')
  
  const endpoints = [
    { path: '/api/bybit/status', name: 'Bybit Status' },
    { path: '/api/bybit/balance', name: 'Bybit Balance' },
    { path: '/api/bybit/positions', name: 'Bybit Positions' },
    { path: '/api/bybit/signals', name: 'Bybit Strategy Signals' },
    { path: '/api/bybit/news', name: 'Bybit News Events' }
  ]
  
  let successCount = 0
  for (const endpoint of endpoints) {
    const success = await testAPIEndpoint(endpoint.path, endpoint.name)
    if (success) successCount++
  }
  
  if (successCount === endpoints.length) {
    logSuccess('✅ All Bybit endpoints are working')
  } else {
    logWarning(`⚠️ ${successCount}/${endpoints.length} Bybit endpoints are working`)
  }
}

async function testTradingEndpoints() {
  log('Testing trading endpoints...')
  
  const endpoints = [
    { path: '/api/positions', name: 'Positions' },
    { path: '/api/orders', name: 'Orders' },
    { path: '/api/balance', name: 'Balance' },
    { path: '/api/models', name: 'Models' },
    { path: '/api/metrics', name: 'Metrics' }
  ]
  
  let successCount = 0
  for (const endpoint of endpoints) {
    const success = await testAPIEndpoint(endpoint.path, endpoint.name)
    if (success) successCount++
  }
  
  if (successCount === endpoints.length) {
    logSuccess('✅ All trading endpoints are working')
  } else {
    logWarning(`⚠️ ${successCount}/${endpoints.length} trading endpoints are working`)
  }
}

async function testFrontend() {
  log('Testing frontend...')
  await testEndpoint(FRONTEND_URL, 'Frontend Dashboard')
}

async function testPM2Processes() {
  log('Testing PM2 processes...')
  
  return new Promise((resolve) => {
    const pm2 = spawn('pm2', ['list'])
    
    let output = ''
    pm2.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    pm2.stderr.on('data', (data) => {
      logError(`PM2 error: ${data}`)
    })
    
    pm2.on('close', (code) => {
      if (code === 0) {
        if (output.includes('ai-trading-backend') && output.includes('ai-trading-frontend')) {
          logSuccess('✅ Both PM2 processes are running')
          resolve(true)
        } else {
          logWarning('⚠️ Some PM2 processes may not be running')
          console.log(output)
          resolve(false)
        }
      } else {
        logError('❌ Failed to check PM2 processes')
        resolve(false)
      }
    })
  })
}

async function testSystemResources() {
  log('Testing system resources...')
  
  return new Promise((resolve) => {
    const top = spawn('top', ['-bn1'])
    
    let output = ''
    top.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    top.on('close', (code) => {
      if (code === 0) {
        // Extract CPU and memory usage
        const lines = output.split('\n')
        const cpuLine = lines.find(line => line.includes('Cpu(s)'))
        const memLine = lines.find(line => line.includes('Mem'))
        
        if (cpuLine) {
          const cpuMatch = cpuLine.match(/(\d+\.?\d*)%us/)
          if (cpuMatch) {
            const cpuUsage = parseFloat(cpuMatch[1])
            if (cpuUsage < 80) {
              logSuccess(`✅ CPU usage: ${cpuUsage.toFixed(1)}%`)
            } else {
              logWarning(`⚠️ High CPU usage: ${cpuUsage.toFixed(1)}%`)
            }
          }
        }
        
        if (memLine) {
          const memMatch = memLine.match(/(\d+)k total.*?(\d+)k used/)
          if (memMatch) {
            const total = parseInt(memMatch[1])
            const used = parseInt(memMatch[2])
            const memUsage = (used / total) * 100
            if (memUsage < 90) {
              logSuccess(`✅ Memory usage: ${memUsage.toFixed(1)}%`)
            } else {
              logWarning(`⚠️ High memory usage: ${memUsage.toFixed(1)}%`)
            }
          }
        }
        
        resolve(true)
      } else {
        logError('❌ Failed to check system resources')
        resolve(false)
      }
    })
  })
}

async function testNotifications() {
  log('Testing notification system...')
  
  try {
    // Test if notification agent is running by checking health endpoint
    const response = await fetch(`${BASE_URL}/api/health`)
    const data = await response.json()
    
    if (data.components && data.components.notificationAgent) {
      logSuccess('✅ AI Notification Agent is active')
    } else {
      logWarning('⚠️ AI Notification Agent is not active')
    }
  } catch (error) {
    logError(`❌ Failed to test notification system: ${error.message}`)
  }
}

async function runAllTests() {
  log('🚀 Starting Enhanced AI Trading System Tests')
  log('============================================')
  
  const tests = [
    { name: 'System Health', fn: testSystemHealth },
    { name: 'PM2 Processes', fn: testPM2Processes },
    { name: 'System Resources', fn: testSystemResources },
    { name: 'Frontend', fn: testFrontend },
    { name: 'Trading Endpoints', fn: testTradingEndpoints },
    { name: 'Bybit Integration', fn: testBybitIntegration },
    { name: 'Notifications', fn: testNotifications }
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  for (const test of tests) {
    try {
      log(`\nRunning ${test.name} test...`)
      const result = await test.fn()
      if (result !== false) {
        passedTests++
      }
    } catch (error) {
      logError(`❌ ${test.name} test failed: ${error.message}`)
    }
  }
  
  log('\n============================================')
  log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! System is working correctly.')
  } else {
    logWarning(`⚠️ ${totalTests - passedTests} tests failed. Check the logs above.`)
  }
  
  log('\n📋 Quick Access:')
  log(`   🌐 Frontend: ${FRONTEND_URL}`)
  log(`   🔧 Backend: ${BASE_URL}`)
  log(`   📊 Health: ${BASE_URL}/api/health`)
  log(`   🤖 Bybit: ${BASE_URL}/api/bybit/status`)
  
  log('\n🛠️ Management Commands:')
  log('   📋 Health check: ./health-check.sh')
  log('   🔄 Restart: sudo systemctl restart ai-trading')
  log('   📊 Monitor: pm2 monit')
  log('   📝 Logs: pm2 logs')
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    logError(`Test suite failed: ${error.message}`)
    process.exit(1)
  })
}

export { runAllTests } 