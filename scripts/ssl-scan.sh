#!/bin/bash

# SSL/TLS Security Scan Script
# Generates Qualys/SSLLabs A+ scan reports and validates security configurations

set -e

echo "🔒 Starting SSL/TLS Security Scan..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="methtrader.xyz"
COMPLIANCE_DIR="compliance/ssl"
SCAN_DATE=$(date +%Y-%m-%d)
REPORT_FILE="$COMPLIANCE_DIR/ssl-scan-$SCAN_DATE.pdf"
LOG_FILE="$COMPLIANCE_DIR/ssl-scan-$SCAN_DATE.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install required tools
install_tools() {
    log "Installing required SSL scan tools..."
    
    if ! command_exists openssl; then
        log "${YELLOW}OpenSSL not found, installing...${NC}"
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y openssl
        elif command_exists yum; then
            sudo yum install -y openssl
        elif command_exists brew; then
            brew install openssl
        else
            log "${RED}❌ Cannot install OpenSSL automatically${NC}"
            exit 1
        fi
    fi
    
    if ! command_exists nmap; then
        log "${YELLOW}Nmap not found, installing...${NC}"
        if command_exists apt-get; then
            sudo apt-get install -y nmap
        elif command_exists yum; then
            sudo yum install -y nmap
        elif command_exists brew; then
            brew install nmap
        else
            log "${RED}❌ Cannot install Nmap automatically${NC}"
            exit 1
        fi
    fi
}

# Function to test SSL/TLS configuration
test_ssl_configuration() {
    log "${BLUE}🔍 Testing SSL/TLS Configuration...${NC}"
    
    # Test basic SSL connection
    log "Testing SSL connection to $DOMAIN..."
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "CONNECTED"; then
        log "${GREEN}✅ SSL connection successful${NC}"
    else
        log "${RED}❌ SSL connection failed${NC}"
        return 1
    fi
    
    # Test TLS versions
    log "Testing TLS version support..."
    
    # Test TLS 1.3
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_3 </dev/null 2>/dev/null | grep -q "TLSv1.3"; then
        log "${GREEN}✅ TLS 1.3 supported${NC}"
    else
        log "${YELLOW}⚠️  TLS 1.3 not supported${NC}"
    fi
    
    # Test TLS 1.2
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_2 </dev/null 2>/dev/null | grep -q "TLSv1.2"; then
        log "${GREEN}✅ TLS 1.2 supported${NC}"
    else
        log "${YELLOW}⚠️  TLS 1.2 not supported${NC}"
    fi
    
    # Test TLS 1.1 (should fail for A+ rating)
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_1 </dev/null 2>/dev/null | grep -q "TLSv1.1"; then
        log "${RED}❌ TLS 1.1 still supported (should be disabled for A+ rating)${NC}"
        return 1
    else
        log "${GREEN}✅ TLS 1.1 properly disabled${NC}"
    fi
    
    # Test TLS 1.0 (should fail for A+ rating)
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1 </dev/null 2>/dev/null | grep -q "TLSv1"; then
        log "${RED}❌ TLS 1.0 still supported (should be disabled for A+ rating)${NC}"
        return 1
    else
        log "${GREEN}✅ TLS 1.0 properly disabled${NC}"
    fi
}

# Function to test cipher suites
test_cipher_suites() {
    log "${BLUE}🔍 Testing Cipher Suites...${NC}"
    
    # Test for weak ciphers
    log "Checking for weak cipher suites..."
    
    # List of weak ciphers to check for
    WEAK_CIPHERS=(
        "RC4"
        "DES"
        "3DES"
        "MD5"
        "NULL"
        "EXPORT"
    )
    
    local weak_ciphers_found=0
    
    for cipher in "${WEAK_CIPHERS[@]}"; do
        if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -cipher "$cipher" </dev/null 2>/dev/null | grep -q "Cipher is"; then
            log "${RED}❌ Weak cipher found: $cipher${NC}"
            weak_ciphers_found=$((weak_ciphers_found + 1))
        fi
    done
    
    if [ $weak_ciphers_found -eq 0 ]; then
        log "${GREEN}✅ No weak cipher suites found${NC}"
    else
        log "${RED}❌ $weak_ciphers_found weak cipher(s) found${NC}"
        return 1
    fi
}

