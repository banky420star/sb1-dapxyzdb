// server/services/account.js
// Real Bybit API integration for live balance data

import crypto from 'crypto'

// Bybit API configuration
const BYBIT_API_KEY = process.env.BYBIT_API_KEY
const BYBIT_SECRET = process.env.BYBIT_SECRET
const BYBIT_BASE_URL = 'https://api.bybit.com'

// Generate Bybit API signature
function generateSignature(params, secret) {
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex')
}

// Get real balance from Bybit
async function getBybitBalance() {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit API credentials not configured')
  }

  const timestamp = Date.now().toString()
  const params = {
    accountType: 'UNIFIED',
    coin: 'USDT',
    timestamp: timestamp,
    recvWindow: process.env.BYBIT_RECV_WINDOW || '5000'
  }

  const signature = generateSignature(params, BYBIT_SECRET)
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  const url = `${BYBIT_BASE_URL}/v5/account/wallet-balance?${queryString}&sign=${signature}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': BYBIT_API_KEY,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': params.recvWindow
    }
  })

  if (!response.ok) {
    throw new Error(`Bybit API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`)
  }

  const balance = data.result.list[0]?.coin[0]
  if (!balance) {
    throw new Error('No balance data found')
  }

  return {
    mode: 'live',
    currency: balance.coin,
    available: parseFloat(balance.walletBalance),
    equity: parseFloat(balance.walletBalance),
    pnl24hPct: 0, // Would need additional API call for PnL
    updatedAt: new Date().toISOString()
  }
}

// Get paper trading balance (simulated)
function getPaperBalance() {
  return {
    mode: 'paper',
    currency: 'USDT',
    available: 10000.00,
    equity: 10250.75,
    pnl24hPct: 2.5,
    updatedAt: new Date().toISOString()
  }
}

export async function getLiveBalance() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  
  try {
    if (mode === 'live' && BYBIT_API_KEY && BYBIT_SECRET) {
      return await getBybitBalance()
    } else {
      return getPaperBalance()
    }
  } catch (error) {
    console.error('Error fetching balance:', error.message)
    // Fallback to paper trading on error
    return getPaperBalance()
  }
}
