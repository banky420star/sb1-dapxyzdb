import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import backend server
import('./server/index.js');

// Serve frontend from dist
const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(FRONTEND_PORT, () => {
  console.log(`🌐 Frontend running on port ${FRONTEND_PORT}`);
});
