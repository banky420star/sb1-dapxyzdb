import { Router } from "express"; import { z } from "zod"; import { validate } from "../middleware/validate";
import { predict, PredictReqSchema } from "../services/modelService"; import { env } from "../config";
const r=Router();
r.post("/ai/consensus", validate(z.object({ body: PredictReqSchema })), async (req,res)=>{
  const { symbol, features, timestamp } = (req as any).z.body;
  const out = await predict({ symbol, features, timestamp });
  const allow = out.confidence >= env.CONFIDENCE_THRESHOLD && out.signal!=="flat";
  res.json({ ...out, allow });
});
export default r;
