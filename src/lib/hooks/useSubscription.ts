'use client'

import { useUserSession } from './useUserSession'
import type { PlanType, SubscriptionStatus } from '@/lib/subscription'

interface SubscriptionData {
  plan: PlanType
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId?: string | null
}

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null
  isLoading: boolean
  error: string | null
  isTrialing: boolean
  isActive: boolean
  isExpired: boolean
  trialDaysLeft: number | null
  refetch: () => Promise<any>
}

// This hook now uses the shared useUserSession hook
// Multiple components using useSubscription will share the same cached data
export function useSubscription(): UseSubscriptionReturn {
  const {
    subscription,
    isLoading,
    error,
    isTrialing,
    isActive,
    isExpired,
    trialDaysLeft,
    refetch,
  } = useUserSession()

  return {
    subscription,
    isLoading,
    error,
    isTrialing,
    isActive,
    isExpired,
    trialDaysLeft,
    refetch,
  }
}
