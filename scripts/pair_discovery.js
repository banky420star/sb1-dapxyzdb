#!/usr/bin/env node

/**
 * Pair Discovery Script
 * Polls Bybit /v5/market/instruments-info to find active USDT pairs
 * Filters for liquidity and stores in Redis for trading system
 */

import axios from 'axios';
import Redis from 'ioredis';
import dayjs from 'dayjs';
import { EnhancedLogger } from '../server/utils/enhanced-logger.js';

const logger = new EnhancedLogger('pair-discovery');

// Configuration
const BYBIT_API_URL = 'https://api.bybit.com/v5/market/instruments-info';
const MIN_VOLUME_24H = 10e6; // $10M minimum 24h volume
const REDIS_KEY_TRADABLE_PAIRS = 'tradable_pairs';
const REDIS_KEY_LAST_REFRESH = 'pairs_last_refresh';
const REDIS_KEY_PAIRS_METADATA = 'pairs_metadata';

// Initialize Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Fetch instruments from Bybit API
 */
async function fetchInstruments() {
    try {
        logger.info('🔍 Fetching instruments from Bybit API...');
        
        const response = await axios.get(BYBIT_API_URL, {
            params: { 
                category: 'linear',
                limit: 1000
            },
            timeout: 10000
        });

        if (!response.data || !response.data.result || !response.data.result.list) {
            throw new Error('Invalid response structure from Bybit API');
        }

        logger.info(`📊 Retrieved ${response.data.result.list.length} instruments`);
        return response.data.result.list;
    } catch (error) {
        logger.error('❌ Failed to fetch instruments:', error.message);
        throw error;
    }
}

/**
 * Filter instruments for trading criteria
 */
function filterTradablePairs(instruments) {
    logger.info('🔍 Filtering instruments for trading criteria...');
    
    const tradablePairs = instruments.filter(instrument => {
        // Must be actively trading
        if (instrument.status !== 'Trading') return false;
        
        // Must be USDT quoted
        if (instrument.quoteCoin !== 'USDT') return false;
        
        // Must have sufficient 24h volume
        const volume24h = parseFloat(instrument.volume24h || '0');
        if (volume24h < MIN_VOLUME_24H) return false;
        
        // Must have valid symbol
        if (!instrument.symbol || instrument.symbol.length < 3) return false;
        
        return true;
    });

    logger.info(`✅ Found ${tradablePairs.length} tradable pairs out of ${instruments.length} total`);
    return tradablePairs;
}

/**
 * Store pairs in Redis with metadata
 */
async function storePairs(pairs) {
    try {
        logger.info('💾 Storing pairs in Redis...');
        
        // Clear existing pairs
        await redis.del(REDIS_KEY_TRADABLE_PAIRS);
        
        // Store pair symbols
        const symbols = pairs.map(pair => pair.symbol);
        if (symbols.length > 0) {
            await redis.sadd(REDIS_KEY_TRADABLE_PAIRS, ...symbols);
        }
        
        // Store metadata for each pair
        const metadata = {};
        pairs.forEach(pair => {
            metadata[pair.symbol] = {
                symbol: pair.symbol,
                baseCoin: pair.baseCoin,
                quoteCoin: pair.quoteCoin,
                volume24h: parseFloat(pair.volume24h || '0'),
                price: parseFloat(pair.lastPrice || '0'),
                tickSize: parseFloat(pair.tickSize || '0'),
                stepSize: parseFloat(pair.stepSize || '0'),
                minOrderQty: parseFloat(pair.minOrderQty || '0'),
                maxOrderQty: parseFloat(pair.maxOrderQty || '0'),
                status: pair.status,
                createdAt: dayjs().toISOString()
            };
        });
        
        // Store metadata as JSON
        await redis.set(REDIS_KEY_PAIRS_METADATA, JSON.stringify(metadata));
        
        // Update last refresh timestamp
        await redis.set(REDIS_KEY_LAST_REFRESH, dayjs().toISOString());
        
        logger.info(`✅ Stored ${symbols.length} pairs in Redis`);
        return symbols;
    } catch (error) {
        logger.error('❌ Failed to store pairs in Redis:', error.message);
        throw error;
    }
}

/**
 * Emit Prometheus metrics
 */
async function emitMetrics(pairsCount) {
    try {
        // Emit Prometheus metric for Grafana monitoring
        const metric = `pairs_total{symbol="all"} ${pairsCount}`;
        
        // Store metric in Redis for Prometheus to scrape
        await redis.set('prometheus:pairs_total', metric);
        await redis.expire('prometheus:pairs_total', 300); // 5 minute TTL
        
        logger.info(`📊 Emitted metric: pairs_total = ${pairsCount}`);
    } catch (error) {
        logger.error('❌ Failed to emit metrics:', error.message);
    }
}

/**
 * Generate discovery report
 */
function generateReport(pairs, symbols) {
    const report = {
        timestamp: dayjs().toISOString(),
        total_pairs: symbols.length,
        total_volume_24h: pairs.reduce((sum, pair) => sum + parseFloat(pair.volume24h || '0'), 0),
        top_pairs: pairs
            .sort((a, b) => parseFloat(b.volume24h || '0') - parseFloat(a.volume24h || '0'))
            .slice(0, 10)
            .map(pair => ({
                symbol: pair.symbol,
                volume24h: parseFloat(pair.volume24h || '0'),
                price: parseFloat(pair.lastPrice || '0')
            })),
        discovery_duration_ms: Date.now() - global.startTime
    };
    
    logger.info('📋 Discovery Report:', JSON.stringify(report, null, 2));
    return report;
}

/**
 * Main discovery function
 */
async function discoverPairs() {
    global.startTime = Date.now();
    
    try {
        logger.info('🚀 Starting pair discovery process...');
        
        // Fetch instruments from Bybit
        const instruments = await fetchInstruments();
        
        // Filter for tradable pairs
        const tradablePairs = filterTradablePairs(instruments);
        
        // Store in Redis
        const symbols = await storePairs(tradablePairs);
        
        // Emit metrics
        await emitMetrics(symbols.length);
        
        // Generate report
        const report = generateReport(tradablePairs, symbols);
        
        // Store report in Redis for dashboard
        await redis.set('discovery_report', JSON.stringify(report));
        await redis.expire('discovery_report', 3600); // 1 hour TTL
        
        logger.info('✅ Pair discovery completed successfully');
        return { success: true, pairs_count: symbols.length, report };
        
    } catch (error) {
        logger.error('❌ Pair discovery failed:', error.message);
        
        // Emit error metric
        await redis.set('prometheus:discovery_errors_total', 
            `discovery_errors_total{symbol="all"} 1`);
        
        return { success: false, error: error.message };
    } finally {
        // Close Redis connection
        await redis.quit();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    discoverPairs()
        .then(result => {
            if (result.success) {
                console.log(`✔ Refreshed pairs: ${result.pairs_count}`);
                process.exit(0);
            } else {
                console.error(`❌ Discovery failed: ${result.error}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

export { discoverPairs }; 