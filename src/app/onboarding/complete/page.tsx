'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import {
    ArrowRight,
    Building2,
    Users,
    Sparkles,
    Trophy,
    Briefcase,
    History,
    Users2,
    HandCoins,
    Handshake,
    CreditCard,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BerriLoader } from '@/components/ui/BerriLoader'
import { getTrialEndDate, SELF_SERVE_PLANS, STRIPE_TRIAL_DAYS } from '@/lib/commercial'

interface OrgInfo {
    screenName: string
    name: string
    type?: string
    profileImageUrl?: string
}

interface OnboardingResult {
    vibe: string
    twitterProfile: {
        screenName: string
        name: string
        profileImageUrl?: string
        followersCount: number
        followingCount: number
    }
    organizations: {
        works_at: OrgInfo[]
        worked_at: OrgInfo[]
        member_of: OrgInfo[]
        invested_in: OrgInfo[]
        partners_with: OrgInfo[]
    }
    berriPoints: number
    pendingIcpAnalysis: string[]
}

export default function OnboardingCompletePage() {
    const router = useRouter()
    const { getAccessToken } = usePrivy()
    const [result, setResult] = useState<OnboardingResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [checkoutLoading, setCheckoutLoading] = useState(false)
    const [checkoutError, setCheckoutError] = useState<string | null>(null)

    useEffect(() => {
        // Get result from session storage (set by onboarding flow)
        const storedResult = sessionStorage.getItem('onboarding-result')
        if (storedResult) {
            setResult(JSON.parse(storedResult))
        }
        if (new URLSearchParams(window.location.search).get('checkout') === 'canceled') {
            setCheckoutError('Checkout was canceled. Your Explorer preview is still available.')
        }
        setLoading(false)
    }, [])

    const handleGoToDashboard = () => {
        router.push('/app')
    }

    const handleStartTrial = async () => {
        try {
            setCheckoutLoading(true)
            setCheckoutError(null)
            const token = await getAccessToken()
            const response = await fetch('/api/subscription/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    plan: 'founder',
                    interval: 'monthly',
                    source: 'onboarding',
                }),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || 'Could not start checkout')
            }
            window.location.assign(data.url)
        } catch (error) {
            setCheckoutError(error instanceof Error ? error.message : 'Could not start checkout')
            setCheckoutLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BerriLoader size="lg" />
            </div>
        )
    }

    // Default data if result isn't available
    const displayResult = result || {
        vibe: 'individual',
        twitterProfile: {
            screenName: 'user',
            name: 'User',
            followersCount: 0,
            followingCount: 0
        },
        organizations: {
            works_at: [],
            worked_at: [],
            member_of: [],
            invested_in: [],
            partners_with: []
        },
        berriPoints: 600,
        pendingIcpAnalysis: []
    }

    const orgSections = [
        { key: 'works_at', label: 'Works At', icon: Briefcase, orgs: displayResult.organizations.works_at },
        { key: 'worked_at', label: 'Previously', icon: History, orgs: displayResult.organizations.worked_at },
        { key: 'member_of', label: 'Member Of', icon: Users2, orgs: displayResult.organizations.member_of },
        { key: 'invested_in', label: 'Invested In', icon: HandCoins, orgs: displayResult.organizations.invested_in },
        { key: 'partners_with', label: 'Partners', icon: Handshake, orgs: displayResult.organizations.partners_with },
    ].filter(section => section.orgs.length > 0)

    const totalOrgs = Object.values(displayResult.organizations).flat().length

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {/* Success header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center shadow-lg"
                    >
                        <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-heading font-bold text-gray-900 mb-2"
                    >
                        Your Berri preview is ready
                    </motion.h1>

                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-gray-600"
                    >
                        Here&apos;s what we discovered about your network
                    </motion.p>
                </div>

                {/* Stats grid */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-3 gap-4 mb-8"
                >
                    {/* Vibe */}
                    <div className="glass-strong rounded-2xl p-5 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-berri-raspberry/20 to-berri-coral/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-berri-raspberry" />
                        </div>
                        <div className="text-lg font-semibold text-gray-900 capitalize">
                            {displayResult.vibe}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Your Vibe</div>
                    </div>

                    {/* Followers */}
                    <div className="glass-strong rounded-2xl p-5 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-berri-coral/20 to-berri-amber/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-berri-coral" />
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {displayResult.twitterProfile.followersCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Followers</div>
                    </div>

                    {/* Berri Points */}
                    <div className="glass-strong rounded-2xl p-5 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-berri-amber/20 to-berri-gold/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-berri-amber" />
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {displayResult.berriPoints.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Berri Points</div>
                    </div>
                </motion.div>

                {/* Organizations */}
                {totalOrgs > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="glass-strong rounded-2xl p-6 mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-berri-raspberry" />
                            <h2 className="font-heading font-semibold text-gray-900">
                                Your Organizations ({totalOrgs})
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {orgSections.map((section, sectionIdx) => {
                                const Icon = section.icon
                                return (
                                    <motion.div
                                        key={section.key}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.7 + sectionIdx * 0.1 }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                                {section.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {section.orgs.map((org, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100"
                                                >
                                                    {org.profileImageUrl && (
                                                        <img
                                                            src={org.profileImageUrl}
                                                            alt={org.name}
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <span className="text-sm text-gray-700">
                                                        {org.name || `@${org.screenName}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {/* Pending ICP analysis note */}
                        {displayResult.pendingIcpAnalysis.length > 0 && (
                            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                                <p className="text-xs text-amber-700">
                                    <span className="font-medium">Still analyzing:</span>{' '}
                                    {displayResult.pendingIcpAnalysis.length} organizations are being enriched in the background
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Trial conversion */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="rounded-3xl bg-gray-950 p-7 text-white shadow-xl shadow-gray-900/10"
                >
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-md">
                            <p className="text-sm font-semibold text-berri-coral">Founder plan</p>
                            <h2 className="mt-2 text-2xl font-heading font-bold text-white">
                                Put your network to work for {STRIPE_TRIAL_DAYS} days
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-gray-300">
                                Full individual access with no usage meter. Add a payment method now;
                                you will pay $0 today, then ${SELF_SERVE_PLANS.founder.monthlyPrice}/month on{' '}
                                {getTrialEndDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                {' '}unless you cancel.
                            </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                            <p className="text-3xl font-heading font-bold tabular-nums">
                                ${SELF_SERVE_PLANS.founder.monthlyPrice}<span className="text-sm font-medium text-gray-400">/month</span>
                            </p>
                            <p className="mt-1 text-xs text-gray-400">after the free trial</p>
                        </div>
                    </div>

                    {checkoutError && (
                        <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-100">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{checkoutError}</span>
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button
                            onClick={handleStartTrial}
                            disabled={checkoutLoading}
                            variant="brand"
                            size="lg"
                            className="h-14 rounded-full px-7"
                        >
                            {checkoutLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CreditCard className="mr-2 h-4 w-4" />
                            )}
                            Start my {STRIPE_TRIAL_DAYS}-day trial
                        </Button>
                        <button
                            type="button"
                            onClick={handleGoToDashboard}
                            className="inline-flex min-h-11 items-center justify-center px-4 text-sm font-medium text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berri-coral"
                        >
                            Continue with limited Explorer
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-4 text-xs text-gray-500">
                        Cancel during the trial from Settings → Billing. You will keep access until the trial ends.
                    </p>
                </motion.div>
            </motion.div>
        </div>
    )
}
