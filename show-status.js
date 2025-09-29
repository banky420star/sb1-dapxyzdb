#!/usr/bin/env node

/**
 * Show AI Trading Cyborg Status
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002';

async function showStatus() {
  console.log('🤖 AI Trading Cyborg Status Report');
  console.log('=====================================\n');

  try {
    // Health Check
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const health = await healthResponse.json();
    
    console.log('🏥 System Health:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Version: ${health.version}`);
    console.log(`   Mode: ${health.mode}`);
    console.log(`   Timestamp: ${health.timestamp}`);
    console.log(`   Message: ${health.message}`);
    console.log('');

    // Trading P&L
    const pnlResponse = await fetch(`${BASE_URL}/api/trading/pnl`);
    const pnl = await pnlResponse.json();
    
    console.log('💰 Trading Performance:');
    console.log(`   Total P&L: $${pnl.data.totalPnL.toFixed(2)}`);
    console.log(`   Daily P&L: $${pnl.data.dailyPnL.toFixed(2)}`);
    console.log(`   Unrealized: $${pnl.data.unrealizedPnL.toFixed(2)}`);
    console.log(`   Realized: $${pnl.data.realizedPnL.toFixed(2)}`);
    console.log('');

    // Risk Metrics
    const riskResponse = await fetch(`${BASE_URL}/api/risk/metrics`);
    const risk = await riskResponse.json();
    
    console.log('🛡️ Risk Metrics:');
    console.log(`   Current Drawdown: ${(risk.data.currentDrawdown * 100).toFixed(2)}%`);
    console.log(`   Max Drawdown: ${(risk.data.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`   Risk Utilization: ${risk.data.riskUtilization.toFixed(1)}%`);
    console.log(`   Position Count: ${risk.data.positionCount}`);
    console.log(`   Exposure: $${risk.data.exposure.toFixed(2)}`);
    console.log(`   Volatility: ${(risk.data.volatility * 100).toFixed(2)}%`);
    console.log(`   Sharpe Ratio: ${risk.data.sharpeRatio.toFixed(2)}`);
    console.log('');

    // Alpha Pods
    const alphaResponse = await fetch(`${BASE_URL}/api/alpha/pods/status`);
    const alpha = await alphaResponse.json();
    
    console.log('🧠 Alpha Pods:');
    alpha.data.forEach(pod => {
      const signalText = pod.signal > 0.1 ? 'BUY' : pod.signal < -0.1 ? 'SELL' : 'HOLD';
      console.log(`   ${pod.name}:`);
      console.log(`     Weight: ${(pod.weight * 100).toFixed(1)}%`);
      console.log(`     Signal: ${signalText} (${pod.signal.toFixed(3)})`);
      console.log(`     Confidence: ${(pod.confidence * 100).toFixed(1)}%`);
      console.log(`     Performance: ${(pod.performance * 100).toFixed(2)}%`);
      console.log(`     Attribution: $${pod.attribution.toFixed(2)}`);
    });
    console.log('');

    // Positions
    const positionsResponse = await fetch(`${BASE_URL}/api/positions`);
    const positions = await positionsResponse.json();
    
    console.log('📊 Current Positions:');
    if (positions.data.length === 0) {
      console.log('   No open positions');
    } else {
      positions.data.forEach(pos => {
        console.log(`   ${pos.symbol} ${pos.side.toUpperCase()}:`);
        console.log(`     Size: ${pos.size}`);
        console.log(`     Entry: $${pos.entryPrice}`);
        console.log(`     Current: $${pos.currentPrice}`);
        console.log(`     P&L: $${pos.pnl.toFixed(3)}`);
        console.log(`     Risk: ${(pos.risk * 100).toFixed(2)}%`);
      });
    }
    console.log('');

    console.log('🌐 Frontend Access:');
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   Health: ${BASE_URL}/health`);
    console.log(`   Trading API: ${BASE_URL}/api/trading/pnl`);
    console.log(`   Risk API: ${BASE_URL}/api/risk/metrics`);
    console.log(`   Alpha API: ${BASE_URL}/api/alpha/pods/status`);
    console.log('');

    console.log('🎯 AI Trading Cyborg is fully operational!');
    console.log('   Ready for profit hunting with real guardrails!');

  } catch (error) {
    console.error('❌ Error fetching status:', error.message);
    console.log('\n💡 Make sure the server is running:');
    console.log('   node simple-cyborg.js');
  }
}

showStatus();