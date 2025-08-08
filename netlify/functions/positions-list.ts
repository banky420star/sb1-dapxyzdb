// netlify/functions/positions-list.ts
// Bybit V5 Positions List with HMAC-SHA256 signing
import crypto from "node:crypto";

export const handler = async (event: any) => {
  // CORS headers for frontend access
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
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

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category || 'linear';
    const symbol = queryParams.symbol || '';
    const settleCoin = queryParams.settleCoin || '';

    // Build query string
    const queryString = new URLSearchParams();
    queryString.append('category', category);
    if (symbol) queryString.append('symbol', symbol);
    if (settleCoin) queryString.append('settleCoin', settleCoin);

    const queryStringStr = queryString.toString();
    const timestamp = Date.now().toString();
    
    // Create signature: timestamp + apiKey + recvWindow + queryString
    const payloadToSign = timestamp + apiKey + recvWindow + queryStringStr;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(payloadToSign)
      .digest('hex');

    // Make request to Bybit API
    const url = `https://api.bybit.com/v5/position/list?${queryStringStr}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
    });

    const responseData = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: responseData,
    };

  } catch (error) {
    console.error('Positions list error:', error);
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