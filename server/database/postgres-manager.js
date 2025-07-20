import pkg from 'pg';
const { Pool } = pkg;
import os from 'os';
import { Logger } from '../utils/logger.js';

export class DatabaseManager {
  constructor(options = {}) {
    this.logger = new Logger();
    this.options = {
      connectionString: options.connectionString || process.env.DATABASE_URL || 
        'postgres://trading_app:secure_trading_pass_2024!@localhost:5432/trading',
      maxConnections: options.maxConnections || os.cpus().length * 4,
      idleTimeoutMillis: options.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: options.connectionTimeoutMillis || 2000,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    this.pool = null;
    this.isInitialized = false;
    this.connectionCount = 0;
    this.metrics = {
      totalQueries: 0,
      errorCount: 0,
      connectionErrors: 0,
      slowQueries: 0
    };
  }

  async initialize() {
    try {
      this.logger.info('Initializing PostgreSQL Database Manager');
      
      // Create connection pool
      await this.createConnectionPool();
      
      // Test connection
      await this.testConnection();
      
      // Run migrations if needed
      await this.runMigrations();
      
      this.isInitialized = true;
      this.logger.info('PostgreSQL Database Manager initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize PostgreSQL Database Manager:', error);
      throw error;
    }
  }

  async createConnectionPool() {
    this.pool = new Pool({
      connectionString: this.options.connectionString,
      max: this.options.maxConnections,
      idleTimeoutMillis: this.options.idleTimeoutMillis,
      connectionTimeoutMillis: this.options.connectionTimeoutMillis,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Pool event handlers
    this.pool.on('connect', (client) => {
      this.connectionCount++;
      this.logger.debug(`New client connected. Total connections: ${this.connectionCount}`);
    });

    this.pool.on('remove', (client) => {
      this.connectionCount--;
      this.logger.debug(`Client removed. Total connections: ${this.connectionCount}`);
    });

    this.pool.on('error', (err, client) => {
      this.metrics.connectionErrors++;
      this.logger.error('Database pool error:', err);
    });

    this.logger.info(`Database pool created with max ${this.options.maxConnections} connections`);
  }

  async testConnection() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time');
      this.logger.info('Database connection test successful:', result.rows[0]);
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    // In production, migrations should be run separately
    // This is just a basic check to ensure tables exist
    try {
      const result = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ohlcv_data'
      `);
      
      if (result.rows.length === 0) {
        this.logger.warn('Database tables not found. Please run migrations manually.');
      } else {
        this.logger.info('Database tables verified');
      }
    } catch (error) {
      this.logger.error('Migration check failed:', error);
    }
  }

  async query(text, params = [], retries = 0) {
    const start = Date.now();
    
    try {
      this.metrics.totalQueries++;
      const result = await this.pool.query(text, params);
      
      const duration = Date.now() - start;
      if (duration > 1000) { // Log slow queries
        this.metrics.slowQueries++;
        this.logger.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      
      // Retry on serialization failure
      if (error.code === '40001' && retries < this.options.maxRetries) {
        this.logger.warn(`Serialization failure, retrying (${retries + 1}/${this.options.maxRetries})`);
        await this.sleep(Math.pow(2, retries) * 100); // Exponential backoff
        return this.query(text, params, retries + 1);
      }
      
      this.logger.error('Database query error:', { 
        error: error.message, 
        code: error.code,
        query: text.substring(0, 100),
        params: params.length > 0 ? '[PARAMS]' : null
      });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // OHLCV Data Methods
  async saveOHLCVData(data) {
    try {
      const query = `
        INSERT INTO ohlcv_data (symbol, timeframe, timestamp, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (symbol, timeframe, timestamp) 
        DO UPDATE SET 
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          created_at = NOW()
      `;
      
      await this.query(query, [
        data.symbol, data.timeframe, data.timestamp,
        data.open, data.high, data.low, data.close, data.volume
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving OHLCV data:', error);
      throw error;
    }
  }

  async getOHLCVData(symbol, timeframe, limit = 1000) {
    try {
      const query = `
        SELECT * FROM ohlcv_data 
        WHERE symbol = $1 AND timeframe = $2 
        ORDER BY timestamp DESC 
        LIMIT $3
      `;
      
      const result = await this.query(query, [symbol, timeframe, limit]);
      return result.rows.reverse(); // Return in ascending order
    } catch (error) {
      this.logger.error('Error getting OHLCV data:', error);
      throw error;
    }
  }

  // Position Methods
  async savePosition(position) {
    try {
      const query = `
        INSERT INTO positions
        (id, order_id, symbol, side, size, entry_price, current_price, pnl, pnl_percent,
         stop_loss, take_profit, timestamp, status, mt5_ticket)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) 
        DO UPDATE SET 
          current_price = EXCLUDED.current_price,
          pnl = EXCLUDED.pnl,
          pnl_percent = EXCLUDED.pnl_percent,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
      
      await this.query(query, [
        position.id, position.orderId, position.symbol, position.side,
        position.size, position.entryPrice, position.currentPrice,
        position.pnl, position.pnlPercent, position.stopLoss,
        position.takeProfit, position.timestamp, position.status, position.mt5Ticket
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving position:', error);
      throw error;
    }
  }

  async getPositions(status = null) {
    try {
      let query = 'SELECT * FROM positions';
      let params = [];
      
      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY timestamp DESC';
      
      const result = await this.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting positions:', error);
      throw error;
    }
  }

  // Trade Methods
  async saveTrade(trade) {
    try {
      const query = `
        INSERT INTO trades
        (id, position_id, symbol, side, size, entry_price, close_price, pnl, duration, timestamp, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `;
      
      await this.query(query, [
        trade.id, trade.positionId, trade.symbol, trade.side,
        trade.size, trade.entryPrice, trade.closePrice,
        trade.pnl, trade.duration, trade.timestamp, trade.reason
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving trade:', error);
      throw error;
    }
  }

  async getTrades(limit = 100) {
    try {
      const query = `
        SELECT * FROM trades 
        ORDER BY timestamp DESC 
        LIMIT $1
      `;
      
      const result = await this.query(query, [limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Error getting trades:', error);
      throw error;
    }
  }

  // Account Balance Methods
  async saveAccountBalance(balance) {
    try {
      const query = `
        INSERT INTO account_balance
        (equity, balance, margin, free_margin, margin_level, peak_equity, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await this.query(query, [
        balance.equity, balance.balance, balance.margin,
        balance.freeMargin, balance.marginLevel, balance.peakEquity, balance.timestamp
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving account balance:', error);
      throw error;
    }
  }

  // Model Performance Methods
  async saveModelPerformance(performance) {
    try {
      const query = `
        INSERT INTO model_performance
        (model_type, accuracy, precision_score, recall_score, f1_score, 
         training_time, training_date, data_size, version, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (model_type, version) 
        DO UPDATE SET 
          accuracy = EXCLUDED.accuracy,
          precision_score = EXCLUDED.precision_score,
          recall_score = EXCLUDED.recall_score,
          f1_score = EXCLUDED.f1_score,
          status = EXCLUDED.status,
          last_update = NOW()
      `;
      
      await this.query(query, [
        performance.modelType, performance.accuracy, performance.precision,
        performance.recall, performance.f1Score, performance.trainingTime,
        performance.trainingDate, performance.dataSize, performance.version, performance.status
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving model performance:', error);
      throw error;
    }
  }

  async getModelStatus() {
    try {
      const query = `
        SELECT model_type, accuracy, last_update, status, version
        FROM model_performance 
        ORDER BY last_update DESC
      `;
      
      const result = await this.query(query);
      return result.rows.map(row => ({
        name: row.model_type,
        type: row.model_type.toLowerCase().replace(' ', ''),
        status: row.status || 'offline',
        accuracy: parseFloat(row.accuracy) || 0,
        lastUpdate: row.last_update,
        version: row.version || '1.0.0'
      }));
    } catch (error) {
      this.logger.error('Error getting model status:', error);
      return [];
    }
  }

  // Training Progress (for MLflow integration)
  async saveTrainingProgress(progress) {
    try {
      const query = `
        INSERT INTO training_progress
        (model_type, run_id, epoch, metrics, timestamp)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await this.query(query, [
        progress.modelType, progress.runId, progress.epoch,
        JSON.stringify(progress.metrics), progress.timestamp
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving training progress:', error);
      throw error;
    }
  }

  // Features for ML Pipeline
  async saveFeatures(features) {
    try {
      const query = `
        INSERT INTO features
        (symbol, timeframe, feature_set, labels, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (symbol, timeframe, timestamp) 
        DO UPDATE SET 
          feature_set = EXCLUDED.feature_set,
          labels = EXCLUDED.labels
      `;
      
      await this.query(query, [
        features.symbol, features.timeframe, 
        JSON.stringify(features.featureSet),
        JSON.stringify(features.labels), 
        features.timestamp
      ]);
      
      return true;
    } catch (error) {
      this.logger.error('Error saving features:', error);
      throw error;
    }
  }

  async getFeatures(symbol, timeframe, limit = 1000) {
    try {
      const query = `
        SELECT * FROM features 
        WHERE symbol = $1 AND timeframe = $2 
        ORDER BY timestamp DESC 
        LIMIT $3
      `;
      
      const result = await this.query(query, [symbol, timeframe, limit]);
      return result.rows.map(row => ({
        ...row,
        feature_set: JSON.parse(row.feature_set),
        labels: row.labels ? JSON.parse(row.labels) : null
      }));
    } catch (error) {
      this.logger.error('Error getting features:', error);
      throw error;
    }
  }

  // Metrics and Stats
  async getStats() {
    try {
      const stats = {};
      
      // Get table row counts using TimescaleDB optimized queries
      const tables = [
        'ohlcv_data', 'positions', 'orders', 'trades',
        'account_balance', 'model_states', 'model_performance',
        'risk_violations', 'metrics', 'features'
      ];
      
      for (const table of tables) {
        const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result.rows[0].count);
      }
      
      // Database size
      const sizeResult = await this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      stats.database_size = sizeResult.rows[0].size;
      
      // Connection pool stats
      stats.pool = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount
      };
      
      // Query metrics
      stats.metrics = { ...this.metrics };
      
      return stats;
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const queryTime = Date.now() - start;
      
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        queryTime,
        stats,
        pool: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Cleanup and close
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database pool closed');
    }
  }

  // Utility methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DatabaseManager; 