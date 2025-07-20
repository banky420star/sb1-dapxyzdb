-- PostgreSQL + TimescaleDB Migration: Convert from SQLite to PostgreSQL
-- Version: 001_init.sql
-- Description: Initial schema creation with TimescaleDB hypertables for time-series data

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- OHLCV data table (main time-series table)
CREATE TABLE IF NOT EXISTS ohlcv_data (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, timeframe, timestamp)
);

-- Convert to hypertable and partition by time (using timestamp)
SELECT create_hypertable('ohlcv_data', 'timestamp', 
    chunk_time_interval => 86400000000, -- 1 day in microseconds 
    if_not_exists => TRUE
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(20,8) NOT NULL,
    entry_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8),
    pnl DECIMAL(20,8) DEFAULT 0,
    pnl_percent DECIMAL(10,4) DEFAULT 0,
    stop_loss DECIMAL(20,8),
    take_profit DECIMAL(20,8),
    timestamp BIGINT NOT NULL,
    close_time BIGINT,
    close_price DECIMAL(20,8),
    close_pnl DECIMAL(20,8),
    close_reason VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    mt5_ticket BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8),
    execution_price DECIMAL(20,8),
    status VARCHAR(20) DEFAULT 'pending',
    position_id VARCHAR(255),
    rejection_reason TEXT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (position_id) REFERENCES positions (id)
);

-- Trades table (time-series for performance analysis)
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(255) PRIMARY KEY,
    position_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    size DECIMAL(20,8) NOT NULL,
    entry_price DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    pnl DECIMAL(20,8) NOT NULL,
    duration BIGINT,
    timestamp BIGINT NOT NULL,
    reason VARCHAR(100),
    trade_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (position_id) REFERENCES positions (id)
);

