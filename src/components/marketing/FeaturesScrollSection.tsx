'use client'
import { useRef, useState, useEffect } from 'react'
import { Network, Search, Users, ArrowUpRight, Zap, Globe, TrendingUp, Target, BarChart3, Layers, Database, UserCheck, Activity, Link2, Send, MessageSquare, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

// Icons for each feature's benefits - monochromatic style (workflow order)
const featureIcons = {
    'company-intelligence': [Database, Activity, Layers, Users],
    'people-intelligence': [UserCheck, BarChart3, Target, Activity],
    'pathfinder': [Link2, Zap, Network, TrendingUp],
    'ping': [Sparkles, MessageSquare, Send, Activity],
}

// Features in workflow order: Research → Find → Connect → Reach
const features = [
    {
        id: 'company-intelligence',
        title: 'Company Intelligence',
        description: 'Know everything about your target. Funding, team, tech stack, news, competitors — all in one place.',
        icon: Search,
        href: '/platform#company-intelligence',
        gradient: 'from-berri-coral to-berri-raspberry',
        bgGradient: 'from-berri-coral/10 to-berri-raspberry/10',
        iconColor: 'text-berri-coral',
        items: [
            'Funding rounds & investors',
            'Team composition & hiring',
            'Tech stack & integrations',
            'News & competitive intel',
        ],
        primaryCta: 'Get Started',
        secondaryCta: 'Learn more',
    },
    {
        id: 'people-intelligence',
        title: 'People Intelligence',
        description: 'Find the right decision makers. Search by company, event, or role to identify your targets.',
        icon: Users,
        href: '/platform#people-intelligence',
        gradient: 'from-berri-amber to-berri-gold',
        bgGradient: 'from-berri-amber/10 to-berri-gold/10',
        iconColor: 'text-berri-amber',
        items: [
            'Search by company or event',
            'Role & seniority filtering',
            'Current, past, or affiliated',
            'Contact info & socials',
        ],
        primaryCta: 'Get Started',
        secondaryCta: 'Learn more',
    },
    {
        id: 'pathfinder',
        title: 'Pathfinder',
        description: 'Discover warm paths through your network. We map alumni, colleagues, investors, and communities.',
        icon: Network,
        href: '/platform#pathfinder',
        gradient: 'from-berri-raspberry to-berri-coral',
        bgGradient: 'from-berri-raspberry/10 to-berri-coral/10',
        iconColor: 'text-berri-raspberry',
        items: [
            'Multi-hop path discovery',
            'Extended network mapping',
            'Connection strength scoring',
            'Best intro route ranking',
        ],
        primaryCta: 'Get Started',
        secondaryCta: 'Learn more',
    },
    {
        id: 'ping',
        title: 'Ping',
        description: 'Craft and send personalized outreach. AI drafts the perfect message based on your warm path.',
        icon: Send,
        href: '/platform#ping',
        gradient: 'from-berri-gold to-berri-amber',
        bgGradient: 'from-berri-gold/10 to-berri-amber/10',
        iconColor: 'text-berri-gold',
        items: [
            'AI-drafted personalized messages',
            'Context from your warm path',
            'One-click send via X/Twitter',
            'Response tracking',
        ],
        primaryCta: 'Get Started',
        secondaryCta: 'Learn more',
    },
]

// Navigation Tab Component
function FeatureTab({
    feature,
    isActive,
    onClick
}: {
    feature: typeof features[0]
    isActive: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`relative px-6 py-3 rounded-full text-sm font-medium transition-colors duration-200 ${isActive
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {isActive && (
                <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${feature.gradient}`}
                    transition={{ type: 'tween', ease: [0.25, 0.1, 0.25, 1], duration: 0.35 }}
                />
            )}
            <span className="relative z-10">{feature.title}</span>
        </button>
    )
}

