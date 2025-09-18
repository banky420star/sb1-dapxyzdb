import { useState } from 'react';
import api from '@/lib/api';

export default function TradeTriggerV2() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function manualBuy() {
    try {
      setLoading(true); 
      setMsg('');
      const out = await api.executeTrade({
        symbol: 'BTCUSDT',
        side: 'buy',
        type: 'market',
        volume: 1,
        confidence: 0.9,
      });
      setMsg(JSON.stringify(out, null, 2));
    } catch (e:any) {
      setMsg(e.message || String(e));
    } finally { 
      setLoading(false); 
    }
  }

  async function autoTick() {
    try {
      setLoading(true); 
      setMsg('');
      const out = await api.autoTick({ symbol: 'BTCUSDT', candles: [] }); // TODO: plug real candles
      setMsg(JSON.stringify(out, null, 2));
    } catch (e:any) {
      setMsg(e.message || String(e));
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex gap-2">
        <button 
          disabled={loading} 
          onClick={manualBuy} 
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          Manual Buy
        </button>
        <button 
          disabled={loading} 
          onClick={autoTick} 
          className="px-3 py-2 rounded bg-gray-800 text-white disabled:opacity-50"
        >
          Auto Tick
        </button>
      </div>
      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
        {msg}
      </pre>
    </div>
  );
} 
