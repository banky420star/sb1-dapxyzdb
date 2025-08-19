// Simple test server to debug Railway deployment
import 'dotenv/config';
import express from 'express';

const app = express();

// Basic middleware
app.use(express.json({ limit: '1mb' }));

// Simple health endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: 'test-1.0.0'
  });
});

// Simple status endpoint
app.get('/api/status', (_req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.TRADING_MODE || 'paper',
    time: new Date().toISOString()
  });
});

// Start server
const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple test server listening on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Trading Mode: ${process.env.TRADING_MODE || 'paper'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 