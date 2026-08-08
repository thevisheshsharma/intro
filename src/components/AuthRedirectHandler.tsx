'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter, usePathname } from 'next/navigation'

/**
 * AuthRedirectHandler - Handles post-login redirects for authenticated users
 *
 * When a user is authenticated on a marketing page, this component will:
 * 1. Check server-authoritative onboarding state with a Privy bearer token
 * 2. Redirect to /onboarding if not complete
 * 3. Redirect to /app if onboarding is complete
 */
export function AuthRedirectHandler() {
  const { ready, authenticated, user, getAccessToken } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!ready || !authenticated || !user) return

    // Marketing routes that should redirect to app when authenticated
    // Authenticated users must be able to remain on pricing to deliberately
    // start or change a subscription. Other marketing pages still redirect.
    const marketingRoutes = ['/', '/platform', '/use-cases', '/resources']
    const isMarketingPage = marketingRoutes.some(route =>
      pathname === route || pathname.startsWith(route + '/')
    )

    // Skip if already on app or onboarding pages
    if (pathname.startsWith('/app') || pathname.startsWith('/onboarding')) {
      return
    }

    // Only redirect from marketing pages
    if (isMarketingPage) {
      checkOnboardingStatus(getAccessToken).then(isComplete => {
        router.push(isComplete ? '/app' : '/onboarding')
      }).catch(() => {
        router.push('/onboarding')
      })
    }
  }, [ready, authenticated, user, pathname, router, getAccessToken])

  return null
}

/**
 * Check onboarding status from server
 */
async function checkOnboardingStatus(
  getAccessToken: () => Promise<string | null>
): Promise<boolean> {
  try {
    const token = await getAccessToken()
    if (!token) return false
    const response = await fetch('/api/user/session', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (response.ok) {
      const data = await response.json()
      return data.onboardingComplete === true
    }
    return false
  } catch {
    return false
  }
}
