import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { predict } from '../services/modelService';
import { env } from '../config';

const router = Router();

const Candle = z.object({
  timestamp: z.number().or(z.string()),
  open: z.string().or(z.number()),
  high: z.string().or(z.number()),
  low: z.string().or(z.number()),
  close: z.string().or(z.number()),
  volume: z.string().or(z.number()).optional(),
});

const AutoTickSchema = z.object({
  body: z.object({
    symbol: z.string().default('BTCUSDT'),
    candles: z.array(Candle).default([]),
  }),
});

function toNumber(x: any): number {
  const n = typeof x === 'string' ? Number(x) : x;
  return Number.isFinite(n) ? Number(n) : NaN;
}

function sma(values: number[], period: number): number {
  if (values.length === 0) return NaN;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / slice.length;
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return NaN;
  const k = 2 / (period + 1);
  let emaVal = values[0];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function macdHist(values: number[]): number {
  if (values.length < 35) {
    // minimal warmup for EMAs
    return 0;
  }
  const macd = ema(values, 12) - ema(values, 26);
  const signal = ema(values, 9); // using the same stream for simplicity
  return macd - signal;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

router.post('/auto/tick', validate(AutoTickSchema), async (req, res) => {
  const { symbol, candles } = (req as any).z.body as { symbol: string; candles: any[] };

  try {
    const closes = candles
      .map((c) => toNumber((c && (c.close ?? c.c))) ?? NaN)
      .filter((n) => Number.isFinite(n));

    if (closes.length < 2) {
      return res.status(400).json({ ok: false, error: 'insufficient_candles' });
    }

    const ret = closes.length >= 2 ? closes[closes.length - 1] / closes[closes.length - 2] - 1 : 0;
    const features = {
      rsi_14: Number(rsi(closes, 14).toFixed(6)),
      macd_hist: Number(macdHist(closes).toFixed(6)),
      sma_20: Number(sma(closes, 20).toFixed(6)),
      sma_50: Number(sma(closes, 50).toFixed(6)),
      returns: Number(ret.toFixed(6)),
    } as Record<string, number>;

    const pred = await predict({ symbol, features, timestamp: Date.now() });
    const allow = pred.confidence >= env.CONFIDENCE_THRESHOLD && pred.signal !== 'flat';
    return res.json({ ok: true, symbol, features, decision: pred, allow });
  } catch (e: any) {
    console.error('[auto/tick] error', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;

