#!/bin/bash

# AI Trading System - Backup Verification Script
# Following Ops/Runbook.md backup procedures

echo "🔒 AI TRADING SYSTEM - BACKUP VERIFICATION"
echo "=========================================="
echo "Following Ops/Runbook.md backup procedures..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p backups/daily

# 1. Database Backup
echo -e "${BLUE}💾 DATABASE BACKUP${NC}"
echo "-------------------"

if [[ -f "data/trading.db" ]]; then
    backup_file="backups/daily/trading_db_$(date +%Y%m%d_%H%M%S).db"
    echo -n "Creating SQLite backup: "
    
    if cp "data/trading.db" "$backup_file"; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "   └─ Backup saved: $backup_file"
        
        # Verify backup integrity
        echo -n "Verifying backup integrity: "
        if sqlite3 "$backup_file" "PRAGMA integrity_check;" | grep -q "ok"; then
            echo -e "${GREEN}✅ VALID${NC}"
        else
            echo -e "${RED}❌ CORRUPTED${NC}"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No database file found${NC}"
fi

# 2. Configuration Backup
echo -e "\n${BLUE}⚙️ CONFIGURATION BACKUP${NC}"
echo "------------------------"

config_backup="backups/daily/config_$(date +%Y%m%d_%H%M%S).tar.gz"
echo -n "Creating configuration backup: "

if tar -czf "$config_backup" .env package.json Ops/ scripts/ 2>/dev/null; then
    echo -e "${GREEN}✅ SUCCESS${NC}"
    echo "   └─ Config saved: $config_backup"
else
    echo -e "${RED}❌ FAILED${NC}"
fi

# 3. Model Backup (if exists)
echo -e "\n${BLUE}🤖 MODEL BACKUP${NC}"
echo "----------------"

if [[ -d "models" ]] && [[ "$(ls -A models 2>/dev/null)" ]]; then
    model_backup="backups/daily/models_$(date +%Y%m%d_%H%M%S).tar.gz"
    echo -n "Creating model backup: "
    
    if tar -czf "$model_backup" models/ 2>/dev/null; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "   └─ Models saved: $model_backup"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No models directory or empty${NC}"
fi

# 4. Log Backup
echo -e "\n${BLUE}📝 LOG BACKUP${NC}"
echo "--------------"

if [[ -d "logs" ]] && [[ "$(ls -A logs 2>/dev/null)" ]]; then
    log_backup="backups/daily/logs_$(date +%Y%m%d_%H%M%S).tar.gz"
    echo -n "Creating log backup: "
    
    if tar -czf "$log_backup" logs/ 2>/dev/null; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "   └─ Logs saved: $log_backup"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No logs directory or empty${NC}"
fi

# 5. Backup Directory Status
echo -e "\n${BLUE}📊 BACKUP DIRECTORY STATUS${NC}"
echo "---------------------------"

if [[ -d "backups/daily" ]]; then
    backup_count=$(ls -1 backups/daily/ 2>/dev/null | wc -l | tr -d ' ')
    backup_size=$(du -sh backups/daily 2>/dev/null | cut -f1)
    
    echo "Backup directory: backups/daily/"
    echo "├─ Total backups: $backup_count files"
    echo "├─ Total size: $backup_size"
    echo "└─ Latest backups:"
    
    ls -lt backups/daily/ | head -6 | tail -5 | while read line; do
        echo "   └─ $line"
    done
fi

# 6. Cleanup old backups (keep last 7 days)
echo -e "\n${BLUE}🧹 BACKUP CLEANUP${NC}"
echo "-----------------"

echo -n "Cleaning old backups (>7 days): "
old_backups=$(find backups/daily -name "*.db" -o -name "*.tar.gz" | xargs ls -t | tail -n +8 2>/dev/null)

if [[ -n "$old_backups" ]]; then
    echo "$old_backups" | xargs rm -f
    removed_count=$(echo "$old_backups" | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ REMOVED${NC} ($removed_count old backups)"
else
    echo -e "${GREEN}✅ NONE${NC} (all backups recent)"
fi

# 7. Backup Recovery Test
echo -e "\n${BLUE}🔄 BACKUP RECOVERY TEST${NC}"
echo "-----------------------"

# Test database backup recovery
latest_db_backup=$(ls -t backups/daily/*.db 2>/dev/null | head -1)
if [[ -n "$latest_db_backup" ]]; then
    echo -n "Testing database backup recovery: "
    
    # Create test recovery
    test_recovery="backups/test_recovery.db"
    if cp "$latest_db_backup" "$test_recovery"; then
        # Test if we can query the backup
        if sqlite3 "$test_recovery" "SELECT COUNT(*) FROM sqlite_master;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ SUCCESS${NC}"
            echo "   └─ Database backup is recoverable"
        else
            echo -e "${RED}❌ FAILED${NC}"
            echo "   └─ Database backup cannot be queried"
        fi
        rm -f "$test_recovery"
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   └─ Cannot copy backup file"
    fi
else
    echo -e "${YELLOW}⚠️ No database backup found${NC}"
fi

# 8. Backup Summary
echo -e "\n${BLUE}📋 BACKUP SUMMARY${NC}"
echo "=================="

echo "Backup Status:"
echo "├─ Database: $([ -f "$(ls -t backups/daily/*.db 2>/dev/null | head -1)" ] && echo "✅ Available" || echo "❌ Missing")"
echo "├─ Configuration: $([ -f "$(ls -t backups/daily/config_*.tar.gz 2>/dev/null | head -1)" ] && echo "✅ Available" || echo "❌ Missing")"
echo "├─ Models: $([ -f "$(ls -t backups/daily/models_*.tar.gz 2>/dev/null | head -1)" ] && echo "✅ Available" || echo "⚠️ Optional")"
echo "└─ Logs: $([ -f "$(ls -t backups/daily/logs_*.tar.gz 2>/dev/null | head -1)" ] && echo "✅ Available" || echo "❌ Missing")"

echo ""
echo "Recovery Instructions:"
echo "├─ Database: cp backups/daily/trading_db_LATEST.db data/trading.db"
echo "├─ Config: tar -xzf backups/daily/config_LATEST.tar.gz"
echo "├─ Models: tar -xzf backups/daily/models_LATEST.tar.gz"
echo "└─ Logs: tar -xzf backups/daily/logs_LATEST.tar.gz"

echo ""
echo "Backup schedule recommendations:"
echo "├─ Database: Every 4 hours during trading"
echo "├─ Configuration: Daily or after changes"
echo "├─ Models: After training/validation"
echo "└─ Logs: Weekly rotation"

echo ""
echo -e "${GREEN}✅ Backup verification complete!${NC}" 