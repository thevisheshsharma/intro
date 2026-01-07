'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

// Lazy load the auth-related components to avoid loading Privy on initial render
const AuthenticatedNavActions = dynamic(
    () => import('./NavbarAuthActions').then(mod => ({ default: mod.AuthenticatedActions })),
    {
        loading: () => <NavActionsSkeleton />,
        ssr: false
    }
)

const UnauthenticatedNavActions = dynamic(
    () => import('./NavbarAuthActions').then(mod => ({ default: mod.UnauthenticatedActions })),
    {
        loading: () => <NavActionsSkeleton />,
        ssr: false
    }
)

const AuthChecker = dynamic(
    () => import('./NavbarAuthActions').then(mod => ({ default: mod.AuthChecker })),
    { ssr: false }
)

function NavActionsSkeleton() {
    return (
        <div className="flex items-center gap-3">
            <div className="h-10 w-24 rounded-full bg-gray-100 animate-pulse" />
        </div>
    )
}

// Desktop nav actions with lazy auth check
export function LazyNavActions() {
    return (
        <Suspense fallback={<NavActionsSkeleton />}>
            <AuthChecker
                authenticated={() => <AuthenticatedNavActions />}
                unauthenticated={() => <UnauthenticatedNavActions />}
                loading={() => <NavActionsSkeleton />}
            />
        </Suspense>
    )
}

// Mobile nav actions with lazy auth check
export function LazyMobileNavActions({ onClose }: { onClose: () => void }) {
    return (
        <Suspense fallback={<NavActionsSkeleton />}>
            <AuthChecker
                authenticated={() => (
                    <MobileAuthenticatedActions onClose={onClose} />
                )}
                unauthenticated={() => (
                    <MobileUnauthenticatedActions onClose={onClose} />
                )}
                loading={() => <NavActionsSkeleton />}
            />
        </Suspense>
    )
}

// Mobile authenticated actions (can't be lazy loaded due to onClose prop)
function MobileAuthenticatedActions({ onClose }: { onClose: () => void }) {
    return (
        <>
            <Button
                variant="brand"
                className="w-full rounded-full h-12 text-sm font-medium"
                asChild
            >
                <Link href="/app" onClick={onClose}>
                    Go to Dashboard
                </Link>
            </Button>
        </>
    )
}

// Mobile unauthenticated actions - uses lazy loaded login
const MobileLazyLogin = dynamic(
    () => import('./NavbarAuthActions').then(mod => ({ default: mod.MobileLoginActions })),
    {
        loading: () => <NavActionsSkeleton />,
        ssr: false
    }
)

function MobileUnauthenticatedActions({ onClose }: { onClose: () => void }) {
    return <MobileLazyLogin onClose={onClose} />
}
