#!/bin/bash

# Grok API Debug Script
# This script helps diagnose issues with the Grok API integration

echo "🔍 Grok API Integration Debug Report"
echo "==================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo "📅 Date: $(date)"
echo ""

# Check environment configuration
echo "🔧 Environment Configuration"
echo "----------------------------"
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    
    # Check for required environment variables (without showing values)
    if grep -q "GROK_API_KEY=" .env.local; then
        echo "✅ GROK_API_KEY is set in .env.local"
    else
        echo "❌ GROK_API_KEY is missing from .env.local"
    fi
    
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=" .env.local; then
        echo "✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set"
    else
        echo "❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing"
    fi
    
    if grep -q "CLERK_SECRET_KEY=" .env.local; then
        echo "✅ CLERK_SECRET_KEY is set"
    else
        echo "❌ CLERK_SECRET_KEY is missing"
    fi
else
    echo "❌ .env.local file does not exist"
    echo "💡 Tip: Copy .env.local.example to .env.local and fill in your API keys"
fi
echo ""

# Check file structure
echo "📂 File Structure Check"
echo "----------------------"
files_to_check=(
    "src/app/api/grok-analyze/route.ts"
    "src/app/api/grok-stream/route.ts"
    "src/app/api/grok-functions/route.ts"
    "src/lib/grok.ts"
    "src/middleware.ts"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done
echo ""

# Check TypeScript compilation
echo "🔨 TypeScript Compilation"
echo "-------------------------"
if npx tsc --noEmit; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
fi
echo ""

# Check Next.js build
echo "🏗️  Next.js Build Check"
echo "----------------------"
if npm run build > /dev/null 2>&1; then
    echo "✅ Next.js build successful"
else
    echo "❌ Next.js build failed"
    echo "💡 Run 'npm run build' for detailed error information"
fi
echo ""

# Test API endpoints (if server is running)
echo "🌐 API Endpoint Tests"
echo "--------------------"
if curl -s -f http://localhost:3000/api/grok-analyze > /dev/null 2>&1; then
    echo "✅ Local server is running on port 3000"
    
    # Test GET endpoint
    response=$(curl -s http://localhost:3000/api/grok-analyze)
    if echo "$response" | grep -q "Grok analyze endpoint is working"; then
        echo "✅ GET /api/grok-analyze is working"
    else
        echo "❌ GET /api/grok-analyze returned unexpected response"
    fi
else
    echo "ℹ️  Local server is not running or not accessible"
    echo "💡 Start the server with 'npm run dev' to test endpoints"
fi
echo ""

# Deployment status check
echo "🚀 Deployment Status"
echo "--------------------"
if [ -f "vercel.json" ] || grep -q "vercel" package.json; then
    echo "ℹ️  Project appears to be configured for Vercel deployment"
    echo "💡 Check Vercel dashboard for deployment logs and environment variables"
else
    echo "ℹ️  No Vercel configuration detected"
fi
echo ""

# Common issues and solutions
echo "🔧 Common Issues & Solutions"
echo "---------------------------"
echo "1. 500 Internal Server Error:"
echo "   - Check that GROK_API_KEY is set in production environment"
echo "   - Verify Clerk authentication is properly configured"
echo "   - Check deployment logs for specific error messages"
echo ""
echo "2. 401 Unauthorized Error:"
echo "   - Ensure user is logged in with Clerk"
echo "   - Verify Clerk middleware is properly configured"
echo "   - Check that authentication tokens are being passed correctly"
echo ""
echo "3. 403 Permission Denied (API Key Blocked):"
echo "   - Generate a new Grok API key from https://console.x.ai/"
echo "   - Update the GROK_API_KEY environment variable"
echo "   - Ensure the API key is not exposed in client-side code"
echo ""
echo "4. Middleware Issues:"
echo "   - Ensure using authMiddleware instead of deprecated withClerkMiddleware"
echo "   - Check that middleware config matcher is correct"
echo "   - Verify ignored routes are properly configured"
echo ""

echo "📋 Debug Report Complete"
echo "======================="
echo "For production issues, check:"
echo "1. Vercel dashboard logs"
echo "2. Environment variables in deployment"
echo "3. Function logs in monitoring tools"
echo ""
