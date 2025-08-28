import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import { config } from "./config";
import { logger } from "./logger";

// Import routes
import healthRouter from "./routes/health";
import aiRouter from "./routes/ai";
import tradeRouter from "./routes/trade";

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "rate_limit_exceeded",
    message: "Too many requests, please try again later.",
  },
}));

// Logging middleware
app.use(morgan("combined", {
  stream: {
    write: (message: string) => {
      logger.info({ message: message.trim() });
    },
  },
}));

// Request logging
app.use((req, res, next) => {
  logger.info({
    event: "http_request",
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Routes
app.use("/", healthRouter);
app.use("/api", aiRouter);
app.use("/api", tradeRouter);

// 404 handler
app.use((req, res) => {
  logger.warn({
    event: "route_not_found",
    method: req.method,
    path: req.path,
  });

  res.status(404).json({
    error: "not_found",
    message: "Route not found",
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    event: "unhandled_error",
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    error: "internal_server_error",
    message: "An unexpected error occurred",
  });
});

// Start server
const port = config.server.port;
app.listen(port, () => {
  logger.info({
    event: "server_started",
    port,
    env: config.server.env,
    tradingMode: config.trading.mode,
    modelServiceUrl: config.model.serviceUrl,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info({ event: "shutdown_signal_received" });
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info({ event: "shutdown_signal_received" });
  process.exit(0);
});

export default app;
