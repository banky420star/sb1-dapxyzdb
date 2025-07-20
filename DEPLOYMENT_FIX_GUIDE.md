# AI Trading System Server Deployment Fix Guide

## Current Issues
1. Node.js dependency conflicts with `libnode-dev`
2. SSH authentication problems for `banks` user
3. Package management conflicts
4. System service issues

## Step-by-Step Fix

### Step 1: Connect to Server as Root
```bash
ssh root@45.76.136.30
```

### Step 2: Fix Node.js Conflicts
```bash
# Remove conflicting packages
apt-get remove -y libnode-dev || true
apt-get autoremove -y
apt-get install -f -y

# Install Node.js 20.x cleanly
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3: Install PM2
```bash
npm install -g pm2
```

### Step 4: Fix Banks User
```bash
# Set password for banks user
echo "banks:SecurePass123!" | chpasswd

# Set up SSH directory
mkdir -p /home/banks/.ssh
chown banks:banks /home/banks/.ssh
chmod 700 /home/banks/.ssh

# Add your public key
cat > /home/banks/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBwed2kNraun4pMJunHTTUpQ8gMgM/W8N0kkW7yAULhR banks@MacBook
EOF

chown banks:banks /home/banks/.ssh/authorized_keys
chmod 600 /home/banks/.ssh/authorized_keys
```

### Step 5: Copy Trading System to Banks User
```bash
cp -r /root/ai-trading-system /home/banks/
chown -R banks:banks /home/banks/ai-trading-system
```

### Step 6: Start Backend Service
```bash
cd /root/ai-trading-system

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
ALPHA_VANTAGE_API_KEY=demo_key
EOF

# Start with PM2
pm2 delete ai-trading-system || true
pm2 start server/index.js --name ai-trading-system
pm2 save
```

### Step 7: Build and Start Frontend
```bash
# Switch to banks user
su - banks

# Navigate to trading system
cd ~/ai-trading-system

# Install dependencies and build
npm ci
npm run build

# Start frontend with PM2
pm2 delete ai-trading-ui || true
pm2 start "npx serve -s dist -l 3000" --name ai-trading-ui
pm2 save
```

### Step 8: Test Access
```bash
# Test SSH as banks user (from your local machine)
ssh banks@45.76.136.30

# Test backend API
curl http://45.76.136.30:8000/api/health

# Test frontend
curl http://45.76.136.30:3000
```

### Step 9: Final Configuration
```bash
# As root, configure SSH to disable root login
sed -i '/^PermitRootLogin/c\PermitRootLogin no' /etc/ssh/sshd_config
sed -i '/^PasswordAuthentication/c\PasswordAuthentication no' /etc/ssh/sshd_config

# Restart SSH
systemctl restart sshd || killall -HUP sshd
```

## Verification Commands

### Check System Status
```bash
# Node.js versions
node --version
npm --version

# PM2 status
pm2 status

# Service status
systemctl status sshd

# Application URLs
echo "Backend: http://45.76.136.30:8000"
echo "Frontend: http://45.76.136.30:3000"
echo "Health: http://45.76.136.30:8000/api/health"
```

### Test SSH Access
```bash
# From your local machine
ssh banks@45.76.136.30
```

## Troubleshooting

### If Node.js installation fails:
```bash
# Force remove conflicting packages
dpkg --force-depends -r libnode-dev
apt-get install -f -y
```

### If SSH still doesn't work:
```bash
# Check SSH logs
tail -f /var/log/auth.log

# Verify key permissions
ls -la /home/banks/.ssh/
```

### If PM2 processes fail:
```bash
# Check logs
pm2 logs

# Restart processes
pm2 restart all
```

## Expected Results
- Node.js 20.x installed without conflicts
- Banks user can SSH with key authentication
- Backend API running on port 8000
- Frontend UI running on port 3000
- PM2 managing both services
- Root SSH disabled for security 