// netlify/functions/orders-create.ts
// Bybit V5 Order Creation with HMAC-SHA256 signing
import crypto from "node:crypto";

interface BybitOrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop';
  qty: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  category?: 'linear' | 'spot' | 'option';
}

export const handler = async (event: any) => {
  // CORS headers for frontend access
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Get environment variables
    const apiKey = process.env.BYBIT_API_KEY;
    const apiSecret = process.env.BYBIT_API_SECRET;
    const recvWindow = process.env.BYBIT_RECV_WINDOW || '5000';

    if (!apiKey || !apiSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API credentials not configured' }),
      };
    }

    // Parse request body
    const orderData: BybitOrderRequest = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!orderData.symbol || !orderData.side || !orderData.orderType || !orderData.qty) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: symbol, side, orderType, qty' }),
      };
    }

    // Prepare request body for Bybit
    const requestBody = {
      category: orderData.category || 'linear',
      symbol: orderData.symbol,
      side: orderData.side,
      orderType: orderData.orderType,
      qty: orderData.qty,
      timeInForce: orderData.timeInForce || 'GTC',
      ...(orderData.price && { price: orderData.price }),
      ...(orderData.stopPrice && { stopPrice: orderData.stopPrice }),
    };

    const bodyString = JSON.stringify(requestBody);
    const timestamp = Date.now().toString();
    
    // Create signature: timestamp + apiKey + recvWindow + body
    const payloadToSign = timestamp + apiKey + recvWindow + bodyString;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(payloadToSign)
      .digest('hex');

    // Make request to Bybit API
    const response = await fetch('https://api.bybit.com/v5/order/create', {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json',
      },
      body: bodyString,
    });

    const responseData = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: responseData,
    };

  } catch (error) {
    console.error('Order creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
}; 