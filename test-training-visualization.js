#!/usr/bin/env node

/**
 * Test script for Model Training Visualization
 * Simulates training sessions and verifies real-time updates
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:8000'

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

async function testTrainingEndpoints() {
  log('Testing training visualization endpoints...')
  
  const endpoints = [
    { path: '/api/ml/training-data', name: 'Training Data' },
    { path: '/api/ml/real-time-updates', name: 'Real-time Updates' }
  ]
  
  let successCount = 0
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`)
      if (response.ok) {
        const data = await response.json()
        logSuccess(`✅ ${endpoint.name} endpoint working`)
        console.log(`   Data:`, JSON.stringify(data, null, 2))
        successCount++
      } else {
        logError(`❌ ${endpoint.name} returned status ${response.status}`)
      }
    } catch (error) {
      logError(`❌ ${endpoint.name} failed: ${error.message}`)
    }
  }
  
  return successCount === endpoints.length
}

async function testStartTraining() {
  log('Testing start training functionality...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/ml/start-training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelType: 'randomforest' })
    })
    
    if (response.ok) {
      const data = await response.json()
      logSuccess(`✅ Start training working: ${data.message}`)
      return true
    } else {
      logError(`❌ Start training failed: ${response.status}`)
      return false
    }
  } catch (error) {
    logError(`❌ Start training error: ${error.message}`)
    return false
  }
}

async function testModelStatus() {
  log('Testing model status endpoint...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/models`)
    if (response.ok) {
      const models = await response.json()
      logSuccess(`✅ Model status working - ${models.length} models found`)
      
      models.forEach(model => {
        console.log(`   ${model.name}: ${model.status} (${(model.accuracy * 100).toFixed(2)}% accuracy)`)
      })
      
      return true
    } else {
      logError(`❌ Model status failed: ${response.status}`)
      return false
    }
  } catch (error) {
    logError(`❌ Model status error: ${error.message}`)
    return false
  }
}

async function simulateTrainingProgress() {
  log('Simulating training progress...')
  
  // This would normally be done by the actual training process
  // For testing, we'll just verify the endpoints exist
  try {
    const response = await fetch(`${BASE_URL}/api/ml/training-data`)
    if (response.ok) {
      const data = await response.json()
      logSuccess(`✅ Training data endpoint accessible`)
      console.log(`   Active trainings: ${data.activeTrainings?.length || 0}`)
      console.log(`   Training history: ${data.trainingHistory?.length || 0}`)
      return true
    } else {
      logError(`❌ Training data endpoint failed: ${response.status}`)
      return false
    }
  } catch (error) {
    logError(`❌ Training data error: ${error.message}`)
    return false
  }
}

async function testFrontendAccess() {
  log('Testing frontend access...')
  
  try {
    const response = await fetch('http://localhost:3000')
    if (response.ok) {
      logSuccess(`✅ Frontend accessible`)
      return true
    } else {
      logWarning(`⚠️ Frontend returned status ${response.status}`)
      return false
    }
  } catch (error) {
    logWarning(`⚠️ Frontend not accessible: ${error.message}`)
    return false
  }
}

async function runTrainingVisualizationTests() {
  log('🚀 Starting Model Training Visualization Tests')
  log('============================================')
  
  const tests = [
    { name: 'Model Status', fn: testModelStatus },
    { name: 'Training Endpoints', fn: testTrainingEndpoints },
    { name: 'Start Training', fn: testStartTraining },
    { name: 'Training Progress', fn: simulateTrainingProgress },
    { name: 'Frontend Access', fn: testFrontendAccess }
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  for (const test of tests) {
    try {
      log(`\nRunning ${test.name} test...`)
      const result = await test.fn()
      if (result) {
        passedTests++
      }
    } catch (error) {
      logError(`❌ ${test.name} test failed: ${error.message}`)
    }
  }
  
  log('\n============================================')
  log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All training visualization tests passed!')
    log('\n📋 Next Steps:')
    log('   1. Open http://localhost:3000 in your browser')
    log('   2. Go to the Models page')
    log('   3. Click on "Training Visualization" tab')
    log('   4. Start a training session to see real-time updates')
  } else {
    logWarning(`⚠️ ${totalTests - passedTests} tests failed. Check the logs above.`)
  }
  
  log('\n🛠️ Manual Testing:')
  log('   📊 View training data: curl http://localhost:8000/api/ml/training-data')
  log('   🚀 Start training: curl -X POST http://localhost:8000/api/ml/start-training -H "Content-Type: application/json" -d \'{"modelType":"randomforest"}\'')
  log('   📈 Real-time updates: curl http://localhost:8000/api/ml/real-time-updates')
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTrainingVisualizationTests().catch(error => {
    logError(`Test suite failed: ${error.message}`)
    process.exit(1)
  })
}

export { runTrainingVisualizationTests } 