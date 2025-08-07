const logger = require('../utils/enhanced-logger');
const { EventEmitter } = require('events');

/**
 * Bybit Rate Limit Monitor
 * Monitors X-Bapi-Limit-Status headers and provides real-time rate limit metrics
 */
class BybitRateMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            requests: 0,
            rateLimitHits: 0,
            utilization: 0,
            lastReset: null,
            limits: {
                orders: { used: 0, limit: 0, remaining: 0 },
                positions: { used: 0, limit: 0, remaining: 0 },
                account: { used: 0, limit: 0, remaining: 0 }
            }
        };
        
        this.alertThreshold = 0.7; // 70% utilization
        this.alertSent = false;
        
        logger.info('Bybit Rate Monitor initialized');
    }

    /**
     * Parse X-Bapi-Limit-Status header
     * Format: "0,0,0" (orders, positions, account)
     */
    parseLimitStatus(header) {
        if (!header) return null;
        
        try {
            const parts = header.split(',');
            if (parts.length !== 3) {
                logger.warn('Invalid X-Bapi-Limit-Status header format:', header);
                return null;
            }
            
            return {
                orders: parseInt(parts[0]) || 0,
                positions: parseInt(parts[1]) || 0,
                account: parseInt(parts[2]) || 0
            };
        } catch (error) {
            logger.error('Error parsing X-Bapi-Limit-Status:', error);
            return null;
        }
    }

    /**
     * Update metrics from API response
     */
    updateMetrics(response, endpoint) {
        this.metrics.requests++;
        
        const limitStatus = this.parseLimitStatus(response.headers['x-bapi-limit-status']);
        if (!limitStatus) return;
        
        // Update limits (assuming 1000 requests per minute as default)
        const defaultLimit = 1000;
        this.metrics.limits.orders = {
            used: limitStatus.orders,
            limit: defaultLimit,
            remaining: defaultLimit - limitStatus.orders
        };
        
        this.metrics.limits.positions = {
            used: limitStatus.positions,
            limit: defaultLimit,
            remaining: defaultLimit - limitStatus.positions
        };
        
        this.metrics.limits.account = {
            used: limitStatus.account,
            limit: defaultLimit,
            remaining: defaultLimit - limitStatus.account
        };
        
        // Calculate overall utilization
        const totalUsed = limitStatus.orders + limitStatus.positions + limitStatus.account;
        const totalLimit = defaultLimit * 3;
        this.metrics.utilization = totalUsed / totalLimit;
        
        // Check for rate limit hits
        if (response.status === 429) {
            this.metrics.rateLimitHits++;
            logger.warn('Rate limit hit on endpoint:', endpoint);
        }
        
        // Check alert threshold
        this.checkAlertThreshold();
        
        // Emit metrics update
        this.emit('metricsUpdate', this.metrics);
        
        logger.debug('Rate limit metrics updated:', {
            endpoint,
            utilization: `${(this.metrics.utilization * 100).toFixed(2)}%`,
            orders: limitStatus.orders,
            positions: limitStatus.positions,
            account: limitStatus.account
        });
    }

    /**
     * Check if utilization exceeds alert threshold
     */
    checkAlertThreshold() {
        if (this.metrics.utilization >= this.alertThreshold && !this.alertSent) {
            this.alertSent = true;
            this.emit('alert', {
                type: 'RATE_LIMIT_WARNING',
                utilization: this.metrics.utilization,
                threshold: this.alertThreshold,
                timestamp: new Date().toISOString()
            });
            
            logger.warn('Rate limit utilization alert:', {
                utilization: `${(this.metrics.utilization * 100).toFixed(2)}%`,
                threshold: `${(this.alertThreshold * 100).toFixed(2)}%`
            });
        } else if (this.metrics.utilization < this.alertThreshold && this.alertSent) {
            this.alertSent = false;
            this.emit('alert', {
                type: 'RATE_LIMIT_RECOVERED',
                utilization: this.metrics.utilization,
                threshold: this.alertThreshold,
                timestamp: new Date().toISOString()
            });
            
            logger.info('Rate limit utilization recovered:', {
                utilization: `${(this.metrics.utilization * 100).toFixed(2)}%`,
                threshold: `${(this.alertThreshold * 100).toFixed(2)}%`
            });
        }
    }

    /**
     * Get current metrics for Grafana
     */
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString(),
            utilizationPercent: this.metrics.utilization * 100
        };
    }

    /**
     * Get Prometheus-formatted metrics
     */
    getPrometheusMetrics() {
        const timestamp = Date.now();
        return [
            `# HELP bybit_rate_limit_requests_total Total number of API requests`,
            `# TYPE bybit_rate_limit_requests_total counter`,
            `bybit_rate_limit_requests_total ${this.metrics.requests} ${timestamp}`,
            '',
            `# HELP bybit_rate_limit_hits_total Total number of rate limit hits`,
            `# TYPE bybit_rate_limit_hits_total counter`,
            `bybit_rate_limit_hits_total ${this.metrics.rateLimitHits} ${timestamp}`,
            '',
            `# HELP bybit_rate_limit_utilization Current rate limit utilization (0-1)`,
            `# TYPE bybit_rate_limit_utilization gauge`,
            `bybit_rate_limit_utilization ${this.metrics.utilization} ${timestamp}`,
            '',
            `# HELP bybit_rate_limit_orders_used Current orders limit usage`,
            `# TYPE bybit_rate_limit_orders_used gauge`,
            `bybit_rate_limit_orders_used ${this.metrics.limits.orders.used} ${timestamp}`,
            '',
            `# HELP bybit_rate_limit_positions_used Current positions limit usage`,
            `# TYPE bybit_rate_limit_positions_used gauge`,
            `bybit_rate_limit_positions_used ${this.metrics.limits.positions.used} ${timestamp}`,
            '',
            `# HELP bybit_rate_limit_account_used Current account limit usage`,
            `# TYPE bybit_rate_limit_account_used gauge`,
            `bybit_rate_limit_account_used ${this.metrics.limits.account.used} ${timestamp}`
        ].join('\n');
    }

    /**
     * Reset metrics (call periodically)
     */
    resetMetrics() {
        this.metrics.requests = 0;
        this.metrics.rateLimitHits = 0;
        this.metrics.lastReset = new Date().toISOString();
        this.alertSent = false;
        
        logger.info('Rate limit metrics reset');
        this.emit('metricsReset', this.metrics);
    }

    /**
     * Set alert threshold
     */
    setAlertThreshold(threshold) {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Alert threshold must be between 0 and 1');
        }
        
        this.alertThreshold = threshold;
        logger.info('Alert threshold updated:', threshold);
    }

    /**
     * Get health status
     */
    getHealth() {
        return {
            status: this.metrics.utilization >= this.alertThreshold ? 'warning' : 'healthy',
            utilization: this.metrics.utilization,
            alertThreshold: this.alertThreshold,
            lastUpdate: new Date().toISOString()
        };
    }
}

// Create singleton instance
const bybitRateMonitor = new BybitRateMonitor();

// Export singleton and class
module.exports = {
    BybitRateMonitor,
    bybitRateMonitor
}; 