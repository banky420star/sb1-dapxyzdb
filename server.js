import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the backend API server
import './server/index.js';

// Create frontend server
const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Serve frontend app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start frontend server
app.listen(FRONTEND_PORT, () => {
  console.log(`
🚀 AI Trading System Started!
============================
🌐 Frontend: http://localhost:${FRONTEND_PORT}
📡 Backend API: http://localhost:${process.env.PORT || 8000}
📊 Health Check: http://localhost:${process.env.PORT || 8000}/api/health

Ready for trading! 💰
  `);
});