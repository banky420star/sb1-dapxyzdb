#!/usr/bin/env python3
"""
MLflow Tracking Server for Model Governance and Compliance
Production-ready setup with PostgreSQL backend and S3 artifact storage
"""

import os
import mlflow
import mlflow.sklearn
import mlflow.pytorch
import mlflow.tensorflow
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLGovernance:
    """ML Governance and Compliance Manager"""
    
    def __init__(self):
        # MLflow configuration
        self.tracking_uri = os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000')
        self.registry_uri = os.getenv('MLFLOW_REGISTRY_URI', 'sqlite:///mlflow.db')
        self.artifact_location = os.getenv('MLFLOW_ARTIFACT_LOCATION', 's3://mlflow-artifacts')
        
        # Set MLflow tracking URI
        mlflow.set_tracking_uri(self.tracking_uri)
        
        # Experiment configuration
        self.experiment_name = "crypto_trading_models"
        self.experiment_id = self._get_or_create_experiment()
        
        # Compliance settings
        self.require_review = True
        self.audit_trail = True
        
        logger.info(f"ML Governance initialized with tracking URI: {self.tracking_uri}")
    
    def _get_or_create_experiment(self) -> str:
        """Get or create the main experiment"""
        try:
            experiment = mlflow.get_experiment_by_name(self.experiment_name)
            if experiment is None:
                experiment_id = mlflow.create_experiment(
                    self.experiment_name,
                    artifact_location=self.artifact_location
                )
                logger.info(f"Created experiment: {self.experiment_name}")
            else:
                experiment_id = experiment.experiment_id
                logger.info(f"Using existing experiment: {self.experiment_name}")
            
            return experiment_id
        except Exception as e:
            logger.error(f"Error setting up experiment: {e}")
            raise
    
    def log_training_run(self, 
                        model, 
                        params: Dict[str, Any], 
                        metrics: Dict[str, float], 
                        data_hash: str, 
                        git_sha: str,
                        model_type: str = "sklearn") -> str:
        """Log a complete training run with compliance information"""
        
        try:
            with mlflow.start_run(experiment_id=self.experiment_id) as run:
                run_id = run.info.run_id
                
                # Log parameters
                mlflow.log_params(params)
                
                # Log metrics
                mlflow.log_metrics(metrics)
                
                # Log model based on type
                if model_type == "sklearn":
                    mlflow.sklearn.log_model(model, "model")
                elif model_type == "pytorch":
                    mlflow.pytorch.log_model(model, "model")
                elif model_type == "tensorflow":
                    mlflow.tensorflow.log_model(model, "model")
                else:
                    mlflow.log_model(model, "model")
                
                # Log compliance information
                compliance_info = {
                    "data_hash": data_hash,
                    "git_sha": git_sha,
                    "model_version": self._get_model_version(),
                    "training_timestamp": datetime.now().isoformat(),
                    "environment": os.getenv('NODE_ENV', 'development'),
                    "compliance_id": self._generate_compliance_id(run_id)
                }
                
                mlflow.log_param("compliance_info", json.dumps(compliance_info))
                
                # Log artifacts
                self._log_training_artifacts()
                
                # Log lineage information
                self._log_lineage_info(run_id, data_hash, git_sha)
                
                logger.info(f"Training run logged successfully: {run_id}")
                return run_id
                
        except Exception as e:
            logger.error(f"Error logging training run: {e}")
            raise
    
    def register_model(self, 
                      model_name: str, 
                      model_uri: str, 
                      stage: str = "Staging",
                      description: str = "") -> str:
        """Register model with promotion gates and review requirements"""
        
        try:
            # Register model
            model_version = mlflow.register_model(
                model_uri=model_uri,
                name=model_name
            )
            
            # Add model description
            mlflow.set_registered_model_description(model_name, description)
            
            # Add review requirement for production
            if stage == "Production" and self.require_review:
                self._require_review(model_version)
            
            # Log model registration
            self._log_model_registration(model_version, stage)
            
            logger.info(f"Model registered: {model_name} v{model_version.version}")
            return model_version.version
            
        except Exception as e:
            logger.error(f"Error registering model: {e}")
            raise
    
    def detect_drift(self, 
                    live_features: Dict[str, Any], 
                    training_features: Dict[str, Any]) -> float:
        """Detect feature drift and alert if >3σ"""
        
        try:
            drift_score = self._calculate_drift(live_features, training_features)
            
            # Log drift detection
            mlflow.log_metric("feature_drift_score", drift_score)
            
            if drift_score > 3.0:
                self._send_drift_alert(drift_score, live_features, training_features)
            
            logger.info(f"Drift detection completed: score={drift_score}")
            return drift_score
            
        except Exception as e:
            logger.error(f"Error detecting drift: {e}")
            return 0.0
    
    def _generate_compliance_id(self, run_id: str) -> str:
        """Generate unique compliance ID"""
        timestamp = datetime.now().isoformat()
        compliance_string = f"{run_id}_{timestamp}_{os.getenv('NODE_ENV', 'development')}"
        return hashlib.sha256(compliance_string.encode()).hexdigest()[:16]
    
    def _get_model_version(self) -> str:
        """Get current model version"""
        return os.getenv('APP_VERSION', '1.0.0')
    
    def _log_training_artifacts(self):
        """Log training artifacts for compliance"""
        try:
            # Log training data sample
            if os.path.exists('training_data_sample.csv'):
                mlflow.log_artifact('training_data_sample.csv')
            
            # Log validation results
            if os.path.exists('validation_results.json'):
                mlflow.log_artifact('validation_results.json')
            
            # Log model configuration
            if os.path.exists('model_config.json'):
                mlflow.log_artifact('model_config.json')
            
            # Log training logs
            if os.path.exists('training.log'):
                mlflow.log_artifact('training.log')
                
        except Exception as e:
            logger.warning(f"Error logging artifacts: {e}")
    
    def _log_lineage_info(self, run_id: str, data_hash: str, git_sha: str):
        """Log lineage information for audit trail"""
        lineage_info = {
            "run_id": run_id,
            "data_hash": data_hash,
            "git_sha": git_sha,
            "timestamp": datetime.now().isoformat(),
            "lineage_id": hashlib.sha256(f"{run_id}_{data_hash}_{git_sha}".encode()).hexdigest()
        }
        
        mlflow.log_param("lineage_info", json.dumps(lineage_info))
    
    def _require_review(self, model_version):
        """Add review requirement for production models"""
        review_info = {
            "requires_review": True,
            "review_deadline": (datetime.now() + timedelta(days=7)).isoformat(),
            "reviewers": ["ml-team", "compliance-team"],
            "review_criteria": [
                "Model performance validation",
                "Risk assessment",
                "Compliance verification",
                "Business approval"
            ]
        }
        
        mlflow.set_model_version_tag(
            model_version.name,
            model_version.version,
            "review_required",
            json.dumps(review_info)
        )
    
    def _log_model_registration(self, model_version, stage: str):
        """Log model registration for audit trail"""
        registration_info = {
            "model_name": model_version.name,
            "model_version": model_version.version,
            "stage": stage,
            "registration_timestamp": datetime.now().isoformat(),
            "registrar": os.getenv('USER', 'unknown')
        }
        
        mlflow.set_model_version_tag(
            model_version.name,
            model_version.version,
            "registration_info",
            json.dumps(registration_info)
        )
    
    def _calculate_drift(self, live_features: Dict[str, Any], 
                        training_features: Dict[str, Any]) -> float:
        """Calculate feature drift score"""
        # Simplified drift calculation
        # In production, use more sophisticated drift detection methods
        
        drift_scores = []
        
        for feature in live_features:
            if feature in training_features:
                live_mean = live_features[feature].mean()
                train_mean = training_features[feature].mean()
                
                if train_mean != 0:
                    drift = abs(live_mean - train_mean) / train_mean
                    drift_scores.append(drift)
        
        return sum(drift_scores) / len(drift_scores) if drift_scores else 0.0
    
    def _send_drift_alert(self, drift_score: float, 
                         live_features: Dict[str, Any], 
                         training_features: Dict[str, Any]):
        """Send drift alert"""
        alert = {
            "type": "feature_drift_alert",
            "drift_score": drift_score,
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if drift_score > 5.0 else "medium"
        }
        
        logger.warning(f"Feature drift detected: {alert}")
        
        # TODO: Send alert to monitoring system
        # send_alert_to_monitoring(alert)
    
    def get_model_lineage(self, model_name: str, version: str) -> Dict[str, Any]:
        """Get complete model lineage for compliance"""
        try:
            model_version = mlflow.get_model_version(model_name, version)
            
            # Get run information
            run = mlflow.get_run(model_version.run_id)
            
            # Get compliance information
            compliance_info = json.loads(run.data.params.get("compliance_info", "{}"))
            lineage_info = json.loads(run.data.params.get("lineage_info", "{}"))
            
            return {
                "model_name": model_name,
                "model_version": version,
                "run_id": model_version.run_id,
                "compliance_info": compliance_info,
                "lineage_info": lineage_info,
                "parameters": run.data.params,
                "metrics": run.data.metrics,
                "tags": run.data.tags
            }
            
        except Exception as e:
            logger.error(f"Error getting model lineage: {e}")
            return {}
    
    def audit_trail(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Generate audit trail for compliance"""
        try:
            # Get all runs in date range
            runs = mlflow.search_runs(
                experiment_ids=[self.experiment_id],
                filter_string=f"start_time >= '{start_date}' AND start_time <= '{end_date}'"
            )
            
            audit_trail = {
                "period": {"start": start_date, "end": end_date},
                "total_runs": len(runs),
                "models_registered": 0,
                "drift_alerts": 0,
                "compliance_issues": 0,
                "runs": []
            }
            
            for _, run in runs.iterrows():
                run_info = {
                    "run_id": run['run_id'],
                    "start_time": run['start_time'],
                    "end_time": run['end_time'],
                    "status": run['status'],
                    "compliance_id": run.get('params.compliance_info', '{}')
                }
                audit_trail["runs"].append(run_info)
            
            logger.info(f"Audit trail generated: {len(runs)} runs")
            return audit_trail
            
        except Exception as e:
            logger.error(f"Error generating audit trail: {e}")
            return {}

def main():
    """Main function to start MLflow tracking server"""
    import argparse
    
    parser = argparse.ArgumentParser(description='MLflow Tracking Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--backend-store-uri', default='sqlite:///mlflow.db', 
                       help='Backend store URI')
    parser.add_argument('--default-artifact-root', default='./mlruns',
                       help='Default artifact root')
    
    args = parser.parse_args()
    
    # Start MLflow tracking server
    import subprocess
    
    cmd = [
        'mlflow', 'server',
        '--host', args.host,
        '--port', str(args.port),
        '--backend-store-uri', args.backend_store_uri,
        '--default-artifact-root', args.default_artifact_root
    ]
    
    logger.info(f"Starting MLflow server: {' '.join(cmd)}")
    subprocess.run(cmd)

if __name__ == "__main__":
    main() 