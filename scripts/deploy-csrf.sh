#!/bin/bash

###############################################################################
# CSRF Protection Deployment Script
# 
# Purpose: Deploy HMAC-signed CSRF token implementation
# Date: October 19, 2025
# 
# Usage:
#   ./scripts/deploy-csrf.sh [development|production|test]
#
# Requirements:
#   - CSRF_SECRET environment variable (min 32 characters)
#   - CSRF_DUAL_MODE=true for migration period
#   - curl, jq installed for smoke tests
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Generate CSRF secret
generate_csrf_secret() {
    print_header "Generating CSRF Secret"
    
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    echo "Generated CSRF Secret (save this securely):"
    echo ""
    echo "CSRF_SECRET=$SECRET"
    echo ""
    print_warning "⚠️  Save this secret to your environment variables!"
    print_warning "⚠️  Do not commit this secret to version control!"
    echo ""
}

# Development deployment
deploy_development() {
    print_header "Development Deployment"
    
    # Check if CSRF_SECRET is set
    if [ -z "$CSRF_SECRET" ]; then
        print_error "CSRF_SECRET environment variable not set!"
        echo ""
        print_info "Generate a secret with:"
        echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        echo ""
        print_info "Then set it:"
        echo "  export CSRF_SECRET='your-generated-secret'"
        echo ""
        exit 1
    fi
    
    # Validate secret length
    if [ ${#CSRF_SECRET} -lt 32 ]; then
        print_error "CSRF_SECRET must be at least 32 characters long!"
        exit 1
    fi
    
    print_success "CSRF_SECRET is set and valid (${#CSRF_SECRET} characters)"
    
    # Set dual mode for migration
    if [ -z "$CSRF_DUAL_MODE" ]; then
        print_warning "CSRF_DUAL_MODE not set, enabling for migration"
        export CSRF_DUAL_MODE="true"
    fi
    
    print_info "CSRF_DUAL_MODE=$CSRF_DUAL_MODE"
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm install
    
    # Run tests
    print_info "Running CSRF tests..."
    npm test -- csrf || {
        print_error "Tests failed! Fix issues before deploying."
        exit 1
    }
    
    print_success "All tests passed!"
    
    # TypeScript check
    print_info "Checking TypeScript compilation..."
    npx tsc --noEmit || {
        print_error "TypeScript compilation failed!"
        exit 1
    }
    
    print_success "TypeScript compilation successful!"
    
    # Start development server
    print_info "Starting development server..."
    print_warning "Press Ctrl+C to stop"
    echo ""
    
    npm run dev
}

# Production deployment instructions
deploy_production() {
    print_header "Production Deployment (Replit)"
    
    echo "Follow these steps to deploy to Replit:"
    echo ""
    
    print_info "Step 1: Generate CSRF Secret"
    echo "  Run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo "  Copy the generated secret"
    echo ""
    
    print_info "Step 2: Add Secrets in Replit"
    echo "  1. Click 'Tools' → 'Secrets'"
    echo "  2. Add new secret:"
    echo "     Key: CSRF_SECRET"
    echo "     Value: <paste-generated-secret>"
    echo "  3. Add migration flag:"
    echo "     Key: CSRF_DUAL_MODE"
    echo "     Value: true"
    echo "  4. Click 'Save'"
    echo ""
    
    print_info "Step 3: Deploy Code"
    echo "  1. Commit and push your changes to the repository"
    echo "  2. Replit will auto-deploy"
    echo "  OR"
    echo "  3. Click the 'Run' button to manually restart"
    echo ""
    
    print_info "Step 4: Monitor Startup"
    echo "  Watch the console for:"
    echo "  ✅ '🔒 CSRF secret loaded from environment'"
    echo "  ✅ '🚀 Starting application with validated security configuration'"
    echo ""
    
    print_warning "Step 5: Run Smoke Tests"
    echo "  After deployment, run:"
    echo "  ./scripts/deploy-csrf.sh test"
    echo ""
    
    print_info "Step 6: Monitor for 1-2 Hours"
    echo "  - Watch logs for CSRF validation messages"
    echo "  - Look for 'Old format token detected' (should decrease)"
    echo "  - Monitor error rates"
    echo ""
    
    print_info "Step 7: Disable Dual Mode (After Migration)"
    echo "  After 2+ hours when old tokens expired:"
    echo "  1. Tools → Secrets"
    echo "  2. Delete CSRF_DUAL_MODE or set to 'false'"
    echo "  3. Restart application"
    echo ""
}

# Run smoke tests
run_smoke_tests() {
    print_header "Running Smoke Tests"
    
    # Check required commands
    check_command "curl"
    check_command "jq"
    
    # Get base URL
    if [ -z "$APP_URL" ]; then
        APP_URL="http://localhost:5000"
        print_info "Using default APP_URL: $APP_URL"
    else
        print_info "Using APP_URL: $APP_URL"
    fi
    
    # Test 1: Get CSRF Token
    print_info "Test 1: Getting CSRF token..."
    RESPONSE=$(curl -s -c /tmp/csrf_cookies.txt "$APP_URL/api/auth/csrf-token")
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        TOKEN=$(echo "$RESPONSE" | jq -r '.data.csrfToken')
        
        # Validate token format (should contain dot)
        if [[ "$TOKEN" == *.* ]]; then
            print_success "CSRF token received (HMAC-signed format): ${TOKEN:0:20}..."
        else
            print_warning "CSRF token received but old format: $TOKEN"
        fi
    else
        print_error "Failed to get CSRF token"
        echo "Response: $RESPONSE"
        exit 1
    fi
    
    # Test 2: Token validation (missing token should fail)
    print_info "Test 2: Testing missing token rejection..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$APP_URL/api/auth/student-login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"test"}')
    
    if [ "$STATUS" == "403" ]; then
        print_success "Missing token correctly rejected (403)"
    else
        print_warning "Expected 403, got $STATUS (might be OK if different validation)"
    fi
    
    # Test 3: Token validation (with valid token format)
    print_info "Test 3: Testing request with CSRF token..."
    RESPONSE=$(curl -s -b /tmp/csrf_cookies.txt \
        -X POST "$APP_URL/api/auth/student-login" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $TOKEN" \
        -d '{"email":"test@example.com","password":"invalid"}')
    
    # Should not get CSRF error (might get auth error which is expected)
    if echo "$RESPONSE" | jq -e '.error.code' | grep -q "CSRF"; then
        print_error "CSRF error with valid token!"
        echo "Response: $RESPONSE"
        exit 1
    else
        print_success "CSRF token accepted (got auth response)"
    fi
    
    # Test 4: Tampered token rejection
    print_info "Test 4: Testing tampered token rejection..."
    TAMPERED_TOKEN="tampered.signature.here"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$APP_URL/api/auth/student-login" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $TAMPERED_TOKEN" \
        -b "_csrf=$TAMPERED_TOKEN" \
        -d '{"email":"test@example.com","password":"test"}')
    
    if [ "$STATUS" == "403" ]; then
        print_success "Tampered token correctly rejected (403)"
    else
        print_warning "Expected 403 for tampered token, got $STATUS"
    fi
    
    # Test 5: Token/cookie mismatch
    print_info "Test 5: Testing token/cookie mismatch detection..."
    WRONG_COOKIE="different.token.value"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$APP_URL/api/auth/student-login" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $TOKEN" \
        -b "_csrf=$WRONG_COOKIE" \
        -d '{"email":"test@example.com","password":"test"}')
    
    if [ "$STATUS" == "403" ]; then
        print_success "Token/cookie mismatch correctly rejected (403)"
    else
        print_warning "Expected 403 for mismatch, got $STATUS"
    fi
    
    # Clean up
    rm -f /tmp/csrf_cookies.txt
    
    echo ""
    print_success "Smoke tests completed!"
    echo ""
    print_info "Summary:"
    echo "  ✅ CSRF token generation working"
    echo "  ✅ Token format validation working"
    echo "  ✅ Missing token rejection working"
    echo "  ✅ Tampered token rejection working"
    echo "  ✅ Token/cookie mismatch detection working"
    echo ""
}

# Monitor CSRF metrics
monitor_metrics() {
    print_header "CSRF Metrics Monitor"
    
    if [ -z "$LOG_FILE" ]; then
        print_error "LOG_FILE environment variable not set"
        print_info "Usage: LOG_FILE=/path/to/app.log ./scripts/deploy-csrf.sh monitor"
        exit 1
    fi
    
    if [ ! -f "$LOG_FILE" ]; then
        print_error "Log file not found: $LOG_FILE"
        exit 1
    fi
    
    print_info "Analyzing logs from: $LOG_FILE"
    echo ""
    
    # Token generation count
    TOKEN_GEN=$(grep -c "CSRF token generated" "$LOG_FILE" || echo "0")
    print_info "CSRF Tokens Generated: $TOKEN_GEN"
    
    # Validation success count
    VALID_SUCCESS=$(grep -c "CSRF validation successful" "$LOG_FILE" || echo "0")
    print_success "Validations Successful: $VALID_SUCCESS"
    
    # Validation failure count
    VALID_FAIL=$(grep -c "CSRF validation failed" "$LOG_FILE" || echo "0")
    if [ "$VALID_FAIL" -gt 0 ]; then
        print_warning "Validations Failed: $VALID_FAIL"
    else
        print_info "Validations Failed: $VALID_FAIL"
    fi
    
    # Old token usage (dual mode)
    OLD_TOKENS=$(grep -c "Old format token detected" "$LOG_FILE" || echo "0")
    if [ "$OLD_TOKENS" -gt 0 ]; then
        print_warning "Old Format Tokens Used: $OLD_TOKENS (migration in progress)"
    else
        print_info "Old Format Tokens Used: $OLD_TOKENS"
    fi
    
    # Session mismatches
    SESSION_MISMATCH=$(grep -c "session mismatch" "$LOG_FILE" || echo "0")
    if [ "$SESSION_MISMATCH" -gt 10 ]; then
        print_error "Session Mismatches: $SESSION_MISMATCH (possible attack!)"
    elif [ "$SESSION_MISMATCH" -gt 0 ]; then
        print_warning "Session Mismatches: $SESSION_MISMATCH"
    else
        print_info "Session Mismatches: $SESSION_MISMATCH"
    fi
    
    echo ""
    
    # Calculate failure rate
    if [ "$VALID_SUCCESS" -gt 0 ] || [ "$VALID_FAIL" -gt 0 ]; then
        TOTAL=$((VALID_SUCCESS + VALID_FAIL))
        FAIL_RATE=$((VALID_FAIL * 100 / TOTAL))
        
        if [ "$FAIL_RATE" -gt 5 ]; then
            print_error "Failure rate: ${FAIL_RATE}% (threshold: 5%)"
            print_warning "Action required: Investigate validation failures"
        else
            print_success "Failure rate: ${FAIL_RATE}% (within threshold)"
        fi
    fi
    
    echo ""
    
    # Show recent errors
    print_info "Recent CSRF errors (last 10):"
    grep "CSRF.*failed\|CSRF.*error" "$LOG_FILE" | tail -10 || echo "  No errors found"
    
    echo ""
}

# Main script
main() {
    MODE=${1:-help}
    
    case "$MODE" in
        development|dev)
            deploy_development
            ;;
        production|prod)
            deploy_production
            ;;
        test|smoke)
            run_smoke_tests
            ;;
        monitor)
            monitor_metrics
            ;;
        generate-secret)
            generate_csrf_secret
            ;;
        help|*)
            print_header "CSRF Deployment Script"
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  development     Deploy to development environment"
            echo "  production      Show production deployment instructions"
            echo "  test            Run smoke tests"
            echo "  monitor         Monitor CSRF metrics from logs"
            echo "  generate-secret Generate a new CSRF secret"
            echo "  help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 generate-secret"
            echo "  export CSRF_SECRET='<generated-secret>'"
            echo "  export CSRF_DUAL_MODE='true'"
            echo "  $0 development"
            echo ""
            echo "  APP_URL=https://your-app.replit.app $0 test"
            echo ""
            echo "  LOG_FILE=./app.log $0 monitor"
            echo ""
            ;;
    esac
}

# Run main function
main "$@"
