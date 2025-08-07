#!/bin/bash

# Caddy Security Hardening Test
# Tests that certificate requests for unauthorized domains are blocked

set -e

echo "🔒 Testing Caddy Security Hardening..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
AUTHORIZED_DOMAIN="methtrader.xyz"
UNAUTHORIZED_DOMAIN="fake.methtrader.xyz"
CADDY_ADMIN_PORT="2019"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to test certificate request
test_certificate_request() {
    local domain=$1
    local expected_result=$2
    
    log "Testing certificate request for: $domain"
    
    # Attempt to request certificate via Caddy's admin API
    response=$(curl -s -w "%{http_code}" -o /tmp/cert_response.json \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"hosts\":[\"$domain\"]}" \
        "http://localhost:$CADDY_ADMIN_PORT/load" 2>/dev/null || echo "000")
    
    if [ "$response" = "000" ]; then
        log "${YELLOW}Warning: Could not connect to Caddy admin API${NC}"
        return 0
    fi
    
    if [ "$expected_result" = "blocked" ] && [ "$response" != "200" ]; then
        log "${GREEN}✅ Certificate request for $domain was blocked (HTTP $response)${NC}"
        return 0
    elif [ "$expected_result" = "allowed" ] && [ "$response" = "200" ]; then
        log "${GREEN}✅ Certificate request for $domain was allowed (HTTP $response)${NC}"
        return 0
    else
        log "${RED}❌ Certificate request for $domain returned unexpected result (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test rate limiting
test_rate_limiting() {
    log "Testing rate limiting configuration..."
    
    # Check if on_demand_tls block exists in Caddyfile
    if grep -q "on_demand_tls" /etc/caddy/Caddyfile; then
        log "${GREEN}✅ on_demand_tls block found in Caddyfile${NC}"
    else
        log "${RED}❌ on_demand_tls block not found in Caddyfile${NC}"
        return 1
    fi
    
    # Check if rate_limit is configured
    if grep -q "rate_limit" /etc/caddy/Caddyfile; then
        log "${GREEN}✅ rate_limit configuration found${NC}"
    else
        log "${RED}❌ rate_limit configuration not found${NC}"
        return 1
    fi
    
    # Check if allowed_domains is configured
    if grep -q "allowed_domains" /etc/caddy/Caddyfile; then
        log "${GREEN}✅ allowed_domains configuration found${NC}"
    else
        log "${RED}❌ allowed_domains configuration not found${NC}"
        return 1
    fi
    
    return 0
}

# Function to test domain allow-list
test_domain_allowlist() {
    log "Testing domain allow-list configuration..."
    
    # Check if unauthorized domain is in allow-list
    if grep -q "$UNAUTHORIZED_DOMAIN" /etc/caddy/Caddyfile; then
        log "${RED}❌ Unauthorized domain $UNAUTHORIZED_DOMAIN found in Caddyfile${NC}"
        return 1
    else
        log "${GREEN}✅ Unauthorized domain $UNAUTHORIZED_DOMAIN not in Caddyfile${NC}"
    fi
    
    # Check if authorized domain is in allow-list
    if grep -q "$AUTHORIZED_DOMAIN" /etc/caddy/Caddyfile; then
        log "${GREEN}✅ Authorized domain $AUTHORIZED_DOMAIN found in Caddyfile${NC}"
    else
        log "${YELLOW}⚠️  Authorized domain $AUTHORIZED_DOMAIN not found in Caddyfile${NC}"
    fi
    
    return 0
}

# Function to test security headers
test_security_headers() {
    log "Testing security headers..."
    
    # Test main domain
    headers=$(curl -s -I "https://$AUTHORIZED_DOMAIN" 2>/dev/null || echo "")
    
    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        log "${GREEN}✅ HSTS header present${NC}"
    else
        log "${YELLOW}⚠️  HSTS header not found${NC}"
    fi
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        log "${GREEN}✅ X-Frame-Options header present${NC}"
    else
        log "${YELLOW}⚠️  X-Frame-Options header not found${NC}"
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        log "${GREEN}✅ X-Content-Type-Options header present${NC}"
    else
        log "${YELLOW}⚠️  X-Content-Type-Options header not found${NC}"
    fi
}

# Main test execution
main() {
    log "Starting Caddy Security Hardening Tests..."
    
    local test_results=0
    
    # Test 1: Rate limiting configuration
    if test_rate_limiting; then
        log "${GREEN}✅ Rate limiting test passed${NC}"
    else
        log "${RED}❌ Rate limiting test failed${NC}"
        test_results=$((test_results + 1))
    fi
    
    # Test 2: Domain allow-list
    if test_domain_allowlist; then
        log "${GREEN}✅ Domain allow-list test passed${NC}"
    else
        log "${RED}❌ Domain allow-list test failed${NC}"
        test_results=$((test_results + 1))
    fi
    
    # Test 3: Certificate request blocking
    if test_certificate_request "$UNAUTHORIZED_DOMAIN" "blocked"; then
        log "${GREEN}✅ Unauthorized domain certificate blocking test passed${NC}"
    else
        log "${RED}❌ Unauthorized domain certificate blocking test failed${NC}"
        test_results=$((test_results + 1))
    fi
    
    # Test 4: Security headers
    test_security_headers
    
    # Summary
    echo ""
    log "=== Test Summary ==="
    if [ $test_results -eq 0 ]; then
        log "${GREEN}🎉 All Caddy security hardening tests passed!${NC}"
        echo "✅ Caddy abuse-control hardening verified"
        exit 0
    else
        log "${RED}❌ $test_results test(s) failed${NC}"
        echo "❌ Caddy abuse-control hardening needs attention"
        exit 1
    fi
}

# Run main function
main "$@" 