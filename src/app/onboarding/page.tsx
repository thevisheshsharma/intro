'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

import ConnectTwitterStep from '@/components/onboarding/ConnectTwitterStep'
import ProcessingStep from '@/components/onboarding/ProcessingStep'
import ProfileStep from '@/components/onboarding/ProfileStep'
import { extractTwitterUsername } from '@/lib/twitter-helpers'

type OnboardingStep = 'connect-twitter' | 'processing' | 'profile' | 'complete'

export default function OnboardingPage() {
    const { user, ready, authenticated, getAccessToken } = usePrivy()
    const router = useRouter()

    const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect-twitter')
    const [jobId, setJobId] = useState<string | null>(null)
    const [analysisResult, setAnalysisResult] = useState<any>(null)
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
            // First check cookie (fast path)
            if (typeof document !== 'undefined') {
                const cookies = document.cookie.split(';')
                const onboardingComplete = cookies.some(c => c.trim().startsWith('onboarding-complete='))
                if (onboardingComplete) {
                    router.replace('/app')
                    return
                }
            }

            // Also check server-side status (in case cookie was cleared)
            if (ready && authenticated) {
                try {
                    const token = await getAccessToken()
                    const res = await fetch('/api/user/onboarding-status', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.completed) {
                            // Re-set cookie and redirect
                            document.cookie = 'onboarding-complete=true; path=/; max-age=31536000; SameSite=Lax'
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

    const handleAnalysisComplete = useCallback((result: any) => {
        setAnalysisResult(result)
        setCurrentStep('profile')
    }, [])

    const handleProfileComplete = useCallback(async (profileData?: any) => {
        // Save profile data if provided
        if (profileData) {
            try {
                const token = await getAccessToken()
                await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profileData)
                })
            } catch (err) {
                console.error('Failed to save profile:', err)
                // Non-fatal, continue anyway
            }
        }

        // Store result in session storage for complete page
        if (analysisResult) {
            sessionStorage.setItem('onboarding-result', JSON.stringify(analysisResult))
        }

        // Mark onboarding complete on server (primary source of truth)
        try {
            const token = await getAccessToken()
            await fetch('/api/user/complete-onboarding', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
        } catch (err) {
            console.error('Failed to mark onboarding complete on server:', err)
            // Non-fatal, continue with cookie fallback
        }

        // Set cookie to mark onboarding as complete (fallback for immediate redirect)
        document.cookie = 'onboarding-complete=true; path=/; max-age=31536000; SameSite=Lax'

        // Navigate to complete page with results
        router.push('/onboarding/complete')
    }, [getAccessToken, router, analysisResult])

    const handleSkipProfile = useCallback(() => {
        handleProfileComplete()
    }, [handleProfileComplete])

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
                            onComplete={handleAnalysisComplete}
                            onError={(err) => {
                                setError(err)
                                setCurrentStep('connect-twitter')
                            }}
                        />
                    </motion.div>
                )}

                {currentStep === 'profile' && (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ProfileStep
                            twitterUsername={twitterUsername}
                            analysisResult={analysisResult}
                            onComplete={handleProfileComplete}
                            onSkip={handleSkipProfile}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
