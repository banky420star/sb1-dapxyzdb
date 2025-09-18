import { RestClientV5 } from "bybit-api"; import { env } from "../config";
const qc=new RestClientV5({ testnet: env.TRADING_MODE!=="live" });
export async function midPx(symbol:string, category:"linear"|"inverse"|"spot"="linear"):Promise<number>{
  const { result }=await qc.getTickers({ category, symbol }); const t:any=result.list?.[0]; const b=Number(t?.bid1Price||0), a=Number(t?.ask1Price||0);
  if(!b||!a) throw new Error("No quotes"); return (b+a)/2;
}
