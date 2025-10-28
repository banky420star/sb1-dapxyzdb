#!/bin/bash
# Database Instance Setup Script for Oracle Cloud

set -e

# Update system
yum update -y

# Install PostgreSQL 15
yum install -y postgresql15-server postgresql15 postgresql15-contrib

# Initialize PostgreSQL
postgresql-setup --initdb

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Install Docker (for containerized deployment if needed)
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install additional tools
yum install -y curl wget git htop

# Create application directory
mkdir -p /opt/ai-trading
cd /opt/ai-trading

# Configure PostgreSQL
sudo -u postgres psql << EOF
-- Create database and user
CREATE DATABASE trading_system;
CREATE USER trader WITH PASSWORD '${db_password}';
GRANT ALL PRIVILEGES ON DATABASE trading_system TO trader;

-- Connect to trading_system database
\c trading_system;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO trader;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trader;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trader;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO trader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO trader;
EOF

# Configure PostgreSQL for remote connections
PG_VERSION=$(postgresql-setup --version | grep -oP '\d+\.\d+')
PG_CONFIG_DIR="/var/lib/pgsql/$PG_VERSION/data"

# Backup original config
cp $PG_CONFIG_DIR/postgresql.conf $PG_CONFIG_DIR/postgresql.conf.backup
cp $PG_CONFIG_DIR/pg_hba.conf $PG_CONFIG_DIR/pg_hba.conf.backup

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONFIG_DIR/postgresql.conf
sed -i "s/#port = 5432/port = 5432/" $PG_CONFIG_DIR/postgresql.conf
sed -i "s/#max_connections = 100/max_connections = 200/" $PG_CONFIG_DIR/postgresql.conf
sed -i "s/#shared_buffers = 128MB/shared_buffers = 256MB/" $PG_CONFIG_DIR/postgresql.conf

# Update pg_hba.conf for local network access
echo "host    all             all             10.0.0.0/16           md5" >> $PG_CONFIG_DIR/pg_hba.conf

# Restart PostgreSQL
systemctl restart postgresql

# Create environment file
cat > .env << EOF
POSTGRES_DB=trading_system
POSTGRES_USER=trader
POSTGRES_PASSWORD=${db_password}
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
EOF

# Create docker-compose file for database
cat > docker-compose.yml << EOF
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    container_name: ai-trading-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=trading_system
      - POSTGRES_USER=trader
      - POSTGRES_PASSWORD=${db_password}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trader -d trading_system"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  postgres_data:
    driver: local
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/ai-trading-db.service << EOF
[Unit]
Description=AI Trading Database
After=docker.service postgresql.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ai-trading
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable ai-trading-db

# Create log rotation
cat > /etc/logrotate.d/ai-trading << EOF
/opt/ai-trading/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
EOF

# Set up monitoring
cat > /opt/ai-trading/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for database

DB_URL="postgresql://trader:${db_password}@localhost:5432/trading_system"
RESPONSE=$(psql $DB_URL -c "SELECT 1;" 2>/dev/null | grep -c "1 row")

if [ $RESPONSE -eq 1 ]; then
    echo "Database is healthy"
    exit 0
else
    echo "Database is unhealthy"
    exit 1
fi
EOF

chmod +x /opt/ai-trading/health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /opt/ai-trading/health-check.sh >> /var/log/ai-trading-health.log 2>&1" | crontab -

# Create necessary directories
mkdir -p /opt/ai-trading/data
mkdir -p /opt/ai-trading/logs
mkdir -p /opt/ai-trading/migrations

# Set up firewall
firewall-cmd --permanent --add-port=5432/tcp
firewall-cmd --reload

# Create database backup script
cat > /opt/ai-trading/backup-db.sh << 'EOF'
#!/bin/bash
# Database backup script

BACKUP_DIR="/opt/ai-trading/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="trading_system_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -h localhost -U trader -d trading_system > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/ai-trading/backup-db.sh

# Add daily backup to crontab
echo "0 2 * * * /opt/ai-trading/backup-db.sh >> /var/log/ai-trading-backup.log 2>&1" | crontab -

echo "Database setup completed successfully!"