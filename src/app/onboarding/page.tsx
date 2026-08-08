'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

import ConnectTwitterStep from '@/components/onboarding/ConnectTwitterStep'
import ProcessingStep from '@/components/onboarding/ProcessingStep'
import { extractTwitterUsername } from '@/lib/twitter-helpers'
import type { OnboardingResult } from '@/lib/onboarding-storage'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'

type OnboardingStep = 'connect-twitter' | 'processing' | 'completion-error'

export default function OnboardingPage() {
    const { user, ready, authenticated, getAccessToken } = usePrivy()
    const router = useRouter()

    const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect-twitter')
    const [jobId, setJobId] = useState<string | null>(null)
    const [pendingResult, setPendingResult] = useState<OnboardingResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [checkedCompletion, setCheckedCompletion] = useState(false)

    // Check if user has Twitter linked
    const hasTwitter = user?.linkedAccounts?.some(
        (account: any) => account.type === 'twitter_oauth'
    )
    const twitterUsername = user ? extractTwitterUsername(user) : null

    // Check if onboarding is already complete - redirect to dashboard
    useEffect(() => {
        const checkCompletion = async () => {
            // The server is authoritative; cookies are only a navigation hint.
            if (ready && authenticated) {
                try {
                    const token = await getAccessToken()
                    const res = await fetch('/api/user/onboarding-status', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.completed) {
                            router.replace('/app')
                            return
                        }
                    }
                } catch (err) {
                    console.error('Failed to check onboarding status:', err)
                }
            }

            setCheckedCompletion(true)
        }

        if (ready) {
            checkCompletion()
        }
    }, [router, ready, authenticated, getAccessToken])

    // Auto-proceed to processing if Twitter is already linked
    // Only after we've confirmed onboarding isn't already complete
    useEffect(() => {
        if (checkedCompletion && ready && authenticated && hasTwitter && currentStep === 'connect-twitter') {
            startAnalysis()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkedCompletion, ready, authenticated, hasTwitter, currentStep])

    const startAnalysis = useCallback(async () => {
        if (!twitterUsername) return

        setCurrentStep('processing')
        setError(null)

        try {
            const token = await getAccessToken()
            const response = await fetch('/api/onboarding/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (!response.ok) {
                if (data.requiresTwitter) {
                    setCurrentStep('connect-twitter')
                    return
                }
                throw new Error(data.error || 'Analysis failed')
            }

            setJobId(data.jobId)
        } catch (err: any) {
            console.error('Failed to start analysis:', err)
            setError(err.message)
            setCurrentStep('connect-twitter')
        }
    }, [twitterUsername, getAccessToken])

    const handleTwitterConnected = useCallback(() => {
        // Twitter was just linked, start analysis
        startAnalysis()
    }, [startAnalysis])

    const completeOnboarding = useCallback(async (result: OnboardingResult) => {
        setPendingResult(result)
        sessionStorage.setItem('onboarding-result', JSON.stringify(result))

        try {
            const token = await getAccessToken()
            const completionResponse = await fetch('/api/user/complete-onboarding', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!completionResponse.ok) {
                const data = await completionResponse.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to complete onboarding')
            }
        } catch (err) {
            console.error('Failed to mark onboarding complete on server:', err)
            setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
            setCurrentStep('completion-error')
            return
        }

        document.cookie = 'onboarding-complete=true; path=/; max-age=31536000; SameSite=Lax'
        router.push('/onboarding/complete')
    }, [getAccessToken, router])

    // Show nothing while checking auth and completion status
    if (!ready || !checkedCompletion) return null

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <AnimatePresence mode="wait">
                {currentStep === 'connect-twitter' && (
                    <motion.div
                        key="connect-twitter"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ConnectTwitterStep
                            onConnected={handleTwitterConnected}
                            error={error}
                        />
                    </motion.div>
                )}

                {currentStep === 'processing' && jobId && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ProcessingStep
                            jobId={jobId}
                            onComplete={completeOnboarding}
                            onError={(err) => {
                                setError(err)
                                setCurrentStep('connect-twitter')
                            }}
                        />
                    </motion.div>
                )}

                {currentStep === 'completion-error' && pendingResult && (
                    <motion.div
                        key="completion-error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm"
                    >
                        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
                        <h1 className="mt-5 text-2xl font-heading font-bold text-gray-900">
                            We saved your network analysis
                        </h1>
                        <p className="mt-3 text-gray-600">
                            We could not finish setting up your account. Retry without analyzing your network again.
                        </p>
                        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                        <Button
                            onClick={() => completeOnboarding(pendingResult)}
                            variant="brand"
                            size="lg"
                            className="mt-7 rounded-full"
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Retry setup
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
