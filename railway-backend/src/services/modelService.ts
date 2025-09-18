import { z } from "zod"; import { env } from "../config";
export const PredictReqSchema=z.object({symbol:z.string().min(1),features:z.record(z.number()).default({}),timestamp:z.number().int().optional()});
export const PredictRespSchema=z.object({signal:z.enum(["long","short","flat"]),prob_long:z.number().min(0).max(1),prob_short:z.number().min(0).max(1),confidence:z.number().min(0).max(1),model_version:z.string().min(1)});
export type PredictReq= z.infer<typeof PredictReqSchema>; export type PredictResp= z.infer<typeof PredictRespSchema>;
async function fetchWithTimeout(url:string,opts:RequestInit,ms=3000){ const c=new AbortController(); const id=setTimeout(()=>c.abort(),ms); try{ return await fetch(url,{...opts,signal:c.signal}); } finally{ clearTimeout(id);} }
export async function predict(req:PredictReq):Promise<PredictResp>{
  const p=PredictReqSchema.safeParse(req); if(!p.success) throw new Error("bad_request");
  const r=await fetchWithTimeout(`${env.MODEL_SERVICE_URL}/predict`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p.data)});
  if(!r.ok) throw new Error(`modelService ${r.status}`); const j=await r.json(); const v=PredictRespSchema.safeParse(j); if(!v.success) throw new Error("bad_response"); return v.data;
}
