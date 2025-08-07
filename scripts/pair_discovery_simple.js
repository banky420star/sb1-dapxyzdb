#!/usr/bin/env node

/**
 * Pair Discovery Script - Simplified Version
 * Polls Bybit /v5/market/instruments-info to find active USDT pairs
 */

import axios from 'axios';
import Redis from 'ioredis';

// Configuration
const BYBIT_API_URL = 'https://api.bybit.com/v5/market/instruments-info';
const BYBIT_TICKER_URL = 'https://api.bybit.com/v5/market/tickers';
const MIN_VOLUME_24H = 10e6; // $10M minimum 24h volume
const REDIS_KEY_TRADABLE_PAIRS = 'tradable_pairs';
const REDIS_KEY_LAST_REFRESH = 'pairs_last_refresh';

// Simple logging function
function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Fetch instruments from Bybit API
 */
async function fetchInstruments() {
    try {
        log('🔍 Fetching instruments from Bybit API...');
        
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

        log(`📊 Retrieved ${response.data.result.list.length} instruments`);
        return response.data.result.list;
    } catch (error) {
        log(`❌ Failed to fetch instruments: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch ticker data for volume information
 */
async function fetchTickers() {
    try {
        log('📊 Fetching ticker data for volume information...');
        
        const response = await axios.get(BYBIT_TICKER_URL, {
            params: { 
                category: 'linear'
            },
            timeout: 10000
        });

        if (!response.data || !response.data.result || !response.data.result.list) {
            throw new Error('Invalid ticker response structure from Bybit API');
        }

        log(`📊 Retrieved ${response.data.result.list.length} tickers`);
        return response.data.result.list;
    } catch (error) {
        log(`❌ Failed to fetch tickers: ${error.message}`);
        throw error;
    }
}

/**
 * Filter instruments for trading criteria
 */
function filterTradablePairs(instruments, tickers) {
    log('🔍 Filtering instruments for trading criteria...');
    
    // Create a map of ticker data for quick lookup
    const tickerMap = {};
    tickers.forEach(ticker => {
        tickerMap[ticker.symbol] = ticker;
    });
    
    const tradablePairs = instruments.filter(instrument => {
        // Must be actively trading
        if (instrument.status !== 'Trading') return false;
        
        // Must be USDT quoted
        if (instrument.quoteCoin !== 'USDT') return false;
        
        // Must have valid symbol
        if (!instrument.symbol || instrument.symbol.length < 3) return false;
        
        // Check volume from ticker data
        const ticker = tickerMap[instrument.symbol];
        if (ticker) {
            const volume24h = parseFloat(ticker.volume24h || '0');
            if (volume24h < MIN_VOLUME_24H) return false;
        } else {
            // If no ticker data, skip this pair
            return false;
        }
        
        return true;
    });

    log(`✅ Found ${tradablePairs.length} tradable pairs out of ${instruments.length} total`);
    return tradablePairs.map(pair => {
        const ticker = tickerMap[pair.symbol];
        return {
            ...pair,
            volume24h: parseFloat(ticker?.volume24h || '0'),
            lastPrice: parseFloat(ticker?.lastPrice || '0'),
            price24hPcnt: parseFloat(ticker?.price24hPcnt || '0')
        };
    });
}

/**
 * Store pairs in Redis
 */
async function storePairs(pairs) {
    try {
        log('💾 Storing pairs in Redis...');
        
        // Initialize Redis connection
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        
        // Clear existing pairs
        await redis.del(REDIS_KEY_TRADABLE_PAIRS);
        
        // Store pair symbols
        const symbols = pairs.map(pair => pair.symbol);
        if (symbols.length > 0) {
            await redis.sadd(REDIS_KEY_TRADABLE_PAIRS, ...symbols);
        }
        
        // Update last refresh timestamp
        await redis.set(REDIS_KEY_LAST_REFRESH, new Date().toISOString());
        
        // Store metadata for each pair
        const metadata = {};
        pairs.forEach(pair => {
            metadata[pair.symbol] = {
                symbol: pair.symbol,
                baseCoin: pair.baseCoin,
                quoteCoin: pair.quoteCoin,
                volume24h: pair.volume24h,
                price: pair.lastPrice,
                price24hPcnt: pair.price24hPcnt,
                status: pair.status,
                createdAt: new Date().toISOString()
            };
        });
        
        await redis.set('pairs_metadata', JSON.stringify(metadata));
        
        log(`✅ Stored ${symbols.length} pairs in Redis`);
        
        // Close Redis connection
        await redis.quit();
        
        return symbols;
    } catch (error) {
        log(`❌ Failed to store pairs in Redis: ${error.message}`);
        throw error;
    }
}

/**
 * Main discovery function
 */
async function discoverPairs() {
    const startTime = Date.now();
    
    try {
        log('🚀 Starting pair discovery process...');
        
        // Fetch instruments and tickers from Bybit
        const [instruments, tickers] = await Promise.all([
            fetchInstruments(),
            fetchTickers()
        ]);
        
        // Filter for tradable pairs
        const tradablePairs = filterTradablePairs(instruments, tickers);
        
        // Store in Redis
        const symbols = await storePairs(tradablePairs);
        
        const duration = Date.now() - startTime;
        log(`✅ Pair discovery completed in ${duration}ms`);
        
        // Show top 5 pairs by volume
        if (tradablePairs.length > 0) {
            log('📈 Top 5 pairs by volume:');
            tradablePairs
                .sort((a, b) => b.volume24h - a.volume24h)
                .slice(0, 5)
                .forEach((pair, index) => {
                    log(`  ${index + 1}. ${pair.symbol}: $${(pair.volume24h / 1e6).toFixed(1)}M volume`);
                });
        }
        
        return { success: true, pairs_count: symbols.length };
        
    } catch (error) {
        log(`❌ Pair discovery failed: ${error.message}`);
        return { success: false, error: error.message };
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