import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Zap,
  Shield,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';
import AutonomousTradingPanel from '../components/AutonomousTradingPanel';
import TradeFeed from '../components/TradeFeed';
import ModelTrainingMonitor from '../components/ModelTrainingMonitor';
import DataPipelineMonitor from '../components/DataPipelineMonitor';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  lastUpdated?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false,
  lastUpdated 
}) => {
  const getChangeColor = (change?: number) => {
    if (!change) return 'text-text-tertiary';
    return change >= 0 ? 'text-profit' : 'text-loss';
  };

  const getChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary rounded-lg p-6 border border-border-primary hover:border-border-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-tertiary mb-1">{title}</p>
          {loading ? (
            <div className="skeleton h-8 w-24 rounded mb-2"></div>
          ) : (
            <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
          )}
          {change !== undefined && !loading && (
            <div className="flex items-center space-x-1">
              {getChangeIcon(change)}
              <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
          {lastUpdated && (
            <p className="text-xs text-text-muted mt-2">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-brand-primary bg-opacity-10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const { state, refresh } = useTradingContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getSystemStatusIcon = () => {
    return state.systemStatus === 'online' ? 
      <CheckCircle className="w-6 h-6 text-success" /> : 
      <AlertTriangle className="w-6 h-6 text-error" />;
  };

  const getSystemStatusColor = () => {
    return state.systemStatus === 'online' ? 'text-success' : 'text-error';
  };

  const ensemble = state.models.find(m => m.type === 'ensemble')?.metrics ?? { 
    accuracy: 0, 
    trades: 0, 
    profitPct: 0 
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Page Header */}
      <div className="bg-bg-secondary border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
              <p className="text-text-tertiary mt-1">
                Real-time overview of your autonomous trading system
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getSystemStatusIcon()}
                <span className={`text-sm font-medium ${getSystemStatusColor()}`}>
                  {state.systemStatus === 'online' ? 'System Online' : 'System Offline'}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark focus-ring disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Portfolio Value"
            value={state.balance ? formatCurrency(state.balance.equity) : '$0'}
            change={state.balance?.pnl24hPct}
            icon={<DollarSign className="w-6 h-6 text-brand-primary" />}
            lastUpdated={state.balance?.updatedAt}
          />
          
          <MetricCard
            title="AI Accuracy"
            value={`${ensemble.accuracy.toFixed(1)}%`}
            icon={<Zap className="w-6 h-6 text-brand-secondary" />}
            lastUpdated={state.autonomousTrading.lastUpdate}
          />
          
          <MetricCard
            title="Total Trades"
            value={ensemble.trades.toLocaleString()}
            icon={<Activity className="w-6 h-6 text-brand-accent" />}
            lastUpdated={state.autonomousTrading.lastUpdate}
          />
          
          <MetricCard
            title="Profit %"
            value={formatPercentage(ensemble.profitPct)}
            change={ensemble.profitPct}
            icon={<TrendingUp className="w-6 h-6 text-success" />}
            lastUpdated={state.autonomousTrading.lastUpdate}
          />
        </div>

        {/* Autonomous Trading Panel */}
        <div className="mb-8">
          <AutonomousTradingPanel />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Active Models"
            value={state.models.filter(m => m.status === 'ready').length}
            icon={<Shield className="w-6 h-6 text-brand-primary" />}
          />
          
          <MetricCard
            title="Trading Mode"
            value={state.tradingMode.toUpperCase()}
            icon={<Activity className="w-6 h-6 text-brand-secondary" />}
          />
          
          <MetricCard
            title="System Uptime"
            value={`${Math.floor((Date.now() - new Date(state.autonomousTrading.lastUpdate).getTime()) / 1000 / 60)}m`}
            icon={<Clock className="w-6 h-6 text-brand-accent" />}
          />
        </div>

        {/* Monitoring Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trade Feed */}
          <div>
            <div className="bg-bg-secondary rounded-lg border border-border-primary">
              <div className="px-6 py-4 border-b border-border-primary">
                <h3 className="text-lg font-semibold text-text-primary">Recent Trades</h3>
              </div>
              <div className="p-6">
                <TradeFeed maxTrades={10} />
              </div>
            </div>
          </div>

          {/* Model Training Monitor */}
          <div>
            <div className="bg-bg-secondary rounded-lg border border-border-primary">
              <div className="px-6 py-4 border-b border-border-primary">
                <h3 className="text-lg font-semibold text-text-primary">Model Training</h3>
              </div>
              <div className="p-6">
                <ModelTrainingMonitor maxRuns={5} />
              </div>
            </div>
          </div>
        </div>

        {/* Data Pipeline Monitor - Full Width */}
        <div className="mt-8">
          <div className="bg-bg-secondary rounded-lg border border-border-primary">
            <div className="px-6 py-4 border-b border-border-primary">
              <h3 className="text-lg font-semibold text-text-primary">Data Pipeline Status</h3>
            </div>
            <div className="p-6">
              <DataPipelineMonitor refreshInterval={15000} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">
            Last refresh: {lastRefresh.toLocaleTimeString()} • 
            Auto-refresh: {state.systemStatus === 'online' ? 'Active' : 'Paused'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;