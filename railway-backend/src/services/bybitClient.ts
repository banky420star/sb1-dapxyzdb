import { RestClientV5 } from "bybit-api"; import { env } from "../config";
const client=new RestClientV5({ key:process.env.BYBIT_API_KEY||"", secret:process.env.BYBIT_API_SECRET||"", testnet: env.TRADING_MODE!=="live", recv_window:15000 });
export type PlaceOrderParams={symbol:string; side:"Buy"|"Sell"; qty:string; market:boolean; price?:string; idempotencyKey?:string; category?:"linear"|"inverse"|"option"|"spot";};
export async function placeOrder(p:PlaceOrderParams){
  const req:any={ category:p.category??"linear", symbol:p.symbol, side:p.side, orderType:p.market?"Market":"Limit", qty:p.qty, timeInForce:"GTC" };
  if(!p.market) req.price=p.price; if(p.idempotencyKey) req.orderLinkId=p.idempotencyKey.slice(0,36);
  return client.submitOrder(req);
}
