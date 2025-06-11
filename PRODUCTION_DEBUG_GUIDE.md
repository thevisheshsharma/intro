# Production 500 Error Debug Guide

## Issue Summary
**Environment**: Production (Vercel deployment)
**Error**: `POST https://intro-smoky.vercel.app/api/grok-analyze 500 (Internal Server Error)`
**Status**: Error traced to authentication and environment configuration issues

## Root Cause Analysis

### Primary Issues Identified:
1. **Deprecated Middleware**: Using `withClerkMiddleware` instead of `authMiddleware`
2. **Missing Environment Variables**: Production environment may lack required API keys
3. **Authentication Flow**: Middleware redirecting API calls incorrectly
4. **Error Handling**: Insufficient logging in production environment

## Fixes Applied

### 1. Middleware Modernization ✅
**File**: `/src/middleware.ts`
**Change**: Updated from deprecated `withClerkMiddleware` to `authMiddleware`
```typescript
// Before (deprecated)
import { withClerkMiddleware, getAuth } from "@clerk/nextjs/server";

// After (current)
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/"],
  ignoredRoutes: ["/api/grok-analyze", "/api/grok-stream", "/api/grok-functions"],
});
```

### 2. Enhanced Error Handling ✅
**Files**: All Grok API routes
**Changes**: Added comprehensive logging and API key validation
- Environment variable validation before API calls
- Detailed console logging for debugging
- Proper error message propagation

### 3. Authentication Flow Fix ✅
**Issue**: API routes were being redirected to sign-in page
**Solution**: Updated middleware to properly handle API routes without redirecting

## Production Deployment Checklist

### Environment Variables (Critical)
Ensure these are set in Vercel dashboard:
- [ ] `GROK_API_KEY` - Valid xAI API key
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- [ ] `CLERK_SECRET_KEY` - Clerk secret key
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SOCIALAPI_BEARER_TOKEN` - Social API token (if used)

### Deployment Steps
1. **Build Verification**
   ```bash
   npm run build
   ```
   Should complete without TypeScript errors

2. **Environment Variable Check**
   - Visit Vercel project dashboard
   - Go to Settings → Environment Variables
   - Verify all required variables are set
   - Redeploy if variables were added/updated

3. **Middleware Configuration**
   - Ensure `src/middleware.ts` uses `authMiddleware`
   - Verify matcher configuration includes API routes
   - Check that Grok API routes are in `ignoredRoutes`

4. **API Route Testing**
   - Test GET endpoint: `curl https://intro-smoky.vercel.app/api/grok-analyze`
   - Should return: `{"message":"Grok analyze endpoint is working",...}`

## Debug Production Issues

### 1. Check Vercel Function Logs
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login and link project
vercel login
vercel link

# View function logs
vercel logs --follow
```

### 2. Test API Endpoints
```bash
# Test GET endpoint (should work without auth)
curl https://intro-smoky.vercel.app/api/grok-analyze

# Test POST endpoint (requires auth)
curl -X POST https://intro-smoky.vercel.app/api/grok-analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### 3. Check Client-Side Authentication
- Verify user is logged in via Clerk
- Check that authentication headers are being sent
- Inspect network tab for request details

## Expected Error Patterns

### ✅ Valid Responses
- `200 OK` with Grok response content
- `401 Unauthorized` if user not logged in
- `400 Bad Request` if message is missing

### ❌ Problem Indicators
- `500 Internal Server Error` - Environment/API key issues
- `403 Permission Denied` - Blocked or invalid API key
- Redirect to sign-in page - Middleware configuration issue

## Immediate Actions Required

1. **Verify Grok API Key**
   - Check if current key is valid/not blocked
   - Generate new key if needed from https://console.x.ai/
   - Update Vercel environment variables

2. **Redeploy Application**
   ```bash
   # After updating environment variables
   vercel --prod
   ```

3. **Monitor Logs**
   - Watch Vercel function logs during testing
   - Check for specific error messages
   - Verify authentication flow

## Testing Script

Use the provided debug script:
```bash
./debug-grok.sh
```

This will check:
- Local environment configuration
- File structure integrity
- TypeScript compilation
- Build process
- API endpoint accessibility

## Success Criteria

✅ API endpoints return expected responses
✅ Authentication flow works correctly  
✅ Error messages are descriptive and logged
✅ Environment variables are properly configured
✅ No TypeScript compilation errors
✅ Successful production build and deployment

## Next Steps

1. Run debug script locally: `./debug-grok.sh`
2. Verify environment variables in Vercel dashboard
3. Redeploy application with fixed middleware
4. Test API endpoints in production
5. Monitor logs for any remaining issues
