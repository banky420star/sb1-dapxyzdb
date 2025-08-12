/**
 * buildFeatures({ candles }) -> features
 * candles: array of { open, high, low, close, volume, ts }
 * 
 * Extracts technical indicators and market features for AI models
 */
export function buildFeatures({ candles = [] }) {
  // Minimal example: last close, simple momentum, volume spike flag
  const n = candles.length;
  const last = candles[n-1] || {};
  const prev = candles[n-2] || last;
  
  // Basic price momentum
  const momentum = last.close && prev.close ? (last.close - prev.close) / prev.close : 0;
  
  // Volume analysis
  const avgVol = candles.slice(-20).reduce((s,c)=>s+(c.volume||0),0) / Math.max(1, Math.min(20, n));
  const volSpike = last.volume && avgVol ? (last.volume > 1.8 * avgVol) : false;
  
  // Price volatility (last 10 candles)
  const recentCandles = candles.slice(-10);
  const priceChanges = recentCandles.map(c => c.close).filter(Boolean);
  const volatility = priceChanges.length > 1 ? 
    Math.sqrt(priceChanges.reduce((sum, price, i) => {
      if (i === 0) return 0;
      const change = (price - priceChanges[i-1]) / priceChanges[i-1];
      return sum + change * change;
    }, 0) / (priceChanges.length - 1)) : 0;
  
  // RSI approximation (simplified)
  const gains = recentCandles.map(c => c.close > c.open ? (c.close - c.open) : 0);
  const losses = recentCandles.map(c => c.close < c.open ? (c.open - c.close) : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  
  // MACD approximation (simplified)
  const prices = recentCandles.map(c => c.close).filter(Boolean);
  const ema12 = prices.length > 0 ? prices.reduce((a, b) => a * 0.85 + b * 0.15, prices[0]) : 0;
  const ema26 = prices.length > 0 ? prices.reduce((a, b) => a * 0.92 + b * 0.08, prices[0]) : 0;
  const macd = ema12 - ema26;
  
  // Support/Resistance levels (simplified)
  const highs = recentCandles.map(c => c.high).filter(Boolean);
  const lows = recentCandles.map(c => c.low).filter(Boolean);
  const resistance = highs.length > 0 ? Math.max(...highs) : 0;
  const support = lows.length > 0 ? Math.min(...lows) : 0;
  
  return {
    lastClose: last.close,
    momentum,
    volSpike,
    volatility,
    rsi,
    macd,
    resistance,
    support,
    avgVolume: avgVol,
    priceChange: momentum,
    timestamp: last.ts || Date.now()
  };
}

/**
 * Generate mock candles for testing when real data isn't available
 */
export function generateMockCandles(count = 20) {
  const candles = [];
  let basePrice = 50000; // BTC price
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 0.02; // ±1% change
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 100 + Math.random() * 50;
    
    candles.push({
      open,
      high,
      low,
      close,
      volume,
      ts: Date.now() - (count - i) * 60000 // 1 minute intervals
    });
    
    basePrice = close;
  }
  
  return candles;
} 