'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

import ConnectTwitterStep from '@/components/onboarding/ConnectTwitterStep'
import ProcessingStep from '@/components/onboarding/ProcessingStep'
import { extractTwitterUsername } from '@/lib/twitter-helpers'
import type { OnboardingResult } from '@/lib/onboarding-storage'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
    fetchOnboardingCompletion,
    startOnboardingAnalysis,
    TwitterLinkRequiredError,
} from '@/lib/onboarding-client'

type OnboardingStep =
    | 'connect-twitter'
    | 'starting-analysis'
    | 'processing'
    | 'analysis-error'
    | 'completion-error'

type CompletionCheck = 'checking' | 'ready' | 'error'

export default function OnboardingPage() {
    const { user, ready, authenticated, getAccessToken } = usePrivy()
    const router = useRouter()

    const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect-twitter')
    const [jobId, setJobId] = useState<string | null>(null)
    const [pendingResult, setPendingResult] = useState<OnboardingResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [completionCheck, setCompletionCheck] = useState<CompletionCheck>('checking')
    const [completionCheckAttempt, setCompletionCheckAttempt] = useState(0)
    const analysisStartedRef = useRef(false)

    // Check if user has Twitter linked
    const hasTwitter = user?.linkedAccounts?.some(
        (account: any) => account.type === 'twitter_oauth'
    )
    const twitterUsername = user ? extractTwitterUsername(user) : null

    // Check if onboarding is already complete - redirect to dashboard
    useEffect(() => {
        if (!ready || !authenticated) return

        let active = true

        const checkCompletion = async () => {
            setCompletionCheck('checking')
            setError(null)

            try {
                const completed = await fetchOnboardingCompletion({ getAccessToken })

                if (!active) return

                if (completed) {
                    router.replace('/app')
                    return
                }

                setCompletionCheck('ready')
            } catch (err) {
                if (!active) return
                console.error('Failed to check onboarding status:', err)
                setError(err instanceof Error ? err.message : 'We could not check your onboarding status.')
                setCompletionCheck('error')
            }
        }

        checkCompletion()

        return () => {
            active = false
        }
    }, [router, ready, authenticated, getAccessToken, completionCheckAttempt])

    const startAnalysis = useCallback(async () => {
        if (!twitterUsername || analysisStartedRef.current) return

        analysisStartedRef.current = true
        setCurrentStep('starting-analysis')
        setJobId(null)
        setError(null)

        try {
            const nextJobId = await startOnboardingAnalysis({ getAccessToken })
            setJobId(nextJobId)
            setCurrentStep('processing')
        } catch (err) {
            analysisStartedRef.current = false

            if (err instanceof TwitterLinkRequiredError) {
                setCurrentStep('connect-twitter')
                return
            }

            console.error('Failed to start analysis:', err)
            setError(err instanceof Error ? err.message : 'Failed to start analysis')
            setCurrentStep('analysis-error')
        }
    }, [twitterUsername, getAccessToken])

    // Auto-proceed to processing if Twitter is already linked
    // Only after we've confirmed onboarding isn't already complete
    useEffect(() => {
        if (completionCheck === 'ready' && ready && authenticated && hasTwitter && currentStep === 'connect-twitter') {
            startAnalysis()
        }
    }, [completionCheck, ready, authenticated, hasTwitter, currentStep, startAnalysis])

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

    if (!ready || completionCheck === 'checking') {
        return (
            <OnboardingScreen>
                <PendingCard message="Checking your account…" />
            </OnboardingScreen>
        )
    }

    if (completionCheck === 'error') {
        return (
            <OnboardingScreen>
                <StatusCard
                    title="We couldn't load your onboarding status"
                    message={error || 'Please check your connection and try again.'}
                    onRetry={() => setCompletionCheckAttempt((attempt) => attempt + 1)}
                />
            </OnboardingScreen>
        )
    }

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

                {currentStep === 'starting-analysis' && (
                    <motion.div
                        key="starting-analysis"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md"
                    >
                        <PendingCard message="Starting your network analysis…" />
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
                                analysisStartedRef.current = false
                                setError(err)
                                setCurrentStep('analysis-error')
                            }}
                        />
                    </motion.div>
                )}

                {currentStep === 'analysis-error' && (
                    <motion.div
                        key="analysis-error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="w-full max-w-md"
                    >
                        <StatusCard
                            title="We couldn't start your analysis"
                            message={error || 'Please try again.'}
                            onRetry={startAnalysis}
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

function OnboardingScreen({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
            {children}
        </div>
    )
}

function PendingCard({ message }: { message: string }) {
    return (
        <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center" role="status">
            <LoadingSpinner className="mx-auto" size="lg" />
            <p className="mt-5 text-sm font-medium text-gray-600">{message}</p>
        </div>
    )
}

function StatusCard({
    title,
    message,
    onRetry,
}: {
    title: string
    message: string
    onRetry: () => void
}) {
    return (
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-5 font-heading text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-3 text-sm text-gray-600">{message}</p>
            <Button onClick={onRetry} variant="brand" size="lg" className="mt-7 rounded-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try again
            </Button>
        </div>
    )
}
