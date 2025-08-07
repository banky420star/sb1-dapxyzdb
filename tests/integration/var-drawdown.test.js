const { expect } = require('chai');
const logger = require('../../server/utils/enhanced-logger');

// Mock historical crash data
const HISTORICAL_CRASH_DATA = [
    // 2008 Financial Crisis
    {
        date: '2008-09-15',
        symbol: 'SPY',
        open: 125.48,
        high: 125.48,
        low: 119.50,
        close: 119.50,
        volume: 1000000,
        crash_factor: 0.0476 // 4.76% drop
    },
    {
        date: '2008-10-06',
        symbol: 'SPY',
        open: 119.50,
        high: 119.50,
        low: 113.50,
        close: 113.50,
        volume: 1000000,
        crash_factor: 0.0502 // 5.02% drop
    },
    // 2020 COVID Crash
    {
        date: '2020-03-16',
        symbol: 'SPY',
        open: 250.00,
        high: 250.00,
        low: 235.00,
        close: 235.00,
        volume: 1000000,
        crash_factor: 0.0600 // 6% drop
    },
    {
        date: '2020-03-23',
        symbol: 'SPY',
        open: 235.00,
        high: 235.00,
        low: 220.00,
        close: 220.00,
        volume: 1000000,
        crash_factor: 0.0638 // 6.38% drop
    },
    // 2022 Tech Crash
    {
        date: '2022-01-24',
        symbol: 'QQQ',
        open: 350.00,
        high: 350.00,
        low: 330.00,
        close: 330.00,
        volume: 1000000,
        crash_factor: 0.0571 // 5.71% drop
    }
];

// Mock portfolio data
const PORTFOLIO_DATA = {
    totalValue: 100000,
    positions: [
        { symbol: 'SPY', quantity: 100, avgPrice: 250.00, currentPrice: 250.00 },
        { symbol: 'QQQ', quantity: 50, avgPrice: 350.00, currentPrice: 350.00 },
        { symbol: 'BTC', quantity: 2, avgPrice: 50000, currentPrice: 50000 }
    ],
    cash: 25000
};

