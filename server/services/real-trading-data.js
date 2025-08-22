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

  console.log('Fetching Bybit balance from:', url)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': BYBIT_API_KEY,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': '5000'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Bybit API response error:', response.status, errorText)
    throw new Error(`Bybit API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('Bybit API response:', JSON.stringify(data, null, 2))
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`)
  }

  // Handle the correct response structure
  const accountInfo = data.result.list[0]
  if (!accountInfo) {
    throw new Error('No account data found')
  }

  // Calculate total balance from all coins
  let totalBalance = 0
  let availableBalance = 0
  
  if (accountInfo.coin && Array.isArray(accountInfo.coin)) {
    // New API structure with coin array
    for (const coin of accountInfo.coin) {
      if (coin.coin === 'USDT') {
        totalBalance = parseFloat(coin.walletBalance || 0)
        availableBalance = parseFloat(coin.availableToWithdraw || 0)
        break
      }
    }
  } else {
    // Fallback to old structure
    totalBalance = parseFloat(accountInfo.totalWalletBalance || 0)
    availableBalance = parseFloat(accountInfo.availableToWithdraw || 0)
  }

  return {
    mode: 'live',
    currency: 'USDT',
    total: totalBalance,
    available: availableBalance,
    equity: totalBalance,
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
