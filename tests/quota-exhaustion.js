#!/usr/bin/env node

import fetch from 'node-fetch'
import { performance } from 'perf_hooks'

const RATE_GATE_URL = 'http://localhost:3001'
const ALPHA_VANTAGE_LIMIT = 75
const TEST_PERCENTAGE = 0.8 // Test at 80% of limit

async function testRateGateExhaustion() {
  console.log('🧪 Testing Rate Gate Quota Exhaustion...')
  
  try {
    // 1. Check rate-gate health
    console.log('\n1️⃣ Checking rate-gate health...')
    const healthResponse = await fetch(`${RATE_GATE_URL}/health`)
    if (!healthResponse.ok) {
      throw new Error(`Rate-gate not responding: ${healthResponse.status}`)
    }
    console.log('✅ Rate-gate is healthy')
    
    // 2. Reset quota for clean test
    console.log('\n2️⃣ Resetting quota for clean test...')
    await fetch(`${RATE_GATE_URL}/reset`, { method: 'POST' })
    console.log('✅ Quota reset')
    
    // 3. Consume quota up to 80% threshold
    const targetRequests = Math.floor(ALPHA_VANTAGE_LIMIT * TEST_PERCENTAGE)
    console.log(`\n3️⃣ Consuming quota: ${targetRequests}/${ALPHA_VANTAGE_LIMIT} requests (${TEST_PERCENTAGE * 100}%)...`)
    
    let warningReceived = false
    let backoffTriggered = false
    
    for (let i = 0; i < targetRequests; i++) {
      const response = await fetch(`${RATE_GATE_URL}/consume/alphavantage`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      // Check for warning at 80% threshold
      if (result.warning && result.usagePercentage >= 80) {
        warningReceived = true
        console.log(`⚠️  WARNING: ${result.warning} (${result.usagePercentage}% usage)`)
      }
      
      if (response.status === 429) {
        backoffTriggered = true
        console.log(`🛑 BACKOFF triggered at request ${i + 1}`)
        break
      }
      
      // Progress indicator
      if ((i + 1) % 10 === 0 || i === targetRequests - 1) {
        console.log(`   Progress: ${i + 1}/${targetRequests} requests`)
      }
    }
    
    // 4. Try to exceed the limit to trigger backoff
    console.log('\n4️⃣ Testing quota exhaustion beyond limit...')
    let exhaustionRequests = 0
    
    while (exhaustionRequests < 20) { // Try up to 20 more requests
      const response = await fetch(`${RATE_GATE_URL}/consume/alphavantage`, {
        method: 'POST'
      })
      
      exhaustionRequests++
      
      if (response.status === 429) {
        backoffTriggered = true
        console.log(`🛑 rate-gate BACKOFF triggered after ${exhaustionRequests} additional requests`)
        break
      }
    }
    
    // 5. Check final quota status
    console.log('\n5️⃣ Checking final quota status...')
    const statusResponse = await fetch(`${RATE_GATE_URL}/status/alphavantage`)
    const status = await statusResponse.json()
    
    console.log(`📊 Final Status:`)
    console.log(`   Used: ${status.used}/${status.limit}`)
    console.log(`   Usage: ${status.usagePercentage}%`)
    console.log(`   Remaining: ${status.remaining}`)
    console.log(`   Reset Time: ${new Date(status.resetTime).toLocaleTimeString()}`)
    
    // 6. Test results
    console.log('\n📋 Test Results:')
    console.log(`   ✅ Warning at 80%: ${warningReceived ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Backoff triggered: ${backoffTriggered ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Rate gate functional: ${status.used > 0 ? 'PASS' : 'FAIL'}`)
    
    if (warningReceived && backoffTriggered) {
      console.log('\n🎉 QUOTA EXHAUSTION TEST PASSED!')
      console.log('Rate-gate properly warns at 80% and triggers backoff on exhaustion.')
      return true
    } else {
      console.log('\n❌ QUOTA EXHAUSTION TEST FAILED!')
      console.log('Rate-gate did not behave as expected.')
      return false
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message)
    console.log('\nPossible issues:')
    console.log('- Rate-gate service not running (docker compose up rate-gate)')
    console.log('- Redis not available')
    console.log('- Network connectivity issues')
    return false
  }
}

async function simulateBybitTest() {
  console.log('\n🔄 Quick Bybit rate limiting test...')
  
  try {
    const response = await fetch(`${RATE_GATE_URL}/consume/bybit`, {
      method: 'POST'
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Bybit rate limiting operational (${result.usagePercentage}% used)`)
    }
  } catch (error) {
    console.log(`⚠️  Bybit test skipped: ${error.message}`)
  }
}

async function main() {
  console.log('🚀 AI Trading System - Rate Gate Quota Exhaustion Test')
  console.log('=' .repeat(60))
  
  const startTime = performance.now()
  
  const alphaVantageResult = await testRateGateExhaustion()
  await simulateBybitTest()
  
  const endTime = performance.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log('\n' + '='.repeat(60))
  console.log(`⏱️  Test completed in ${duration}s`)
  
  if (alphaVantageResult) {
    console.log('🎯 System ready for production - rate limiting will prevent API bans!')
    process.exit(0)
  } else {
    console.log('⚠️  Fix rate limiting before deploying to prevent API bans!')
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user')
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test terminated')
  process.exit(143)
})

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
} 