// server/services/trading.js
// Enhanced Real Bybit API integration with Risk Management and Monitoring

import crypto from 'crypto'
import logger from '../utils/simple-logger.js'
import { riskManager } from './risk-manager.js'
import { performanceMonitor } from './monitoring.js'

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

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recvWindow
      }
    })

    const latency = Date.now() - startTime
    performanceMonitor.trackApiRequest(latency, response.ok)

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
  } catch (error) {
    logger.error('Error fetching Bybit positions:', error.message)
    throw error
  }
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

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recvWindow
      }
    })

    const latency = Date.now() - startTime
    performanceMonitor.trackApiRequest(latency, response.ok)

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
  } catch (error) {
    logger.error('Error fetching Bybit orders:', error.message)
    throw error
  }
}

// Execute real order on Bybit with risk validation
async function executeBybitOrder(orderData) {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit API credentials not configured')
  }

  // Get current account balance and positions for risk validation
  const [accountBalance, currentPositions] = await Promise.all([
    getBybitAccountBalance(),
    getBybitPositions()
  ])

  // Risk validation
  const riskValidation = riskManager.validatePosition(
    accountBalance.total,
    orderData.qty * orderData.price,
    orderData.symbol,
    currentPositions
  )

  if (!riskValidation.isValid) {
    logger.warn('Order rejected due to risk violations:', riskValidation.violations)
    throw new Error(`Order rejected: ${riskValidation.violations[0]?.message}`)
  }

  const timestamp = Date.now().toString()
  const params = {
    category: 'linear',
    symbol: orderData.symbol,
    side: orderData.side.toUpperCase(),
    orderType: orderData.type || 'Market',
    qty: orderData.qty.toString(),
    timestamp: timestamp,
    recvWindow: process.env.BYBIT_RECV_WINDOW || '5000'
  }

  // Add optional parameters
  if (orderData.price && orderData.type !== 'Market') {
    params.price = orderData.price.toString()
  }
  if (orderData.stopLoss) {
    params.stopLoss = orderData.stopLoss.toString()
  }
  if (orderData.takeProfit) {
    params.takeProfit = orderData.takeProfit.toString()
  }

  const signature = generateSignature(params, BYBIT_SECRET)
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  const url = `${BYBIT_BASE_URL}/v5/order/create`

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recvWindow,
        'X-BAPI-SIGN': signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    const latency = Date.now() - startTime
    const success = response.ok

    // Track order performance
    performanceMonitor.trackOrder(orderData, success, latency)

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }

    const orderResult = data.result
    
    logger.info('Order executed successfully', {
      orderId: orderResult.orderId,
      symbol: orderData.symbol,
      side: orderData.side,
      qty: orderData.qty,
      latency
    })

    return {
      orderId: orderResult.orderId,
      symbol: orderData.symbol,
      side: orderData.side,
      qty: orderData.qty,
      price: orderData.price,
      status: orderResult.orderStatus,
      latency,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error executing Bybit order:', error.message)
    performanceMonitor.trackOrder(orderData, false, Date.now() - startTime)
    throw error
  }
}

// Get Bybit account balance
async function getBybitAccountBalance() {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit API credentials not configured')
  }

  const timestamp = Date.now().toString()
  const params = {
    accountType: 'UNIFIED',
    timestamp: timestamp,
    recvWindow: process.env.BYBIT_RECV_WINDOW || '5000'
  }

  const signature = generateSignature(params, BYBIT_SECRET)
  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  const url = `${BYBIT_BASE_URL}/v5/account/wallet-balance?${queryString}&sign=${signature}`

  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': params.recvWindow
      }
    })

    const latency = Date.now() - startTime
    performanceMonitor.trackApiRequest(latency, response.ok)

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }

    const balance = data.result.list[0]
    return {
      total: parseFloat(balance.totalWalletBalance),
      available: parseFloat(balance.availableToWithdraw),
      currency: 'USDT',
      mode: 'live'
    }
  } catch (error) {
    logger.error('Error fetching Bybit balance:', error.message)
    throw error
  }
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

// Enhanced trading state with risk management
export async function getLiveTradingState() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  
  try {
    if (mode === 'live' && BYBIT_API_KEY && BYBIT_SECRET) {
      const [positions, orders, accountBalance] = await Promise.all([
        getBybitPositions(),
        getBybitOrders(),
        getBybitAccountBalance()
      ])
      
      // Update risk state
      riskManager.updateRiskState(accountBalance, positions, orders)
      
      return {
        mode: 'live',
        positions,
        openOrders: orders,
        pnlDayPct: 0, // Would need additional API call for daily PnL
        updatedAt: new Date().toISOString(),
        riskLevel: riskManager.getRiskStatus().riskLevel
      }
    } else {
      return getPaperTradingState()
    }
  } catch (error) {
    logger.error('Error fetching trading state:', error.message)
    // Fallback to paper trading on error
    return getPaperTradingState()
  }
}

// Execute order with risk management
export async function executeOrder(orderData) {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  
  try {
    if (mode === 'live' && BYBIT_API_KEY && BYBIT_SECRET) {
      return await executeBybitOrder(orderData)
    } else {
      // Paper trading simulation
      logger.info('Paper trading order:', orderData)
      return {
        orderId: `paper-${Date.now()}`,
        symbol: orderData.symbol,
        side: orderData.side,
        qty: orderData.qty,
        price: orderData.price,
        status: 'Filled',
        latency: 50,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    logger.error('Error executing order:', error.message)
    throw error
  }
}

// Get account balance with risk status
export async function getAccountBalance() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()
  
  try {
    if (mode === 'live' && BYBIT_API_KEY && BYBIT_SECRET) {
      return await getBybitAccountBalance()
    } else {
      return {
        total: 10000,
        available: 9500,
        currency: 'USDT',
        mode: 'paper'
      }
    }
  } catch (error) {
    logger.error('Error fetching account balance:', error.message)
    throw error
  }
}
