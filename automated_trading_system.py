#!/usr/bin/env python3
"""
Automated Trading System - Complete End-to-End Automation
Handles data ingestion, training, model promotion, and MT5 deployment
"""

import argparse
import logging
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('automated_trading_system.log')
    ]
)
LOGGER = logging.getLogger(__name__)

class AutomatedTradingSystem:
    """Complete automated trading system orchestrator."""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.model_service_dir = self.project_root / "model-service"
        self.data_dir = self.project_root / "data"
        self.models_dir = self.model_service_dir / "models"
        self.mt5_files_dir = Path.home() / "Desktop" / "MT5_Files"
        
        # Ensure directories exist
        self._setup_directories()
    
    def _setup_directories(self):
        """Create necessary directories."""
        directories = [
            self.data_dir / "mt5" / "raw",
            self.data_dir / "mt5" / "processed", 
            self.data_dir / "mt5" / "archive",
            self.data_dir / "bybit" / "raw",
            self.models_dir,
            self.mt5_files_dir
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            LOGGER.info(f"Ensured directory exists: {directory}")
    
    def run_data_ingestion(self, once: bool = False) -> bool:
        """Run data ingestion from MT5 and Bybit."""
        LOGGER.info("🔄 Starting data ingestion...")
        
        try:

        
            # Use the root virtual environment Python if available
            venv_python = self.project_root / ".venv312" / "bin" / "python"
            if not venv_python.exists():
                venv_python = sys.executable  # Fallback to system Python
            
            cmd = [
                str(venv_python), str(self.model_service_dir / "data_pipeline" / "ingest.py")
            ]
            
            if once:
                cmd.append("--once")
                LOGGER.info("Running single ingestion pass...")
            else:
                LOGGER.info("Starting continuous data ingestion...")
            
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300 if once else None
            )
            
            if result.returncode == 0:
                LOGGER.info("✅ Data ingestion completed successfully")
                if result.stdout:
                    LOGGER.info(f"Output: {result.stdout}")
                return True
            else:
                LOGGER.error(f"❌ Data ingestion failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            LOGGER.error("❌ Data ingestion timed out")
            return False
        except Exception as e:
            LOGGER.error(f"❌ Data ingestion error: {e}")
            return False
    
    def run_full_training_pipeline(self, max_rows: int = 800) -> Optional[str]:
        """Run the complete training pipeline."""
        LOGGER.info("🧠 Starting full training pipeline...")
        
        try:
            # Check if we have data to train on
            processed_data = self.data_dir / "mt5" / "processed" / "XAUUSD" / "H1"
            if not processed_data.exists() or not any(processed_data.glob("*.csv")):
                LOGGER.warning("⚠️  No processed data found, running data ingestion first...")
                if not self.run_data_ingestion(once=True):
                    LOGGER.error("❌ Failed to ingest data for training")
                    return None
            
            # Find the latest processed data file
            csv_files = list(processed_data.glob("*.csv"))
            if not csv_files:
                LOGGER.error("❌ No CSV files found for training")
                return None
            
            latest_csv = max(csv_files, key=lambda f: f.stat().st_mtime)
            LOGGER.info(f"📊 Using data file: {latest_csv}")
            
            # Use the root virtual environment Python if available
            venv_python = self.project_root / ".venv312" / "bin" / "python"
            if not venv_python.exists():
                venv_python = sys.executable  # Fallback to system Python
            
            # Run training pipeline
            cmd = [
                str(venv_python), "train_full_pipeline.py",
                "--csv", str(latest_csv),
                "--output", str(self.models_dir),
                "--window", "30",
                "--max-rows", str(max_rows),
            ]
            
            result = subprocess.run(
                cmd,
                cwd=self.model_service_dir,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                LOGGER.info("✅ Training pipeline completed successfully")
                
                # Find the latest training run
                run_dirs = [d for d in self.models_dir.iterdir() if d.is_dir() and d.name != "current"]
                if run_dirs:
                    latest_run = max(run_dirs, key=lambda d: d.stat().st_mtime)
                    LOGGER.info(f"🎯 Latest training run: {latest_run.name}")
                    return latest_run.name
                else:
                    LOGGER.warning("⚠️  No training runs found after successful training")
                    return None
            else:
                LOGGER.error(f"❌ Training pipeline failed: {result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            LOGGER.error("❌ Training pipeline timed out")
            return None
        except Exception as e:
            LOGGER.error(f"❌ Training pipeline error: {e}")
            return None
    
    def promote_model_to_mt5(self, run_id: str) -> bool:
        """Promote the specified model run to MT5."""
        LOGGER.info(f"🎯 Promoting model {run_id} to MT5...")
        
        try:

        
            # Use the root virtual environment Python if available
            venv_python = self.project_root / ".venv312" / "bin" / "python"
            if not venv_python.exists():
                venv_python = sys.executable  # Fallback to system Python
            
            cmd = [
                str(venv_python), "promote_model.py",
                run_id,
                "--mt5-files", str(self.mt5_files_dir)
            ]
            
            result = subprocess.run(
                cmd,
                cwd=self.model_service_dir,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                LOGGER.info(f"✅ Model {run_id} promoted successfully to MT5")
                return True
            else:
                LOGGER.error(f"❌ Failed to promote model {run_id}: {result.stderr}")
                return False
                
        except Exception as e:
            LOGGER.error(f"❌ Model promotion error: {e}")
            return False
    
    def update_mt5_scripts(self) -> bool:
        """Update MT5 scripts with the aligned version."""
        LOGGER.info("📝 Updating MT5 scripts with aligned version...")
        
        try:
            aligned_script = self.model_service_dir / "mql5" / "ONNX_DQN_Trading_Script_Aligned.mq5"
            if not aligned_script.exists():
                LOGGER.error(f"❌ Aligned script not found: {aligned_script}")
                return False
            
            # Copy aligned script to MT5 Files directory
            import shutil
            mt5_script_dest = self.mt5_files_dir / "ONNX_DQN_Trading_Script_Aligned.mq5"
            shutil.copy2(aligned_script, mt5_script_dest)
            
            LOGGER.info(f"✅ Aligned script copied to: {mt5_script_dest}")
            return True
            
        except Exception as e:
            LOGGER.error(f"❌ Failed to update MT5 scripts: {e}")
            return False
    
    def run_system_status_check(self) -> bool:
        """Run system status check."""
        LOGGER.info("🔍 Running system status check...")
        
        try:
            # Use the root virtual environment Python if available
            venv_python = self.project_root / ".venv312" / "bin" / "python"
            if not venv_python.exists():
                venv_python = sys.executable  # Fallback to system Python
            
            cmd = [str(venv_python), "system-status.py"]
            
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            # Status check returns 0 for healthy, 2 for unhealthy, but we want to show the status either way
            if result.returncode in [0, 2]:
                LOGGER.info("✅ System status check completed")
                if result.stdout:
                    LOGGER.info(f"Status: {result.stdout}")
                return True
            else:
                LOGGER.error(f"❌ System status check failed: {result.stderr}")
                return False
                
        except Exception as e:
            LOGGER.error(f"❌ System status check error: {e}")
            return False
    
    def run_complete_cycle(self, max_rows: int = 800) -> bool:
        """Run a complete automation cycle: data → training → promotion → deployment."""
        LOGGER.info("🚀 Starting complete automation cycle...")
        
        try:
            # Step 1: Data ingestion
            LOGGER.info("Step 1/4: Data ingestion...")
            if not self.run_data_ingestion(once=True):
                LOGGER.error("❌ Data ingestion failed, aborting cycle")
                return False
            
            # Step 2: Training
            LOGGER.info("Step 2/4: Model training...")
            run_id = self.run_full_training_pipeline(max_rows=max_rows)
            if not run_id:
                LOGGER.error("❌ Training failed, aborting cycle")
                return False
            
            # Step 3: Model promotion
            LOGGER.info("Step 3/4: Model promotion...")
            if not self.promote_model_to_mt5(run_id):
                LOGGER.error("❌ Model promotion failed, aborting cycle")
                return False
            
            # Step 4: Update MT5 scripts
            LOGGER.info("Step 4/4: MT5 script update...")
            if not self.update_mt5_scripts():
                LOGGER.error("❌ MT5 script update failed")
                return False
            
            LOGGER.info("🎉 Complete automation cycle finished successfully!")
            return True
            
        except Exception as e:
            LOGGER.error(f"❌ Complete cycle error: {e}")
            return False
    
    def start_continuous_automation(self, training_interval_hours: int = 24):
        """Start continuous automation with periodic retraining."""
        LOGGER.info(f"🔄 Starting continuous automation (retrain every {training_interval_hours}h)...")
        
        last_training = time.time()
        
        try:
            while True:
                current_time = time.time()
                
                # Check if it's time for retraining
                if current_time - last_training >= training_interval_hours * 3600:
                    LOGGER.info("⏰ Time for periodic retraining...")
                    
                    if self.run_complete_cycle():
                        last_training = current_time
                        LOGGER.info(f"✅ Retraining completed, next retrain in {training_interval_hours}h")
                    else:
                        LOGGER.error("❌ Retraining failed, will retry in 1 hour")
                        last_training = current_time - (training_interval_hours - 1) * 3600
                else:
                    # Just run data ingestion
                    LOGGER.info("📊 Running data ingestion...")
                    self.run_data_ingestion(once=True)
                
                # Wait 5 minutes before next check
                time.sleep(300)
                
        except KeyboardInterrupt:
            LOGGER.info("🛑 Continuous automation stopped by user")
        except Exception as e:
            LOGGER.error(f"❌ Continuous automation error: {e}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Automated Trading System")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(),
                       help="Project root directory")
    parser.add_argument("--mode", choices=["cycle", "continuous", "ingest", "train", "promote", "status"],
                       default="cycle", help="Operation mode")
    parser.add_argument("--run-id", type=str, help="Run ID for promotion mode")
    parser.add_argument("--training-interval", type=int, default=24,
                       help="Training interval in hours for continuous mode")
    parser.add_argument("--max-rows", type=int, default=256,
                       help="Limit dataset rows for faster cycles")
    
    args = parser.parse_args()
    
    system = AutomatedTradingSystem(args.project_root)
    
    if args.mode == "cycle":
        success = system.run_complete_cycle(max_rows=args.max_rows)
        sys.exit(0 if success else 1)
    
    elif args.mode == "continuous":
        system.start_continuous_automation(args.training_interval)
    
    elif args.mode == "ingest":
        success = system.run_data_ingestion(once=True)
        sys.exit(0 if success else 1)
    
    elif args.mode == "train":
        run_id = system.run_full_training_pipeline(max_rows=args.max_rows)
        if run_id:
            print(f"Training completed: {run_id}")
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif args.mode == "promote":
        if not args.run_id:
            LOGGER.error("❌ Run ID required for promotion mode")
            sys.exit(1)
        success = system.promote_model_to_mt5(args.run_id)
        sys.exit(0 if success else 1)
    
    elif args.mode == "status":
        success = system.run_system_status_check()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
