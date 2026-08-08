'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  CreditCard,
  Loader2,
  Network,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import CTA from '@/components/marketing/CTA'
import {
  getPlanPrice,
  getTrialEndDate,
  SELF_SERVE_PLANS,
  STRIPE_TRIAL_DAYS,
  type SelfServePlan,
} from '@/lib/commercial'
import type { BillingInterval } from '@/lib/subscription'

const paidPlanFeatures = [
  'Pathfinder relationship discovery',
  'People and company intelligence',
  'Saved network context',
  'No customer-facing usage meter',
]

const questions = [
  {
    question: 'When does the trial start?',
    answer: `Only after you click “Start my ${STRIPE_TRIAL_DAYS}-day trial” and add a payment method in Stripe. Connecting X and viewing your preview do not start the clock.`,
  },
  {
    question: 'Will I be charged during the trial?',
    answer: `No. Stripe shows the exact renewal date before you confirm. Cancel from Settings → Billing before that date and you will not be charged.`,
  },
  {
    question: 'Do paid plans have credits or usage limits?',
    answer: 'No customer-facing credits or usage meter at launch. We use internal rate and abuse controls so normal exploration stays uninterrupted.',
  },
  {
    question: 'What is available on Explorer?',
    answer: 'Explorer keeps your personalized preview and read-only workspace. New cost-bearing searches and analyses require a paid plan.',
  },
  {
    question: 'When can I buy Growth?',
    answer: 'Growth is in private rollout while shared workspace and team controls are completed. We will not charge for collaboration capabilities before they are ready.',
  },
  {
    question: 'How will CRM usage be billed?',
    answer: 'After release, CRM Sync is planned as a $149/month add-on plus usage for successfully processed records. It is not part of self-serve checkout today.',
  },
]