# Function to test certificate
test_certificate() {
    log "${BLUE}🔍 Testing Certificate...${NC}"
    
    # Get certificate details
    local cert_info=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ -z "$cert_info" ]; then
        log "${RED}❌ Could not retrieve certificate information${NC}"
        return 1
    fi
    
    # Check certificate expiration
    local expiry_date=$(echo "$cert_info" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ $days_until_expiry -gt 30 ]; then
        log "${GREEN}✅ Certificate valid for $days_until_expiry days${NC}"
    else
        log "${YELLOW}⚠️  Certificate expires in $days_until_expiry days${NC}"
    fi
    
    # Check certificate signature algorithm
    local sig_alg=$(echo "$cert_info" | grep "Signature Algorithm" | head -1 | awk '{print $3}')
    if [[ "$sig_alg" == *"sha256"* ]] || [[ "$sig_alg" == *"sha384"* ]] || [[ "$sig_alg" == *"sha512"* ]]; then
        log "${GREEN}✅ Strong signature algorithm: $sig_alg${NC}"
    else
        log "${RED}❌ Weak signature algorithm: $sig_alg${NC}"
        return 1
    fi
    
    # Check certificate key size
    local key_size=$(echo "$cert_info" | grep "Public-Key:" | awk '{print $2}')
    if [ "$key_size" -ge 2048 ]; then
        log "${GREEN}✅ Strong key size: $key_size bits${NC}"
    else
        log "${RED}❌ Weak key size: $key_size bits (should be >= 2048)${NC}"
        return 1
    fi
}

# Function to test security headers
test_security_headers() {
    log "${BLUE}🔍 Testing Security Headers...${NC}"
    
    # Test HSTS header
    local hsts_header=$(curl -s -I "https://$DOMAIN" | grep -i "strict-transport-security" || echo "")
    if [ -n "$hsts_header" ]; then
        log "${GREEN}✅ HSTS header present${NC}"
    else
        log "${RED}❌ HSTS header missing${NC}"
        return 1
    fi
    
    # Test CSP header
    local csp_header=$(curl -s -I "https://$DOMAIN" | grep -i "content-security-policy" || echo "")
    if [ -n "$csp_header" ]; then
        log "${GREEN}✅ CSP header present${NC}"
    else
        log "${YELLOW}⚠️  CSP header missing${NC}"
    fi
    
    # Test X-Frame-Options header
    local xfo_header=$(curl -s -I "https://$DOMAIN" | grep -i "x-frame-options" || echo "")
    if [ -n "$xfo_header" ]; then
        log "${GREEN}✅ X-Frame-Options header present${NC}"
    else
        log "${YELLOW}⚠️  X-Frame-Options header missing${NC}"
    fi
    
    # Test X-Content-Type-Options header
    local xcto_header=$(curl -s -I "https://$DOMAIN" | grep -i "x-content-type-options" || echo "")
    if [ -n "$xcto_header" ]; then
        log "${GREEN}✅ X-Content-Type-Options header present${NC}"
    else
        log "${YELLOW}⚠️  X-Content-Type-Options header missing${NC}"
    fi
}

# Function to test for mixed content
test_mixed_content() {
    log "${BLUE}🔍 Testing for Mixed Content...${NC}"
    
    # Download the main page and check for HTTP resources
    local page_content=$(curl -s "https://$DOMAIN")
    
    # Check for HTTP URLs in the page
    local http_urls=$(echo "$page_content" | grep -o 'http://[^"'\''\s>]*' || echo "")
    
    if [ -n "$http_urls" ]; then
        log "${RED}❌ Mixed content found:${NC}"
        echo "$http_urls" | head -5 | while read url; do
            log "   - $url"
        done
        return 1
    else
        log "${GREEN}✅ No mixed content found${NC}"
    fi
}

