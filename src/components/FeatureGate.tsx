'use client'

import { useUserSession } from '@/lib/hooks/useUserSession'
import { canAccessFeature, type FeatureKey } from '@/lib/features'
import { Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface FeatureGateProps {
  feature: FeatureKey
  children: React.ReactNode
  /**
   * Custom fallback component to show when access is denied.
   * If not provided, shows the default FeatureLockedFallback.
   */
  fallback?: React.ReactNode
}

/**
 * FeatureGate - Conditionally renders content based on feature access.
 *
 * Usage:
 * <FeatureGate feature="pathfinder">
 *   <PathfinderDashboard />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { session, isLoading } = useUserSession()

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null
  }

  const plan = session?.subscription?.plan ?? null
  const status = session?.subscription?.status ?? null

  const hasAccess = canAccessFeature(plan, status, feature)

  if (!hasAccess) {
    return fallback !== undefined ? (
      <>{fallback}</>
    ) : (
      <FeatureLockedFallback feature={feature} isExpired={session?.isExpired} />
    )
  }

  return <>{children}</>
}

interface FeatureLockedFallbackProps {
  feature: FeatureKey
  isExpired?: boolean
}

const FEATURE_NAMES: Record<FeatureKey, string> = {
  pathfinder: 'Pathfinder',
  companyIntel: 'Company Intelligence',
  peopleIntel: 'People Intelligence',
  csvExports: 'CSV Exports',
  advancedFilters: 'Advanced Filters',
  teamTools: 'Team Tools',
  apiAccess: 'API Access',
  sso: 'SSO',
}

const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  pathfinder: 'Map your network connections and discover warm intro paths to any target.',
  companyIntel: 'Deep AI-powered analysis of Web3 organizations and their ideal customer profiles.',
  peopleIntel: 'Find and analyze individuals connected to your target organizations.',
  csvExports: 'Export your data to CSV for further analysis.',
  advancedFilters: 'Filter and segment your network with advanced criteria.',
  teamTools: 'Collaborate with your team on network analysis.',
  apiAccess: 'Integrate Berri data into your own applications.',
  sso: 'Single Sign-On for enterprise security.',
}

/**
 * Default fallback shown when a feature is locked.
 */
function FeatureLockedFallback({ feature, isExpired }: FeatureLockedFallbackProps) {
  const featureName = FEATURE_NAMES[feature] || feature
  const featureDescription = FEATURE_DESCRIPTIONS[feature] || ''

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-3">
          {featureName} is Locked
        </h2>

        <p className="text-gray-600 mb-2">
          {featureDescription}
        </p>

        {isExpired ? (
          <p className="text-sm text-berri-raspberry mb-6">
            Your trial has expired. Upgrade to continue using this feature.
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            This feature is not available on your current plan.
          </p>
        )}

        <Link href="/app/settings/billing">
          <Button variant="brandAction" size="lg" className="rounded-full">
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

/**
 * Hook to check feature access programmatically.
 */
export function useFeatureAccess(feature: FeatureKey): {
  hasAccess: boolean
  isLoading: boolean
  isExpired: boolean
} {
  const { session, isLoading } = useUserSession()

  if (isLoading || !session) {
    return { hasAccess: false, isLoading: true, isExpired: false }
  }

  const plan = session.subscription?.plan ?? null
  const status = session.subscription?.status ?? null

  return {
    hasAccess: canAccessFeature(plan, status, feature),
    isLoading: false,
    isExpired: session.isExpired ?? false,
  }
}
