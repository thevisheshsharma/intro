'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load auth-related components to avoid loading Privy SDK on initial render
const PrivyUserButton = dynamic(
    () => import('@/components/PrivyUserButton').then(mod => ({ default: mod.PrivyUserButton })),
    {
        loading: () => <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />,
        ssr: false,
    }
)

const PrivyLoginButton = dynamic(
    () => import('@/components/PrivyLoginButton').then(mod => ({ default: mod.PrivyLoginButton })),
    {
        loading: () => (
            <div className="h-9 px-6 rounded-full bg-gray-100 animate-pulse" />
        ),
        ssr: false,
    }
)

const PrivyLoginLink = dynamic(
    () => import('@/components/PrivyLoginButton').then(mod => ({ default: mod.PrivyLoginLink })),
    {
        loading: () => null,
        ssr: false,
    }
)

// Export a hook-free auth check component that loads lazily
export function LazyUserButton({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
    return (
        <Suspense fallback={<div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />}>
            <PrivyUserButton size={size} />
        </Suspense>
    )
}

export function LazyLoginButton({
    variant = 'brand',
    size = 'default',
    className = '',
    children,
}: {
    variant?: 'brand' | 'brandOutline' | 'ghost'
    size?: 'sm' | 'default' | 'lg'
    className?: string
    children?: React.ReactNode
}) {
    return (
        <Suspense fallback={<div className="h-9 px-6 rounded-full bg-gray-100 animate-pulse" />}>
            <PrivyLoginButton variant={variant} size={size} className={className}>
                {children}
            </PrivyLoginButton>
        </Suspense>
    )
}

export function LazyLoginLink({ className = '' }: { className?: string }) {
    return (
        <Suspense fallback={null}>
            <PrivyLoginLink className={className} />
        </Suspense>
    )
}
