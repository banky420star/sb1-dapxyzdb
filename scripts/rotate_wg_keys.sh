#!/bin/bash

# WireGuard Key Rotation Script
# Manages WireGuard VPN keys for secure access control

set -e

echo "🔐 WireGuard Key Rotation Management"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WG_CONFIG_DIR="/etc/wireguard"
WG_CONFIG_FILE="$WG_CONFIG_DIR/wg0.conf"
BACKUP_DIR="/opt/wireguard/backups"
LOG_FILE="/var/log/wireguard-rotation.log"
ADMIN_PANEL_URL="https://admin.methtrader.xyz"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log "${RED}❌ This script must be run as root${NC}"
        exit 1
    fi
}

# Function to backup current configuration
backup_config() {
    log "${BLUE}📦 Creating backup of current WireGuard configuration...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/wg0-$(date +%Y%m%d-%H%M%S).conf"
    
    if [ -f "$WG_CONFIG_FILE" ]; then
        cp "$WG_CONFIG_FILE" "$backup_file"
        log "${GREEN}✅ Configuration backed up to: $backup_file${NC}"
    else
        log "${YELLOW}⚠️  No existing WireGuard configuration found${NC}"
    fi
}

# Function to list current peers
list_peers() {
    log "${BLUE}👥 Current WireGuard Peers:${NC}"
    
    if [ ! -f "$WG_CONFIG_FILE" ]; then
        log "${YELLOW}⚠️  No WireGuard configuration found${NC}"
        return 1
    fi
    
    # Extract peer information
    local peer_count=0
    while IFS= read -r line; do
        if [[ $line =~ ^\[Peer\] ]]; then
            peer_count=$((peer_count + 1))
            echo ""
            log "Peer #$peer_count:"
        elif [[ $line =~ ^PublicKey ]]; then
            local pubkey=$(echo "$line" | cut -d'=' -f2 | tr -d ' ')
            log "  Public Key: ${pubkey:0:20}..."
        elif [[ $line =~ ^AllowedIPs ]]; then
            local allowed_ips=$(echo "$line" | cut -d'=' -f2 | tr -d ' ')
            log "  Allowed IPs: $allowed_ips"
        elif [[ $line =~ ^#.*Name ]]; then
            local name=$(echo "$line" | cut -d'=' -f2 | tr -d ' ')
            log "  Name: $name"
        fi
    done < "$WG_CONFIG_FILE"
    
    log "Total peers: $peer_count"
}

# Function to disable a peer
disable_peer() {
    local peer_identifier="$1"
    local reason="${2:-Security rotation}"
    
    log "${BLUE}🚫 Disabling peer: $peer_identifier${NC}"
    
    if [ ! -f "$WG_CONFIG_FILE" ]; then
        log "${RED}❌ WireGuard configuration not found${NC}"
        return 1
    fi
    
    # Create backup before modification
    backup_config
    
    # Create temporary configuration file
    local temp_config="/tmp/wg0-temp.conf"
    local peer_found=false
    local in_peer_section=false
    
    # Process the configuration file
    while IFS= read -r line; do
        if [[ $line =~ ^\[Peer\] ]]; then
            # Check if this is the peer we want to disable
            in_peer_section=true
            peer_found=false
            
            # Read the next few lines to identify the peer
            local peer_lines=""
            local line_number=0
            
            # Store the current position
            local current_pos=$(grep -n "$line" "$WG_CONFIG_FILE" | cut -d: -f1)
            
            # Check if this peer matches our identifier
            local match_found=false
            local temp_file="/tmp/peer-check.tmp"
            
            # Extract this peer's section
            sed -n "${current_pos},/^\[/p" "$WG_CONFIG_FILE" | head -10 > "$temp_file"
            
            if grep -q "$peer_identifier" "$temp_file"; then
                match_found=true
                peer_found=true
            fi
            
            rm -f "$temp_file"
            
            if [ "$match_found" = true ]; then
                log "  Found matching peer, commenting out section..."
                echo "# DISABLED: $reason - $(date)" >> "$temp_config"
                echo "# $line" >> "$temp_config"
            else
                echo "$line" >> "$temp_config"
            fi
        elif [ "$in_peer_section" = true ] && [ "$peer_found" = true ]; then
            # Comment out all lines in this peer section
            if [[ $line =~ ^\[ ]]; then
                # End of peer section, uncomment the next section
                in_peer_section=false
                peer_found=false
                echo "$line" >> "$temp_config"
            else
                echo "# $line" >> "$temp_config"
            fi
        else
            echo "$line" >> "$temp_config"
        fi
    done < "$WG_CONFIG_FILE"
    
    # Replace original configuration
    mv "$temp_config" "$WG_CONFIG_FILE"
    
    if [ "$peer_found" = true ]; then
        log "${GREEN}✅ Peer disabled successfully${NC}"
        
        # Reload WireGuard configuration
        reload_wireguard
        
        return 0
    else
        log "${RED}❌ Peer not found: $peer_identifier${NC}"
        return 1
    fi
}

# Function to reload WireGuard configuration
reload_wireguard() {
    log "${BLUE}🔄 Reloading WireGuard configuration...${NC}"
    
    if command_exists wg; then
        # Reload the configuration
        wg syncconf wg0 <(wg-quick strip wg0)
        log "${GREEN}✅ WireGuard configuration reloaded${NC}"
    else
        log "${YELLOW}⚠️  WireGuard command not found, manual reload required${NC}"
    fi
}

# Function to test admin panel access
test_admin_access() {
    local test_ip="$1"
    local expected_result="$2"
    
    log "${BLUE}🔍 Testing admin panel access from $test_ip...${NC}"
    
    # Simulate access attempt from the specified IP
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-Forwarded-For: $test_ip" \
        "$ADMIN_PANEL_URL" 2>/dev/null || echo "000")
    
    if [ "$expected_result" = "denied" ] && [ "$response" != "200" ]; then
        log "${GREEN}✅ Access properly denied (HTTP $response)${NC}"
        return 0
    elif [ "$expected_result" = "allowed" ] && [ "$response" = "200" ]; then
        log "${GREEN}✅ Access properly allowed (HTTP $response)${NC}"
        return 0
    else
        log "${RED}❌ Unexpected access result (HTTP $response)${NC}"
        return 1
    fi
}

# Function to verify ex-employee access denial
verify_ex_employee_access() {
    log "${BLUE}🔍 Verifying ex-employee access denial...${NC}"
    
    # Get list of disabled peers
    local disabled_peers=$(grep -A 10 "DISABLED" "$WG_CONFIG_FILE" | grep "AllowedIPs" | sed 's/#.*AllowedIPs = //' || echo "")
    
    if [ -z "$disabled_peers" ]; then
        log "${YELLOW}⚠️  No disabled peers found${NC}"
        return 0
    fi
    
    local access_tests_passed=0
    local total_tests=0
    
    # Test each disabled peer's IP
    while IFS= read -r ip; do
        if [ -n "$ip" ]; then
            total_tests=$((total_tests + 1))
            if test_admin_access "$ip" "denied"; then
                access_tests_passed=$((access_tests_passed + 1))
            fi
        fi
    done <<< "$disabled_peers"
    
    log "Access denial tests: $access_tests_passed/$total_tests passed"
    
    if [ $access_tests_passed -eq $total_tests ]; then
        log "${GREEN}✅ All ex-employee access properly denied${NC}"
        return 0
    else
        log "${RED}❌ Some ex-employee access tests failed${NC}"
        return 1
    fi
}

# Function to generate new peer configuration
generate_new_peer() {
    local peer_name="$1"
    local allowed_ips="$2"
    
    log "${BLUE}🔑 Generating new peer configuration for: $peer_name${NC}"
    
    # Generate private and public keys
    local private_key=$(wg genkey)
    local public_key=$(echo "$private_key" | wg pubkey)
    
    # Generate preshared key
    local preshared_key=$(wg genpsk)
    
    # Create peer configuration
    local peer_config="# Peer: $peer_name
# Generated: $(date)
[Peer]
PublicKey = $public_key
PresharedKey = $preshared_key
AllowedIPs = $allowed_ips
"
    
    # Add to WireGuard configuration
    echo "$peer_config" >> "$WG_CONFIG_FILE"
    
    # Create client configuration
    local client_config="# WireGuard Client Configuration
# Peer: $peer_name
# Generated: $(date)

[Interface]
PrivateKey = $private_key
Address = $allowed_ips
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = $(grep 'PrivateKey' "$WG_CONFIG_FILE" | head -1 | sed 's/PrivateKey = //' | wg pubkey)
PresharedKey = $preshared_key
AllowedIPs = 0.0.0.0/0
Endpoint = $ADMIN_PANEL_URL:51820
PersistentKeepalive = 25
"
    
    # Save client configuration
    local client_file="/opt/wireguard/clients/$peer_name.conf"
    mkdir -p "/opt/wireguard/clients"
    echo "$client_config" > "$client_file"
    
    log "${GREEN}✅ New peer configuration generated:${NC}"
    log "  Server config added to: $WG_CONFIG_FILE"
    log "  Client config saved to: $client_file"
    log "  Public Key: ${public_key:0:20}..."
    
    # Reload configuration
    reload_wireguard
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                    - List all current peers"
    echo "  disable <identifier>    - Disable a peer by public key or name"
    echo "  verify                  - Verify ex-employee access is denied"
    echo "  generate <name> <ip>    - Generate new peer configuration"
    echo "  backup                  - Create backup of current configuration"
    echo "  test-access <ip>        - Test admin panel access from IP"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 disable abc123..."
    echo "  $0 disable 'John Doe'"
    echo "  $0 verify"
    echo "  $0 generate 'new-employee' '10.0.0.100/32'"
    echo "  $0 test-access '10.0.0.50'"
}

# Main execution
main() {
    # Check if running as root
    check_root
    
    # Create log file
    touch "$LOG_FILE"
    
    log "🚀 WireGuard Key Rotation Script Started"
    
    case "${1:-}" in
        "list")
            list_peers
            ;;
        "disable")
            if [ -z "$2" ]; then
                log "${RED}❌ Please provide peer identifier${NC}"
                show_usage
                exit 1
            fi
            disable_peer "$2" "${3:-Security rotation}"
            ;;
        "verify")
            verify_ex_employee_access
            ;;
        "generate")
            if [ -z "$2" ] || [ -z "$3" ]; then
                log "${RED}❌ Please provide peer name and IP${NC}"
                show_usage
                exit 1
            fi
            generate_new_peer "$2" "$3"
            ;;
        "backup")
            backup_config
            ;;
        "test-access")
            if [ -z "$2" ]; then
                log "${RED}❌ Please provide IP address${NC}"
                show_usage
                exit 1
            fi
            test_admin_access "$2" "denied"
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
    
    log "✅ WireGuard Key Rotation Script Completed"
}

# Run main function
main "$@" 