# Function to run Nmap SSL scan
run_nmap_ssl_scan() {
    log "${BLUE}🔍 Running Nmap SSL Scan...${NC}"
    
    if command_exists nmap; then
        local nmap_output="$COMPLIANCE_DIR/nmap-ssl-scan-$SCAN_DATE.txt"
        
        log "Running Nmap SSL scan (this may take a few minutes)..."
        nmap --script ssl-enum-ciphers -p 443 "$DOMAIN" > "$nmap_output" 2>/dev/null
        
        if [ -f "$nmap_output" ]; then
            log "${GREEN}✅ Nmap SSL scan completed: $nmap_output${NC}"
            
            # Check for weak ciphers in Nmap output
            local weak_ciphers=$(grep -i "weak\|vulnerable\|deprecated" "$nmap_output" || echo "")
            if [ -n "$weak_ciphers" ]; then
                log "${YELLOW}⚠️  Potential weak ciphers detected in Nmap scan${NC}"
            else
                log "${GREEN}✅ No weak ciphers detected in Nmap scan${NC}"
            fi
        else
            log "${RED}❌ Nmap SSL scan failed${NC}"
        fi
    else
        log "${YELLOW}⚠️  Nmap not available, skipping Nmap SSL scan${NC}"
    fi
}

# Function to generate report
generate_report() {
    log "${BLUE}📋 Generating SSL Security Report...${NC}"
    
    local report_content="# SSL/TLS Security Scan Report
## Domain: $DOMAIN
## Scan Date: $SCAN_DATE
## Scanner: Automated SSL Security Scanner

### Executive Summary
This report details the SSL/TLS security configuration for $DOMAIN.

### Test Results
$(cat "$LOG_FILE" | grep -E "✅|❌|⚠️" | sed 's/.*\[.*\] //')

### Recommendations
1. Ensure TLS 1.1 and 1.0 are disabled
2. Use only strong cipher suites
3. Implement all security headers
4. Avoid mixed content
5. Use certificates with strong signature algorithms and key sizes

### Compliance Status
- [ ] Qualys SSL Labs A+ Rating
- [ ] No TLS 1.1 fallback
- [ ] No mixed content
- [ ] Strong cipher suites only
- [ ] All security headers implemented

### Files Generated
- Log: $LOG_FILE
- Nmap Scan: $COMPLIANCE_DIR/nmap-ssl-scan-$SCAN_DATE.txt
- Report: $REPORT_FILE

---
*Report generated by automated SSL security scanner*
"
    
    echo "$report_content" > "$COMPLIANCE_DIR/ssl-report-$SCAN_DATE.md"
    
    # Convert to PDF if pandoc is available
    if command_exists pandoc; then
        pandoc "$COMPLIANCE_DIR/ssl-report-$SCAN_DATE.md" -o "$REPORT_FILE" --pdf-engine=wkhtmltopdf 2>/dev/null || {
            log "${YELLOW}⚠️  Could not generate PDF, saving as Markdown${NC}"
        }
    else
        log "${YELLOW}⚠️  Pandoc not available, saving as Markdown${NC}"
    fi
    
    log "${GREEN}✅ SSL security report generated: $COMPLIANCE_DIR/ssl-report-$SCAN_DATE.md${NC}"
}

