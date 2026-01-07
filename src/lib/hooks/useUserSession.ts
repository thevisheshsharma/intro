'use client'

import { useQuery } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import type { PlanType, SubscriptionStatus } from '@/lib/subscription'

// Session data returned from the API
export interface UserSession {
  userId: string
  subscription: {
    plan: PlanType
    status: SubscriptionStatus
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    stripeCustomerId: string | null
  }
  isActive: boolean
  trialDaysLeft: number | null
  isTrialing: boolean
  isExpired: boolean
  onboardingComplete: boolean
}

// Query key for session - shared across all components
export const SESSION_QUERY_KEY = ['user', 'session'] as const

// Fetch session data from API
async function fetchSession(getAccessToken: () => Promise<string | null>): Promise<UserSession> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('No access token')
  }

  const response = await fetch('/api/user/session', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch session')
  }

  return response.json()
}

// Main hook for user session - cached and deduplicated
export function useUserSession() {
  const { ready, authenticated, getAccessToken } = usePrivy()

  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchSession(getAccessToken),
    // Only fetch when authenticated
    enabled: ready && authenticated,
    // Session data changes infrequently, cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Refetch when user returns to tab (important after Stripe checkout)
    refetchOnWindowFocus: true,
  })

  return {
    session,
    isLoading: !ready || (authenticated && isLoading),
    error: error?.message || null,
    refetch,
    // Derived subscription state
    subscription: session?.subscription || null,
    isTrialing: session?.isTrialing ?? false,
    isActive: session?.isActive ?? false,
    isExpired: session?.isExpired ?? false,
    trialDaysLeft: session?.trialDaysLeft ?? null,
  }
}
