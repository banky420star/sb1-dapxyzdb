import pino from "pino";
import { env } from "./config";

export const logger = pino({
  name: "sb1-backend",
  level: env.LOG_LEVEL,
  base: { 
    commit: env.COMMIT_SHA ?? "dev",
    env: env.NODE_ENV,
    tradingMode: env.TRADING_MODE
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Create child loggers for different components
export const createLogger = (component: string) => {
  return logger.child({ component });
};

// Export commonly used loggers
export const tradingLogger = createLogger("trading");
export const modelLogger = createLogger("model");
export const riskLogger = createLogger("risk");
export const apiLogger = createLogger("api");
