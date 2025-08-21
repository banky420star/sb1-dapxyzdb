// Real trading data service
import crypto from 'crypto'

const BYBIT_API_KEY = process.env.BYBIT_API_KEY
const BYBIT_SECRET = process.env.BYBIT_SECRET

let realDataCache = {
  balance: null,
  positions: [],
  orders: [],
  trades: [],
  lastUpdate: null
}

async function getRealBybitBalance() {
  if (!BYBIT_API_KEY || !BYBIT_SECRET) {
    throw new Error('Bybit credentials not configured')
  }

  const timestamp = Date.now().toString()
  const params = {
    accountType: 'UNIFIED',
    coin: 'USDT',
    timestamp: timestamp,
    recvWindow: '5000'
  }

  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  const signature = crypto
    .createHmac('sha256', BYBIT_SECRET)
    .update(queryString)
    .digest('hex')

  const url = `https://api.bybit.com/v5/account/wallet-balance?${queryString}&sign=${signature}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': BYBIT_API_KEY,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000'
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
    pnl24hPct: 0,
    updatedAt: new Date().toISOString()
  }
}

export async function updateRealDataCache() {
  try {
    console.log('Fetching real Bybit data...')
    const balance = await getRealBybitBalance()
    realDataCache.balance = balance
    realDataCache.lastUpdate = new Date().toISOString()
    console.log('Real Bybit balance:', balance)
    return realDataCache
  } catch (error) {
    console.error('Error fetching real data:', error.message)
    return realDataCache
  }
}

export function getRealDataCache() {
  return realDataCache
}

// Initialize and update every 30 seconds
updateRealDataCache()
setInterval(updateRealDataCache, 30000)
