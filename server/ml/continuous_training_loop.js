/**
 * Continuous Training Loop
 * Manages nightly training per symbol group and ensemble refresh
 */

import Redis from 'ioredis';
import { Pool } from 'pg';
import Bull from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/enhanced-logger.js';
import { MLflowClient } from './mlflow_client.js';

const execAsync = promisify(exec);

// Configuration
const REDIS_KEY_PROCESSED_PAIRS = 'processed_pairs';
const REDIS_KEY_TRAINING_STATUS = 'training_status';
const REDIS_KEY_MODEL_PERFORMANCE = 'model_performance';
const DISK_USAGE_THRESHOLD = 80; // 80% disk usage threshold
const WORST_MODEL_PERCENTAGE = 20; // Archive worst 20% models

// Initialize connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/trading'
});

// Initialize Bull queue for training jobs
const trainingQueue = new Bull('model-training', {
    redis: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Initialize MLflow client
const mlflow = new MLflowClient();

/**
 * Get available symbols for training
 */
async function getTrainingSymbols() {
    try {
        const processedPairs = await redis.smembers(REDIS_KEY_PROCESSED_PAIRS);
        logger.info(`📊 Found ${processedPairs.length} symbols available for training`);
        return processedPairs;
    } catch (error) {
        logger.error('❌ Failed to get training symbols:', error.message);
        throw error;
    }
}

/**
 * Group symbols by category for ensemble training
 */
function groupSymbols(symbols) {
    const groups = {
        'majors': [], // BTC, ETH, etc.
        'defi': [],   // DeFi tokens
        'meme': [],   // Meme coins
        'other': []   // Everything else
    };
    
    symbols.forEach(symbol => {
        if (symbol.includes('BTC') || symbol.includes('ETH')) {
            groups.majors.push(symbol);
        } else if (symbol.includes('UNI') || symbol.includes('AAVE') || symbol.includes('COMP')) {
            groups.defi.push(symbol);
        } else if (symbol.includes('DOGE') || symbol.includes('SHIB') || symbol.includes('PEPE')) {
            groups.meme.push(symbol);
        } else {
            groups.other.push(symbol);
        }
    });
    
    return groups;
}

/**
 * Check disk usage
 */
async function checkDiskUsage() {
    try {
        const { stdout } = await execAsync('df / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
        const usage = parseInt(stdout.trim());
        logger.info(`💾 Disk usage: ${usage}%`);
        return usage;
    } catch (error) {
        logger.error('❌ Failed to check disk usage:', error.message);
        return 0;
    }
}

/**
 * Archive worst performing models
 */
async function archiveWorstModels() {
    try {
        logger.info('🗂️ Checking for models to archive...');
        
        const diskUsage = await checkDiskUsage();
        if (diskUsage < DISK_USAGE_THRESHOLD) {
            logger.info('✅ Disk usage below threshold, no archiving needed');
            return;
        }
        
        // Get model performance data
        const performanceData = await redis.hgetall(REDIS_KEY_MODEL_PERFORMANCE);
        const models = Object.entries(performanceData).map(([modelId, data]) => ({
            modelId,
            ...JSON.parse(data)
        }));
        
        if (models.length === 0) {
            logger.info('✅ No models to archive');
            return;
        }
        
        // Sort by performance (worst first)
        models.sort((a, b) => (a.sharpeRatio || 0) - (b.sharpeRatio || 0));
        
        // Calculate how many to archive
        const archiveCount = Math.ceil(models.length * (WORST_MODEL_PERCENTAGE / 100));
        const modelsToArchive = models.slice(0, archiveCount);
        
        logger.info(`🗂️ Archiving ${modelsToArchive.length} worst performing models`);
        
        for (const model of modelsToArchive) {
            try {
                // Archive in MLflow
                await mlflow.transitionModelStage(model.modelId, 'Archived');
                
                // Update Redis
                await redis.hdel(REDIS_KEY_MODEL_PERFORMANCE, model.modelId);
                
                // Move model files to archive directory
                await execAsync(`mkdir -p /opt/trading/models/archive && mv /opt/trading/models/${model.modelId} /opt/trading/models/archive/`);
                
                logger.info(`✅ Archived model: ${model.modelId}`);
            } catch (error) {
                logger.error(`❌ Failed to archive model ${model.modelId}:`, error.message);
            }
        }
        
    } catch (error) {
        logger.error('❌ Failed to archive worst models:', error.message);
    }
}

/**
 * Train model for a single symbol
 */
async function trainModelForSymbol(symbol) {
    try {
        logger.info(`🚀 Starting training for ${symbol}`);
        
        // Update training status
        await redis.hset(REDIS_KEY_TRAINING_STATUS, symbol, JSON.stringify({
            status: 'training',
            started_at: new Date().toISOString(),
            symbol: symbol
        }));
        
        // Add training job to queue
        const job = await trainingQueue.add('train-symbol', {
            symbol: symbol,
            timestamp: Date.now()
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: 50,
            removeOnFail: 25
        });
        
        logger.info(`✅ Enqueued training job for ${symbol}: ${job.id}`);
        return job.id;
        
    } catch (error) {
        logger.error(`❌ Failed to train model for ${symbol}:`, error.message);
        
        // Update status to failed
        await redis.hset(REDIS_KEY_TRAINING_STATUS, symbol, JSON.stringify({
            status: 'failed',
            error: error.message,
            failed_at: new Date().toISOString(),
            symbol: symbol
        }));
        
        throw error;
    }
}

/**
 * Train ensemble models
 */
async function trainEnsembleModels() {
    try {
        logger.info('🎯 Starting ensemble model training...');
        
        const symbols = await getTrainingSymbols();
        const groups = groupSymbols(symbols);
        
        // Train ensemble for each group
        for (const [groupName, groupSymbols] of Object.entries(groups)) {
            if (groupSymbols.length === 0) continue;
            
            logger.info(`🎯 Training ensemble for ${groupName} group (${groupSymbols.length} symbols)`);
            
            const job = await trainingQueue.add('train-ensemble', {
                group: groupName,
                symbols: groupSymbols,
                timestamp: Date.now()
            }, {
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 10000
                },
                removeOnComplete: 20,
                removeOnFail: 10
            });
            
            logger.info(`✅ Enqueued ensemble training job for ${groupName}: ${job.id}`);
        }
        
    } catch (error) {
        logger.error('❌ Failed to train ensemble models:', error.message);
        throw error;
    }
}

/**
 * Monitor training progress
 */
async function monitorTrainingProgress() {
    try {
        const statuses = await redis.hgetall(REDIS_KEY_TRAINING_STATUS);
        const activeTrainings = Object.values(statuses)
            .map(s => JSON.parse(s))
            .filter(s => s.status === 'training');
        
        logger.info(`📊 Active trainings: ${activeTrainings.length}`);
        
        // Check for stuck trainings (older than 2 hours)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        const stuckTrainings = activeTrainings.filter(t => 
            new Date(t.started_at).getTime() < twoHoursAgo
        );
        
        if (stuckTrainings.length > 0) {
            logger.warn(`⚠️ Found ${stuckTrainings.length} stuck trainings`);
            for (const training of stuckTrainings) {
                await redis.hset(REDIS_KEY_TRAINING_STATUS, training.symbol, JSON.stringify({
                    ...training,
                    status: 'stuck',
                    stuck_at: new Date().toISOString()
                }));
            }
        }
        
    } catch (error) {
        logger.error('❌ Failed to monitor training progress:', error.message);
    }
}

/**
 * Main training loop function
 */
async function runTrainingLoop() {
    try {
        logger.info('🚀 Starting continuous training loop...');
        
        // Archive worst models if needed
        await archiveWorstModels();
        
        // Get symbols for training
        const symbols = await getTrainingSymbols();
        
        if (symbols.length === 0) {
            logger.info('✅ No symbols available for training');
            return { success: true, trained: 0 };
        }
        
        // Train individual models
        const trainingPromises = symbols.map(symbol => trainModelForSymbol(symbol));
        const trainingResults = await Promise.allSettled(trainingPromises);
        
        const successfulTrainings = trainingResults.filter(r => r.status === 'fulfilled').length;
        const failedTrainings = trainingResults.filter(r => r.status === 'rejected').length;
        
        logger.info(`📊 Individual training results: ${successfulTrainings} successful, ${failedTrainings} failed`);
        
        // Train ensemble models
        await trainEnsembleModels();
        
        // Monitor progress
        await monitorTrainingProgress();
        
        // Emit metrics
        await redis.set('prometheus:models_trained_total', `models_trained_total ${successfulTrainings}`);
        await redis.set('prometheus:models_failed_total', `models_failed_total ${failedTrainings}`);
        
        logger.info('✅ Continuous training loop completed');
        
        return { 
            success: true, 
            individual_trained: successfulTrainings,
            individual_failed: failedTrainings,
            ensemble_trained: Object.keys(groupSymbols(symbols)).length
        };
        
    } catch (error) {
        logger.error('❌ Continuous training loop failed:', error.message);
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
        await trainingQueue.close();
        logger.info('✅ Training loop cleanup completed');
    } catch (error) {
        logger.error('❌ Training loop cleanup failed:', error.message);
    }
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { runTrainingLoop, trainingQueue }; 