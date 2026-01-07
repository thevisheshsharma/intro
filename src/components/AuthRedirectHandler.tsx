'use client'

import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter, usePathname } from 'next/navigation'

/**
 * AuthRedirectHandler - Handles post-login redirects for authenticated users
 *
 * When a user is authenticated on a marketing page, this component will:
 * 1. Check if onboarding is complete (via cookie and server-side check)
 * 2. Redirect to /onboarding if not complete
 * 3. Redirect to /app if onboarding is complete
 */
export function AuthRedirectHandler() {
  const { ready, authenticated, user } = usePrivy()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!ready || !authenticated || !user) return

    // Marketing routes that should redirect to app when authenticated
    const marketingRoutes = ['/', '/pricing', '/platform', '/use-cases', '/resources']
    const isMarketingPage = marketingRoutes.some(route =>
      pathname === route || pathname.startsWith(route + '/')
    )

    // Skip if already on app or onboarding pages
    if (pathname.startsWith('/app') || pathname.startsWith('/onboarding')) {
      return
    }

    // Only redirect from marketing pages
    if (isMarketingPage) {
      // Check both cookie and attempt to verify with server
      const onboardingComplete = document.cookie.includes('onboarding-complete=true')

      if (onboardingComplete) {
        router.push('/app')
      } else {
        // Check with server to be sure
        checkOnboardingStatus().then(isComplete => {
          if (isComplete) {
            // Set cookie if server says complete but cookie missing
            document.cookie = 'onboarding-complete=true; path=/; max-age=31536000; SameSite=Lax'
            router.push('/app')
          } else {
            router.push('/onboarding')
          }
        }).catch(() => {
          // On error, fall back to cookie check
          router.push(onboardingComplete ? '/app' : '/onboarding')
        })
      }
    }
  }, [ready, authenticated, user, pathname, router])

  return null
}

/**
 * Check onboarding status from server
 */
async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/user/session', {
      credentials: 'include'
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
