import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../config";
import { isDrawdownBreached, withinCaps, sizeByVolTarget } from "../services/riskService";
export function riskGate(req:Request,res:Response,next:NextFunction){
  const { symbol, qtyUsd, confidence } = req.body as any;
  if(env.TRADING_MODE==="live" && isDrawdownBreached()) return res.status(423).json({error:"risk_locked"});
  if(confidence < env.CONFIDENCE_THRESHOLD) return res.status(412).json({error:"low_confidence",min:env.CONFIDENCE_THRESHOLD,got:confidence});
  if(!withinCaps(symbol, qtyUsd)) return res.status(409).json({error:"exceeds_symbol_cap"});
  req.body.qtyUsd = sizeByVolTarget(qtyUsd, symbol, 0.5);
  if(!req.header("Idempotency-Key")){
    const ik=crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
    (req as any).idempotencyKey=ik; res.setHeader("Idempotency-Key", ik);
  }
  next();
}
