const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const WebSocket = require('ws');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://delightful-crumble-983869.netlify.app', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Bybit V5 API Configuration
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;
const BYBIT_RECV_WINDOW = process.env.BYBIT_RECV_WINDOW || '5000';

// HMAC-SHA256 signing for Bybit V5
function signBybitRequest(timestamp, apiKey, recvWindow, queryString = '', body = '') {
  const payload = timestamp + apiKey + recvWindow + queryString + body;
  return crypto.createHmac('sha256', BYBIT_API_SECRET).update(payload).digest('hex');
}

// Bybit V5 API endpoints
app.post('/api/orders/create', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const timestamp = Date.now().toString();
    const body = JSON.stringify(req.body);
    const signature = signBybitRequest(timestamp, BYBIT_API_KEY, BYBIT_RECV_WINDOW, '', body);

    const response = await fetch('https://api.bybit.com/v5/order/create', {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': BYBIT_RECV_WINDOW,
        'Content-Type': 'application/json'
      },
      body
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const timestamp = Date.now().toString();
    const queryString = new URLSearchParams(req.query).toString();
    const signature = signBybitRequest(timestamp, BYBIT_API_KEY, BYBIT_RECV_WINDOW, queryString);

    const url = `https://api.bybit.com/v5/position/list?${queryString}`;
    const response = await fetch(url, {
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': BYBIT_RECV_WINDOW
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Positions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/account/balance', async (req, res) => {
  try {
    if (!BYBIT_API_KEY || !BYBIT_API_SECRET) {
      return res.status(500).json({ error: 'API credentials not configured' });
    }

    const timestamp = Date.now().toString();
    const queryString = new URLSearchParams(req.query).toString();
    const signature = signBybitRequest(timestamp, BYBIT_API_KEY, BYBIT_RECV_WINDOW, queryString);

    const url = `https://api.bybit.com/v5/account/wallet-balance?${queryString}`;
    const response = await fetch(url, {
      headers: {
        'X-BAPI-API-KEY': BYBIT_API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': BYBIT_RECV_WINDOW
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public market data endpoints (no authentication required)
app.get('/api/market/tickers', async (req, res) => {
  try {
    const { category = 'linear' } = req.query;
    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=${category}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Tickers fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market/orderbook', async (req, res) => {
  try {
    const { symbol, limit = 25 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter required' });
    }
    
    const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=${symbol}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Orderbook fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market/klines', async (req, res) => {
  try {
    const { symbol, interval = '1', limit = 200 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter required' });
    }
    
    const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Klines fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket proxy for real-time data
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle subscription requests
      if (data.type === 'subscribe') {
        // Forward to Bybit WebSocket
        // This is a simplified implementation
        ws.send(JSON.stringify({
          type: 'subscribed',
          topic: data.topic,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Trading Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API ready for frontend integration`);
});

// Attach WebSocket to HTTP server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
}); 