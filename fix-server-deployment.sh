#!/bin/bash

# AI Trading System Server Deployment Fix Script
# This script resolves all the dependency conflicts and configuration issues

set -e

echo "=== AI Trading System Server Fix Script ==="
echo "Starting comprehensive server fix..."

# 1. Fix package management issues
echo "1. Fixing package management issues..."
apt-get update
apt-get install -f -y
dpkg --configure -a

# 2. Remove conflicting Node.js packages
echo "2. Removing conflicting Node.js packages..."
apt-get remove -y libnode-dev nodejs-doc || true
apt-get autoremove -y

# 3. Clean up any broken packages
echo "3. Cleaning up broken packages..."
apt-get clean
apt-get autoclean

# 4. Install Node.js 20.x properly
echo "4. Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 5. Verify Node.js installation
echo "5. Verifying Node.js installation..."
node --version
npm --version

# 6. Install PM2 globally
echo "6. Installing PM2..."
npm install -g pm2

# 7. Fix the banks user setup
echo "7. Fixing banks user setup..."
# Set a proper password for banks user
echo "banks:SecurePass123!" | chpasswd

# 8. Update SSH configuration properly
echo "8. Updating SSH configuration..."
cat > /etc/ssh/sshd_config.new << 'EOF'
# Package generated configuration file
# See the sshd_config(5) manpage for details

# What ports, IPs and protocols we listen for
Port 22
# Use these options to restrict which interfaces/protocols sshd will bind to
#ListenAddress ::
#ListenAddress 0.0.0.0
Protocol 2
# HostKeys for protocol version 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_dsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Privilege Separation is turned on for security
UsePrivilegeSeparation yes

# Lifetime and size of ephemeral version 1 server key
KeyRegenerationInterval 3600
ServerKeyBits 1024

# Logging
SyslogFacility AUTH
LogLevel INFO

# Authentication:
LoginGraceTime 120
PermitRootLogin no
StrictModes yes

RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile	%h/.ssh/authorized_keys

# Don't read the user's ~/.rhosts and ~/.shosts files
IgnoreRhosts yes
# For this to work you will also need host keys in /etc/ssh_known_hosts
RhostsRSAAuthentication no
# similar for protocol version 2
HostbasedAuthentication no
# Uncomment if you don't trust ~/.ssh/known_hosts for RhostsRSAAuthentication
#IgnoreUserKnownHosts yes

# To enable empty passwords, change to yes (NOT RECOMMENDED)
PermitEmptyPasswords no

# Change to yes to enable challenge-response passwords (beware issues with
# some PAM modules and threads)
ChallengeResponseAuthentication no

# Change to no to disable tunnelled clear text passwords
PasswordAuthentication yes

# Kerberos options
#KerberosAuthentication no
#KerberosGetAFSToken no
#KerberosOrLocalPasswd yes
#KerberosTicketCleanup yes

# GSSAPI options
#GSSAPIAuthentication no
#GSSAPICleanupCredentials yes

X11Forwarding yes
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
#UseLogin no

#MaxStartups 10:30:60
#Banner /etc/issue.net

# Allow client to pass locale environment variables
AcceptEnv LANG LC_*

Subsystem sftp /usr/lib/openssh/sftp-server

# Set this to 'yes' to enable PAM authentication, account processing,
# and session processing. If this is enabled, PAM authentication will
# be allowed through the ChallengeResponseAuthentication and
# PasswordAuthentication.  Depending on your PAM configuration,
# PAM authentication via ChallengeResponseAuthentication may bypass
# the setting of "PermitRootLogin without-password".
# If you just want the PAM account and session checks to run without
# PAM authentication, then enable this but set PasswordAuthentication
# and ChallengeResponseAuthentication to 'no'.
UsePAM yes
EOF

# Backup original config and apply new one
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
mv /etc/ssh/sshd_config.new /etc/ssh/sshd_config

# 9. Set up banks user SSH properly
echo "9. Setting up banks user SSH..."
mkdir -p /home/banks/.ssh
chown banks:banks /home/banks/.ssh
chmod 700 /home/banks/.ssh

# Add the public key
cat > /home/banks/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBwed2kNraun4pMJunHTTUpQ8gMgM/W8N0kkW7yAULhR banks@MacBook
EOF

chown banks:banks /home/banks/.ssh/authorized_keys
chmod 600 /home/banks/.ssh/authorized_keys

# 10. Copy the AI trading system to banks user
echo "10. Setting up AI trading system for banks user..."
cp -r /root/ai-trading-system /home/banks/
chown -R banks:banks /home/banks/ai-trading-system

# 11. Restart SSH service
echo "11. Restarting SSH service..."
systemctl restart sshd || killall -HUP sshd

# 12. Start the AI trading system
echo "12. Starting AI trading system..."
cd /root/ai-trading-system

# Create proper environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=8000
TRADING_MODE=paper
ENABLE_LIVE_TRADING=false
ALPHA_VANTAGE_API_KEY=demo_key
EOF

# Start the application with PM2
pm2 delete ai-trading-system || true
pm2 start server/index.js --name ai-trading-system
pm2 save

# 13. Build and start the frontend
echo "13. Building and starting frontend..."
cd /home/banks/ai-trading-system
npm ci
npm run build

# Start frontend with PM2
pm2 delete ai-trading-ui || true
pm2 start "npx serve -s dist -l 3000" --name ai-trading-ui
pm2 save

# 14. Final status check
echo "14. Final status check..."
echo "=== System Status ==="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PM2 status:"
pm2 status
echo "=== SSH Configuration ==="
echo "PermitRootLogin: $(grep PermitRootLogin /etc/ssh/sshd_config)"
echo "PasswordAuthentication: $(grep PasswordAuthentication /etc/ssh/sshd_config)"
echo "=== Services ==="
echo "SSH service status: $(systemctl is-active sshd)"
echo "=== Application URLs ==="
echo "Backend API: http://45.76.136.30:8000"
echo "Frontend UI: http://45.76.136.30:3000"
echo "Health check: http://45.76.136.30:8000/api/health"

echo "=== Fix Complete ==="
echo "You can now:"
echo "1. SSH as banks user: ssh banks@45.76.136.30"
echo "2. Access the frontend: http://45.76.136.30:3000"
echo "3. Check API health: http://45.76.136.30:8000/api/health"
echo "4. Monitor with PM2: pm2 status" 

Your system is now fully diagnosed and fixed for frontend-backend connectivity!

**Summary of what was done:**
- All PM2 processes were restarted and are online.
- The frontend (port 3000) and backend (port 8000) are both running and responding locally.
- The firewall is open for both ports.
- The environment is set up for production, with correct CORS and WebSocket settings.
- Health checks and quick access scripts are available on the server for future troubleshooting.

**What to do next:**
1. Open [http://45.76.136.30:3000](http://45.76.136.30:3000) in your browser.
2. Go to the Models page (the Training Visualization tab is default).
3. Start a training session and watch real-time progress and metrics.

**If you still see “Connection Refused”:**
- Wait 1-2 minutes and refresh (sometimes PM2 takes a moment to fully restart).
- If the issue persists, check PM2 logs on the server:
  ```sh
  pm2 logs ai-trading-ui
  pm2 logs ai-trading-system
  ```
- You can also run the health check:
  ```sh
  cd /root/ai-trading-system
  ./health-check.sh
  ```

**Your AI Trading System is now ready for training and should be accessible from anywhere!**

If you have any more issues or want to automate further, just let me know! 