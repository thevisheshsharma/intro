'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { PLAN_NAMES, PLAN_DESCRIPTIONS, PLAN_FEATURES } from '@/lib/features'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PlanBadge } from '@/components/subscription/PlanBadge'
import {
  CreditCard,
  Calendar,
  Crown,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

export default function BillingPage() {
  const { getAccessToken } = usePrivy()
  const { subscription, isLoading, isTrialing, isActive, trialDaysLeft } = useSubscription()
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true)
      setError(null)

      const token = await getAccessToken()
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setPortalLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const planName = subscription?.plan ? PLAN_NAMES[subscription.plan] : 'Free'
  const planDescription = subscription?.plan ? PLAN_DESCRIPTIONS[subscription.plan] : ''
  const features = subscription?.plan ? PLAN_FEATURES[subscription.plan] : null

  return (
    <div className="min-h-screen py-8 px-6 lg:px-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-500">Manage your subscription and billing details</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Current Plan</h2>
              <p className="text-gray-500 text-sm">{planDescription}</p>
            </div>
            <PlanBadge />
          </div>

          {/* Trial Info */}
          {isTrialing && trialDaysLeft !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">
                  {trialDaysLeft === 0
                    ? 'Your trial ends today'
                    : trialDaysLeft === 1
                    ? 'Your trial ends tomorrow'
                    : `${trialDaysLeft} days left in your trial`}
                </p>
                <p className="text-amber-700 text-sm">
                  Upgrade to continue using all features after your trial ends.
                </p>
              </div>
            </div>
          )}

          {/* Plan Features */}
          {features && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(features).map(([key, value]) => {
                if (key === 'seats') return null
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${value ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={`text-sm ${value ? 'text-gray-700' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing">
              <Button variant="brand" className="rounded-full">
                <Crown className="w-4 h-4 mr-2" />
                {isActive && !isTrialing ? 'Change Plan' : 'Upgrade Plan'}
              </Button>
            </Link>
            {subscription?.stripeCustomerId && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin mr-2" />
                    Opening...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Billing Details */}
        {subscription?.stripeCustomerId && subscription?.currentPeriodEnd && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Next billing date</span>
                </div>
                <span className="text-gray-900 font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {subscription.cancelAtPeriodEnd && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-amber-800">
                    Your subscription will be canceled at the end of the current billing period.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
