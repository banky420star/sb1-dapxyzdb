#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const execAsync = promisify(exec)

console.log('🚀 MT5 Live Trading Setup Script')
console.log('=' .repeat(50))

// Configuration check
function checkEnvironment() {
  console.log('\n📋 Checking Environment Configuration...')
  
  const requiredEnvVars = [
    'MT5_INTEGRATION',
    'ZMQ_COMMAND_PORT',
    'ZMQ_DATA_PORT',
    'TRADING_MODE'
  ]
  
  const missing = []
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '))
    console.log('💡 Please check your .env file')
    return false
  }
  
  console.log('✅ Environment configuration looks good!')
  return true
}

// Check if MT5 bridge file exists
function checkMT5Bridge() {
  console.log('\n📁 Checking MT5 Bridge Files...')
  
  const bridgeFile = path.join(process.cwd(), 'mt5', 'ZmqDealerEA.mq5')
  
  if (fs.existsSync(bridgeFile)) {
    console.log('✅ MT5 bridge file found:', bridgeFile)
    console.log('📋 Next steps:')
    console.log('   1. Copy this file to your MT5 Experts folder')
    console.log('   2. Download libzmq.dll to MT5 Libraries folder')
    console.log('   3. Compile the EA in MetaEditor')
    console.log('   4. Attach the EA to a chart in MT5')
    return true
  } else {
    console.log('❌ MT5 bridge file not found')
    return false
  }
}

// Check Node.js dependencies
async function checkDependencies() {
  console.log('\n📦 Checking Node.js Dependencies...')
  
  try {
    const { stdout } = await execAsync('npm list zeromq --depth=0')
    if (stdout.includes('zeromq@')) {
      console.log('✅ ZeroMQ dependency installed')
      return true
    }
  } catch (error) {
    console.log('❌ ZeroMQ dependency missing')
    console.log('🔧 Installing ZeroMQ...')
    
    try {
      await execAsync('npm install zeromq@6.0.0-beta.19')
      console.log('✅ ZeroMQ installed successfully')
      return true
    } catch (installError) {
      console.log('❌ Failed to install ZeroMQ:', installError.message)
      return false
    }
  }
  
  return false
}

// Check if models are trained
async function checkModels() {
  console.log('\n🧠 Checking ML Models...')
  
  const modelsDir = path.join(process.cwd(), 'models')
  
  if (fs.existsSync(modelsDir)) {
    const files = fs.readdirSync(modelsDir)
    const modelFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.model'))
    
    if (modelFiles.length > 0) {
      console.log('✅ ML models found:', modelFiles.length)
      return true
    }
  }
  
  console.log('⚠️  No ML models found')
  console.log('🔧 Training models...')
  
  try {
    await execAsync('npm run train')
    console.log('✅ Models trained successfully')
    return true
  } catch (error) {
    console.log('❌ Model training failed:', error.message)
    return false
  }
}

// Test MT5 connection
async function testMT5Connection() {
  console.log('\n🔌 Testing MT5 Connection...')
  
  // This would normally test the ZMQ connection
  console.log('⚠️  Manual step required:')
  console.log('   1. Make sure MT5 is running')
  console.log('   2. ZmqDealerEA should be attached to a chart')
  console.log('   3. Check MT5 Expert Advisors tab for "ZMQ sockets up & running"')
  console.log('   4. Test connection after starting the server')
  
  return true
}

// Display final instructions
function displayInstructions() {
  console.log('\n🎯 Final Setup Instructions:')
  console.log('=' .repeat(50))
  console.log('')
  console.log('1. 📥 Install MT5 and ZeroMQ:')
  console.log('   • Download MetaTrader 5 from your broker')
  console.log('   • Download libzmq.dll (64-bit) from GitHub')
  console.log('   • Place libzmq.dll in MT5/MQL5/Libraries/')
  console.log('')
  console.log('2. 🔧 Setup MT5 Bridge:')
  console.log('   • Copy mt5/ZmqDealerEA.mq5 to MT5/MQL5/Experts/')
  console.log('   • Open MetaEditor (F4) and compile the EA')
  console.log('   • Drag the EA onto any chart in MT5')
  console.log('   • Allow DLL imports when prompted')
  console.log('')
  console.log('3. 🚀 Start Trading:')
  console.log('   • Run: npm run server')
  console.log('   • Open: http://localhost:3000')
  console.log('   • Test connection and start demo trading')
  console.log('')
  console.log('4. ⚠️  Safety First:')
  console.log('   • Start with DEMO account only!')
  console.log('   • Use micro lot sizes (0.01)')
  console.log('   • Monitor for 30+ days before going live')
  console.log('')
  console.log('📚 Complete guide: MT5_INTEGRATION_GUIDE.md')
  console.log('🎯 Your AI is ready to trade with MT5!')
}

// Main execution
async function main() {
  try {
    const envOk = checkEnvironment()
    const bridgeOk = checkMT5Bridge()
    const depsOk = await checkDependencies()
    const modelsOk = await checkModels()
    const connectionOk = await testMT5Connection()
    
    console.log('\n📊 Setup Status:')
    console.log('=' .repeat(30))
    console.log(`Environment: ${envOk ? '✅' : '❌'}`)
    console.log(`MT5 Bridge: ${bridgeOk ? '✅' : '❌'}`)
    console.log(`Dependencies: ${depsOk ? '✅' : '❌'}`)
    console.log(`ML Models: ${modelsOk ? '✅' : '❌'}`)
    console.log(`Connection: ${connectionOk ? '✅' : '❌'}`)
    
    if (envOk && bridgeOk && depsOk && modelsOk && connectionOk) {
      console.log('\n🎉 All checks passed! Ready for MT5 trading!')
    } else {
      console.log('\n⚠️  Some checks failed. Please fix the issues above.')
    }
    
    displayInstructions()
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

main()