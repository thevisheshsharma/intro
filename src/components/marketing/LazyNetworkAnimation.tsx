'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load the heavy NetworkAnimation component
const NetworkAnimation = dynamic(
    () => import('./NetworkAnimation'),
    {
        loading: () => (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-berri-raspberry/20 to-berri-coral/20 animate-pulse" />
            </div>
        ),
        ssr: false, // Don't SSR this heavy animation component
    }
)

export default function LazyNetworkAnimation() {
    return (
        <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-berri-raspberry/20 to-berri-coral/20 animate-pulse" />
            </div>
        }>
            <NetworkAnimation />
        </Suspense>
    )
}
