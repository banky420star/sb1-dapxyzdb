# 🔐 WireGuard Key Rotation System

*Comprehensive VPN key management for secure access control and ex-employee offboarding*

## 📋 Overview

The WireGuard Key Rotation System provides automated management of VPN access keys, ensuring secure access control and proper offboarding of former employees. This system is critical for maintaining production security and compliance.

## 🚀 Quick Start

### Prerequisites
- Root access on the server
- WireGuard installed and configured
- Admin panel accessible at `https://admin.methtrader.xyz`

### Basic Usage
```bash
# List all current peers
sudo ./scripts/rotate_wg_keys.sh list

# Disable an ex-employee
sudo ./scripts/rotate_wg_keys.sh disable "john.doe@company.com"

# Verify access is denied
sudo ./scripts/rotate_wg_keys.sh verify

# Generate new peer for new employee
sudo ./scripts/rotate_wg_keys.sh generate "new.employee" "10.0.0.100/32"
```

## 🔧 Commands Reference

### `list`
Lists all current WireGuard peers with their public keys and allowed IPs.

```bash
sudo ./scripts/rotate_wg_keys.sh list
```

**Output:**
```
👥 Current WireGuard Peers:

Peer #1:
  Public Key: abc123def456ghi789...
  Allowed IPs: 10.0.0.50/32
  Name: john.doe

Peer #2:
  Public Key: xyz789uvw123rst456...
  Allowed IPs: 10.0.0.51/32
  Name: jane.smith

Total peers: 2
```

### `disable <identifier> [reason]`
Disables a peer by public key, name, or email address.

```bash
# Disable by public key
sudo ./scripts/rotate_wg_keys.sh disable "abc123def456ghi789..."

# Disable by name
sudo ./scripts/rotate_wg_keys.sh disable "John Doe"

# Disable with custom reason
sudo ./scripts/rotate_wg_keys.sh disable "john.doe@company.com" "Employee termination"
```

**What happens:**
1. Creates backup of current configuration
2. Comments out the peer section in WireGuard config
3. Reloads WireGuard configuration
4. Logs the action with timestamp and reason

### `verify`
Verifies that disabled peers cannot access the admin panel.

```bash
sudo ./scripts/rotate_wg_keys.sh verify
```

**Output:**
```
🔍 Verifying ex-employee access denial...
🔍 Testing admin panel access from 10.0.0.50...
✅ Access properly denied (HTTP 403)
Access denial tests: 1/1 passed
✅ All ex-employee access properly denied
```

### `generate <name> <ip>`
Generates new peer configuration for new employees.

```bash
sudo ./scripts/rotate_wg_keys.sh generate "new.employee" "10.0.0.100/32"
```

**What happens:**
1. Generates new private/public key pair
2. Creates preshared key for additional security
3. Adds peer to WireGuard configuration
4. Creates client configuration file
5. Reloads WireGuard configuration

**Output:**
```
🔑 Generating new peer configuration for: new.employee
✅ New peer configuration generated:
  Server config added to: /etc/wireguard/wg0.conf
  Client config saved to: /opt/wireguard/clients/new.employee.conf
  Public Key: def456ghi789jkl012...
```

### `backup`
Creates backup of current WireGuard configuration.

```bash
sudo ./scripts/rotate_wg_keys.sh backup
```

**Output:**
```
📦 Creating backup of current WireGuard configuration...
✅ Configuration backed up to: /opt/wireguard/backups/wg0-20250127-143022.conf
```

### `test-access <ip>`
Tests admin panel access from a specific IP address.

```bash
sudo ./scripts/rotate_wg_keys.sh test-access "10.0.0.50"
```

## 🔒 Security Procedures

### Ex-Employee Offboarding Process

1. **Immediate Action (Day 0)**
   ```bash
   # Disable VPN access immediately
   sudo ./scripts/rotate_wg_keys.sh disable "employee.name" "Immediate termination"
   
   # Verify access is denied
   sudo ./scripts/rotate_wg_keys.sh verify
   ```

2. **Documentation (Day 1)**
   - Update employee records
   - Document reason for termination
   - Store backup configuration
   - Update access logs

3. **Follow-up (Week 1)**
   ```bash
   # Re-verify access denial
   sudo ./scripts/rotate_wg_keys.sh verify
   
   # Check for any unauthorized access attempts
   grep "10.0.0.50" /var/log/nginx/access.log
   ```

### New Employee Onboarding Process

1. **Generate Access**
   ```bash
   # Generate new peer configuration
   sudo ./scripts/rotate_wg_keys.sh generate "new.employee" "10.0.0.101/32"
   ```

