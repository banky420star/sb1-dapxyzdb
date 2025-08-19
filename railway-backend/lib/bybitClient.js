import crypto from 'crypto';
// Using built-in fetch (available in Node.js 18+)

const API_KEY = process.env.BYBIT_API_KEY || '';
const API_SECRET = process.env.BYBIT_API_SECRET || '';
const MODE = (process.env.TRADING_MODE || 'paper').toLowerCase();
const BASE_URL = MODE === 'live' ? 'https://api.bybit.com' : 'https://api-testnet.bybit.com';
const RECV_WINDOW = 5000; // ms

// Enhanced logging
const logger = {
  info: (msg, data) => console.log(`[BYBIT ${MODE.toUpperCase()}] ${msg}`, data || ''),
  error: (msg, error) => console.error(`[BYBIT ${MODE.toUpperCase()}] ERROR: ${msg}`, error),
  warn: (msg, data) => console.warn(`[BYBIT ${MODE.toUpperCase()}] WARN: ${msg}`, data || '')
};

function signV5(bodyObj) {
  const timestamp = Date.now().toString();
  const bodyStr = JSON.stringify(bodyObj ?? {});
  const preSign = timestamp + API_KEY + RECV_WINDOW + bodyStr; // v5 JSON-body signing
  const signature = crypto.createHmac('sha256', API_SECRET).update(preSign).digest('hex');
  return { timestamp, signature, bodyStr };
}

async function postV5(path, bodyObj) {
  if (!API_KEY || !API_SECRET) throw new Error('BYBIT_API_KEY/SECRET missing');
  const { timestamp, signature, bodyStr } = signV5(bodyObj);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': API_KEY,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': signature,
      'X-BAPI-RECV-WINDOW': RECV_WINDOW.toString(),
      'X-BAPI-SIGN-TYPE': '2'
    },
    body: bodyStr
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.retCode && json.retCode !== 0)) {
    throw new Error(`Bybit error: HTTP ${res.status} ${res.statusText} – ${json?.retMsg || 'unknown'}`);
  }
  return json;
}

/**
 * Place a MARKET order on Bybit v5
 * @param {Object} p
 * @param {string} p.symbol e.g., 'BTCUSDT'
 * @param {('Buy'|'Sell'|'buy'|'sell')} p.side
 * @param {string|number} p.qty quantity in contract/coin units (string recommended)
 * @param {('linear'|'inverse'|'spot')} [p.category='linear']
 */
export async function placeMarketOrder({ symbol, side, qty, category = 'linear' }) {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase();
  if (mode !== 'live') {
    // Paper mode – no external call
    logger.info('PAPER TRADE EXECUTED', { symbol, side, qty, category });
    return { 
      ok: true, 
      paper: true, 
      echo: { symbol, side, qty, category },
      orderId: `paper_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  const payload = {
    category,
    symbol,
    side: side.toUpperCase(), // 'BUY'|'SELL'
    orderType: 'Market',
    qty: String(qty),
    timeInForce: 'IOC'
    // Optional: takeProfit, stopLoss as absolute price strings
  };

  logger.info('Executing live trade', { symbol, side, qty, category });
  const data = await postV5('/v5/order/create', payload);
  logger.info('Live trade executed successfully', data);
  return { ok: true, paper: false, data };
}

// Legacy function for backward compatibility
export async function executeTrade({ symbol, side, qty, price, sl, tp }) {
  return placeMarketOrder({ symbol, side, qty });
}

export async function getAccountBalance() {
  try {
    if (MODE === 'paper') {
      return {
        ok: true,
        paper: true,
        balance: {
          totalWalletBalance: '1000.00',
          totalUnrealizedProfit: '0.00',
          totalMarginBalance: '1000.00',
          totalPositionMargin: '0.00',
          totalOrderMargin: '0.00',
          availableBalance: '1000.00'
        }
      };
    }

    if (!API_KEY || !API_SECRET) {
      throw new Error('Bybit API credentials not configured');
    }

    const endpoint = '/v2/private/wallet/balance';
    const ts = Date.now().toString();
    const params = {
      api_key: API_KEY,
      timestamp: ts
    };

    const url = `${BASE_URL}${endpoint}?${signParams(params)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Bybit API error: ${data.ret_msg || data.msg || 'Unknown error'}`);
    }

    return data;

  } catch (error) {
    logger.error('Failed to get account balance', error);
    throw error;
  }
}

export async function getPositions(symbol = null) {
  try {
    if (MODE === 'paper') {
      return {
        ok: true,
        paper: true,
        positions: []
      };
    }

    if (!API_KEY || !API_SECRET) {
      throw new Error('Bybit API credentials not configured');
    }

    const endpoint = '/v2/private/position/list';
    const ts = Date.now().toString();
    const params = {
      api_key: API_KEY,
      timestamp: ts
    };

    if (symbol) {
      params.symbol = symbol;
    }

    const url = `${BASE_URL}${endpoint}?${signParams(params)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Bybit API error: ${data.ret_msg || data.msg || 'Unknown error'}`);
    }

    return data;

  } catch (error) {
    logger.error('Failed to get positions', error);
    throw error;
  }
}

export function getMode() {
  return MODE;
}

export function isPaperMode() {
  return MODE === 'paper';
} 