// Basic server for Railway testing
const express = require('express');
const app = express();

// Get port from environment
const PORT = process.env.PORT || 3000;

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Basic server is working!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Trading Bot Backend - Basic Server',
    status: 'operational',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Basic server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Basic error handling
process.on('uncaughtException', (err) => {
  console.error('Error:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 