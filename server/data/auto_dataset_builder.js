/**
 * Auto Dataset Builder
 * Backfills 90 days of candles for new pairs and enqueues feature engineering jobs
 */

import Redis from 'ioredis';
import { Pool } from 'pg';
import Bull from 'bull';
import axios from 'axios';
import { logger } from '../utils/enhanced-logger.js';
import { writeParquetFile, calculateSHA256 } from './parquet_manager.js';

// Configuration
const REDIS_KEY_TRADABLE_PAIRS = 'tradable_pairs';
const REDIS_KEY_PROCESSED_PAIRS = 'processed_pairs';
const BYBIT_API_URL = 'https://api.bybit.com/v5/market/kline';
const BACKFILL_DAYS = 90;
const CANDLE_INTERVAL = '1'; // 1 minute candles

// Initialize connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/trading'
});

// Initialize Bull queue for feature engineering
const featureQueue = new Bull('feature-engineering', {
    redis: process.env.REDIS_URL || 'redis://localhost:6379'
});

/**
 * Fetch historical candles from Bybit
 */
async function fetchHistoricalCandles(symbol, startTime, endTime) {
    try {
        logger.info(`📊 Fetching candles for ${symbol} from ${startTime} to ${endTime}`);
        
        const response = await axios.get(BYBIT_API_URL, {
            params: {
                category: 'linear',
                symbol: symbol,
                interval: CANDLE_INTERVAL,
                start: startTime,
                end: endTime,
                limit: 1000
            },
            timeout: 30000
        });

        if (!response.data || !response.data.result || !response.data.result.list) {
            throw new Error(`Invalid response for ${symbol}`);
        }

        const candles = response.data.result.list.map(candle => ({
            timestamp: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5]),
            symbol: symbol
        }));

        logger.info(`✅ Fetched ${candles.length} candles for ${symbol}`);
        return candles;
    } catch (error) {
        logger.error(`❌ Failed to fetch candles for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Store candles in PostgreSQL with partitioning
 */
async function storeCandles(symbol, candles) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Create partition table if it doesn't exist
        const partitionTable = `market_data_${symbol.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS ${partitionTable} (
                timestamp BIGINT NOT NULL,
                open DECIMAL(20,8) NOT NULL,
                high DECIMAL(20,8) NOT NULL,
                low DECIMAL(20,8) NOT NULL,
                close DECIMAL(20,8) NOT NULL,
                volume DECIMAL(20,8) NOT NULL,
                symbol VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) PARTITION OF market_data FOR VALUES IN ('${symbol}')
        `);
        
        // Insert candles in batches
        const batchSize = 1000;
        for (let i = 0; i < candles.length; i += batchSize) {
            const batch = candles.slice(i, i + batchSize);
            const values = batch.map(candle => 
                `(${candle.timestamp}, ${candle.open}, ${candle.high}, ${candle.low}, ${candle.close}, ${candle.volume}, '${candle.symbol}')`
            ).join(',');
            
            await client.query(`
                INSERT INTO ${partitionTable} (timestamp, open, high, low, close, volume, symbol)
                VALUES ${values}
                ON CONFLICT (timestamp, symbol) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
            `);
        }
        
        await client.query('COMMIT');
        logger.info(`✅ Stored ${candles.length} candles for ${symbol} in PostgreSQL`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Failed to store candles for ${symbol}:`, error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Store data as Parquet/Arrow files
 */
async function storeParquetData(symbol, candles) {
    try {
        const filename = `data/${symbol}_${Date.now()}.parquet`;
        const filePath = await writeParquetFile(filename, candles);
        const sha256 = await calculateSHA256(filePath);
        
        // Store metadata in Redis
        await redis.hset('parquet_files', symbol, JSON.stringify({
            filename: filePath,
            sha256: sha256,
            candle_count: candles.length,
            created_at: new Date().toISOString()
        }));
        
        logger.info(`✅ Stored Parquet file for ${symbol}: ${sha256}`);
        return { filePath, sha256 };
    } catch (error) {
        logger.error(`❌ Failed to store Parquet data for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Enqueue feature engineering job
 */
async function enqueueFeatureEngineering(symbol, parquetMetadata) {
    try {
        const job = await featureQueue.add('feature-engineering', {
            symbol: symbol,
            parquet_file: parquetMetadata.filePath,
            parquet_sha256: parquetMetadata.sha256,
            candle_count: parquetMetadata.candle_count,
            created_at: new Date().toISOString()
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: 100,
            removeOnFail: 50
        });
        
        logger.info(`✅ Enqueued feature engineering job for ${symbol}: ${job.id}`);
        return job.id;
    } catch (error) {
        logger.error(`❌ Failed to enqueue feature engineering for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Get new pairs that haven't been processed
 */
async function getNewPairs() {
    try {
        const [tradablePairs, processedPairs] = await Promise.all([
            redis.smembers(REDIS_KEY_TRADABLE_PAIRS),
            redis.smembers(REDIS_KEY_PROCESSED_PAIRS)
        ]);
        
        const newPairs = tradablePairs.filter(pair => !processedPairs.includes(pair));
        logger.info(`🔍 Found ${newPairs.length} new pairs to process`);
        
        return newPairs;
    } catch (error) {
        logger.error('❌ Failed to get new pairs:', error.message);
        throw error;
    }
}

/**
 * Mark pair as processed
 */
async function markPairProcessed(symbol) {
    try {
        await redis.sadd(REDIS_KEY_PROCESSED_PAIRS, symbol);
        logger.info(`✅ Marked ${symbol} as processed`);
    } catch (error) {
        logger.error(`❌ Failed to mark ${symbol} as processed:`, error.message);
    }
}

/**
 * Build dataset for a single pair
 */
async function buildDatasetForPair(symbol) {
    try {
        logger.info(`🚀 Building dataset for ${symbol}`);
        
        // Calculate time range (90 days back)
        const endTime = Date.now();
        const startTime = endTime - (BACKFILL_DAYS * 24 * 60 * 60 * 1000);
        
        // Fetch historical candles
        const candles = await fetchHistoricalCandles(symbol, startTime, endTime);
        
        if (candles.length === 0) {
            logger.warn(`⚠️ No candles found for ${symbol}`);
            return false;
        }
        
        // Store in PostgreSQL
        await storeCandles(symbol, candles);
        
        // Store as Parquet file
        const parquetMetadata = await storeParquetData(symbol, candles);
        
        // Enqueue feature engineering
        await enqueueFeatureEngineering(symbol, parquetMetadata);
        
        // Mark as processed
        await markPairProcessed(symbol);
        
        logger.info(`✅ Successfully built dataset for ${symbol}`);
        return true;
        
    } catch (error) {
        logger.error(`❌ Failed to build dataset for ${symbol}:`, error.message);
        return false;
    }
}

/**
 * Main dataset builder function
 */
async function buildDatasets() {
    try {
        logger.info('🚀 Starting auto dataset builder...');
        
        // Get new pairs
        const newPairs = await getNewPairs();
        
        if (newPairs.length === 0) {
            logger.info('✅ No new pairs to process');
            return { success: true, processed: 0 };
        }
        
        // Process pairs in parallel (with concurrency limit)
        const concurrencyLimit = 5;
        const results = [];
        
        for (let i = 0; i < newPairs.length; i += concurrencyLimit) {
            const batch = newPairs.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(symbol => buildDatasetForPair(symbol));
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            if (i + concurrencyLimit < newPairs.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Calculate statistics
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;
        
        logger.info(`📊 Dataset building completed: ${successful} successful, ${failed} failed`);
        
        // Emit metrics
        await redis.set('prometheus:datasets_built_total', `datasets_built_total ${successful}`);
        await redis.set('prometheus:datasets_failed_total', `datasets_failed_total ${failed}`);
        
        return { success: true, processed: successful, failed };
        
    } catch (error) {
        logger.error('❌ Auto dataset builder failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Cleanup function
 */
async function cleanup() {
    try {
        await redis.quit();
        await pool.end();
        await featureQueue.close();
        logger.info('✅ Cleanup completed');
    } catch (error) {
        logger.error('❌ Cleanup failed:', error.message);
    }
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { buildDatasets, buildDatasetForPair, featureQueue }; 