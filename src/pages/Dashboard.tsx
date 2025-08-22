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
  CheckCircle,
  Grid3X3,
  Settings,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  BarChart3,
  PieChart,
  Target,
  Cpu,
  Bot
} from 'lucide-react';
import { useTradingContext } from '../contexts/TradingContext';
import AutonomousTradingPanel from '../components/AutonomousTradingPanel';
import TradeFeed from '../components/TradeFeed';
import ModelTrainingMonitor from '../components/ModelTrainingMonitor';
import DataPipelineMonitor from '../components/DataPipelineMonitor';
import LiveDataFeed from '../components/LiveDataFeed';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  lastUpdated?: string;
  widgetId?: string;
  onToggle?: (id: string) => void;
  isVisible?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  loading = false,
  lastUpdated,
  widgetId,
  onToggle,
  isVisible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-text-tertiary';
    return change >= 0 ? 'text-profit' : 'text-loss';
  };

  const getChangeIcon = (change?: number) => {
    if (!change) return null;
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-bg-secondary rounded-lg border border-border-primary hover:border-border-accent transition-all duration-200 ${
        isExpanded ? 'col-span-2 row-span-2' : ''
      }`}
    >
      <div className="p-6">
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-primary bg-opacity-10 rounded-lg flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-tertiary">{title}</h3>
              {lastUpdated && (
                <p className="text-xs text-text-muted">
                  Updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {onToggle && (
              <button
                onClick={() => widgetId && onToggle(widgetId)}
                className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
                title="Toggle widget visibility"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Widget Content */}
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-bg-tertiary rounded"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-text-primary">{value}</span>
                {change !== undefined && (
                  <div className={`flex items-center space-x-1 ${getChangeColor(change)}`}>
                    {getChangeIcon(change)}
                    <span className="text-sm font-medium">
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const { state, refresh } = useTradingContext();
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set([
    'balance', 'trading-status', 'autonomous-trading', 'models', 'live-data'
  ]));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleWidget = (widgetId: string) => {
    const newVisible = new Set(visibleWidgets);
    if (newVisible.has(widgetId)) {
      newVisible.delete(widgetId);
    } else {
      newVisible.add(widgetId);
    }
    setVisibleWidgets(newVisible);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refresh]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              🤖 Autonomous Trading Dashboard
            </h1>
            <p className="text-text-secondary">
              Real-time monitoring of your AI-powered trading system
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${state.systemStatus === 'online' ? 'bg-profit' : 'bg-loss'}`}></div>
              <span className="text-sm text-text-secondary">
                {state.systemStatus === 'online' ? 'System Online' : 'System Offline'}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Balance"
          value={state.balance ? formatCurrency(state.balance.total) : '$0.00'}
          change={state.balance?.pnl24hPct}
          icon={<DollarSign className="w-5 h-5" />}
          loading={!state.balance}
          lastUpdated={state.balance?.updatedAt}
          widgetId="balance"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('balance')}
        />

        <MetricCard
          title="Available Balance"
          value={state.balance ? formatCurrency(state.balance.available) : '$0.00'}
          icon={<Shield className="w-5 h-5" />}
          loading={!state.balance}
          lastUpdated={state.balance?.updatedAt}
          widgetId="available"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('available')}
        />

        <MetricCard
          title="Trading Mode"
          value={state.tradingMode.toUpperCase()}
          icon={<Activity className="w-5 h-5" />}
          lastUpdated={state.balance?.updatedAt}
          widgetId="trading-mode"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('trading-mode')}
        />

        <MetricCard
          title="Autonomous Trading"
          value={state.autonomousTrading.isActive ? 'ACTIVE' : 'INACTIVE'}
          icon={<Bot className="w-5 h-5" />}
          lastUpdated={state.autonomousTrading.lastUpdate}
          widgetId="autonomous-trading"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('autonomous-trading')}
        />

        <MetricCard
          title="Total Positions"
          value={state.positions.length}
          icon={<BarChart3 className="w-5 h-5" />}
          lastUpdated={state.balance?.updatedAt}
          widgetId="positions"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('positions')}
        />

        <MetricCard
          title="Open Orders"
          value={state.openOrders.length}
          icon={<Clock className="w-5 h-5" />}
          lastUpdated={state.balance?.updatedAt}
          widgetId="orders"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('orders')}
        />

        <MetricCard
          title="AI Models Ready"
          value={state.models.filter(m => m.status === 'ready').length}
          icon={<Cpu className="w-5 h-5" />}
          lastUpdated={state.balance?.updatedAt}
          widgetId="models"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('models')}
        />

        <MetricCard
          title="Live Data Feed"
          value={state.autonomousTrading.isActive ? 'ACTIVE' : 'INACTIVE'}
          icon={<Zap className="w-5 h-5" />}
          lastUpdated={state.autonomousTrading.lastUpdate}
          widgetId="live-data"
          onToggle={toggleWidget}
          isVisible={visibleWidgets.has('live-data')}
        />
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6">
        {/* Autonomous Trading Panel */}
        {visibleWidgets.has('autonomous-trading') && (
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <AutonomousTradingPanel />
          </div>
        )}

        {/* Trade Feed */}
        {visibleWidgets.has('trades') && (
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <TradeFeed />
          </div>
        )}

        {/* Model Training Monitor */}
        {visibleWidgets.has('training') && (
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <ModelTrainingMonitor />
          </div>
        )}

        {/* Data Pipeline Monitor */}
        {visibleWidgets.has('pipeline') && (
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <DataPipelineMonitor />
          </div>
        )}

        {/* Live Data Feed Section */}
        {visibleWidgets.has('live-data') && (
          <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
            <LiveDataFeed />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;