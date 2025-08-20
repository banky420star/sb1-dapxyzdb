// src/pages/Trading.tsx
import React from 'react'
import { useTradingContext } from '../contexts/TradingContext'

export default function Trading() {
  const { state, refresh } = useTradingContext()
  const badge = state.tradingMode === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Trading</h1>
        <span className={`px-2 py-1 text-xs rounded-full ${badge}`}>{state.tradingMode.toUpperCase()}</span>
        <button onClick={refresh} className="px-3 py-1 text-sm rounded border">Refresh</button>
      </div>

      <section>
        <h2 className="font-medium mb-2">Open Positions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left opacity-70">
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Entry</th>
                <th className="py-2 pr-4">PnL %</th>
                <th className="py-2 pr-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {state.positions.length === 0 ? (
                <tr><td className="py-2" colSpan={5}>No open positions</td></tr>
              ) : state.positions.map((p: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4">{p.symbol}</td>
                  <td className="py-2 pr-4">{p.size}</td>
                  <td className="py-2 pr-4">{p.entry}</td>
                  <td className="py-2 pr-4">{(p.pnlPct ?? 0).toFixed(2)}%</td>
                  <td className="py-2 pr-4">{new Date(p.ts).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Open Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left opacity-70">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Side</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {state.openOrders.length === 0 ? (
                <tr><td className="py-2" colSpan={6}>No open orders</td></tr>
              ) : state.openOrders.map((o: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4">{o.id}</td>
                  <td className="py-2 pr-4">{o.symbol}</td>
                  <td className="py-2 pr-4">{o.side}</td>
                  <td className="py-2 pr-4">{o.price}</td>
                  <td className="py-2 pr-4">{o.qty}</td>
                  <td className="py-2 pr-4">{new Date(o.ts).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}