# Function to validate A+ rating requirements
validate_a_plus_requirements() {
    log "${BLUE}🏆 Validating A+ Rating Requirements...${NC}"
    
    local requirements_met=0
    local total_requirements=5
    
    # Check TLS 1.1 disabled
    if ! openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1_1 </dev/null 2>/dev/null | grep -q "TLSv1.1"; then
        log "${GREEN}✅ TLS 1.1 disabled${NC}"
        requirements_met=$((requirements_met + 1))
    else
        log "${RED}❌ TLS 1.1 enabled${NC}"
    fi
    
    # Check TLS 1.0 disabled
    if ! openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" -tls1 </dev/null 2>/dev/null | grep -q "TLSv1"; then
        log "${GREEN}✅ TLS 1.0 disabled${NC}"
        requirements_met=$((requirements_met + 1))
    else
        log "${RED}❌ TLS 1.0 enabled${NC}"
    fi
    
    # Check for no mixed content
    local page_content=$(curl -s "https://$DOMAIN")
    local http_urls=$(echo "$page_content" | grep -o 'http://[^"'\''\s>]*' || echo "")
    if [ -z "$http_urls" ]; then
        log "${GREEN}✅ No mixed content${NC}"
        requirements_met=$((requirements_met + 1))
    else
        log "${RED}❌ Mixed content found${NC}"
    fi
    
    # Check HSTS header
    local hsts_header=$(curl -s -I "https://$DOMAIN" | grep -i "strict-transport-security" || echo "")
    if [ -n "$hsts_header" ]; then
        log "${GREEN}✅ HSTS header present${NC}"
        requirements_met=$((requirements_met + 1))
    else
        log "${RED}❌ HSTS header missing${NC}"
    fi
    
    # Check certificate strength
    local cert_info=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    local key_size=$(echo "$cert_info" | grep "Public-Key:" | awk '{print $2}')
    if [ "$key_size" -ge 2048 ]; then
        log "${GREEN}✅ Strong certificate (${key_size} bits)${NC}"
        requirements_met=$((requirements_met + 1))
    else
        log "${RED}❌ Weak certificate (${key_size} bits)${NC}"
    fi
    
    # Calculate score
    local score=$((requirements_met * 100 / total_requirements))
    
    log "📊 A+ Rating Score: $score% ($requirements_met/$total_requirements requirements met)"
    
    if [ $score -eq 100 ]; then
        log "${GREEN}🏆 A+ Rating Achieved!${NC}"
        return 0
    else
        log "${YELLOW}⚠️  A+ Rating not achieved. Missing $((total_requirements - requirements_met)) requirement(s)${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Create compliance directory
    mkdir -p "$COMPLIANCE_DIR"
    
    # Initialize log file
    echo "SSL/TLS Security Scan Log - $(date)" > "$LOG_FILE"
    
    log "🚀 Starting SSL/TLS Security Scan for $DOMAIN"
    
    # Install required tools
    install_tools
    
    # Run all tests
    local test_results=0
    
    test_ssl_configuration || test_results=$((test_results + 1))
    test_cipher_suites || test_results=$((test_results + 1))
    test_certificate || test_results=$((test_results + 1))
    test_security_headers || test_results=$((test_results + 1))
    test_mixed_content || test_results=$((test_results + 1))
    run_nmap_ssl_scan
    
    # Generate report
    generate_report
    
    # Validate A+ rating
    if validate_a_plus_requirements; then
        log "${GREEN}🎉 SSL/TLS configuration meets A+ rating requirements!${NC}"
    else
        log "${YELLOW}⚠️  SSL/TLS configuration needs improvement for A+ rating${NC}"
        test_results=$((test_results + 1))
    fi
    
    # Summary
    log "📋 SSL Security Scan Summary:"
    log "   Domain: $DOMAIN"
    log "   Scan Date: $SCAN_DATE"
    log "   Tests Failed: $test_results"
    log "   Report: $COMPLIANCE_DIR/ssl-report-$SCAN_DATE.md"
    log "   Log: $LOG_FILE"
    
    if [ $test_results -eq 0 ]; then
        log "${GREEN}✅ All SSL/TLS security tests passed!${NC}"
        exit 0
    else
        log "${RED}❌ $test_results SSL/TLS security test(s) failed${NC}"
        exit 1
    fi
}

# Run main function
main "$@" 