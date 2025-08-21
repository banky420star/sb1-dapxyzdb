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
                <EyeOff className="w-4 h-4" />
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
            <div className="skeleton h-8 w-24 rounded mb-2"></div>
          ) : (
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              {change !== undefined && (
                <div className="flex items-center space-x-1">
                  {getChangeIcon(change)}
                  <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-4 border-t border-border-primary"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">24h Volume</p>
                  <p className="font-medium text-text-primary">$2.4M</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Active Trades</p>
                  <p className="font-medium text-text-primary">12</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Win Rate</p>
                  <p className="font-medium text-profit">68.5%</p>
                </div>
                <div>
                  <p className="text-text-tertiary">Risk Level</p>
                  <p className="font-medium text-warning">Medium</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const { state, refresh } = useTradingContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [widgetVisibility, setWidgetVisibility] = useState({
    portfolio: true,
    accuracy: true,
    trades: true,
    profit: true,
    autonomous: true,
    models: true,
    pipeline: true
  });
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  const toggleWidget = (widgetId: string) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId as keyof typeof prev]
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const metrics = [
    {
      id: 'portfolio',
      title: 'Portfolio Value',
      value: formatCurrency(state.balance?.total || 0),
      change: state.pnl24hPct || 0,
      icon: <DollarSign className="w-5 h-5 text-brand-primary" />,
      lastUpdated: state.lastUpdated
    },
    {
      id: 'accuracy',
      title: 'AI Accuracy',
      value: formatPercentage(state.models?.[0]?.metrics?.accuracy || 0),
      change: 2.5,
      icon: <Target className="w-5 h-5 text-success" />,
      lastUpdated: state.lastUpdated
    },
    {
      id: 'trades',
      title: 'Total Trades',
      value: state.models?.[0]?.metrics?.trades || 0,
      change: 12.5,
      icon: <Activity className="w-5 h-5 text-info" />,
      lastUpdated: state.lastUpdated
    },
    {
      id: 'profit',
      title: 'Profit %',
      value: formatPercentage(state.models?.[0]?.metrics?.profitPct || 0),
      change: state.pnl24hPct || 0,
      icon: <TrendingUp className="w-5 h-5 text-profit" />,
      lastUpdated: state.lastUpdated
    }
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trading Dashboard</h1>
          <p className="text-text-tertiary mt-1">
            Real-time overview of your autonomous trading performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Layout Toggle */}
          <div className="flex items-center bg-bg-tertiary rounded-lg p-1">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-2 rounded-md text-sm transition-colors ${
                layoutMode === 'grid' 
                  ? 'bg-brand-primary text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Grid layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-2 rounded-md text-sm transition-colors ${
                layoutMode === 'list' 
                  ? 'bg-brand-primary text-white' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="List layout"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Widget Settings */}
          <button className="p-2 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Last Updated Status */}
      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${state.systemStatus === 'online' ? 'bg-success' : 'bg-error'}`}></div>
          <span>{state.systemStatus === 'online' ? 'System Online' : 'System Offline'}</span>
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className={`grid gap-6 ${
        layoutMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            widgetId={metric.id}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            loading={isRefreshing}
            lastUpdated={metric.lastUpdated}
            onToggle={toggleWidget}
            isVisible={widgetVisibility[metric.id as keyof typeof widgetVisibility]}
          />
        ))}
      </div>

      {/* Enhanced Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Autonomous Trading Panel */}
        {widgetVisibility.autonomous && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary rounded-lg border border-border-primary p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center">
                <Bot className="w-5 h-5 mr-2 text-brand-primary" />
                Autonomous Trading
              </h2>
              <button
                onClick={() => toggleWidget('autonomous')}
                className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            <AutonomousTradingPanel />
          </motion.div>
        )}

        {/* AI Models Status */}
        {widgetVisibility.models && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary rounded-lg border border-border-primary p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-success" />
                AI Models Status
              </h2>
              <button
                onClick={() => toggleWidget('models')}
                className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            <ModelTrainingMonitor />
          </motion.div>
        )}

        {/* Data Pipeline Monitor */}
        {widgetVisibility.pipeline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary rounded-lg border border-border-primary p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center">
                <Zap className="w-5 h-5 mr-2 text-warning" />
                Data Pipeline
              </h2>
              <button
                onClick={() => toggleWidget('pipeline')}
                className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
            <DataPipelineMonitor />
          </motion.div>
        )}

        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-lg border border-border-primary p-6"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Trades</h2>
          <TradeFeed />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;