import crypto from "node:crypto";

export const handler = async (event) => {
  const KEY = process.env.BYBIT_API_KEY!;
  const SEC = process.env.BYBIT_API_SECRET!;
  const RECV = process.env.BYBIT_RECV_WINDOW || "5000";
  const ts = Date.now().toString();

  const qs = event.rawQuery || "";                   // sign the EXACT querystring
  const payload = ts + KEY + RECV + qs;
  const sign = crypto.createHmac("sha256", SEC).update(payload).digest("hex");

  const r = await fetch("https://api.bybit.com/v5/position/list?" + qs, {
    headers: {
      "X-BAPI-API-KEY": KEY,
      "X-BAPI-SIGN": sign,
      "X-BAPI-SIGN-TYPE": "2",
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": RECV
    }
  });
  return { statusCode: r.status, body: await r.text(), headers: { "content-type": "application/json" } };
}; 