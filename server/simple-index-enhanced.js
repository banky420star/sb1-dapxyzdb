import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// ML Models state
const models = {
  LSTM: { status: 'idle', epoch: 0, epochs: 20, loss: 0, acc: 0 },
  RF: { status: 'idle', epoch: 0, epochs: 15, loss: 0, acc: 0 },
  DDQN: { status: 'idle', epoch: 0, epochs: 25, loss: 0, acc: 0 }
};

// ML Visualization functions
function emitModelActivity(model, data) {
  const activity = {
    model,
    epoch: data.epoch || 0,
    epochs: data.epochs || 20,
    batch: data.batch || 0,
    loss: data.loss || 0,
    acc: data.acc || 0,
    extra: {
      hiddenNorm: data.hiddenNorm || 0,
      gradientNorm: data.gradientNorm || 0,
      qValue: data.qValue || 0
    },
    timestamp: Date.now()
  };

  models[model] = activity;
  io.emit('model_activity', activity);
  console.log(`Emitted ${model} activity:`, activity);
}

async function simulateTraining(model) {
  const epochs = models[model].epochs;
  const batches = 50;
  
  models[model].status = 'training';
  emitModelActivity(model, { status: 'training', epoch: 0, epochs });

  for (let epoch = 1; epoch <= epochs; epoch++) {
    for (let batch = 1; batch <= batches; batch++) {
      const progress = (epoch - 1 + batch / batches) / epochs;
      const loss = Math.max(0.1, 2.0 * Math.exp(-progress * 3) + Math.random() * 0.1);
      const acc = Math.min(0.95, 0.3 + progress * 0.6 + Math.random() * 0.05);
      const gradientNorm = 0.5 + Math.random() * 0.5;
      const hiddenNorm = 0.3 + Math.random() * 0.4;
      const qValue = model === 'DDQN' ? 0.2 + progress * 0.7 + Math.random() * 0.1 : 0;

      emitModelActivity(model, {
        epoch,
        epochs,
        batch,
        loss: parseFloat(loss.toFixed(4)),
        acc: parseFloat(acc.toFixed(4)),
        hiddenNorm: parseFloat(hiddenNorm.toFixed(4)),
        gradientNorm: parseFloat(gradientNorm.toFixed(4)),
        qValue: parseFloat(qValue.toFixed(4))
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  models[model].status = 'completed';
  emitModelActivity(model, { status: 'completed', epoch: epochs, epochs });
  console.log(`${model} training completed`);
}

function startTraining(model) {
  if (models[model].status === 'training') {
    console.warn(`${model} is already training`);
    return;
  }
  console.log(`Starting ${model} training`);
  simulateTraining(model);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      database: 'connected',
      websocket: 'active',
      visualization: 'active'
    }
  });
});

// Market data endpoint
app.get('/api/market/data', (req, res) => {
  const mockData = {
    symbol: 'EURUSD',
    price: 1.0850 + (Math.random() - 0.5) * 0.01,
    timestamp: new Date().toISOString(),
    volume: Math.floor(Math.random() * 1000000),
    change: (Math.random() - 0.5) * 0.02
  };
  res.json(mockData);
});

// Trading signal endpoint
app.get('/api/signals', (req, res) => {
  const signals = [
    {
      id: 1,
      symbol: 'EURUSD',
      action: 'BUY',
      confidence: 0.85,
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      symbol: 'GBPUSD',
      action: 'SELL',
      confidence: 0.72,
      timestamp: new Date().toISOString()
    }
  ];
  res.json(signals);
});

// Portfolio endpoint
app.get('/api/portfolio', (req, res) => {
  const portfolio = {
    balance: 100000,
    equity: 105000,
    margin: 2000,
    freeMargin: 98000,
    profit: 5000,
    positions: [
      {
        id: 1,
        symbol: 'EURUSD',
        type: 'BUY',
        lots: 0.1,
        openPrice: 1.0830,
        currentPrice: 1.0850,
        profit: 200
      }
    ]
  };
  res.json(portfolio);
});

// ML Training endpoints
app.post('/api/train/:model', (req, res) => {
  const { model } = req.params;
  const validModels = ['LSTM', 'RF', 'DDQN'];
  
  if (!validModels.includes(model)) {
    return res.status(400).json({ error: 'Invalid model type' });
  }
  
  startTraining(model);
  res.json({ message: `Started training for ${model}` });
});

app.get('/api/models/status', (req, res) => {
  res.json(models);
});

// WebSocket connection for real-time data
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial model states
  socket.emit('model_activity', models);
  
  // Send market data every 5 seconds
  const marketInterval = setInterval(() => {
    const marketData = {
      symbol: 'EURUSD',
      price: 1.0850 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString()
    };
    socket.emit('market-data', marketData);
  }, 5000);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(marketInterval);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Trading API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🤖 ML Visualization: Active`);
}); 