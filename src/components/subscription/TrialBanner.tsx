'use client'

import { useSubscription } from '@/lib/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Clock, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export function TrialBanner() {
  const { isTrialing, trialDaysLeft, isExpired, isLoading } = useSubscription()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if loading, dismissed, or not in trial/expired state
  if (isLoading || dismissed || (!isTrialing && !isExpired)) {
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
              Your trial has expired. Upgrade now to continue using Berri.
            </p>
          </div>
          <Link href="/pricing">
            <Button size="sm" className="bg-white text-red-600 hover:bg-gray-100 rounded-full">
              Upgrade Now
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Trial state
  const isUrgent = trialDaysLeft !== null && trialDaysLeft <= 3
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
            {' '}Upgrade to keep full access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button size="sm" className="bg-white text-berri-raspberry hover:bg-gray-100 rounded-full">
              Upgrade Now
            </Button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
