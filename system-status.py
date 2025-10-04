#!/usr/bin/env python3
"""System status checker for the autonomous trading system."""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional


def check_file_exists(file_path: Path) -> bool:
    """Check if a file exists and is readable."""
    return file_path.exists() and file_path.is_file()


def check_directory_exists(dir_path: Path) -> bool:
    """Check if a directory exists and is readable."""
    return dir_path.exists() and dir_path.is_dir()


def get_latest_training_run(models_dir: Path) -> Optional[Path]:
    """Get the latest training run directory."""
    if not models_dir.exists():
        return None
    
    training_runs = [d for d in models_dir.iterdir() 
                    if d.is_dir() and re.match(r'^\d{8}_\d{6}$', d.name)]
    
    if not training_runs:
        return None
    
    return sorted(training_runs)[-1]


def check_model_artifacts(training_run_dir: Path) -> Dict[str, bool]:
    """Check if required model artifacts exist."""
    artifacts = {
        'metadata.json': check_file_exists(training_run_dir / 'metadata.json'),
        'scaler_stats.json': check_file_exists(training_run_dir / 'scaler_stats.json'),
        'model_selection.json': check_file_exists(training_run_dir / 'model_selection.json'),
        'random_forest.pkl': check_file_exists(training_run_dir / 'random_forest.pkl'),
        'lstm_classifier.pth': check_file_exists(training_run_dir / 'lstm_classifier.pth'),
        'ddqn_classifier.pth': check_file_exists(training_run_dir / 'ddqn_classifier.pth'),
        'dueling_dqn.pth': check_file_exists(training_run_dir / 'dueling_dqn.pth'),
    }
    
    # Check for regime evaluation files
    for model_type in ['random_forest', 'lstm', 'ddqn_supervised', 'dueling_dqn_rl']:
        regime_file = f"{model_type}_regimes.json"
        artifacts[regime_file] = check_file_exists(training_run_dir / regime_file)
    
    return artifacts


def check_data_pipeline(data_dir: Path) -> Dict[str, any]:
    """Check data pipeline status."""
    status = {
        'processed_data_exists': False,
        'data_files_count': 0,
        'latest_data_file': None,
        'mt5_exports_exists': False,
        'bybit_data_exists': False
    }
    
    processed_dir = data_dir / 'mt5' / 'processed'
    if processed_dir.exists():
        status['processed_data_exists'] = True
        
        # Count data files
        data_files = list(processed_dir.rglob('*.csv'))
        status['data_files_count'] = len(data_files)
        
        if data_files:
            # Get latest file
            latest_file = max(data_files, key=lambda x: x.stat().st_mtime)
            status['latest_data_file'] = {
                'path': str(latest_file),
                'modified': datetime.fromtimestamp(latest_file.stat().st_mtime).isoformat(),
                'size_mb': latest_file.stat().st_size / (1024 * 1024)
            }
    
    # Check MT5 exports
    mt5_dir = data_dir / 'mt5' / 'raw'
    status['mt5_exports_exists'] = mt5_dir.exists()
    
    # Check Bybit data
    bybit_dir = data_dir / 'bybit' / 'raw'
    status['bybit_data_exists'] = bybit_dir.exists()
    
    return status


def check_onnx_exports(models_dir: Path) -> Dict[str, any]:
    """Check ONNX export status."""
    status = {
        'onnx_available': False,
        'onnx_models': [],
        'deployment_package': False
    }
    
    latest_run = get_latest_training_run(models_dir)
    if latest_run:
        onnx_dir = latest_run / 'onnx'
        if onnx_dir.exists():
            status['onnx_available'] = True
            status['onnx_models'] = [f.name for f in onnx_dir.glob('*.onnx')]
            
            # Check for deployment package
            deployment_dir = models_dir / 'mt5_deployment'
            status['deployment_package'] = deployment_dir.exists()
    
    return status


