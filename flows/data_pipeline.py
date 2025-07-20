"""
AI Trading System Data Pipeline
Prefect Flow for orchestrating data processing and ML workflows
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
import requests
import pandas as pd
import numpy as np
from pathlib import Path

import prefect
from prefect import flow, task, get_run_logger
from prefect.task_runners import ConcurrentTaskRunner
from prefect.blocks.system import Secret
from prefect.artifacts import create_markdown_artifact
from prefect.deployments import Deployment
from prefect.server.schemas.schedules import IntervalSchedule

# Database and ML imports
import psycopg2
from sqlalchemy import create_engine
import mlflow
import mlflow.sklearn
import mlflow.tensorflow

# Configuration
DATABASE_URL = "postgresql://trading_app:secure_trading_pass_2024!@localhost:5432/trading"
MLFLOW_TRACKING_URI = "http://localhost:5000"
SLACK_WEBHOOK_URL = ""  # Set in environment or Prefect blocks

# Symbols and timeframes to process
SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"]
TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h"]
LOOKBACK_DAYS = 30

@task(name="fetch_raw_data", retries=3, retry_delay_seconds=60)
async def fetch_raw_data(symbol: str, timeframe: str, days: int = 7) -> Dict[str, Any]:
    """
    Fetch raw OHLCV data from Alpha Vantage API with rate limiting
    """
    logger = get_run_logger()
    logger.info(f"Fetching data for {symbol} {timeframe}")
    
    try:
        # Check rate limits first
        rate_gate_response = requests.post(
            "http://localhost:3002/consume/ALPHA_VANTAGE",
            json={"tokens": 1},
            timeout=10
        )
        
        if rate_gate_response.status_code == 429:
            logger.warning(f"Rate limit exceeded for {symbol}, skipping...")
            return {"symbol": symbol, "timeframe": timeframe, "data": [], "skipped": True}
        
        rate_info = rate_gate_response.json()
        logger.info(f"Rate limit status: {rate_info.get('usage', 0):.2%} used")
        
        # Simulate API call (replace with actual Alpha Vantage integration)
        await asyncio.sleep(1)  # Simulate network delay
        
        # Generate mock data for now
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        data = []
        current_price = 1.1000 if "EUR" in symbol else 1.0000
        
        for i in range(days * 24):  # Hourly data
            timestamp = start_date + timedelta(hours=i)
            price_change = np.random.normal(0, 0.001)
            current_price += price_change
            
            ohlc = {
                "timestamp": int(timestamp.timestamp() * 1000),
                "open": current_price,
                "high": current_price + abs(np.random.normal(0, 0.0005)),
                "low": current_price - abs(np.random.normal(0, 0.0005)),
                "close": current_price + np.random.normal(0, 0.0002),
                "volume": np.random.uniform(1000, 10000)
            }
            data.append(ohlc)
        
        logger.info(f"Fetched {len(data)} data points for {symbol} {timeframe}")
        return {"symbol": symbol, "timeframe": timeframe, "data": data, "skipped": False}
        
    except Exception as e:
        logger.error(f"Failed to fetch data for {symbol}: {str(e)}")
        raise

@task(name="engineer_features", retries=2)
async def engineer_features(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Engineer trading features from raw OHLCV data
    """
    logger = get_run_logger()
    
    if raw_data.get("skipped", False):
        return raw_data
    
    symbol = raw_data["symbol"]
    timeframe = raw_data["timeframe"]
    data = raw_data["data"]
    
    logger.info(f"Engineering features for {symbol} {timeframe}")
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('timestamp', inplace=True)
        
        # Technical indicators
        features = {}
        
        # Price-based features
        features['returns'] = df['close'].pct_change()
        features['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        features['volatility'] = features['returns'].rolling(20).std()
        
        # Moving averages
        for period in [5, 10, 20, 50]:
            features[f'sma_{period}'] = df['close'].rolling(period).mean()
            features[f'ema_{period}'] = df['close'].ewm(span=period).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        features['rsi'] = 100 - (100 / (1 + rs))
        
        # MACD
        ema_12 = df['close'].ewm(span=12).mean()
        ema_26 = df['close'].ewm(span=26).mean()
        features['macd'] = ema_12 - ema_26
        features['macd_signal'] = features['macd'].ewm(span=9).mean()
        features['macd_histogram'] = features['macd'] - features['macd_signal']
        
        # Bollinger Bands
        bb_period = 20
        bb_std = 2
        sma = df['close'].rolling(bb_period).mean()
        std = df['close'].rolling(bb_period).std()
        features['bb_upper'] = sma + (std * bb_std)
        features['bb_lower'] = sma - (std * bb_std)
        features['bb_position'] = (df['close'] - features['bb_lower']) / (features['bb_upper'] - features['bb_lower'])
        
        # Volume features
        features['volume_sma'] = df['volume'].rolling(20).mean()
        features['volume_ratio'] = df['volume'] / features['volume_sma']
        
        # Price patterns
        features['high_low_ratio'] = df['high'] / df['low']
        features['close_open_ratio'] = df['close'] / df['open']
        
        # Combine all features
        feature_df = pd.DataFrame(features)
        feature_df = feature_df.dropna()
        
        # Create labels for supervised learning (next period return)
        labels = feature_df['returns'].shift(-1)
        labels_binary = (labels > 0).astype(int)  # 1 for up, 0 for down
        
        # Convert to records for storage
        feature_records = []
        for i, (timestamp, row) in enumerate(feature_df.iterrows()):
            if i < len(labels):
                record = {
                    "timestamp": int(timestamp.timestamp() * 1000),
                    "features": row.to_dict(),
                    "label_return": float(labels.iloc[i]) if not pd.isna(labels.iloc[i]) else None,
                    "label_direction": int(labels_binary.iloc[i]) if not pd.isna(labels_binary.iloc[i]) else None
                }
                feature_records.append(record)
        
        logger.info(f"Engineered {len(feature_records)} feature vectors for {symbol} {timeframe}")
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "features": feature_records,
            "feature_count": len(feature_df.columns),
            "record_count": len(feature_records)
        }
        
    except Exception as e:
        logger.error(f"Feature engineering failed for {symbol}: {str(e)}")
        raise

