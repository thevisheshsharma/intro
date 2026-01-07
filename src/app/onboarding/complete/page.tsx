'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    Handshake
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BerriLoader } from '@/components/ui/BerriLoader'

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
    const [result, setResult] = useState<OnboardingResult | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Ensure onboarding-complete cookie is set when reaching this page
        document.cookie = 'onboarding-complete=true; path=/; max-age=31536000'

        // Get result from session storage (set by onboarding flow)
        const storedResult = sessionStorage.getItem('onboarding-result')
        if (storedResult) {
            setResult(JSON.parse(storedResult))
            sessionStorage.removeItem('onboarding-result')
        }
        setLoading(false)
    }, [])

    const handleGoToDashboard = () => {
        // Ensure cookie is set before navigating
        document.cookie = 'onboarding-complete=true; path=/; max-age=31536000'
        router.push('/app')
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
                        Welcome to Berri! 🍇
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

                {/* CTA */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center"
                >
                    <Button
                        onClick={handleGoToDashboard}
                        variant="brand"
                        size="lg"
                        className="rounded-full h-14 px-8 text-base font-medium shadow-lg shadow-berri-raspberry/20"
                    >
                        Start Exploring
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    )
}
