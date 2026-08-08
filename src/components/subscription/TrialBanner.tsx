'use client'

import { useSubscription } from '@/lib/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function TrialBanner() {
  const { subscription, isTrialing, trialDaysLeft, isExpired, isLoading } = useSubscription()

  if (isLoading || (!isTrialing && !isExpired)) {
    return null
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Your trial has ended. Your saved Explorer preview is still available.
            </p>
          </div>
          <Link href="/pricing">
            <Button size="sm" className="bg-white text-red-600 hover:bg-gray-100 rounded-full">
              View plans
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Trial state
  const isUrgent = trialDaysLeft !== null && trialDaysLeft <= 3
  const trialEndLabel = subscription?.trialEndsAt
    ? new Date(subscription.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const bgColor = isUrgent
    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
    : 'bg-gradient-to-r from-berri-raspberry to-berri-coral'

  return (
    <div className={`${bgColor} text-white px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {trialDaysLeft === 0 ? (
              'Your trial ends today!'
            ) : trialDaysLeft === 1 ? (
              'Your trial ends tomorrow!'
            ) : (
              <>
                <span className="font-bold">{trialDaysLeft} days</span> left in your free trial.
              </>
            )}
            {trialEndLabel ? ` Your plan renews on ${trialEndLabel} unless canceled.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/settings/billing">
            <Button size="sm" className="bg-white text-berri-raspberry hover:bg-gray-100 rounded-full">
              Manage trial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
