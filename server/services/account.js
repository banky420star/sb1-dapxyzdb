// server/services/account.js
// Real Bybit API integration for live balance data

import { getRealDataCache } from './real-trading-data.js'

// Get paper trading balance (simulated)
function getPaperBalance() {
  console.log('Using paper trading balance (fallback)')
  return {
    mode: 'paper',
    currency: 'USDT',
    total: 10000.00,
    available: 9500.00,
    equity: 10250.75,
    pnl24hPct: 2.5,
    updatedAt: new Date().toISOString()
  }
}

export async function getLiveBalance() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  console.log('Trading mode:', mode)
  
  try {
    // Always try to get real data first, regardless of mode
    const realData = getRealDataCache()
    console.log('Real data cache:', realData)
    
    if (realData.balance && realData.balance.mode === 'live') {
      console.log('Returning real Bybit balance:', realData.balance)
      return realData.balance
    } else {
      console.log('No real balance available or not in live mode, using paper trading')
      return getPaperBalance()
    }
  } catch (error) {
    console.error('Error fetching balance:', error.message)
    // Fallback to paper trading on error
    return getPaperBalance()
  }
}
