// server/services/trading.js
// Real Bybit API integration for live trading state

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

// Get real positions from Bybit
async function getBybitPositions() {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit API credentials not configured')
  }

  const timestamp = Date.now().toString()
  const params = {
    accountType: 'UNIFIED',
    category: 'linear',
    timestamp: timestamp,
    recvWindow: process.env.BYBIT_RECV_WINDOW || '5000'
  }

  const signature = generateSignature(params, BYBIT_SECRET)
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  const url = `${BYBIT_BASE_URL}/v5/position/list?${queryString}&sign=${signature}`

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

  const positions = data.result.list
    .filter(pos => parseFloat(pos.size) > 0) // Only open positions
    .map(pos => ({
      symbol: pos.symbol,
      size: parseFloat(pos.size),
      entry: parseFloat(pos.avgPrice),
      pnlPct: parseFloat(pos.unrealisedPnlPcnt) * 100,
      ts: new Date().toISOString()
    }))

  return positions
}

// Get real open orders from Bybit
async function getBybitOrders() {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit API credentials not configured')
  }

  const timestamp = Date.now().toString()
  const params = {
    accountType: 'UNIFIED',
    category: 'linear',
    timestamp: timestamp,
    recvWindow: process.env.BYBIT_RECV_WINDOW || '5000'
  }

  const signature = generateSignature(params, BYBIT_SECRET)
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  const url = `${BYBIT_BASE_URL}/v5/order/realtime?${queryString}&sign=${signature}`

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

  const orders = data.result.list
    .filter(order => order.orderStatus === 'New' || order.orderStatus === 'PartiallyFilled')
    .map(order => ({
      id: order.orderId,
      symbol: order.symbol,
      side: order.side.toLowerCase(),
      price: parseFloat(order.avgPrice || order.price),
      qty: parseFloat(order.qty),
      ts: new Date(parseInt(order.updatedTime)).toISOString()
    }))

  return orders
}

// Get paper trading state (simulated)
function getPaperTradingState() {
  return {
    mode: 'paper',
    positions: [
      {
        symbol: 'BTCUSDT',
        size: 0.01,
        entry: 65000,
        pnlPct: 1.2,
        ts: new Date().toISOString()
      }
    ],
    openOrders: [
      {
        id: 'paper-order-1',
        symbol: 'ETHUSDT',
        side: 'buy',
        price: 3200,
        qty: 0.1,
        ts: new Date().toISOString()
      }
    ],
    pnlDayPct: 1.8,
    updatedAt: new Date().toISOString()
  }
}

export async function getLiveTradingState() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  
  try {
    if (mode === 'live' && BYBIT_API_KEY && BYBIT_SECRET) {
      const [positions, orders] = await Promise.all([
        getBybitPositions(),
        getBybitOrders()
      ])
      
      return {
        mode: 'live',
        positions,
        openOrders: orders,
        pnlDayPct: 0, // Would need additional API call for daily PnL
        updatedAt: new Date().toISOString()
      }
    } else {
      return getPaperTradingState()
    }
  } catch (error) {
    console.error('Error fetching trading state:', error.message)
    // Fallback to paper trading on error
    return getPaperTradingState()
  }
}