function PricingContent() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<SelfServePlan | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const { authenticated, login, getAccessToken } = usePrivy()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('checkout') === 'canceled') {
      setCheckoutMessage('Checkout was canceled. No charge was made.')
    }
  }, [searchParams])

  const handleExplorer = () => {
    if (authenticated) {
      router.push('/app')
      return
    }
    login()
  }

  const handleCheckout = async (plan: SelfServePlan) => {
    if (!authenticated) {
      login()
      return
    }

    try {
      setCheckoutLoading(plan)
      setCheckoutMessage(null)
      const token = await getAccessToken()
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, interval, source: 'pricing' }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Could not open checkout')
      }
      window.location.assign(data.url)
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : 'Could not open checkout')
      setCheckoutLoading(null)
    }
  }

  const founderPrice = getPlanPrice('founder', interval)
  const growthPrice = getPlanPrice('standard', interval)
  const renewalDate = getTrialEndDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const renewalPrice = interval === 'annual'
    ? `$${founderPrice.total.toLocaleString()}/year`
    : `$${founderPrice.amount}/month`

  return (
    <>
      <section className="relative overflow-hidden bg-[#fbfaf9] px-6 pb-24 pt-32 sm:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_10%,rgba(229,72,104,0.13),transparent_34%),radial-gradient(circle_at_15%_42%,rgba(255,127,107,0.08),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold tracking-[0.14em] text-berri-raspberry"
              >
                PRICING THAT STAYS OUT OF THE WAY
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-5 max-w-4xl text-balance text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] text-gray-950 sm:text-6xl lg:text-7xl"
              >
                Use your network. Don&apos;t count credits.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-gray-600"
              >
                Explorer is limited. Paid plans have no customer-facing usage meter at launch.
                Start with a personalized preview, then begin your trial when the value is clear.
              </motion.p>
            </div>

            <div className="rounded-[1.75rem] bg-gray-950 p-6 text-white shadow-2xl shadow-gray-900/10">
              <p className="text-sm font-medium text-gray-400">Trial disclosure</p>
              <p className="mt-3 text-xl font-semibold leading-8">
                $0 today, then {renewalPrice} on {renewalDate} unless canceled.
              </p>
              <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">
                <CreditCard className="h-4 w-4" />
                Payment method required in Stripe
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
              {(['monthly', 'annual'] as BillingInterval[]).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setInterval(option)}
                  aria-pressed={interval === option}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berri-raspberry ${
                    interval === option
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {interval === 'annual' && (
              <p className="text-sm font-medium text-gray-600">Save about two months · billed annually</p>
            )}
            {checkoutMessage && (
              <p role="status" className="text-sm font-medium text-berri-raspberry">{checkoutMessage}</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.72fr_1.15fr_1fr]">
          <article className="rounded-[1.5rem] bg-gray-100 p-7">
            <p className="text-sm font-semibold text-gray-500">Explore first</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">Explorer</h2>
            <p className="mt-5 text-4xl font-bold tracking-tight text-gray-950">Free</p>
            <p className="mt-5 min-h-20 text-sm leading-6 text-gray-600">
              A limited personalized preview and read-only workspace. No card and no trial clock.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-gray-700">
              {['Connect X', 'Personalized network preview', 'Keep discovered context'].map(feature => (
                <li key={feature} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-berri-raspberry" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button onClick={handleExplorer} variant="outline" size="lg" className="mt-9 w-full rounded-full">
              Explore free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </article>

          <article className="relative rounded-[1.75rem] bg-gray-950 p-8 text-white shadow-2xl shadow-berri-raspberry/10">
            <div className="absolute right-6 top-6 text-sm font-semibold text-berri-coral">Recommended</div>
            <p className="text-sm font-semibold text-gray-400">For founder-led growth</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Founder</h2>
            <div className="mt-6 flex items-baseline gap-1 tabular-nums">
              <span className="text-5xl font-bold">${founderPrice.amount}</span>
              <span className="text-gray-400">/month</span>
            </div>
            {interval === 'annual' && (
              <p className="mt-2 text-sm text-gray-400">${founderPrice.total.toLocaleString()}/year · billed annually</p>
            )}
            <p className="mt-5 text-sm leading-6 text-gray-300">
              One seat and full individual access, without a customer-facing usage meter.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-gray-200">
              {paidPlanFeatures.map(feature => (
                <li key={feature} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-berri-coral" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleCheckout('founder')}
              disabled={checkoutLoading === 'founder'}
              variant="brand"
              size="lg"
              className="mt-9 w-full rounded-full"
            >
              {checkoutLoading === 'founder' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start my {STRIPE_TRIAL_DAYS}-day trial
              {checkoutLoading !== 'founder' && <ArrowUpRight className="ml-2 h-4 w-4" />}
            </Button>
            <p className="mt-4 text-center text-xs leading-5 text-gray-500">
              Card required · cancel during the trial from Settings → Billing
            </p>
          </article>

          <article className="rounded-[1.5rem] bg-[#fff6f3] p-7 ring-1 ring-berri-coral/15">
            <p className="text-sm font-semibold text-berri-raspberry">Private rollout</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">{SELF_SERVE_PLANS.standard.name}</h2>
            <div className="mt-6 flex items-baseline gap-1 tabular-nums">
              <span className="text-4xl font-bold text-gray-950">${growthPrice.amount}</span>
              <span className="text-gray-500">/month</span>
            </div>
            {interval === 'annual' && (
              <p className="mt-2 text-sm text-gray-500">${growthPrice.total.toLocaleString()}/year · billed annually</p>
            )}
            <p className="mt-5 min-h-20 text-sm leading-6 text-gray-600">
              Three seats, with extra seats planned at $59/month. Available when shared team controls are ready.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-gray-700">
              {['Everything in Founder', 'Three-seat workspace', 'Shared workflows and team controls'].map(feature => (
                <li key={feature} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-berri-raspberry" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild variant="brandOutline" size="lg" className="mt-9 w-full rounded-full">
              <Link href="/resources/contact#my-cal-inline-berri">
                Join the private rollout
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </article>
        </div>
      </section>

      <section className="bg-[#fbfaf9] px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-berri-raspberry">For higher-touch teams</p>
              <h2 className="mt-3 text-balance text-4xl font-bold tracking-[-0.04em] text-gray-950">
                Buy support and control—not a larger bucket of credits.
              </h2>
            </div>
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              <div className="grid gap-4 py-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-4">
                  <Network className="mt-1 h-5 w-5 shrink-0 text-berri-raspberry" />
                  <div>
                    <h3 className="font-semibold text-gray-950">Design Partner</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Onboarding, direct founder support, and explicitly contracted capabilities.</p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums text-gray-950">$6k–$12k/year</p>
              </div>
              <div className="grid gap-4 py-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-4">
                  <Users className="mt-1 h-5 w-5 shrink-0 text-berri-raspberry" />
                  <div>
                    <h3 className="font-semibold text-gray-950">Enterprise</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Custom governance, implementation, support, and volume once the required capability is available.</p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums text-gray-950">From $20k/year</p>
              </div>
              <div className="grid gap-4 py-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-4">
                  <CircleDollarSign className="mt-1 h-5 w-5 shrink-0 text-berri-raspberry" />
                  <div>
                    <h3 className="font-semibold text-gray-950">CRM Sync add-on</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Planned after release: platform access plus usage for successfully processed records.</p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums text-gray-950">$149/month + usage</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="text-sm font-semibold text-berri-raspberry">Questions</p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-gray-950">Before you start</h2>
            </div>
            <dl className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {questions.map(item => (
                <div key={item.question}>
                  <dt className="font-semibold text-gray-950">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-6 text-gray-600">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <CTA />
    </>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfaf9] pt-32" />}>
      <PricingContent />
    </Suspense>
  )
}
