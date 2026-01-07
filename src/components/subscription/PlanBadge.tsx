'use client'

import { useSubscription } from '@/lib/hooks/useSubscription'
import { PLAN_NAMES } from '@/lib/features'
import { Crown, Clock, AlertCircle } from 'lucide-react'

interface PlanBadgeProps {
  showStatus?: boolean
  size?: 'sm' | 'md'
}

export function PlanBadge({ showStatus = true, size = 'md' }: PlanBadgeProps) {
  const { subscription, isTrialing, isExpired, isLoading } = useSubscription()

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-full ${size === 'sm' ? 'h-5 w-16' : 'h-6 w-20'}`} />
    )
  }

  if (!subscription?.plan) {
    return null
  }

  const planName = PLAN_NAMES[subscription.plan] || subscription.plan

  // Expired state
  if (isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span className="font-medium">Expired</span>
      </div>
    )
  }

  // Trialing state
  if (isTrialing && showStatus) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span className="font-medium">{planName} Trial</span>
      </div>
    )
  }

  // Active state
  const bgColor = subscription.plan === 'enterprise'
    ? 'bg-berri-charcoal text-white'
    : subscription.plan === 'standard'
    ? 'bg-berri-coral/10 text-berri-coral'
    : 'bg-berri-raspberry/10 text-berri-raspberry'

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bgColor} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="font-medium">{planName}</span>
    </div>
  )
}
