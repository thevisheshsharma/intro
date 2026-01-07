'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface DashboardHeaderProps {
    user: {
        firstName?: string
        imageUrl?: string
    }
    profile?: {
        department?: string
    } | null
    stats?: {
        followers: number
        following: number
        berriPoints: number
    }
    subscription?: {
        daysRemaining: number
        totalDays: number
    }
}

// Get time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
}

// Format date for display (matching reference: "19" with "Tue, December" below)
function getFormattedDate() {
    const now = new Date()
    return {
        dayNumber: now.getDate(),
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()],
        month: ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'][now.getMonth()]
    }
}

// Format numbers with K suffix
function formatCount(num: number): string {
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return num.toString()
}

// Circular Progress Ring SVG
function ProgressRing({ progress, size = 96, strokeWidth = 3 }: {
    progress: number
    size?: number
    strokeWidth?: number
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(229, 72, 104, 0.12)"
                strokeWidth={strokeWidth}
            />
            <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#E54868" />
                    <stop offset="100%" stopColor="#FF7F6B" />
                </linearGradient>
            </defs>
        </svg>
    )
}

// Date Display Card - Matching reference exactly
function DateCard() {
    const { dayNumber, dayName, month } = getFormattedDate()

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="inline-flex items-center gap-4 bg-gray-50/80 rounded-full pl-2 pr-6 py-2"
        >
            {/* Large circle with day number */}
            <div className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-900">{dayNumber}</span>
            </div>
            {/* Day, Month text - stacked */}
            <div className="flex flex-col leading-snug">
                <span className="text-[13px] text-gray-500">{dayName},</span>
                <span className="text-[15px] font-medium text-gray-900">{month}</span>
            </div>
        </motion.div>
    )
}

// Stats Pill Component - with shadow like reference
function StatsPill({
    icon,
    value,
    color
}: {
    icon: React.ReactNode
    value: string | number
    color: 'raspberry' | 'coral' | 'amber'
}) {
    const iconColors = {
        raspberry: 'text-berri-raspberry',
        coral: 'text-berri-coral',
        amber: 'text-berri-amber'
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100/60">
            <span className={iconColors[color]}>{icon}</span>
            <span className="text-sm font-medium text-gray-700">{value}</span>
        </div>
    )
}

// User Profile Card - Larger and matching reference
function UserProfileCard({ user, profile, stats, subscription }: DashboardHeaderProps) {
    const displayName = user?.firstName || 'User'
    const department = profile?.department || 'Member'
    const progressPercent = subscription
        ? (subscription.daysRemaining / subscription.totalDays) * 100
        : 83

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-2xl p-6 shadow-md border border-gray-100/60 w-full"
        >
            {/* Avatar with Progress Ring */}
            <div className="flex flex-col items-center mb-5">
                <div className="relative w-24 h-24 mb-4">
                    <ProgressRing progress={progressPercent} size={96} strokeWidth={3} />
                    <div className="absolute inset-[6px] rounded-full overflow-hidden border-2 border-white shadow-md">
                        {user?.imageUrl ? (
                            <Image
                                src={`${user.imageUrl}?width=200&height=200&quality=100&fit=crop`}
                                alt={displayName}
                                width={168}
                                height={168}
                                quality={100}
                                className="w-full h-full object-cover"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center text-white font-bold text-2xl">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {/* Badge */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-berri-raspberry rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {/* Name & Department */}
                <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
                <p className="text-sm text-gray-500 capitalize">{department}</p>
            </div>

            {/* Stats Pills Row */}
            <div className="flex items-center justify-center gap-3">
                {/* Followers */}
                <StatsPill
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    }
                    value={formatCount(stats?.followers || 0)}
                    color="raspberry"
                />

                {/* Following */}
                <StatsPill
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                    }
                    value={formatCount(stats?.following || 0)}
                    color="coral"
                />

                {/* Berri Points */}
                <StatsPill
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                        </svg>
                    }
                    value={formatCount(stats?.berriPoints || 0)}
                    color="amber"
                />
            </div>
        </motion.div>
    )
}

// Main Dashboard Header Component  
const DashboardHeader = memo(function DashboardHeader(props: DashboardHeaderProps) {
    const { user, profile, stats, subscription } = props
    const displayName = user?.firstName || 'there'
    const greeting = getGreeting()

    return (
        <div className="pt-8 mb-10">
            {/* Two-column layout: Left content aligns bottom with card */}
            <div className="flex items-end justify-between gap-8">
                {/* Left: Date + Greeting (aligned to bottom) */}
                <div className="flex flex-col">
                    <DateCard />
                    <div className="mt-8">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-3xl font-heading font-bold text-gray-900 tracking-tight"
                        >
                            {greeting},{' '}
                            <span className="text-berri-raspberry">{displayName}</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="text-gray-500 mt-2 text-[15px]"
                        >
                            Find warm introductions to your next prospect
                        </motion.p>
                    </div>
                </div>

                {/* Right: User Profile Card - width matches one quick action card */}
                <div className="hidden lg:block flex-shrink-0" style={{ width: 'calc((100% - 40px) / 3)' }}>
                    <UserProfileCard
                        user={user}
                        profile={profile}
                        stats={stats}
                        subscription={subscription}
                    />
                </div>
            </div>
        </div>
    )
})

export default DashboardHeader