def check_system_health() -> Dict[str, any]:
    """Check overall system health."""
    project_root = Path(__file__).parent
    models_dir = project_root / 'model-service' / 'models'
    # Use the data directory at repo root
    data_dir = project_root / 'data'
    
    health = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'project_root': str(project_root),
        'directories': {
            'models_dir_exists': check_directory_exists(models_dir),
            'data_dir_exists': check_directory_exists(data_dir),
        },
        'training': {
            'latest_run': None,
            'artifacts': {},
            'health_score': 0
        },
        'data_pipeline': {},
        'onnx_exports': {},
        'overall_health': 'unknown'
    }
    
    # Check training status
    latest_run = get_latest_training_run(models_dir)
    if latest_run:
        health['training']['latest_run'] = str(latest_run)
        health['training']['artifacts'] = check_model_artifacts(latest_run)
        
        # Calculate health score
        required_artifacts = ['metadata.json', 'scaler_stats.json', 'model_selection.json']
        optional_artifacts = ['random_forest.pkl', 'lstm_classifier.pth', 'ddqn_classifier.pth', 'dueling_dqn.pth']
        
        required_score = sum(1 for artifact in required_artifacts 
                           if health['training']['artifacts'].get(artifact, False))
        optional_score = sum(1 for artifact in optional_artifacts 
                           if health['training']['artifacts'].get(artifact, False))
        
        health['training']['health_score'] = (required_score / len(required_artifacts)) * 0.7 + \
                                           (optional_score / len(optional_artifacts)) * 0.3
    
    # Check data pipeline
    health['data_pipeline'] = check_data_pipeline(data_dir)
    
    # Check ONNX exports
    health['onnx_exports'] = check_onnx_exports(models_dir)
    
    # Determine overall health
    if health['training']['health_score'] >= 0.8 and health['data_pipeline']['processed_data_exists']:
        health['overall_health'] = 'healthy'
    elif health['training']['health_score'] >= 0.5:
        health['overall_health'] = 'degraded'
    else:
        health['overall_health'] = 'unhealthy'
    
    return health


def print_status_report(health: Dict[str, any]):
    """Print a human-readable status report."""
    print("🏥 Autonomous Trading System Health Check")
    print("=" * 50)
    print(f"Timestamp: {health['timestamp']}")
    print(f"Overall Status: {health['overall_health'].upper()}")
    print()
    
    # Directory status
    print("📁 Directories:")
    for name, exists in health['directories'].items():
        status = "✅" if exists else "❌"
        print(f"  {status} {name}: {'EXISTS' if exists else 'MISSING'}")
    print()
    
    # Training status
    print("🧠 Training System:")
    if health['training']['latest_run']:
        print(f"  ✅ Latest Run: {Path(health['training']['latest_run']).name}")
        print(f"  📊 Health Score: {health['training']['health_score']:.2f}")
        
        print("  📦 Artifacts:")
        for artifact, exists in health['training']['artifacts'].items():
            status = "✅" if exists else "❌"
            print(f"    {status} {artifact}")
    else:
        print("  ❌ No training runs found")
    print()
    
    # Data pipeline
    print("📊 Data Pipeline:")
    dp = health['data_pipeline']
    print(f"  {'✅' if dp['processed_data_exists'] else '❌'} Processed Data: {'AVAILABLE' if dp['processed_data_exists'] else 'MISSING'}")
    print(f"  📈 Data Files: {dp['data_files_count']}")
    
    if dp['latest_data_file']:
        latest = dp['latest_data_file']
        print(f"  📅 Latest File: {Path(latest['path']).name}")
        print(f"  🕐 Modified: {latest['modified']}")
        print(f"  📏 Size: {latest['size_mb']:.2f} MB")
    
    print(f"  {'✅' if dp['mt5_exports_exists'] else '❌'} MT5 Exports Directory")
    print(f"  {'✅' if dp['bybit_data_exists'] else '❌'} Bybit Data Directory")
    print()
    
    # ONNX exports
    print("🔧 ONNX Exports:")
    onnx = health['onnx_exports']
    print(f"  {'✅' if onnx['onnx_available'] else '❌'} ONNX Models: {'AVAILABLE' if onnx['onnx_available'] else 'MISSING'}")
    
    if onnx['onnx_models']:
        print("  📦 Available Models:")
        for model in onnx['onnx_models']:
            print(f"    • {model}")
    
    print(f"  {'✅' if onnx['deployment_package'] else '❌'} MT5 Deployment Package")
    print()
    
    # Recommendations
    print("💡 Recommendations:")
    if health['overall_health'] == 'healthy':
        print("  ✅ System is ready for trading!")
    elif health['overall_health'] == 'degraded':
        print("  ⚠️  System needs attention - some components missing")
    else:
        print("  🚨 System needs immediate attention - critical components missing")
    
    if not health['training']['latest_run']:
        print("  🔄 Run training pipeline to generate models")
    
    if not health['data_pipeline']['processed_data_exists']:
        print("  📊 Collect market data to start training")
    
    if not health['onnx_exports']['onnx_available']:
        print("  🔧 Export models to ONNX for MT5 deployment")


def main():
    """Main entry point."""
    health = check_system_health()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--json':
        print(json.dumps(health, indent=2))
    else:
        print_status_report(health)
    
    # Exit with appropriate code
    if health['overall_health'] == 'healthy':
        return 0
    elif health['overall_health'] == 'degraded':
        return 1
    else:
        return 2


if __name__ == '__main__':
    sys.exit(main())
