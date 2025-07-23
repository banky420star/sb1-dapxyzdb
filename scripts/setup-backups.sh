#!/bin/bash

# Setup Automated Backups for AI Trading System
# Configures cron jobs for PostgreSQL and Redis backups

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POSTGRES_BACKUP_SCRIPT="$SCRIPT_DIR/backup-postgres.sh"
REDIS_BACKUP_SCRIPT="$SCRIPT_DIR/backup-redis.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

log "Setting up automated backups for AI Trading System..."

# Make backup scripts executable
chmod +x "$POSTGRES_BACKUP_SCRIPT" || error "Failed to make PostgreSQL backup script executable"
chmod +x "$REDIS_BACKUP_SCRIPT" || error "Failed to make Redis backup script executable"

# Check if scripts exist
[ -f "$POSTGRES_BACKUP_SCRIPT" ] || error "PostgreSQL backup script not found at $POSTGRES_BACKUP_SCRIPT"
[ -f "$REDIS_BACKUP_SCRIPT" ] || error "Redis backup script not found at $REDIS_BACKUP_SCRIPT"

log "Backup scripts found and made executable"

# Create backup directories
sudo mkdir -p /var/backups/postgres /var/backups/redis || warn "Failed to create backup directories"

# Backup current crontab
crontab -l > /tmp/crontab_backup_$(date +%s) 2>/dev/null || true

# Add cron jobs
log "Adding cron jobs..."

# PostgreSQL daily backup at 2 AM
POSTGRES_CRON="0 2 * * * $POSTGRES_BACKUP_SCRIPT >> /var/log/postgres-backup.log 2>&1"

# Redis backup every 5 minutes
REDIS_CRON="*/5 * * * * $REDIS_BACKUP_SCRIPT >> /var/log/redis-backup.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null; echo "$POSTGRES_CRON"; echo "$REDIS_CRON") | sort -u | crontab -

log "Cron jobs added successfully:"
log "  PostgreSQL: Daily at 2:00 AM"
log "  Redis: Every 5 minutes"

# Create log rotation configuration
sudo tee /etc/logrotate.d/trading-backups > /dev/null << 'EOF'
/var/log/postgres-backup.log
/var/log/redis-backup.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

log "Log rotation configured for backup logs"

# Verify cron service is running
if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
    log "Cron service is running"
else
    warn "Cron service may not be running. Please check and start if necessary."
fi

# Create environment file for cron jobs
sudo tee /etc/environment-trading > /dev/null << EOF
# Environment variables for AI Trading System backups
DATABASE_URL=${DATABASE_URL:-postgresql://trading:securepassword123@localhost:5432/trading_db}
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
AWS_S3_BACKUP_BUCKET=${AWS_S3_BACKUP_BUCKET:-ai-trading-backups}
SLACK_WEBHOOK=${SLACK_WEBHOOK:-}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
EOF

log "Environment file created at /etc/environment-trading"

# Update cron jobs to source environment
log "Updating cron jobs to use environment file..."
(crontab -l 2>/dev/null | grep -v "$POSTGRES_BACKUP_SCRIPT" | grep -v "$REDIS_BACKUP_SCRIPT"; 
 echo "0 2 * * * source /etc/environment-trading && $POSTGRES_BACKUP_SCRIPT >> /var/log/postgres-backup.log 2>&1";
 echo "*/5 * * * * source /etc/environment-trading && $REDIS_BACKUP_SCRIPT >> /var/log/redis-backup.log 2>&1") | crontab -

# Test backup scripts (dry run)
log "Testing backup scripts..."

# Test PostgreSQL backup (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    log "Testing PostgreSQL backup script..."
    if $POSTGRES_BACKUP_SCRIPT --dry-run 2>/dev/null; then
        log "PostgreSQL backup script test passed"
    else
        warn "PostgreSQL backup script test failed - check configuration"
    fi
fi

# Test Redis backup (if Redis is accessible)
if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    log "Testing Redis backup script..."
    if $REDIS_BACKUP_SCRIPT --dry-run 2>/dev/null; then
        log "Redis backup script test passed"
    else
        warn "Redis backup script test failed - check configuration"
    fi
fi

# Display current crontab
log "Current crontab:"
crontab -l | grep -E "(postgres|redis)" || warn "No backup cron jobs found"

log "Backup setup completed successfully!"
log ""
log "Next steps:"
log "1. Verify environment variables in /etc/environment-trading"
log "2. Test backups manually: $POSTGRES_BACKUP_SCRIPT"
log "3. Monitor backup logs: tail -f /var/log/postgres-backup.log"
log "4. Set up S3 bucket and AWS credentials for off-site backups" 