// Content Section for each feature
function FeatureContent({
    feature,
    isActive
}: {
    feature: typeof features[0]
    isActive: boolean
}) {
    const icons = featureIcons[feature.id as keyof typeof featureIcons]

    return (
        <div
            className={`py-[calc(var(--section-spacing)*0.8)] lg:py-[var(--section-spacing)] scroll-mt-24 transition-opacity duration-300 ease-out ${isActive ? 'opacity-100' : 'opacity-40'
                }`}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
                {/* Title */}
                <h3 className="text-3xl lg:text-4xl font-heading font-extrabold text-gray-900 mb-4">
                    {feature.title}
                </h3>

                {/* Description */}
                <p className="text-lg text-gray-700 leading-relaxed mb-8 max-w-md">
                    {feature.description}
                </p>

                {/* CTAs - Website consistent style */}
                <div className="flex flex-wrap items-center gap-3 mb-10">
                    <Button
                        variant="brandAction"
                        size="lg"
                        className="rounded-full h-14 text-base font-semibold px-8 gap-2"
                        asChild
                    >
                        <Link href="/sign-up" className="flex items-center">
                            <span>{feature.primaryCta}</span>
                            <ArrowUpRight className="w-5 h-5" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="lg"
                        className="rounded-full h-14 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        asChild
                    >
                        <Link href={feature.href}>
                            {feature.secondaryCta}
                        </Link>
                    </Button>
                </div>

                {/* Feature Items - Monochromatic icons */}
                <ul className="space-y-4">
                    {feature.items.map((item, idx) => {
                        const IconComponent = icons[idx]
                        return (
                            <motion.li
                                key={item}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                                className="flex items-center gap-3 text-gray-700"
                            >
                                <IconComponent className={`w-5 h-5 ${feature.iconColor} flex-shrink-0`} />
                                <span className="text-sm lg:text-base">{item}</span>
                            </motion.li>
                        )
                    })}
                </ul>
            </motion.div>
        </div>
    )
}

