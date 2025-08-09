const crypto = require("crypto");

exports.handler = async (event) => {
  // CORS headers for frontend access
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const KEY = process.env.BYBIT_API_KEY;
    const SEC = process.env.BYBIT_API_SECRET;
    const RECV = process.env.BYBIT_RECV_WINDOW || "5000";
    
    if (!KEY || !SEC) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing API credentials' }) };
    }

    const ts = Date.now().toString();
    const qs = event.rawQuery || "";
    const payload = ts + KEY + RECV + qs;
    const sign = crypto.createHmac("sha256", SEC).update(payload).digest("hex");

    const response = await fetch("https://api.bybit.com/v5/account/wallet-balance?" + qs, {
      headers: {
        "X-BAPI-API-KEY": KEY,
        "X-BAPI-SIGN": sign,
        "X-BAPI-SIGN-TYPE": "2",
        "X-BAPI-TIMESTAMP": ts,
        "X-BAPI-RECV-WINDOW": RECV
      }
    });

    return { 
      statusCode: response.status, 
      headers: { "content-type": "application/json" },
      body: await response.text() 
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: error.message }) 
    };
  }
};