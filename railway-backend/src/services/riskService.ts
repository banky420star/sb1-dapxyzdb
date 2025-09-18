import { env } from "../config";
let rollingDrawdownPct=0; const caps=new Map<string,number>();
export function isDrawdownBreached(){ return rollingDrawdownPct <= -Math.abs(env.MAX_DRAWDOWN_PCT); }
export function withinCaps(sym:string, usd:number){ const cap=caps.get(sym)??env.PER_SYMBOL_USD_CAP; return Math.abs(usd)<=cap; }
export function sizeByVolTarget(usd:number, _sym:string, rv=0.5){ const s=Math.min(1, env.TARGET_ANN_VOL/Math.max(1e-6,rv)); return usd*s; }
export function updateDrawdown(pct:number){ rollingDrawdownPct=pct; }
