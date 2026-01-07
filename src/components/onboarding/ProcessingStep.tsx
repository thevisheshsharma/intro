'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import { BerriLoader } from '@/components/ui/BerriLoader'

interface ProcessingStepProps {
    jobId: string
    onComplete: (result: any) => void
    onError: (error: string) => void
}

const POLL_INTERVAL = 1500 // 1.5 seconds

const stepOrder = [
    'initializing',
    'profile',
    'fetching',
    'classifying',
    'extracting_orgs',
    'checking_relationships',
    'saving',
    'done'
]

export default function ProcessingStep({
    jobId,
    onComplete,
    onError
}: ProcessingStepProps) {
    const { getAccessToken } = usePrivy()
    const [status, setStatus] = useState<{
        step: string
        stepLabel: string
        progress: number
    }>({
        step: 'initializing',
        stepLabel: 'Setting up your account...',
        progress: 0
    })

    const pollStatus = useCallback(async () => {
        try {
            const token = await getAccessToken()
            const response = await fetch(`/api/onboarding/status?jobId=${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.status === 'complete') {
                onComplete(data.result)
                return true // Stop polling
            }

            if (data.status === 'error') {
                onError(data.error || 'Analysis failed')
                return true // Stop polling
            }

            setStatus({
                step: data.step,
                stepLabel: data.stepLabel,
                progress: data.progress
            })

            return false // Continue polling

        } catch (err: any) {
            console.error('Failed to poll status:', err)
            // Don't stop polling on transient errors
            return false
        }
    }, [jobId, getAccessToken, onComplete, onError])

    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout

        const poll = async () => {
            if (!mounted) return

            const shouldStop = await pollStatus()

            if (!shouldStop && mounted) {
                timeoutId = setTimeout(poll, POLL_INTERVAL)
            }
        }

        poll()

        return () => {
            mounted = false
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [pollStatus])

    const currentStepIndex = stepOrder.indexOf(status.step)

    return (
        <div className="w-full max-w-lg mx-auto text-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-strong rounded-3xl p-10"
            >
                {/* Loader */}
                <BerriLoader
                    steps={[
                        'Analyzing your profile',
                        'Discovering your vibe',
                        'Mapping your network',
                        'Finding your organizations'
                    ]}
                    currentStep={Math.floor(currentStepIndex / 2)}
                    size="lg"
                />

                {/* Progress bar */}
                <div className="mt-8 mb-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-berri-raspberry via-berri-coral to-berri-amber"
                            initial={{ width: 0 }}
                            animate={{ width: `${status.progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Current step label */}
                <motion.p
                    key={status.step}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-gray-600"
                >
                    {status.stepLabel}
                </motion.p>

                {/* Reassuring message */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="mt-6 text-sm text-gray-400"
                >
                    This usually takes about 30 seconds...
                </motion.p>
            </motion.div>
        </div>
    )
}
