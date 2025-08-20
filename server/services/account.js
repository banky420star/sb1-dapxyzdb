// server/services/account.js
// Agent note: connect your real source here (Bybit, MT5 via Redis, DB).
// This stub returns a stable shape the frontend expects.

export async function getLiveBalance() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase()

  // TODO: wire your real providers based on mode + env vars
  // Example: if (mode === 'live') return await bybitBalance()
  // Example: if (mode === 'paper') return await dbSimulatedBalance()

  return {
    mode,               // 'paper' | 'live'
    currency: 'USDT',
    available: 1234.56,
    equity: 1301.78,
    pnl24hPct: 2.3,
    updatedAt: new Date().toISOString(),
  }
}
