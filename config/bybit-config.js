// Bybit API Configuration
export const bybitConfig = {
  // API Credentials
  apiKey: 'yyiExkVv3EV7C2LvaX',
  secret: 'g35hzW8frw9E1H9g9svuWGl59ZoXwDLMAk2c',
  
  // Environment Configuration
  testnet: false,  // Use mainnet for demo trading
  demo: true,      // Enable demo trading mode
  debug: true,
  
  // Trading Configuration
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  spreadSymbols: ['BTCUSDT_SOL/USDT', 'ETHUSDT_SOL/USDT', 'SOLUSDT_BTC/USDT'],
  
  // WebSocket Configuration
  heartbeatInterval: 20000,
  reconnectAttempts: 3,
  reconnectDelay: 5000,
  maxActiveTime: 600
}

// Export for use in other modules
export default bybitConfig 