2. **Distribute Configuration**
   - Send client configuration file securely
   - Provide setup instructions
   - Set up initial password

3. **Verify Access**
   ```bash
   # Test admin panel access
   sudo ./scripts/rotate_wg_keys.sh test-access "10.0.0.101"
   ```

## 📁 File Structure

```
/etc/wireguard/
├── wg0.conf                    # Main WireGuard configuration
└── private/                    # Private keys (restricted access)

/opt/wireguard/
├── backups/                    # Configuration backups
│   ├── wg0-20250127-143022.conf
│   └── wg0-20250127-150045.conf
├── clients/                    # Client configuration files
│   ├── john.doe.conf
│   ├── jane.smith.conf
│   └── new.employee.conf
└── logs/                       # Rotation logs

/var/log/
└── wireguard-rotation.log      # Main rotation log
```

## 🔍 Monitoring and Logging

### Log Locations
- **Main Log**: `/var/log/wireguard-rotation.log`
- **WireGuard Logs**: `journalctl -u wg-quick@wg0`
- **Admin Panel Access**: `/var/log/nginx/access.log`

### Key Log Entries
```bash
# Monitor rotation activities
tail -f /var/log/wireguard-rotation.log

# Check for access attempts from disabled IPs
grep "10.0.0.50" /var/log/nginx/access.log

# Monitor WireGuard status
wg show
```

## 🚨 Emergency Procedures

### Complete VPN Shutdown
```bash
# Stop WireGuard service
sudo systemctl stop wg-quick@wg0

# Verify all access is blocked
sudo ./scripts/rotate_wg_keys.sh verify
```

### Emergency Access Restoration
```bash
# Restore from latest backup
sudo cp /opt/wireguard/backups/wg0-$(ls -t /opt/wireguard/backups/ | head -1) /etc/wireguard/wg0.conf

# Restart WireGuard
sudo systemctl restart wg-quick@wg0
```

### Security Incident Response
1. **Immediate**: Disable all VPN access
2. **Investigation**: Check logs for unauthorized access
3. **Recovery**: Restore from clean backup
4. **Prevention**: Update security procedures

## 📊 Compliance and Auditing

### Audit Trail
The system maintains comprehensive audit trails:
- All peer modifications are logged with timestamps
- Backup configurations are preserved
- Access attempts are recorded
- Admin panel access is monitored

### Compliance Requirements
- **SOC 2**: Access control and user management
- **GDPR**: Right to be forgotten (key deletion)
- **SOX**: Change management and audit trails
- **PCI DSS**: Network access control

### Regular Audits
```bash
# Monthly audit script
#!/bin/bash
echo "=== WireGuard Security Audit ==="
echo "Date: $(date)"
echo ""

# List all peers
sudo ./scripts/rotate_wg_keys.sh list

# Verify disabled peers
sudo ./scripts/rotate_wg_keys.sh verify

# Check backup integrity
ls -la /opt/wireguard/backups/

# Review recent access logs
tail -100 /var/log/wireguard-rotation.log
```

## 🔧 Troubleshooting

### Common Issues

#### Peer Not Found
```bash
# Check if peer exists
sudo ./scripts/rotate_wg_keys.sh list | grep "employee.name"

# Try different identifier
sudo ./scripts/rotate_wg_keys.sh disable "employee.name@company.com"
```

#### Configuration Reload Failed
```bash
# Check WireGuard status
sudo systemctl status wg-quick@wg0

# Manual reload
sudo wg syncconf wg0 <(wg-quick strip wg0)
```

#### Access Test Failed
```bash
# Check admin panel status
curl -I https://admin.methtrader.xyz

# Verify firewall rules
sudo iptables -L | grep 10.0.0.50
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=1
sudo ./scripts/rotate_wg_keys.sh list
```

## 📞 Support

### Emergency Contacts
- **Security Team**: security@methtrader.xyz
- **DevOps Team**: devops@methtrader.xyz
- **On-Call**: +1-555-0123

### Escalation Procedures
1. **Level 1**: Check logs and basic troubleshooting
2. **Level 2**: Security team involvement
3. **Level 3**: Complete VPN shutdown and investigation

---

## 🎯 Success Metrics

### Security KPIs
- **Zero unauthorized access** from disabled peers
- **100% ex-employee offboarding** within 1 hour
- **Complete audit trail** for all access changes
- **Automated verification** of access controls

### Operational KPIs
- **MTTR < 5 minutes** for access issues
- **100% backup success** rate
- **Zero configuration drift** in production
- **Automated compliance** reporting

This system ensures your trading platform maintains enterprise-grade security while providing efficient access management for your team! 🔐 