// server/services/models.js
// Agent note: Hook to your orchestrator/sockets later.
// Keep shape consistent for the UI.

export async function listModels() {
  return [
    { type: 'randomforest', status: 'ready', metrics: { accuracy: 0, trades: 0, profitPct: 0 } },
    { type: 'lstm',         status: 'ready', metrics: { accuracy: 0, trades: 0, profitPct: 0 } },
    { type: 'ddqn',         status: 'ready', metrics: { accuracy: 0, trades: 0, profitPct: 0 } },
    { type: 'ensemble',     status: 'ready', metrics: { accuracy: 0, trades: 0, profitPct: 0 } },
  ]
}

export async function getTrainingStatus() {
  return {
    isTraining: false,
    currentModel: null,
    progress: 0,
    lastTraining: null,
    updatedAt: new Date().toISOString(),
  }
}
