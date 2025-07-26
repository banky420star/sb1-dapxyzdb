const io = require('socket.io');
const logger = require('../utils/logger');

class VisualizationManager {
    constructor(server) {
        this.io = io(server);
        this.models = {
            LSTM: { status: 'idle', epoch: 0, epochs: 20, loss: 0, acc: 0 },
            RF: { status: 'idle', epoch: 0, epochs: 15, loss: 0, acc: 0 },
            DDQN: { status: 'idle', epoch: 0, epochs: 25, loss: 0, acc: 0 }
        };
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info('Client connected to visualization manager');
            
            // Send current state to new client
            socket.emit('model_activity', this.models);
            
            socket.on('disconnect', () => {
                logger.info('Client disconnected from visualization manager');
            });
        });
    }

    emitModelActivity(model, data) {
        const activity = {
            model,
            epoch: data.epoch || 0,
            epochs: data.epochs || 20,
            batch: data.batch || 0,
            loss: data.loss || 0,
            acc: data.acc || 0,
            extra: {
                hiddenNorm: data.hiddenNorm || 0,
                gradientNorm: data.gradientNorm || 0,
                qValue: data.qValue || 0
            },
            timestamp: Date.now()
        };

        this.models[model] = activity;
        this.io.emit('model_activity', activity);
        logger.info(`Emitted ${model} activity:`, activity);
    }

    // Simulate training for demonstration
    async simulateTraining(model) {
        const epochs = this.models[model].epochs;
        const batches = 50;
        
        this.models[model].status = 'training';
        this.emitModelActivity(model, { status: 'training', epoch: 0, epochs });

        for (let epoch = 1; epoch <= epochs; epoch++) {
            for (let batch = 1; batch <= batches; batch++) {
                // Simulate training metrics
                const progress = (epoch - 1 + batch / batches) / epochs;
                const loss = Math.max(0.1, 2.0 * Math.exp(-progress * 3) + Math.random() * 0.1);
                const acc = Math.min(0.95, 0.3 + progress * 0.6 + Math.random() * 0.05);
                const gradientNorm = 0.5 + Math.random() * 0.5;
                const hiddenNorm = 0.3 + Math.random() * 0.4;
                const qValue = model === 'DDQN' ? 0.2 + progress * 0.7 + Math.random() * 0.1 : 0;

                this.emitModelActivity(model, {
                    epoch,
                    epochs,
                    batch,
                    loss: parseFloat(loss.toFixed(4)),
                    acc: parseFloat(acc.toFixed(4)),
                    hiddenNorm: parseFloat(hiddenNorm.toFixed(4)),
                    gradientNorm: parseFloat(gradientNorm.toFixed(4)),
                    qValue: parseFloat(qValue.toFixed(4))
                });

                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }

        this.models[model].status = 'completed';
        this.emitModelActivity(model, { status: 'completed', epoch: epochs, epochs });
        logger.info(`${model} training completed`);
    }

    // Start training for a specific model
    startTraining(model) {
        if (this.models[model].status === 'training') {
            logger.warn(`${model} is already training`);
            return;
        }
        
        logger.info(`Starting ${model} training`);
        this.simulateTraining(model);
    }

    // Get current model states
    getModelStates() {
        return this.models;
    }
}

module.exports = VisualizationManager; 