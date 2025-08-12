// Minimal server for Railway testing
const express = require('express');
const app = express();

// Get port from environment
const PORT = process.env.PORT || 3000;

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Minimal server is working!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Trading Bot Backend - Minimal Server',
    status: 'operational',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Basic error handling
process.on('uncaughtException', (err) => {
  console.error('Error:', err);
}); 