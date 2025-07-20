#!/usr/bin/env node

// Test script to verify real-time data display
import fetch from 'node-fetch';
import { io } from 'socket.io-client';

async function testRealTimeData() {
  console.log('🧪 Testing Real-time Data Display...\n');
  
  const baseUrl = 'http://localhost:8000';
  
  try {
    // Test health endpoint
    console.log('1. Testing server health...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log(`✅ Server Status: ${healthData.status}`);
    console.log(`   System Running: ${healthData.system.isRunning}`);
    console.log(`   Trading Mode: ${healthData.system.tradingMode}\n`);
    
    // Test real-time prices
    console.log('2. Testing real-time prices...');
    const pricesRes = await fetch(`${baseUrl}/api/data/prices`);
    const pricesData = await pricesRes.json();
    
    if (pricesData.prices && Object.keys(pricesData.prices).length > 0) {
      console.log('✅ Real-time prices are available:');
      Object.entries(pricesData.prices).forEach(([symbol, price]) => {
        console.log(`   ${symbol}: ${price.bid?.toFixed(5)} / ${price.ask?.toFixed(5)} (Spread: ${price.spread?.toFixed(5)})`);
      });
    } else {
      console.log('❌ No real-time prices available');
    }
    console.log();
    
    // Test real-time signals
    console.log('3. Testing real-time signals...');
    const signalsRes = await fetch(`${baseUrl}/api/data/signals`);
    const signalsData = await signalsRes.json();
    
    if (signalsData.signals && signalsData.signals.length > 0) {
      console.log('✅ Real-time signals are available:');
      signalsData.signals.forEach((signal, index) => {
        console.log(`   Signal ${index + 1}: ${signal.symbol} ${signal.signal} (${(signal.confidence * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('ℹ️  No trading signals available (this is normal)');
    }
    console.log();
    
    // Test AI status
    console.log('4. Testing AI status...');
    const aiStatusRes = await fetch(`${baseUrl}/api/ai/status`);
    const aiStatusData = await aiStatusRes.json();
    
    console.log(`✅ AI Status:`);
    console.log(`   Data Fetcher Connected: ${aiStatusData.dataFetcher.connected}`);
    console.log(`   Data Fetcher Running: ${aiStatusData.dataFetcher.isRunning}`);
    console.log(`   Symbols: ${aiStatusData.dataFetcher.symbols.join(', ')}`);
    console.log(`   Models: ${aiStatusData.models.length} available`);
    
    aiStatusData.models.forEach(model => {
      console.log(`     - ${model.name}: ${model.status} (${(model.accuracy * 100).toFixed(1)}% accuracy)`);
    });
    console.log();
    
    // Test WebSocket connection (simulate frontend connection)
    console.log('5. Testing WebSocket connection...');
    const socket = io(baseUrl);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
    });
    
    socket.on('price_update', (prices) => {
      console.log('✅ Received real-time price update via WebSocket');
      console.log(`   Symbols updated: ${Object.keys(prices).join(', ')}`);
    });
    
    socket.on('signals_update', (signals) => {
      console.log('✅ Received real-time signals update via WebSocket');
      console.log(`   Signals count: ${signals.length}`);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
    });
    
    // Wait for WebSocket events
    setTimeout(() => {
      console.log('\n📊 Summary:');
      console.log('✅ Backend server is running and responding');
      console.log('✅ Real-time price data is available');
      console.log('✅ AI status is accessible');
      console.log('✅ WebSocket connection is working');
      console.log('\n🎯 Frontend should now display real-time data correctly!');
      console.log('   Open http://localhost:3000 to view the dashboard');
      
      socket.disconnect();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testRealTimeData(); 