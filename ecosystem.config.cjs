module.exports = {
  apps: [
    {
      name: 'ai-trading-system',
      script: './server/index.js',
      instances: 4, // NUM_CPUS clustered workers
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        DATABASE_URL: 'postgres://trading_app:secure_trading_pass_2024!@localhost:5432/trading',
        REDIS_URL: 'redis://localhost:6379',
        RATE_GATE_URL: 'http://localhost:3002',
        MLFLOW_TRACKING_URI: 'http://localhost:5000',
        WINSTON_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8000,
        DATABASE_URL: 'postgres://trading_app:secure_trading_pass_2024!@localhost:5432/trading',
        REDIS_URL: 'redis://localhost:6379',
        WINSTON_LEVEL: 'debug'
      },
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Auto restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced settings
      node_args: ['--max-old-space-size=2048'],
      
      // Health check
      health_check_http: {
        url: 'http://localhost:8000/api/health',
        interval: 30000,
        timeout: 5000,
        max_retry: 3
      }
    },
    {
      name: 'rate-gate-service',
      script: './services/rate-gate/index.js',
      instances: 1, // Single instance for rate limiting consistency
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        REDIS_URL: 'redis://localhost:6379',
        ALPHA_VANTAGE_LIMIT: 5,
        BYBIT_LIMIT: 120,
        WARNING_THRESHOLD: 0.8
      },
      
      // Graceful shutdown
      kill_timeout: 3000,
      
      // Logging
      log_file: './logs/rate-gate.log',
      out_file: './logs/rate-gate-out.log',
      error_file: './logs/rate-gate-error.log',
      
      // Auto restart
      autorestart: true,
      max_restarts: 5,
      min_uptime: '5s',
      
      // Health check
      health_check_http: {
        url: 'http://localhost:3002/health',
        interval: 15000,
        timeout: 3000,
        max_retry: 2
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/ai-trading-system.git',
      path: '/var/www/ai-trading-system',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.cjs --env production',
      'post-setup': 'npm install && npm run db:migrate',
      env: {
        NODE_ENV: 'production'
      }
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/ai-trading-system.git',
      path: '/var/www/ai-trading-system-staging',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.cjs --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
}; 