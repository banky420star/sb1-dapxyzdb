/**
 * Live Shadow Deployment System
 * Deploys new models in shadow mode and promotes them based on performance
 */

import Redis from 'ioredis';
import { Pool } from 'pg';
import Bull from 'bull';
import { logger } from '../utils/enhanced-logger.js';
import { MLflowClient } from '../ml/mlflow_client.js';

// Configuration
const REDIS_KEY_SHADOW_MODELS = 'shadow_models';
const REDIS_KEY_MODEL_PERFORMANCE = 'model_performance';
const REDIS_KEY_PRODUCTION_MODELS = 'production_models';
const SHADOW_POSITION_SIZE = 0.01; // 1% position size
const SHADOW_DURATION_DAYS = 7;
const PERFORMANCE_THRESHOLD = 0.2; // 0.2 Sharpe ratio improvement required
const EVALUATION_INTERVAL_HOURS = 24;

// Initialize connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/trading'
});

// Initialize Bull queue for evaluation jobs
const evaluationQueue = new Bull('model-evaluation', {
    redis: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Initialize MLflow client
const mlflow = new MLflowClient();

/**
 * Deploy model in shadow mode
 */
async function deployShadowModel(modelId, symbol) {
    try {
        logger.info(`🔄 Deploying model ${modelId} in shadow mode for ${symbol}`);
        
        // Get model details from MLflow
        const modelDetails = await mlflow.getModelVersion(modelId);
        
        // Create shadow deployment record
        const shadowDeployment = {
            modelId: modelId,
            symbol: symbol,
            deployedAt: new Date().toISOString(),
            positionSize: SHADOW_POSITION_SIZE,
            status: 'active',
            performance: {
                sharpeRatio: 0,
                totalReturn: 0,
                maxDrawdown: 0,
                trades: 0,
                winRate: 0
            },
            evaluationHistory: []
        };
        
        // Store in Redis
        await redis.hset(REDIS_KEY_SHADOW_MODELS, `${symbol}:${modelId}`, JSON.stringify(shadowDeployment));
        
        // Update database
        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO ml_models (model_id, symbol, mode, deployed_at, position_size, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (model_id, symbol) DO UPDATE SET
                    mode = EXCLUDED.mode,
                    deployed_at = EXCLUDED.deployed_at,
                    position_size = EXCLUDED.position_size,
                    status = EXCLUDED.status
            `, [modelId, symbol, 'shadow', shadowDeployment.deployedAt, SHADOW_POSITION_SIZE, 'active']);
        } finally {
            client.release();
        }
        
        // Schedule evaluation job
        await scheduleEvaluation(modelId, symbol);
        
        logger.info(`✅ Shadow model ${modelId} deployed for ${symbol}`);
        return shadowDeployment;
        
    } catch (error) {
        logger.error(`❌ Failed to deploy shadow model ${modelId}:`, error.message);
        throw error;
    }
}

/**
 * Schedule model evaluation
 */
async function scheduleEvaluation(modelId, symbol) {
    try {
        const job = await evaluationQueue.add('evaluate-shadow', {
            modelId: modelId,
            symbol: symbol,
            timestamp: Date.now()
        }, {
            delay: EVALUATION_INTERVAL_HOURS * 60 * 60 * 1000, // 24 hours
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 60000 // 1 minute
            },
            removeOnComplete: 100,
            removeOnFail: 50
        });
        
        logger.info(`📅 Scheduled evaluation for ${modelId} (${symbol}): ${job.id}`);
        return job.id;
    } catch (error) {
        logger.error(`❌ Failed to schedule evaluation for ${modelId}:`, error.message);
        throw error;
    }
}

/**
 * Calculate model performance metrics
 */
async function calculateModelPerformance(modelId, symbol, startTime, endTime) {
    try {
        const client = await pool.connect();
        
        try {
            // Get trades for the model
            const tradesResult = await client.query(`
                SELECT 
                    side,
                    quantity,
                    price,
                    executed_at,
                    pnl
                FROM trades 
                WHERE model_id = $1 
                AND symbol = $2 
                AND executed_at BETWEEN $3 AND $4
                ORDER BY executed_at
            `, [modelId, symbol, startTime, endTime]);
            
            const trades = tradesResult.rows;
            
            if (trades.length === 0) {
                return {
                    sharpeRatio: 0,
                    totalReturn: 0,
                    maxDrawdown: 0,
                    trades: 0,
                    winRate: 0
                };
            }
            
            // Calculate metrics
            const totalReturn = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
            const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0).length;
            const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
            
            // Calculate Sharpe ratio (simplified)
            const returns = trades.map(trade => trade.pnl || 0);
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;
            
            // Calculate max drawdown
            let maxDrawdown = 0;
            let peak = 0;
            let runningTotal = 0;
            
            for (const trade of trades) {
                runningTotal += trade.pnl || 0;
                if (runningTotal > peak) {
                    peak = runningTotal;
                }
                const drawdown = peak - runningTotal;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }
            
            return {
                sharpeRatio: sharpeRatio,
                totalReturn: totalReturn,
                maxDrawdown: maxDrawdown,
                trades: trades.length,
                winRate: winRate
            };
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        logger.error(`❌ Failed to calculate performance for ${modelId}:`, error.message);
        throw error;
    }
}

/**
 * Evaluate shadow model performance
 */
async function evaluateShadowModel(modelId, symbol) {
    try {
        logger.info(`📊 Evaluating shadow model ${modelId} for ${symbol}`);
        
        // Get shadow deployment
        const shadowData = await redis.hget(REDIS_KEY_SHADOW_MODELS, `${symbol}:${modelId}`);
        if (!shadowData) {
            logger.warn(`⚠️ No shadow deployment found for ${modelId}:${symbol}`);
            return;
        }
        
        const shadow = JSON.parse(shadowData);
        const deployedAt = new Date(shadow.deployedAt);
        const now = new Date();
        
        // Check if evaluation period is complete
        const daysDeployed = (now - deployedAt) / (1000 * 60 * 60 * 24);
        if (daysDeployed < SHADOW_DURATION_DAYS) {
            logger.info(`⏳ Shadow model ${modelId} deployed for ${daysDeployed.toFixed(1)} days, continuing evaluation`);
            
            // Re-schedule evaluation
            await scheduleEvaluation(modelId, symbol);
            return;
        }
        
        // Calculate performance
        const performance = await calculateModelPerformance(modelId, symbol, deployedAt, now);
        
        // Get production model performance for comparison
        const productionData = await redis.hget(REDIS_KEY_PRODUCTION_MODELS, symbol);
        let productionSharpe = 0;
        
        if (productionData) {
            const production = JSON.parse(productionData);
            productionSharpe = production.performance?.sharpeRatio || 0;
        }
        
        // Update shadow performance
        shadow.performance = performance;
        shadow.evaluationHistory.push({
            timestamp: now.toISOString(),
            performance: performance
        });
        
        await redis.hset(REDIS_KEY_SHADOW_MODELS, `${symbol}:${modelId}`, JSON.stringify(shadow));
        
        // Check if model should be promoted
        const performanceImprovement = performance.sharpeRatio - productionSharpe;
        
        if (performanceImprovement > PERFORMANCE_THRESHOLD) {
            logger.info(`🎉 Shadow model ${modelId} outperforms production by ${performanceImprovement.toFixed(3)} Sharpe ratio`);
            await promoteModel(modelId, symbol, performance);
        } else {
            logger.info(`❌ Shadow model ${modelId} underperforms production (${performanceImprovement.toFixed(3)} Sharpe ratio)`);
            await demoteModel(modelId, symbol);
        }
        
    } catch (error) {
        logger.error(`❌ Failed to evaluate shadow model ${modelId}:`, error.message);
    }
}

/**
 * Promote shadow model to production
 */
async function promoteModel(modelId, symbol, performance) {
    try {
        logger.info(`🚀 Promoting model ${modelId} to production for ${symbol}`);
        
        // Update MLflow model stage
        await mlflow.transitionModelStage(modelId, 'Production');
        
        // Update database
        const client = await pool.connect();
        try {
            await client.query(`
                UPDATE ml_models 
                SET mode = 'production', 
                    position_size = 1.0,
                    promoted_at = CURRENT_TIMESTAMP,
                    performance = $3
                WHERE model_id = $1 AND symbol = $2
            `, [modelId, symbol, JSON.stringify(performance)]);
        } finally {
            client.release();
        }
        
        // Update Redis
        await redis.hset(REDIS_KEY_PRODUCTION_MODELS, symbol, JSON.stringify({
            modelId: modelId,
            symbol: symbol,
            promotedAt: new Date().toISOString(),
            performance: performance
        }));
        
        // Remove from shadow models
        await redis.hdel(REDIS_KEY_SHADOW_MODELS, `${symbol}:${modelId}`);
        
        // Send Slack notification
        await sendPromotionNotification(modelId, symbol, performance);
        
        logger.info(`✅ Model ${modelId} promoted to production for ${symbol}`);
        
    } catch (error) {
        logger.error(`❌ Failed to promote model ${modelId}:`, error.message);
        throw error;
    }
}

/**
 * Demote shadow model
 */
async function demoteModel(modelId, symbol) {
    try {
        logger.info(`📉 Demoting shadow model ${modelId} for ${symbol}`);
        
        // Update database
        const client = await pool.connect();
        try {
            await client.query(`
                UPDATE ml_models 
                SET mode = 'archived', 
                    archived_at = CURRENT_TIMESTAMP
                WHERE model_id = $1 AND symbol = $2
            `, [modelId, symbol]);
        } finally {
            client.release();
        }
        
        // Remove from shadow models
        await redis.hdel(REDIS_KEY_SHADOW_MODELS, `${symbol}:${modelId}`);
        
        // Archive in MLflow
        await mlflow.transitionModelStage(modelId, 'Archived');
        
        logger.info(`✅ Model ${modelId} demoted and archived for ${symbol}`);
        
    } catch (error) {
        logger.error(`❌ Failed to demote model ${modelId}:`, error.message);
        throw error;
    }
}

/**
 * Send promotion notification
 */
async function sendPromotionNotification(modelId, symbol, performance) {
    try {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) return;
        
        const message = {
            text: `🎉 Model Promotion Alert`,
            attachments: [{
                color: 'good',
                fields: [
                    { title: 'Model ID', value: modelId, short: true },
                    { title: 'Symbol', value: symbol, short: true },
                    { title: 'Sharpe Ratio', value: performance.sharpeRatio.toFixed(3), short: true },
                    { title: 'Total Return', value: performance.totalReturn.toFixed(2), short: true },
                    { title: 'Win Rate', value: `${(performance.winRate * 100).toFixed(1)}%`, short: true },
                    { title: 'Trades', value: performance.trades.toString(), short: true }
                ],
                footer: 'AutoTrading System'
            }]
        };
        
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });
        
        logger.info(`📢 Promotion notification sent for ${modelId}`);
        
    } catch (error) {
        logger.error('❌ Failed to send promotion notification:', error.message);
    }
}

/**
 * Get active shadow models
 */
async function getActiveShadowModels() {
    try {
        const shadowModels = await redis.hgetall(REDIS_KEY_SHADOW_MODELS);
        return Object.entries(shadowModels).map(([key, value]) => ({
            key,
            ...JSON.parse(value)
        }));
    } catch (error) {
        logger.error('❌ Failed to get active shadow models:', error.message);
        return [];
    }
}

/**
 * Cleanup function
 */
async function cleanup() {
    try {
        await redis.quit();
        await pool.end();
        await evaluationQueue.close();
        logger.info('✅ Shadow deployment cleanup completed');
    } catch (error) {
        logger.error('❌ Shadow deployment cleanup failed:', error.message);
    }
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export { 
    deployShadowModel, 
    evaluateShadowModel, 
    getActiveShadowModels, 
    evaluationQueue 
}; 