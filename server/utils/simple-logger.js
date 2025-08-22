// server/utils/simple-logger.js
// Simple logger for development and testing

class SimpleLogger {
  constructor() {
    this.service = 'trading-system'
  }

  info(message, meta = {}) {
    console.log(`[INFO] ${message}`, meta)
  }

  warn(message, meta = {}) {
    console.warn(`[WARN] ${message}`, meta)
  }

  error(message, meta = {}) {
    console.error(`[ERROR] ${message}`, meta)
  }

  debug(message, meta = {}) {
    console.debug(`[DEBUG] ${message}`, meta)
  }

  critical(message, meta = {}) {
    console.error(`[CRITICAL] ${message}`, meta)
  }
}

export const logger = new SimpleLogger()
export default logger