// Sticky Image Component with feature-specific visuals
function StickyImage({ activeIndex }: { activeIndex: number }) {
    const activeFeature = features[activeIndex]

    return (
        <div className="relative w-full aspect-[16/15] rounded-3xl overflow-hidden glass-strong depth-lg">
            {/* Aurora gradient background layer */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    background: 'radial-gradient(ellipse 80% 80% at 30% 20%, rgba(229, 72, 104, 0.15), transparent 60%), radial-gradient(ellipse 60% 60% at 70% 80%, rgba(255, 127, 107, 0.12), transparent 60%)',
                }}
            />
            {/* Background gradient with transition */}
            <motion.div
                key={`bg-${activeIndex}`}
                className={`absolute inset-0 bg-gradient-to-br ${activeFeature.bgGradient}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />

            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Valley-inspired grain texture overlay */}
            <div className="absolute inset-0 grain-overlay" />

            {/* Feature-specific visuals - order: Company(0), People(1), Pathfinder(2), Ping(3) */}
            <AnimatePresence mode="popLayout" custom={activeIndex}>
                {activeIndex === 0 && (
                    <motion.div
                        key="company-visual"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute inset-0 flex items-center justify-center p-6"
                    >
                        {/* Network Path Visualization */}
                        <div className="relative w-full h-full max-w-md">
                            {/* SVG Connection Paths */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 350" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                    <linearGradient id="path-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#E54868" stopOpacity="0.8" />
                                        <stop offset="100%" stopColor="#FF7F6B" stopOpacity="0.6" />
                                    </linearGradient>
                                    <linearGradient id="path-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#FF7F6B" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#F5A623" stopOpacity="0.5" />
                                    </linearGradient>
                                    <linearGradient id="path-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#22C55E" stopOpacity="0.8" />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Path 1: You -> 1st degree */}
                                <motion.path
                                    d="M 60 175 Q 110 140 160 155"
                                    stroke="url(#path-gradient-1)"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                />

                                {/* Path 2: 1st degree -> 2nd degree */}
                                <motion.path
                                    d="M 185 155 Q 230 120 270 140"
                                    stroke="url(#path-gradient-2)"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                />

                                {/* Path 3: 2nd degree -> Target */}
                                <motion.path
                                    d="M 295 140 Q 330 160 350 175"
                                    stroke="url(#path-gradient-3)"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    filter="url(#glow)"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
                                />

                                {/* Secondary connections (faded) */}
                                <motion.path
                                    d="M 60 175 Q 100 220 150 230"
                                    stroke="rgba(229, 72, 104, 0.2)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray="4,4"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.4 }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                />
                                <motion.path
                                    d="M 170 155 Q 200 200 220 220"
                                    stroke="rgba(76, 64, 247, 0.15)"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeDasharray="4,4"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.3 }}
                                    transition={{ duration: 1, delay: 0.8 }}
                                />
                            </svg>

                            {/* Node: YOU */}
                            <motion.div
                                className="absolute"
                                style={{ left: '5%', top: '42%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-berri-raspberry to-berri-coral shadow-lg flex items-center justify-center ring-4 ring-white">
                                        <span className="text-white font-bold text-sm">YOU</span>
                                    </div>
                                    <motion.div
                                        className="absolute -inset-2 rounded-full border-2 border-berri-raspberry/30"
                                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                </div>
                            </motion.div>

                            {/* Node: 1st Degree Connection */}
                            <motion.div
                                className="absolute"
                                style={{ left: '32%', top: '35%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full overflow-hidden ring-3 ring-white shadow-lg">
                                        <Image
                                            src="https://i.pravatar.cc/100?u=connection-1"
                                            alt="1st degree"
                                            width={56}
                                            height={56}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-berri-coral text-white text-xs font-bold flex items-center justify-center shadow-md">
                                        1°
                                    </div>
                                </div>
                            </motion.div>

                            {/* Node: 2nd Degree Connection */}
                            <motion.div
                                className="absolute"
                                style={{ left: '58%', top: '30%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full overflow-hidden ring-3 ring-white shadow-lg">
                                        <Image
                                            src="https://i.pravatar.cc/100?u=connection-2"
                                            alt="2nd degree"
                                            width={56}
                                            height={56}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-berri-coral text-white text-xs font-bold flex items-center justify-center shadow-md">
                                        2°
                                    </div>
                                </div>
                            </motion.div>

                            {/* Node: TARGET */}
                            <motion.div
                                className="absolute"
                                style={{ left: '78%', top: '40%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 1.3, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="relative">
                                    <motion.div
                                        className="absolute -inset-3 rounded-full bg-green-400/20"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                    <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-green-400 shadow-xl">
                                        <Image
                                            src="https://i.pravatar.cc/100?u=target-vp"
                                            alt="Target"
                                            width={64}
                                            height={64}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold shadow-md whitespace-nowrap">
                                        TARGET
                                    </div>
                                </div>
                            </motion.div>

                            {/* Secondary unconnected nodes (faded) */}
                            <motion.div
                                className="absolute"
                                style={{ left: '28%', top: '60%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.4 }}
                                transition={{ duration: 0.4, delay: 0.7 }}
                            >
                                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 shadow">
                                    <Image
                                        src="https://i.pravatar.cc/100?u=other-1"
                                        alt="Other connection"
                                        width={40}
                                        height={40}
                                        loading="lazy"
                                        className="w-full h-full object-cover grayscale"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                className="absolute"
                                style={{ left: '48%', top: '58%' }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.3 }}
                                transition={{ duration: 0.4, delay: 1.0 }}
                            >
                                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 shadow">
                                    <Image
                                        src="https://i.pravatar.cc/100?u=other-2"
                                        alt="Other connection"
                                        width={36}
                                        height={36}
                                        loading="lazy"
                                        className="w-full h-full object-cover grayscale"
                                    />
                                </div>
                            </motion.div>

                            {/* Path strength indicator */}
                            <motion.div
                                className="absolute bottom-4 left-1/2 -translate-x-1/2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.5, duration: 0.4 }}
                            >
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-lg border border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs font-semibold text-gray-700">Strong Path</span>
                                    </div>
                                    <div className="w-px h-4 bg-gray-200" />
                                    <span className="text-xs text-green-600 font-bold">92% intro rate</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeIndex === 1 && (
                    <motion.div
                        key="people-visual"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute inset-0 flex items-center justify-center p-8"
                    >
                        {/* Company Intelligence Cards Stack */}
                        <div className="relative w-full max-w-sm">
                            {/* Stacked cards background */}
                            <motion.div
                                className="absolute top-4 left-4 right-0 bottom-0 rounded-2xl bg-white/50 shadow-lg"
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            />
                            <motion.div
                                className="absolute top-2 left-2 right-2 bottom-2 rounded-2xl bg-white/70 shadow-lg"
                                initial={{ opacity: 0, x: 4 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            />

                            {/* Main card */}
                            <motion.div
                                className="relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-coral to-berri-raspberry flex items-center justify-center">
                                        <Search className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                                        <div className="h-3 w-16 bg-gray-100 rounded" />
                                    </div>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-berri-coral/10 rounded-lg p-3">
                                        <div className="text-berri-coral text-xs font-medium mb-1">Funding</div>
                                        <div className="text-gray-900 font-bold">$24M</div>
                                    </div>
                                    <div className="bg-berri-raspberry/10 rounded-lg p-3">
                                        <div className="text-berri-raspberry text-xs font-medium mb-1">Team Size</div>
                                        <div className="text-gray-900 font-bold">45</div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-berri-coral/15 text-berri-coral text-xs rounded-full">DeFi</span>
                                    <span className="px-2 py-1 bg-berri-raspberry/15 text-berri-raspberry text-xs rounded-full">Layer 2</span>
                                    <span className="px-2 py-1 bg-berri-raspberry/10 text-berri-raspberry text-xs rounded-full">Series A</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeIndex === 2 && (
                    <motion.div
                        key="pathfinder-visual"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute inset-0 flex items-center justify-center p-8"
                    >
                        {/* People Intelligence - Profile Cards */}
                        <div className="relative w-full max-w-sm">
                            {/* Background profiles */}
                            <motion.div
                                className="absolute -top-4 -right-4 w-40 h-24 rounded-xl bg-white/50 shadow-md"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                            />

                            {/* Main profile card */}
                            <motion.div
                                className="relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-berri-amber to-berri-gold flex items-center justify-center">
                                        <Users className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                                        <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-berri-amber" />
                                            <span className="text-xs text-gray-500">Active</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center p-2 bg-berri-amber/10 rounded-lg">
                                        <div className="text-berri-amber font-bold text-lg">87</div>
                                        <div className="text-berri-amber text-xs">Score</div>
                                    </div>
                                    <div className="text-center p-2 bg-berri-gold/15 rounded-lg">
                                        <div className="text-berri-gold font-bold text-lg">12K</div>
                                        <div className="text-berri-gold text-xs">Reach</div>
                                    </div>
                                    <div className="text-center p-2 bg-berri-raspberry/10 rounded-lg">
                                        <div className="text-berri-raspberry font-bold text-lg">C-Level</div>
                                        <div className="text-berri-raspberry text-xs">Role</div>
                                    </div>
                                </div>

                                {/* Action button */}
                                <motion.div
                                    className="w-full py-2 bg-gradient-to-r from-berri-amber to-berri-gold rounded-lg text-white text-sm font-medium text-center"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    View Full Profile
                                </motion.div>
                            </motion.div>

                            {/* Floating mini cards */}
                            <motion.div
                                className="absolute -bottom-4 -left-4 flex -space-x-3"
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-berri-amber to-berri-gold border-2 border-white shadow-md"
                                        style={{ opacity: 1 - i * 0.2 }}
                                    />
                                ))}
                                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-md flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">+24</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeIndex === 3 && (
                    <motion.div
                        key="ping-visual"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute inset-0 flex items-center justify-center p-8"
                    >
                        {/* Ping - Message Composer */}
                        <div className="relative w-full max-w-sm">
                            {/* Main message card */}
                            <motion.div
                                className="relative bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-berri-gold to-berri-amber flex items-center justify-center">
                                        <Send className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">New Message</div>
                                        <div className="text-xs text-gray-500">via warm intro path</div>
                                    </div>
                                </div>

                                {/* Message Preview */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-medium">To:</span>
                                        <span className="px-2 py-0.5 bg-berri-gold/10 text-berri-gold rounded-full">@target_vp</span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            Hey! I saw you&apos;re connected with Alex from our portfolio. Would love to chat about...
                                        </motion.span>
                                        <motion.span
                                            className="inline-block w-2 h-4 bg-berri-gold ml-0.5"
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                        />
                                    </div>
                                </div>

                                {/* Context badges */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-2 py-1 bg-berri-raspberry/10 text-berri-raspberry text-xs rounded-full flex items-center gap-1">
                                        <Network className="w-3 h-3" />
                                        2nd degree
                                    </span>
                                    <span className="px-2 py-1 bg-berri-amber/10 text-berri-amber text-xs rounded-full">
                                        Shared investor
                                    </span>
                                </div>

                                {/* Send button */}
                                <motion.div
                                    className="w-full py-2.5 bg-gradient-to-r from-berri-gold to-berri-amber rounded-lg text-white text-sm font-medium text-center flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <Send className="w-4 h-4" />
                                    Send via X
                                </motion.div>
                            </motion.div>

                            {/* AI indicator */}
                            <motion.div
                                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full bg-white shadow-lg border border-gray-100 flex items-center gap-2"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4, duration: 0.3 }}
                            >
                                <Sparkles className="w-4 h-4 text-berri-gold" />
                                <span className="text-xs font-medium text-gray-700">AI-crafted</span>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Border */}
            <div className="absolute inset-0 rounded-3xl border border-gray-200/50 pointer-events-none" />
        </div>
    )
}

export default function FeaturesScrollSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

    // Track scroll position to update active section
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY
            const windowHeight = window.innerHeight

            // Find the section that is most "active" (closest to center)
            let maxVisibleSection = 0
            let maxVisibility = 0

            sectionRefs.current.forEach((ref, index) => {
                if (ref) {
                    const rect = ref.getBoundingClientRect()

                    // Simple visibility check
                    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)
                    const visibility = Math.max(0, visibleHeight / rect.height) // Percentage visible

                    // Heuristic: If top is near the "action zone" (top 30%)
                    const distanceToTop = Math.abs(rect.top - windowHeight * 0.3)

                    // Prioritize the section starting in the upper third
                    if (distanceToTop < windowHeight * 0.4 && rect.bottom > windowHeight * 0.4) {
                        return setActiveIndex(index)
                    }
                }
            })
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToSection = (index: number) => {
        sectionRefs.current[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        })
    }

    return (
        <section className="py-[var(--section-spacing)] bg-white" ref={containerRef}>
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                        How Berri Works
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                        From stranger to warm intro in 4 steps. Research, find, connect, and reach
                        your ideal targets through your network.
                    </p>
                </motion.div>

                {/* Sticky Navigation Tabs */}
                <div className="sticky top-20 z-30 py-4 mb-8 flex justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-1 p-1.5 bg-white/90 backdrop-blur-xl rounded-full border border-gray-200/60 shadow-lg shadow-gray-200/30"
                    >
                        {features.map((feature, index) => (
                            <FeatureTab
                                key={feature.id}
                                feature={feature}
                                isActive={activeIndex === index}
                                onClick={() => scrollToSection(index)}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Left: Scrolling Content */}
                    <div className="order-2 lg:order-1">
                        {features.map((feature, index) => (
                            <div
                                key={feature.id}
                                id={feature.id}
                                ref={(el) => { sectionRefs.current[index] = el }}
                            >
                                <FeatureContent
                                    feature={feature}
                                    isActive={activeIndex === index}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Right: Sticky Image */}
                    <div className="order-1 lg:order-2 lg:sticky lg:top-52 lg:h-fit">
                        <StickyImage activeIndex={activeIndex} />
                    </div>
                </div>
            </div>
        </section>
    )
}
