'use client'

import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import { PrivyUserButton } from '@/components/PrivyUserButton'
import { PrivyLoginButton, PrivyLoginLink } from '@/components/PrivyLoginButton'

interface AuthCheckerProps {
    authenticated: (props: { ready: boolean }) => React.ReactNode
    unauthenticated: () => React.ReactNode
    loading: () => React.ReactNode
}

// Auth checker component - uses Privy hook
export function AuthChecker({ authenticated, unauthenticated, loading }: AuthCheckerProps) {
    const { ready, authenticated: isAuth } = usePrivy()

    if (!ready) {
        return <>{loading()}</>
    }

    if (isAuth) {
        return <>{authenticated({ ready })}</>
    }

    return <>{unauthenticated()}</>
}

// Authenticated desktop actions
export function AuthenticatedActions() {
    return (
        <>
            <Button
                variant="brand"
                asChild
                className="rounded-full px-6 h-10 text-sm font-medium transition-transform hover:scale-105"
            >
                <Link href="/app" className="flex items-center gap-2">
                    Go to Dashboard
                    <ArrowUpRight className="w-4 h-4" />
                </Link>
            </Button>
            <PrivyUserButton size="md" />
        </>
    )
}

// Unauthenticated desktop actions
export function UnauthenticatedActions() {
    return (
        <>
            <PrivyLoginLink />
            <PrivyLoginButton
                variant="brand"
                size="default"
                className="px-6 h-10 text-sm font-medium transition-transform hover:scale-105"
            >
                Get Started
            </PrivyLoginButton>
        </>
    )
}

// Mobile login actions
export function MobileLoginActions({ onClose }: { onClose: () => void }) {
    const { login } = usePrivy()

    return (
        <>
            <button
                onClick={() => { onClose(); login(); }}
                className="text-sm font-medium text-gray-600 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
                Log in
            </button>
            <Button
                variant="brand"
                className="w-full rounded-full h-12 text-sm font-medium"
                onClick={() => { onClose(); login(); }}
            >
                Get Started
            </Button>
        </>
    )
}
