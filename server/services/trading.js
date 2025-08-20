// server/services/trading.js
// Agent note: Replace with your Redis/DB/Bybit/MT5 calls.
// Return small, consistent payloads so UI is snappy.

export async function getLiveTradingState() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()

  // TODO: plug real position/order feeds
  const positions = [
    // { symbol: 'BTCUSDT', size: 0.01, entry: 65000, pnlPct: 0.8, ts: new Date().toISOString() }
  ]
  const openOrders = [
    // { id: 'abc123', symbol: 'BTCUSDT', side: 'buy', price: 64200, qty: 0.01, ts: new Date().toISOString() }
  ]

  return {
    mode,               // 'paper' | 'live'
    positions,
    openOrders,
    pnlDayPct: 0.0,
    updatedAt: new Date().toISOString(),
  }
}
