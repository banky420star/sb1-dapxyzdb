import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import ai from './routes/ai';
import trade from './routes/trade';
import health from './routes/health';
import status from './routes/status';
import analytics from './routes/analytics';
import trading from './routes/trading';
import auto from './routes/auto';
import { env } from './config';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_SEC * 1000,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api', ai);
app.use('/api', trade);
app.use('/api', status);
app.use('/api', analytics);
app.use('/api', auto);
app.use('/api', trading);
app.use('/', health);

app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({ error: 'internal_error', detail: String(err?.message || err) });
});

app.listen(Number(env.PORT), () => console.log(`backend up :${env.PORT}`));
