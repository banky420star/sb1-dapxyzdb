const { BybitRateMonitor } = require('../../server/monitoring/bybit-rate-monitor');
const logger = require('../../server/utils/enhanced-logger');

describe('Bybit Rate Monitor', () => {
    let monitor;
    
    beforeEach(() => {
        monitor = new BybitRateMonitor();
    });
    
    afterEach(() => {
        monitor.removeAllListeners();
    });

    describe('parseLimitStatus', () => {
        test('should parse valid X-Bapi-Limit-Status header', () => {
            const header = '150,200,300';
            const result = monitor.parseLimitStatus(header);
            
            expect(result).toEqual({
                orders: 150,
                positions: 200,
                account: 300
            });
        });

        test('should handle invalid header format', () => {
            const header = 'invalid';
            const result = monitor.parseLimitStatus(header);
            
            expect(result).toBeNull();
        });

        test('should handle empty header', () => {
            const result = monitor.parseLimitStatus('');
            expect(result).toBeNull();
        });

        test('should handle null header', () => {
            const result = monitor.parseLimitStatus(null);
            expect(result).toBeNull();
        });
    });

    describe('updateMetrics', () => {
        test('should update metrics from valid response', () => {
            const response = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '100,150,200'
                }
            };
            
            monitor.updateMetrics(response, '/api/v5/order');
            
            expect(monitor.metrics.requests).toBe(1);
            expect(monitor.metrics.limits.orders.used).toBe(100);
            expect(monitor.metrics.limits.positions.used).toBe(150);
            expect(monitor.metrics.limits.account.used).toBe(200);
        });

        test('should increment rate limit hits on 429 status', () => {
            const response = {
                status: 429,
                headers: {
                    'x-bapi-limit-status': '1000,1000,1000'
                }
            };
            
            monitor.updateMetrics(response, '/api/v5/order');
            
            expect(monitor.metrics.rateLimitHits).toBe(1);
        });

        test('should emit metricsUpdate event', (done) => {
            const response = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '100,150,200'
                }
            };
            
            monitor.on('metricsUpdate', (metrics) => {
                expect(metrics.requests).toBe(1);
                done();
            });
            
            monitor.updateMetrics(response, '/api/v5/order');
        });
    });

    describe('alert threshold', () => {
        test('should emit alert when utilization exceeds threshold', (done) => {
            monitor.setAlertThreshold(0.5); // 50%
            
            monitor.on('alert', (alert) => {
                expect(alert.type).toBe('RATE_LIMIT_WARNING');
                expect(alert.utilization).toBeGreaterThan(0.5);
                done();
            });
            
            // Simulate high utilization
            const response = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '800,800,800' // High usage
                }
            };
            
            monitor.updateMetrics(response, '/api/v5/order');
        });

        test('should emit recovery alert when utilization drops below threshold', (done) => {
            monitor.setAlertThreshold(0.5);
            
            // First, trigger warning
            const highResponse = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '800,800,800'
                }
            };
            monitor.updateMetrics(highResponse, '/api/v5/order');
            
            // Then, trigger recovery
            monitor.on('alert', (alert) => {
                if (alert.type === 'RATE_LIMIT_RECOVERED') {
                    expect(alert.utilization).toBeLessThan(0.5);
                    done();
                }
            });
            
            const lowResponse = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '100,100,100' // Low usage
                }
            };
            monitor.updateMetrics(lowResponse, '/api/v5/order');
        });
    });

    describe('getMetrics', () => {
        test('should return current metrics with timestamp', () => {
            const metrics = monitor.getMetrics();
            
            expect(metrics).toHaveProperty('requests');
            expect(metrics).toHaveProperty('utilization');
            expect(metrics).toHaveProperty('timestamp');
            expect(metrics).toHaveProperty('utilizationPercent');
        });
    });

    describe('getPrometheusMetrics', () => {
        test('should return Prometheus-formatted metrics', () => {
            const prometheusMetrics = monitor.getPrometheusMetrics();
            
            expect(prometheusMetrics).toContain('# HELP bybit_rate_limit_requests_total');
            expect(prometheusMetrics).toContain('# TYPE bybit_rate_limit_requests_total counter');
            expect(prometheusMetrics).toContain('bybit_rate_limit_requests_total');
            expect(prometheusMetrics).toContain('bybit_rate_limit_utilization');
        });
    });

    describe('resetMetrics', () => {
        test('should reset all metrics', () => {
            // First, add some metrics
            const response = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '100,150,200'
                }
            };
            monitor.updateMetrics(response, '/api/v5/order');
            
            expect(monitor.metrics.requests).toBe(1);
            
            // Reset
            monitor.resetMetrics();
            
            expect(monitor.metrics.requests).toBe(0);
            expect(monitor.metrics.rateLimitHits).toBe(0);
            expect(monitor.metrics.lastReset).toBeTruthy();
        });

        test('should emit metricsReset event', (done) => {
            monitor.on('metricsReset', (metrics) => {
                expect(metrics.requests).toBe(0);
                done();
            });
            
            monitor.resetMetrics();
        });
    });

    describe('setAlertThreshold', () => {
        test('should set valid threshold', () => {
            monitor.setAlertThreshold(0.8);
            expect(monitor.alertThreshold).toBe(0.8);
        });

        test('should throw error for invalid threshold', () => {
            expect(() => monitor.setAlertThreshold(1.5)).toThrow();
            expect(() => monitor.setAlertThreshold(-0.1)).toThrow();
        });
    });

    describe('getHealth', () => {
        test('should return healthy status for low utilization', () => {
            const health = monitor.getHealth();
            expect(health.status).toBe('healthy');
        });

        test('should return warning status for high utilization', () => {
            monitor.setAlertThreshold(0.1); // Very low threshold
            
            const response = {
                status: 200,
                headers: {
                    'x-bapi-limit-status': '800,800,800'
                }
            };
            monitor.updateMetrics(response, '/api/v5/order');
            
            const health = monitor.getHealth();
            expect(health.status).toBe('warning');
        });
    });
});

// Integration test for sandbox endpoint
describe('Bybit Rate Monitor Integration', () => {
    test('should handle sandbox endpoint requests', async () => {
        const { bybitRateMonitor } = require('../../server/monitoring/bybit-rate-monitor');
        
        // Simulate sandbox endpoint response
        const sandboxResponse = {
            status: 200,
            headers: {
                'x-bapi-limit-status': '50,75,100'
            }
        };
        
        return new Promise((resolve) => {
            bybitRateMonitor.on('metricsUpdate', (metrics) => {
                expect(metrics.limits.orders.used).toBe(50);
                expect(metrics.limits.positions.used).toBe(75);
                expect(metrics.limits.account.used).toBe(100);
                resolve();
            });
            
            bybitRateMonitor.updateMetrics(sandboxResponse, '/api/v5/sandbox/order');
        });
    });
}); 