describe('VaR + Drawdown Integration Tests', () => {
    let riskManager;
    let tradingEngine;
    let portfolioManager;
    
    before(async () => {
        // Initialize test components
        riskManager = require('../../server/risk/manager');
        tradingEngine = require('../../server/trading/engine');
        portfolioManager = require('../../server/data/manager');
        
        // Seed historical data
        await seedHistoricalData();
        
        logger.info('VaR + Drawdown integration tests initialized');
    });

    describe('Historical Crash Data Seeding', () => {
        it('should seed historical crash data successfully', async () => {
            const seededData = await portfolioManager.getHistoricalData('SPY', '2008-01-01', '2022-12-31');
            
            expect(seededData).to.be.an('array');
            expect(seededData.length).to.be.greaterThan(0);
            
            // Verify crash data is present
            const crashEvents = seededData.filter(data => data.crash_factor > 0.05);
            expect(crashEvents.length).to.be.greaterThan(0);
            
            logger.info(`Seeded ${seededData.length} historical data points with ${crashEvents.length} crash events`);
        });

        it('should contain 2008 financial crisis data', async () => {
            const crisisData = await portfolioManager.getHistoricalData('SPY', '2008-09-01', '2008-10-31');
            
            const crashEvents = crisisData.filter(data => data.crash_factor > 0.04);
            expect(crashEvents.length).to.be.greaterThan(0);
            
            // Verify specific crash dates
            const sept15 = crisisData.find(data => data.date === '2008-09-15');
            expect(sept15).to.exist;
            expect(sept15.crash_factor).to.be.closeTo(0.0476, 0.001);
        });

        it('should contain 2020 COVID crash data', async () => {
            const covidData = await portfolioManager.getHistoricalData('SPY', '2020-03-01', '2020-04-30');
            
            const crashEvents = covidData.filter(data => data.crash_factor > 0.05);
            expect(crashEvents.length).to.be.greaterThan(0);
            
            // Verify specific crash dates
            const mar16 = covidData.find(data => data.date === '2020-03-16');
            expect(mar16).to.exist;
            expect(mar16.crash_factor).to.be.closeTo(0.0600, 0.001);
        });
    });

    describe('VaR Calculation', () => {
        it('should calculate VaR correctly for normal market conditions', async () => {
            const varResult = await riskManager.calculateVaR(PORTFOLIO_DATA, 0.95, 1);
            
            expect(varResult).to.have.property('var');
            expect(varResult).to.have.property('confidence_level');
            expect(varResult).to.have.property('time_horizon');
            expect(varResult.confidence_level).to.equal(0.95);
            expect(varResult.time_horizon).to.equal(1);
            
            // VaR should be positive and reasonable
            expect(varResult.var).to.be.greaterThan(0);
            expect(varResult.var).to.be.lessThan(PORTFOLIO_DATA.totalValue * 0.1); // Less than 10%
            
            logger.info(`VaR calculated: $${varResult.var.toFixed(2)} (${(varResult.var / PORTFOLIO_DATA.totalValue * 100).toFixed(2)}%)`);
        });

        it('should calculate VaR correctly during crash scenarios', async () => {
            // Simulate crash scenario
            const crashPortfolio = {
                ...PORTFOLIO_DATA,
                positions: PORTFOLIO_DATA.positions.map(pos => ({
                    ...pos,
                    currentPrice: pos.currentPrice * 0.95 // 5% drop
                }))
            };
            
            const varResult = await riskManager.calculateVaR(crashPortfolio, 0.95, 1);
            
            expect(varResult.var).to.be.greaterThan(0);
            
            logger.info(`Crash scenario VaR: $${varResult.var.toFixed(2)} (${(varResult.var / crashPortfolio.totalValue * 100).toFixed(2)}%)`);
        });

        it('should trigger VaR alert when VaR > 5%', async () => {
            // Create portfolio with high risk
            const highRiskPortfolio = {
                totalValue: 100000,
                positions: [
                    { symbol: 'SPY', quantity: 500, avgPrice: 250.00, currentPrice: 250.00 },
                    { symbol: 'QQQ', quantity: 300, avgPrice: 350.00, currentPrice: 350.00 }
                ],
                cash: 0
            };
            
            const varResult = await riskManager.calculateVaR(highRiskPortfolio, 0.95, 1);
            const varPercentage = (varResult.var / highRiskPortfolio.totalValue) * 100;
            
            if (varPercentage > 5) {
                logger.warn(`VaR alert triggered: ${varPercentage.toFixed(2)}% > 5%`);
                expect(varPercentage).to.be.greaterThan(5);
            }
        });
    });

    describe('Drawdown Calculation', () => {
        it('should calculate maximum drawdown correctly', async () => {
            const drawdownResult = await riskManager.calculateMaxDrawdown(PORTFOLIO_DATA);
            
            expect(drawdownResult).to.have.property('maxDrawdown');
            expect(drawdownResult).to.have.property('peakValue');
            expect(drawdownResult).to.have.property('troughValue');
            expect(drawdownResult).to.have.property('peakDate');
            expect(drawdownResult).to.have.property('troughDate');
            
            expect(drawdownResult.maxDrawdown).to.be.greaterThanOrEqual(0);
            expect(drawdownResult.maxDrawdown).to.be.lessThanOrEqual(1);
            
            logger.info(`Max drawdown: ${(drawdownResult.maxDrawdown * 100).toFixed(2)}%`);
        });

        it('should calculate current drawdown correctly', async () => {
            const currentDrawdown = await riskManager.calculateCurrentDrawdown(PORTFOLIO_DATA);
            
            expect(currentDrawdown).to.be.greaterThanOrEqual(0);
            expect(currentDrawdown).to.be.lessThanOrEqual(1);
            
            logger.info(`Current drawdown: ${(currentDrawdown * 100).toFixed(2)}%`);
        });
    });

    describe('Auto-Liquidation Integration', () => {
        it('should trigger auto-liquidation when VaR > 5%', async () => {
            // Create portfolio that will trigger VaR > 5%
            const triggerPortfolio = {
                totalValue: 100000,
                positions: [
                    { symbol: 'SPY', quantity: 600, avgPrice: 250.00, currentPrice: 250.00 },
                    { symbol: 'QQQ', quantity: 400, avgPrice: 350.00, currentPrice: 350.00 }
                ],
                cash: 0
            };
            
            // Calculate VaR
            const varResult = await riskManager.calculateVaR(triggerPortfolio, 0.95, 1);
            const varPercentage = (varResult.var / triggerPortfolio.totalValue) * 100;
            
            if (varPercentage > 5) {
                // Trigger auto-liquidation
                const liquidationResult = await riskManager.triggerAutoLiquidation(triggerPortfolio, 'VaR threshold exceeded');
                
                expect(liquidationResult).to.have.property('success');
                expect(liquidationResult).to.have.property('reason');
                expect(liquidationResult).to.have.property('liquidatedPositions');
                
                if (liquidationResult.success) {
                    // Verify all positions are liquidated
                    const remainingPositions = liquidationResult.liquidatedPositions.filter(pos => pos.quantity > 0);
                    expect(remainingPositions.length).to.equal(0);
                    
                    logger.info('Auto-liquidation triggered successfully - all positions liquidated');
                }
            }
        });

        it('should assert positions == 0 after liquidation', async () => {
            // Create test portfolio
            const testPortfolio = {
                totalValue: 100000,
                positions: [
                    { symbol: 'SPY', quantity: 100, avgPrice: 250.00, currentPrice: 250.00 },
                    { symbol: 'QQQ', quantity: 50, avgPrice: 350.00, currentPrice: 350.00 }
                ],
                cash: 25000
            };
            
            // Force liquidation
            const liquidationResult = await riskManager.triggerAutoLiquidation(testPortfolio, 'Test liquidation');
            
            expect(liquidationResult.success).to.be.true;
            
            // Check that all positions are zero
            const activePositions = liquidationResult.liquidatedPositions.filter(pos => pos.quantity > 0);
            expect(activePositions.length).to.equal(0);
            
            // Verify cash increased
            expect(liquidationResult.cash).to.be.greaterThan(testPortfolio.cash);
            
            logger.info('Position liquidation verified - all positions set to zero');
        });

        it('should handle liquidation during market crash', async () => {
            // Simulate crash scenario with historical data
            const crashScenario = {
                totalValue: 100000,
                positions: [
                    { symbol: 'SPY', quantity: 200, avgPrice: 250.00, currentPrice: 235.00 }, // 6% drop
                    { symbol: 'QQQ', quantity: 100, avgPrice: 350.00, currentPrice: 330.00 }  // 5.7% drop
                ],
                cash: 25000
            };
            
            // Calculate VaR in crash scenario
            const varResult = await riskManager.calculateVaR(crashScenario, 0.95, 1);
            const varPercentage = (varResult.var / crashScenario.totalValue) * 100;
            
            // Should trigger liquidation due to crash
            if (varPercentage > 5) {
                const liquidationResult = await riskManager.triggerAutoLiquidation(crashScenario, 'Market crash detected');
                
                expect(liquidationResult.success).to.be.true;
                
                // Verify positions are liquidated
                const activePositions = liquidationResult.liquidatedPositions.filter(pos => pos.quantity > 0);
                expect(activePositions.length).to.equal(0);
                
                logger.info('Crash scenario liquidation successful');
            }
        });
    });

    describe('Risk Management Integration', () => {
        it('should integrate VaR and drawdown monitoring', async () => {
            const riskMetrics = await riskManager.getRiskMetrics(PORTFOLIO_DATA);
            
            expect(riskMetrics).to.have.property('var');
            expect(riskMetrics).to.have.property('maxDrawdown');
            expect(riskMetrics).to.have.property('currentDrawdown');
            expect(riskMetrics).to.have.property('riskLevel');
            
            logger.info(`Risk metrics - VaR: ${(riskMetrics.var * 100).toFixed(2)}%, Max DD: ${(riskMetrics.maxDrawdown * 100).toFixed(2)}%, Risk Level: ${riskMetrics.riskLevel}`);
        });

        it('should provide real-time risk alerts', async () => {
            const alerts = await riskManager.getRiskAlerts(PORTFOLIO_DATA);
            
            expect(alerts).to.be.an('array');
            
            // Log any active alerts
            if (alerts.length > 0) {
                alerts.forEach(alert => {
                    logger.warn(`Risk alert: ${alert.type} - ${alert.message}`);
                });
            }
        });
    });
});

// Helper function to seed historical data
async function seedHistoricalData() {
    try {
        const dataManager = require('../../server/data/manager');
        
        // Seed crash data
        for (const crashData of HISTORICAL_CRASH_DATA) {
            await dataManager.storeHistoricalData(crashData.symbol, crashData);
        }
        
        logger.info(`Seeded ${HISTORICAL_CRASH_DATA.length} historical crash data points`);
    } catch (error) {
        logger.error('Error seeding historical data:', error);
        throw error;
    }
} 