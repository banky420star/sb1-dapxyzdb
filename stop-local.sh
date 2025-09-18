#!/bin/bash
echo "🛑 Stopping all services..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:9000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node data/manager.js" 2>/dev/null || true
pkill -f "python app.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
echo "✅ All services stopped"