-- Convert trades to hypertable partitioned by trade_date
SELECT create_hypertable('trades', 'trade_date', 
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Account balance table (time-series)
CREATE TABLE IF NOT EXISTS account_balance (
    id BIGSERIAL PRIMARY KEY,
    equity DECIMAL(20,8) NOT NULL,
    balance DECIMAL(20,8) NOT NULL,
    margin DECIMAL(20,8) DEFAULT 0,
    free_margin DECIMAL(20,8) NOT NULL,
    margin_level DECIMAL(10,4) DEFAULT 0,
    peak_equity DECIMAL(20,8),
    timestamp BIGINT NOT NULL,
    balance_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert account_balance to hypertable
SELECT create_hypertable('account_balance', 'balance_date',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Model states table
CREATE TABLE IF NOT EXISTS model_states (
    id BIGSERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_type, version)
);

-- Model performance table
CREATE TABLE IF NOT EXISTS model_performance (
    id BIGSERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    accuracy DECIMAL(10,6) NOT NULL,
    precision_score DECIMAL(10,6),
    recall_score DECIMAL(10,6),
    f1_score DECIMAL(10,6),
    training_time BIGINT,
    training_date TIMESTAMPTZ,
    data_size INTEGER,
    version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'offline',
    last_update TIMESTAMPTZ DEFAULT NOW(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk violations table
CREATE TABLE IF NOT EXISTS risk_violations (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    value DECIMAL(20,8),
    limit_value DECIMAL(20,8),
    symbol VARCHAR(20),
    position_id VARCHAR(255),
    timestamp BIGINT NOT NULL,
    violation_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert risk_violations to hypertable
SELECT create_hypertable('risk_violations', 'violation_date',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Risk configuration table
CREATE TABLE IF NOT EXISTS risk_configuration (
    id BIGSERIAL PRIMARY KEY,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics table (time-series)
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    metrics_data JSONB NOT NULL,
    counters_data JSONB,
    gauges_data JSONB,
    metric_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert metrics to hypertable
SELECT create_hypertable('metrics', 'metric_date',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- News events table
CREATE TABLE IF NOT EXISTS news_events (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    impact VARCHAR(20),
    currency VARCHAR(10),
    source VARCHAR(50),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Economic events table
CREATE TABLE IF NOT EXISTS economic_events (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    currency VARCHAR(10),
    impact VARCHAR(20),
    actual VARCHAR(50),
    forecast VARCHAR(50),
    previous VARCHAR(50),
    event_time TIMESTAMPTZ,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    timestamp BIGINT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Signals table
CREATE TABLE IF NOT EXISTS trading_signals (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    indicators JSONB,
    timestamp BIGINT NOT NULL,
    signal_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert trading_signals to hypertable
SELECT create_hypertable('trading_signals', 'signal_date',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Price Data table (high-frequency time-series)
CREATE TABLE IF NOT EXISTS price_data (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    bid DECIMAL(20,8) NOT NULL,
    ask DECIMAL(20,8) NOT NULL,
    spread DECIMAL(20,8) NOT NULL,
    timestamp BIGINT NOT NULL,
    price_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert price_data to hypertable (high frequency - hourly chunks)
SELECT create_hypertable('price_data', 'price_date',
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Market Analysis table
CREATE TABLE IF NOT EXISTS market_analysis (
    id BIGSERIAL PRIMARY KEY,
    overall_trend VARCHAR(20) NOT NULL,
    volatility DECIMAL(10,6) NOT NULL,
    opportunities JSONB,
    risks JSONB,
    timestamp BIGINT NOT NULL,
    analysis_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert market_analysis to hypertable
SELECT create_hypertable('market_analysis', 'analysis_date',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Features table (new for ML feature storage - time-series)
CREATE TABLE IF NOT EXISTS features (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    feature_set JSONB NOT NULL, -- Store all features as JSON
    labels JSONB, -- Store labels for supervised learning
    timestamp BIGINT NOT NULL,
    feature_date DATE GENERATED ALWAYS AS (to_timestamp(timestamp/1000)::date) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert features to hypertable
SELECT create_hypertable('features', 'feature_date',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Training progress table (for MLflow-style tracking)
CREATE TABLE IF NOT EXISTS training_progress (
    id BIGSERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    run_id VARCHAR(255) NOT NULL,
    epoch INTEGER,
    metrics JSONB,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comprehensive indexes for performance
-- OHLCV indexes
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timeframe ON ohlcv_data(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp ON ohlcv_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_timestamp ON ohlcv_data(symbol, timestamp);

-- Position indexes
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_timestamp ON positions(timestamp);
CREATE INDEX IF NOT EXISTS idx_positions_symbol_status ON positions(symbol, status);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_position_id ON orders(position_id);

-- Trade indexes
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_date ON trades(symbol, trade_date);

-- Account balance indexes
CREATE INDEX IF NOT EXISTS idx_balance_timestamp ON account_balance(timestamp);
CREATE INDEX IF NOT EXISTS idx_balance_date ON account_balance(balance_date);

-- Model performance indexes  
CREATE INDEX IF NOT EXISTS idx_model_perf_type ON model_performance(model_type);
CREATE INDEX IF NOT EXISTS idx_model_perf_status ON model_performance(status);

-- Risk violation indexes
CREATE INDEX IF NOT EXISTS idx_risk_violations_type ON risk_violations(type);
CREATE INDEX IF NOT EXISTS idx_risk_violations_timestamp ON risk_violations(timestamp);
CREATE INDEX IF NOT EXISTS idx_risk_violations_date ON risk_violations(violation_date);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(metric_date);

-- News events indexes
CREATE INDEX IF NOT EXISTS idx_news_timestamp ON news_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_news_currency ON news_events(currency);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Trading Signals indexes
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol ON trading_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_signals_timestamp ON trading_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_signals_date ON trading_signals(signal_date);

-- Price Data indexes (optimized for high-frequency queries)
CREATE INDEX IF NOT EXISTS idx_price_data_symbol ON price_data(symbol);
CREATE INDEX IF NOT EXISTS idx_price_data_timestamp ON price_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_data_symbol_timestamp ON price_data(symbol, timestamp);

-- Market Analysis indexes
CREATE INDEX IF NOT EXISTS idx_market_analysis_timestamp ON market_analysis(timestamp);
CREATE INDEX IF NOT EXISTS idx_market_analysis_date ON market_analysis(analysis_date);

-- Features indexes (for ML pipeline)
CREATE INDEX IF NOT EXISTS idx_features_symbol_timeframe ON features(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_features_timestamp ON features(timestamp);
CREATE INDEX IF NOT EXISTS idx_features_date ON features(feature_date);

-- Training progress indexes
CREATE INDEX IF NOT EXISTS idx_training_progress_model_run ON training_progress(model_type, run_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_timestamp ON training_progress(timestamp);

-- Create update trigger for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set up automatic data retention policies (TimescaleDB compression + retention)
-- Compress data older than 7 days for high-frequency tables
SELECT add_compression_policy('price_data', INTERVAL '7 days');
SELECT add_compression_policy('metrics', INTERVAL '1 day');

-- Set retention policies (remove data older than specified periods)
SELECT add_retention_policy('price_data', INTERVAL '90 days');
SELECT add_retention_policy('metrics', INTERVAL '30 days');
SELECT add_retention_policy('ohlcv_data', INTERVAL '2 years');
SELECT add_retention_policy('trading_signals', INTERVAL '6 months');

-- Create database user for the application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trading_app') THEN
        CREATE ROLE trading_app LOGIN PASSWORD 'secure_trading_pass_2024!';
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO trading_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trading_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trading_app;

-- Alter default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trading_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO trading_app;

-- Create materialized views for common queries (performance optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_trade_summary AS
SELECT 
    trade_date,
    symbol,
    COUNT(*) as trade_count,
    SUM(pnl) as total_pnl,
    AVG(pnl) as avg_pnl,
    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::float / COUNT(*) as win_rate
FROM trades 
GROUP BY trade_date, symbol;

CREATE UNIQUE INDEX ON daily_trade_summary (trade_date, symbol);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_daily_trade_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_trade_summary;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
SELECT 'PostgreSQL + TimescaleDB migration completed successfully' as status; 