import { Router } from "express"; import { z } from "zod"; import { validate } from "../middleware/validate"; import { riskGate } from "../middleware/riskGate";
import { env } from "../config"; import { placeOrder } from "../services/bybitClient"; import { midPx } from "../services/quotes";
const r=Router();
const ExecIn=z.object({ body:z.object({ symbol:z.string(), side:z.enum(["buy","sell"]), qtyUsd:z.number().positive(), confidence:z.number().min(0).max(1), slPct:z.number().positive().max(0.2).default(0.01), tpPct:z.number().positive().max(0.5).default(0.02), category:z.enum(["linear","inverse","spot"]).default("linear") }) });
r.post("/trade/execute", validate(ExecIn), riskGate, async (req,res)=>{
  const { symbol, side, qtyUsd, slPct, tpPct, category } = (req as any).z.body; const idk=(req as any).idempotencyKey;
  if(env.TRADING_MODE!=="live") return res.json({ ok:true, mode:"paper", dryRun:true, order:req.body });
  try{
    const px=await midPx(symbol, category); const qty=(qtyUsd/px).toFixed(6);
    const out=await placeOrder({ symbol, side: side==="buy"?"Buy":"Sell", qty, market:true, idempotencyKey:idk, category });
    res.json({ ok:true, mode:"live", broker: out });
  }catch(e:any){ res.status(502).json({ ok:false, error:String(e?.message||e) }); }
});
export default r;