@task(name="store_features", retries=3)
async def store_features(feature_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Store engineered features in PostgreSQL TimescaleDB
    """
    logger = get_run_logger()
    
    if feature_data.get("skipped", False):
        return {"stored": False, "reason": "skipped"}
    
    symbol = feature_data["symbol"]
    timeframe = feature_data["timeframe"]
    features = feature_data["features"]
    
    logger.info(f"Storing {len(features)} feature records for {symbol} {timeframe}")
    
    try:
        # Connect to database
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Prepare batch insert
            insert_query = """
                INSERT INTO features (symbol, timeframe, feature_set, labels, timestamp)
                VALUES (%(symbol)s, %(timeframe)s, %(features)s, %(labels)s, %(timestamp)s)
                ON CONFLICT (symbol, timeframe, timestamp) 
                DO UPDATE SET 
                    feature_set = EXCLUDED.feature_set,
                    labels = EXCLUDED.labels
            """
            
            # Prepare data for insertion
            insert_data = []
            for record in features:
                labels = {}
                if record.get("label_return") is not None:
                    labels["return"] = record["label_return"]
                if record.get("label_direction") is not None:
                    labels["direction"] = record["label_direction"]
                
                insert_data.append({
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "features": json.dumps(record["features"]),
                    "labels": json.dumps(labels) if labels else None,
                    "timestamp": record["timestamp"]
                })
            
            # Execute batch insert
            result = conn.execute(insert_query, insert_data)
            logger.info(f"Stored {len(insert_data)} feature records")
            
            return {
                "stored": True,
                "symbol": symbol,
                "timeframe": timeframe,
                "records_stored": len(insert_data)
            }
            
    except Exception as e:
        logger.error(f"Failed to store features for {symbol}: {str(e)}")
        raise

@task(name="trigger_model_training", retries=2)
async def trigger_model_training(stored_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Trigger model training if sufficient new data is available
    """
    logger = get_run_logger()
    
    # Count total records stored
    total_stored = sum(
        result.get("records_stored", 0) 
        for result in stored_results 
        if result.get("stored", False)
    )
    
    logger.info(f"Total feature records stored: {total_stored}")
    
    if total_stored < 100:  # Threshold for triggering training
        logger.info("Insufficient new data for training")
        return {"training_triggered": False, "reason": "insufficient_data"}
    
    try:
        # Trigger training via API call to trading system
        training_response = requests.post(
            "http://localhost:8000/api/models/train",
            json={"trigger": "pipeline", "records_added": total_stored},
            timeout=30
        )
        
        if training_response.status_code == 200:
            logger.info("Model training triggered successfully")
            return {"training_triggered": True, "records_added": total_stored}
        else:
            logger.warning(f"Training trigger failed: {training_response.status_code}")
            return {"training_triggered": False, "reason": "api_error"}
            
    except Exception as e:
        logger.error(f"Failed to trigger training: {str(e)}")
        return {"training_triggered": False, "reason": str(e)}

@task(name="send_pipeline_report", retries=2)
async def send_pipeline_report(
    fetch_results: List[Dict[str, Any]], 
    store_results: List[Dict[str, Any]],
    training_result: Dict[str, Any]
) -> bool:
    """
    Send pipeline execution report via Slack
    """
    logger = get_run_logger()
    
    try:
        # Calculate statistics
        total_fetched = sum(
            len(result.get("data", [])) 
            for result in fetch_results 
            if not result.get("skipped", False)
        )
        
        total_stored = sum(
            result.get("records_stored", 0) 
            for result in store_results 
            if result.get("stored", False)
        )
        
        skipped_count = sum(
            1 for result in fetch_results 
            if result.get("skipped", False)
        )
        
        # Create report
        report = {
            "pipeline_run": datetime.now().isoformat(),
            "data_fetched": total_fetched,
            "features_stored": total_stored,
            "skipped_symbols": skipped_count,
            "training_triggered": training_result.get("training_triggered", False),
            "status": "success"
        }
        
        # Create markdown artifact for Prefect UI
        markdown_report = f"""
# Data Pipeline Report

**Run Time:** {report['pipeline_run']}
**Status:** ✅ {report['status'].upper()}

## Data Processing
- **Raw data points fetched:** {report['data_fetched']:,}
- **Feature vectors stored:** {report['features_stored']:,}
- **Symbols skipped (rate limit):** {report['skipped_symbols']}

## Model Training
- **Training triggered:** {'✅ Yes' if report['training_triggered'] else '❌ No'}

## Symbol Processing Details
"""
        
        for result in fetch_results:
            symbol = result.get("symbol", "Unknown")
            timeframe = result.get("timeframe", "Unknown")
            data_count = len(result.get("data", []))
            skipped = result.get("skipped", False)
            
            status = "⏭️ Skipped" if skipped else f"✅ {data_count} points"
            markdown_report += f"- **{symbol} {timeframe}:** {status}\n"
        
        # Create Prefect artifact
        await create_markdown_artifact(
            key="pipeline-report",
            markdown=markdown_report,
            description="Data pipeline execution report"
        )
        
        # Send Slack notification if webhook is configured
        if SLACK_WEBHOOK_URL:
            slack_message = {
                "text": "AI Trading System - Data Pipeline Report",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "🤖 AI Trading System Pipeline"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Status:* ✅ Success"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Data Points:* {total_fetched:,}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Features Stored:* {total_stored:,}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Training:* {'Triggered' if training_result.get('training_triggered') else 'Not triggered'}"
                            }
                        ]
                    }
                ]
            }
            
            slack_response = requests.post(SLACK_WEBHOOK_URL, json=slack_message, timeout=10)
            if slack_response.status_code == 200:
                logger.info("Slack notification sent successfully")
            else:
                logger.warning(f"Slack notification failed: {slack_response.status_code}")
        
        logger.info("Pipeline report generated successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send pipeline report: {str(e)}")
        return False

