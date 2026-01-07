'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { ready, authenticated } = usePrivy()
    const router = useRouter()

    // Redirect to home if not authenticated
    useEffect(() => {
        if (ready && !authenticated) {
            router.push('/?login=required')
        }
    }, [ready, authenticated, router])

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-rose-50/30 to-amber-50/20">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!authenticated) {
        return null // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-rose-50/30 to-amber-50/20 relative overflow-hidden">
            {/* Subtle background orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-berri-raspberry/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-berri-coral/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-berri-amber/5 rounded-full blur-3xl" />

            {/* Logo */}
            <div className="absolute top-8 left-8">
                <a href="/" className="flex items-center gap-2">
                    <img src="/berri-logo.svg" alt="Berri" className="h-8 w-auto" />
                </a>
            </div>

            {/* Main content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
