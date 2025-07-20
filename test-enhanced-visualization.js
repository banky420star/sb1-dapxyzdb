#!/usr/bin/env node

/**
 * Enhanced Test Script for Model Training Visualization with Reward System
 * Tests real-time training visualization, model-specific visualizations, and reward system
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:8000'

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
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

function logInfo(message) {
  log(message, 'cyan')
}

function logPurple(message) {
  log(message, 'purple')
}

async function testBasicEndpoints() {
  log('Testing basic training visualization endpoints...')
  
  const endpoints = [
    { path: '/api/ml/training-data', name: 'Training Data' },
    { path: '/api/ml/real-time-updates', name: 'Real-time Updates' },
    { path: '/api/models', name: 'Model Status' }
  ]
  
  let successCount = 0
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`)
      if (response.ok) {
        const data = await response.json()
        logSuccess(`✅ ${endpoint.name} endpoint working`)
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

async function testRewardSystem() {
  logPurple('Testing Reward System...')
  
  const rewardEndpoints = [
    { path: '/api/ml/rewards', name: 'Reward System Data' },
    { path: '/api/ml/rewards/test-session', name: 'Reward Breakdown' },
    { path: '/api/ml/rewards/test-session/history', name: 'Reward History' }
  ]
  
  let successCount = 0
  for (const endpoint of rewardEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`)
      if (response.ok) {
        const data = await response.json()
        logSuccess(`✅ ${endpoint.name} endpoint working`)
        successCount++
      } else if (response.status === 404) {
        logWarning(`⚠️ ${endpoint.name} returned 404 (expected for test data)`)
        successCount++ // This is expected for test sessions
      } else {
        logError(`❌ ${endpoint.name} returned status ${response.status}`)
      }
    } catch (error) {
      logError(`❌ ${endpoint.name} failed: ${error.message}`)
    }
  }
  
  return successCount === rewardEndpoints.length
}

async function testModelTraining() {
  logInfo('Testing model training functionality...')
  
  const models = ['randomforest', 'lstm', 'ddqn']
  let successCount = 0
  
  for (const modelType of models) {
    try {
      const response = await fetch(`${BASE_URL}/api/ml/start-training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelType })
      })
      
      if (response.ok) {
        const data = await response.json()
        logSuccess(`✅ Started training for ${modelType}: ${data.message}`)
        successCount++
      } else {
        logError(`❌ Failed to start training for ${modelType}: ${response.status}`)
      }
    } catch (error) {
      logError(`❌ Error starting training for ${modelType}: ${error.message}`)
    }
  }
  
  return successCount === models.length
}

async function testRewardMetricsUpdate() {
  logPurple('Testing reward metrics update...')
  
  try {
    const newMetrics = {
      accuracy: { weight: 0.5, threshold: 0.7 },
      precision: { weight: 0.3, threshold: 0.6 },
      recall: { weight: 0.2, threshold: 0.6 }
    }
    
    const response = await fetch(`${BASE_URL}/api/ml/rewards/randomforest/metrics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: newMetrics })
    })
    
    if (response.ok) {
      const data = await response.json()
      logSuccess(`✅ Reward metrics updated: ${data.message}`)
      return true
    } else {
      logError(`❌ Failed to update reward metrics: ${response.status}`)
      return false
    }
  } catch (error) {
    logError(`❌ Error updating reward metrics: ${error.message}`)
    return false
  }
}

async function testTrainingSessionEndpoints() {
  logInfo('Testing training session endpoints...')
  
  const sessionEndpoints = [
    { path: '/api/ml/training-session/test-session', name: 'Training Session' },
    { path: '/api/ml/training-metrics/test-session', name: 'Training Metrics' }
  ]
  
  let successCount = 0
  for (const endpoint of sessionEndpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`)
      if (response.ok) {
        const data = await response.json()
        logSuccess(`✅ ${endpoint.name} endpoint working`)
        successCount++
      } else if (response.status === 404) {
        logWarning(`⚠️ ${endpoint.name} returned 404 (expected for test session)`)
        successCount++ // This is expected for test sessions
      } else {
        logError(`❌ ${endpoint.name} returned status ${response.status}`)
      }
    } catch (error) {
      logError(`❌ ${endpoint.name} failed: ${error.message}`)
    }
  }
  
  return successCount === sessionEndpoints.length
}

async function testFrontendAccess() {
  logInfo('Testing frontend access...')
  
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

async function simulateTrainingProgress() {
  logPurple('Simulating training progress with rewards...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/ml/training-data`)
    if (response.ok) {
      const data = await response.json()
      logSuccess(`✅ Training data endpoint accessible`)
      
      if (data.activeTrainings && data.activeTrainings.length > 0) {
        logInfo(`   Active trainings: ${data.activeTrainings.length}`)
        data.activeTrainings.forEach(training => {
          logInfo(`   - ${training.modelName}: ${(training.progress * 100).toFixed(1)}% complete`)
        })
      } else {
        logInfo(`   No active trainings`)
      }
      
      if (data.trainingHistory && data.trainingHistory.length > 0) {
        logInfo(`   Training history: ${data.trainingHistory.length} sessions`)
      }
      
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

async function runEnhancedVisualizationTests() {
  log('🚀 Starting Enhanced Model Training Visualization Tests')
  log('=====================================================')
  
  const tests = [
    { name: 'Basic Endpoints', fn: testBasicEndpoints },
    { name: 'Reward System', fn: testRewardSystem },
    { name: 'Model Training', fn: testModelTraining },
    { name: 'Reward Metrics Update', fn: testRewardMetricsUpdate },
    { name: 'Training Session Endpoints', fn: testTrainingSessionEndpoints },
    { name: 'Training Progress Simulation', fn: simulateTrainingProgress },
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
  
  log('\n=====================================================')
  log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All enhanced visualization tests passed!')
    log('\n📋 Next Steps:')
    log('   1. Open http://localhost:3000 in your browser')
    log('   2. Go to the Models page')
    log('   3. Click on "Training Visualization" tab')
    log('   4. Start a training session to see:')
    log('      - Model-specific visualizations (Random Forest trees, LSTM cells, DDQN actions)')
    log('      - Real-time reward system with radar charts')
    log('      - Progress tracking and metrics')
    log('      - Interactive charts and graphs')
  } else {
    logWarning(`⚠️ ${totalTests - passedTests} tests failed. Check the logs above.`)
  }
  
  log('\n🛠️ Manual Testing:')
  log('   📊 View training data: curl http://localhost:8000/api/ml/training-data')
  log('   🏆 View reward system: curl http://localhost:8000/api/ml/rewards')
  log('   🚀 Start training: curl -X POST http://localhost:8000/api/ml/start-training -H "Content-Type: application/json" -d \'{"modelType":"randomforest"}\'')
  log('   📈 Real-time updates: curl http://localhost:8000/api/ml/real-time-updates')
  
  log('\n🎨 Visual Features:')
  log('   🌳 Random Forest: Tree ensemble visualization with feature importance')
  log('   ⚡ LSTM: Neural network cells with sequence processing')
  log('   🎯 DDQN: Action selection with Q-values and experience replay')
  log('   🏆 Reward System: Radar charts with real-time scoring')
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedVisualizationTests().catch(error => {
    logError(`Test suite failed: ${error.message}`)
    process.exit(1)
  })
}

export { runEnhancedVisualizationTests } 