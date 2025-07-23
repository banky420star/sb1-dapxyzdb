#!/bin/bash
# PostgreSQL Backup Script for AI Trading System
# Referenced in Ops/Runbook.md

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgres"
S3_BUCKET="ai-trading-backups"
RETENTION_DAYS=30
DB_NAME="trading"
DB_USER="trading_app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
LOG_FILE="/var/log/postgres-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "$(date): Starting PostgreSQL backup for $DB_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/trading_db_$(date +%Y%m%d_%H%M%S).dump"

# Create database dump
echo "Creating database dump..."
if pg_dump -U "$DB_USER" -h localhost -p 5432 -Fc -f "$BACKUP_FILE" "$DB_NAME"; then
    echo -e "${GREEN}✅ Database dump created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Database dump failed${NC}" >&2
    exit 1
fi

# Verify backup integrity
echo "Verifying backup integrity..."
if pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backup integrity verified${NC}"
else
    echo -e "${RED}❌ Backup integrity check failed${NC}" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
    echo "Uploading to S3..."
    if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/postgres/$(basename "$BACKUP_FILE")"; then
        echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
    else
        echo -e "${YELLOW}⚠️ S3 upload failed, keeping local copy${NC}" >&2
    fi
else
    echo -e "${YELLOW}⚠️ AWS CLI not configured, skipping S3 upload${NC}"
fi

# Cleanup old local backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "trading_db_*.dump" -mtime +$RETENTION_DAYS -delete
echo "Cleanup completed"

# Report backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup completed successfully. Size: $BACKUP_SIZE"

echo "$(date): PostgreSQL backup completed" 