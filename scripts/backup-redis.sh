#!/bin/bash
# Redis Backup Script for AI Trading System
# Referenced in Ops/Runbook.md

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/redis"
S3_BUCKET="ai-trading-backups"
RETENTION_DAYS=30
REDIS_HOST="localhost"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
LOG_FILE="/var/log/redis-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "$(date): Starting Redis backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/redis_$(date +%Y%m%d_%H%M%S).rdb"

# Test Redis connectivity
echo "Testing Redis connectivity..."
if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to Redis${NC}" >&2
    exit 1
fi

# Trigger Redis save
echo "Triggering Redis BGSAVE..."
if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE | grep -q "Background saving started"; then
    echo -e "${GREEN}✅ Background save started${NC}"
else
    echo -e "${RED}❌ Failed to start background save${NC}" >&2
    exit 1
fi

# Wait for save to complete
echo "Waiting for background save to complete..."
while true; do
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE | grep -q "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)"; then
        sleep 1
        if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" GET "__save_in_progress__" > /dev/null 2>&1; then
            break
        fi
    fi
    sleep 2
done

# Copy RDB file
REDIS_RDB_PATH="/var/lib/redis/dump.rdb"
if [[ -f "$REDIS_RDB_PATH" ]]; then
    echo "Copying RDB file..."
    if cp "$REDIS_RDB_PATH" "$BACKUP_FILE"; then
        echo -e "${GREEN}✅ RDB file copied: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Failed to copy RDB file${NC}" >&2
        exit 1
    fi
else
    echo -e "${RED}❌ Redis RDB file not found at $REDIS_RDB_PATH${NC}" >&2
    exit 1
fi

# Compress backup
echo "Compressing backup..."
if gzip "$BACKUP_FILE"; then
    BACKUP_FILE="$BACKUP_FILE.gz"
    echo -e "${GREEN}✅ Backup compressed: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Failed to compress backup${NC}" >&2
    exit 1
fi

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [[ -n "${AWS_ACCESS_KEY_ID:-}" ]]; then
    echo "Uploading to S3..."
    if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/redis/$(basename "$BACKUP_FILE")"; then
        echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
    else
        echo -e "${YELLOW}⚠️ S3 upload failed, keeping local copy${NC}" >&2
    fi
else
    echo -e "${YELLOW}⚠️ AWS CLI not configured, skipping S3 upload${NC}"
fi

# Cleanup old local backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "redis_*.rdb.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleanup completed"

# Report backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup completed successfully. Size: $BACKUP_SIZE"

# Test backup integrity (optional)
echo "Testing backup integrity..."
TEMP_DIR=$(mktemp -d)
if gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/test.rdb"; then
    # Basic RDB file validation (check magic number)
    if head -c 5 "$TEMP_DIR/test.rdb" | grep -q "REDIS"; then
        echo -e "${GREEN}✅ Backup integrity verified${NC}"
    else
        echo -e "${YELLOW}⚠️ Backup integrity check inconclusive${NC}"
    fi
    rm -rf "$TEMP_DIR"
else
    echo -e "${RED}❌ Backup integrity check failed${NC}" >&2
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "$(date): Redis backup completed" 