@task(name="handle_pipeline_failure")
async def handle_pipeline_failure(error_info: Dict[str, Any]) -> None:
    """
    Handle pipeline failures with notifications and recovery
    """
    logger = get_run_logger()
    logger.error(f"Pipeline failure detected: {error_info}")
    
    try:
        if SLACK_WEBHOOK_URL:
            slack_message = {
                "text": "🚨 AI Trading System Pipeline Failure",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "🚨 Pipeline Failure Alert"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Error:* {error_info.get('error', 'Unknown error')}\n*Time:* {datetime.now().isoformat()}"
                        }
                    }
                ]
            }
            
            requests.post(SLACK_WEBHOOK_URL, json=slack_message, timeout=10)
            
    except Exception as e:
        logger.error(f"Failed to send failure notification: {str(e)}")

@flow(
    name="AI Trading Data Pipeline",
    description="Orchestrates data fetching, feature engineering, and storage for ML models",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
async def data_pipeline_flow() -> Dict[str, Any]:
    """
    Main data pipeline flow that orchestrates all data processing tasks
    """
    logger = get_run_logger()
    logger.info("🚀 Starting AI Trading Data Pipeline")
    
    try:
        # Fetch raw data for all symbols and timeframes concurrently
        fetch_tasks = []
        for symbol in SYMBOLS:
            for timeframe in TIMEFRAMES:
                task = fetch_raw_data.submit(symbol, timeframe, LOOKBACK_DAYS)
                fetch_tasks.append(task)
        
        # Wait for all fetch tasks to complete
        fetch_results = await asyncio.gather(*[task.result() for task in fetch_tasks])
        
        # Engineer features for each dataset concurrently
        feature_tasks = []
        for fetch_result in fetch_results:
            task = engineer_features.submit(fetch_result)
            feature_tasks.append(task)
        
        # Wait for feature engineering to complete
        feature_results = await asyncio.gather(*[task.result() for task in feature_tasks])
        
        # Store features in database concurrently
        store_tasks = []
        for feature_result in feature_results:
            task = store_features.submit(feature_result)
            store_tasks.append(task)
        
        # Wait for storage to complete
        store_results = await asyncio.gather(*[task.result() for task in store_tasks])
        
        # Trigger model training if needed
        training_result = await trigger_model_training(store_results)
        
        # Send pipeline report
        await send_pipeline_report(fetch_results, store_results, training_result)
        
        logger.info("✅ Data pipeline completed successfully")
        
        return {
            "status": "success",
            "fetch_results": len(fetch_results),
            "feature_results": len(feature_results),
            "store_results": len(store_results),
            "training_triggered": training_result.get("training_triggered", False)
        }
        
    except Exception as e:
        logger.error(f"❌ Pipeline failed: {str(e)}")
        await handle_pipeline_failure({"error": str(e), "timestamp": datetime.now().isoformat()})
        raise

# Create deployment for scheduled execution
if __name__ == "__main__":
    # Create deployment with hourly schedule
    deployment = Deployment.build_from_flow(
        flow=data_pipeline_flow,
        name="ai-trading-data-pipeline",
        schedule=IntervalSchedule(interval=timedelta(hours=1)),
        work_queue_name="default",
        tags=["ai-trading", "data-pipeline", "ml"],
        description="Hourly data pipeline for AI trading system",
        version="1.0.0"
    )
    
    # Deploy the flow
    deployment.apply()
    print("✅ Data pipeline deployed successfully!")
    print("Run with: prefect deployment run 'AI Trading Data Pipeline/ai-trading-data-pipeline'") 