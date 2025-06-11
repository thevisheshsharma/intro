#!/bin/bash

# Production API Test Script
# Tests the Grok API endpoints in production

PRODUCTION_URL="https://intro-smoky.vercel.app"
LOCAL_URL="http://localhost:3000"

echo "🧪 Grok API Production Test Suite"
echo "=================================="
echo ""

# Test function
test_endpoint() {
    local url=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local description=$5
    
    echo "🔍 Testing: $description"
    echo "URL: $url$endpoint"
    echo "Method: $method"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$url$endpoint")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "$url$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "Status: $http_code"
    echo "Response: $response_body"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ PASS"
    elif [ "$http_code" = "401" ] && [ "$method" = "POST" ]; then
        echo "⚠️  EXPECTED (401 for unauthenticated POST)"
    else
        echo "❌ FAIL"
    fi
    echo "----------------------------------------"
    echo ""
}

# Test Production Endpoints
echo "🌐 PRODUCTION TESTS"
echo "==================="

test_endpoint "$PRODUCTION_URL" "GET" "/api/grok-analyze" "" "GET /api/grok-analyze (Health Check)"

test_endpoint "$PRODUCTION_URL" "POST" "/api/grok-analyze" '{"message":"test"}' "POST /api/grok-analyze (Unauthenticated)"

test_endpoint "$PRODUCTION_URL" "GET" "/api/grok-stream" "" "GET /api/grok-stream (Health Check)"

test_endpoint "$PRODUCTION_URL" "GET" "/api/grok-functions" "" "GET /api/grok-functions (Health Check)"

# Test Local Endpoints (if server is running)
echo "🏠 LOCAL TESTS (if server running)"
echo "=================================="

if curl -s -f "$LOCAL_URL/api/grok-analyze" > /dev/null 2>&1; then
    echo "Local server detected on port 3000"
    echo ""
    
    test_endpoint "$LOCAL_URL" "GET" "/api/grok-analyze" "" "GET /api/grok-analyze (Local)"
    
    test_endpoint "$LOCAL_URL" "POST" "/api/grok-analyze" '{"message":"test"}' "POST /api/grok-analyze (Local)"
else
    echo "ℹ️  Local server not running on port 3000"
    echo "   Start with: npm run dev"
fi

echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "✅ PASS = Working correctly"
echo "⚠️  EXPECTED = Expected behavior (like 401 for unauthenticated requests)"
echo "❌ FAIL = Needs investigation"
echo ""
echo "🔧 Common Issues:"
echo "- Redirect responses = Middleware configuration issue"
echo "- 500 errors = Environment variables or API key issue"
echo "- 404 errors = Deployment not updated"
echo "- 401 errors on POST = Expected (authentication required)"
echo ""
