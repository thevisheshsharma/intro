'use client'

import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import { Twitter, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConnectTwitterStepProps {
    onConnected: () => void
    error?: string | null
}

export default function ConnectTwitterStep({
    onConnected,
    error
}: ConnectTwitterStepProps) {
    const { linkTwitter, user } = usePrivy()

    const handleConnect = async () => {
        try {
            await linkTwitter()
            // Privy will update the user object, parent will detect and call onConnected
            onConnected()
        } catch (err) {
            console.error('Failed to link Twitter:', err)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-strong rounded-3xl p-8 text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center shadow-lg"
                >
                    <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-heading font-bold text-gray-900 mb-3"
                >
                    Let&apos;s Map Your Network
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-600 mb-8"
                >
                    Connect your Twitter account so we can analyze your connections,
                    discover your organizations, and show you your network&apos;s potential.
                </motion.p>

                {/* Error message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Connect button */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Button
                        onClick={handleConnect}
                        variant="brand"
                        size="lg"
                        className="w-full rounded-full h-14 text-base font-medium gap-3 shadow-lg shadow-berri-raspberry/20"
                    >
                        <Twitter className="w-5 h-5" />
                        Connect Twitter
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </motion.div>

                {/* Benefits */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 space-y-3"
                >
                    {[
                        'Discover organizations in your network',
                        'See who can introduce you',
                        'Understand your professional vibe'
                    ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-berri-raspberry/10 to-berri-coral/10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-berri-raspberry" />
                            </div>
                            {benefit}
                        </div>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    )
}
