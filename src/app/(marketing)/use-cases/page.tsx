'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, TrendingUp, Megaphone, ArrowUpRight, Check, DollarSign, Users, Target, Sparkles, Zap, Building2, Route, MessageSquare, Share2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import CTA from '@/components/marketing/CTA'

const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const

type TabId = 'founders' | 'sales' | 'gtm'

interface TabContent {
    id: TabId
    label: string
    icon: typeof Rocket
    accent: 'amber' | 'raspberry' | 'coral'
    hero: {
        title: string
        highlight: string
        description: string
    }
    stats: { value: string; label: string; description: string }[]
    features: {
        icon: typeof Rocket
        title: string
        description: string
        benefits: string[]
    }[]
    workflow: { step: string; title: string; description: string }[]
    testimonial: {
        quote: string
        author: string
        role: string
        company: string
    }
}

const tabs: TabContent[] = [
    {
        id: 'founders',
        label: 'For Founders',
        icon: Rocket,
        accent: 'amber',
        hero: {
            title: 'Raise Capital via',
            highlight: 'Warm Intros',
            description: "Don't waste time on cold emails. Use your existing network to find warm intros to top-tier VCs, strategic advisors, and ecosystem partners.",
        },
        stats: [
            { value: '2x', label: 'Faster Fundraising', description: 'time to close' },
            { value: '87%', label: 'Meeting Rate', description: 'from warm intros' },
            { value: '$150M+', label: 'Raised', description: 'by Berri users' },
        ],
        features: [
            {
                icon: TrendingUp,
                title: 'Accelerate Fundraising',
                description: 'Identify which investors in your network have backed similar protocols. Get the warmest path to the partner level.',
                benefits: ['Map investor thesis alignment', 'Partner-level connections', 'Portfolio synergy analysis'],
            },
            {
                icon: Users,
                title: 'Recruit Advisors & KOLs',
                description: 'Find key opinion leaders and operators who are already connected to your team or investors.',
                benefits: ['Influence score rankings', 'Domain expertise filters', 'Network overlap analysis'],
            },
            {
                icon: Building2,
                title: 'Ecosystem Partnerships',
                description: 'Map connections to other founders in your space to secure integrations and strategic partnerships.',
                benefits: ['Protocol integration paths', 'Co-marketing partners', 'Strategic alliance mapping'],
            },
        ],
        workflow: [
            { step: '01', title: 'Connect Your Network', description: 'Link Twitter, LinkedIn, and Telegram to build your relationship graph.' },
            { step: '02', title: 'Find Target Investors', description: 'Search by thesis, check size, portfolio companies, and stage preference.' },
            { step: '03', title: 'Discover Warm Paths', description: 'Pathfinder shows you who can introduce you to each investor partner.' },
            { step: '04', title: 'Close Your Round', description: 'Convert warm intros to term sheets at 3x the rate of cold outreach.' },
        ],
        testimonial: {
            quote: "We closed our seed round in 6 weeks using Berri. Found warm paths to 8 tier-1 VCs through our existing network.",
            author: 'Alex Thompson',
            role: 'Co-founder',
            company: 'DeFi Protocol',
        },
    },
    {
        id: 'sales',
        label: 'For Sales & BD',
        icon: TrendingUp,
        accent: 'raspberry',
        hero: {
            title: 'Build Pipeline',
            highlight: '3x Faster',
            description: 'Stop prospecting in the dark. Identify high-intent buyers and get introduced by mutual connections for meetings that actually convert.',
        },
        stats: [
            { value: '3x', label: 'Higher Reply Rates', description: 'vs cold outreach' },
            { value: '40%', label: 'Faster Sales Cycles', description: 'time to close' },
            { value: '68%', label: 'Meeting Rate', description: 'from warm intros' },
        ],
        features: [
            {
                icon: Target,
                title: 'Precision Targeting',
                description: 'Filter prospects by on-chain activity, event attendance, investment history, and social engagement.',
                benefits: ['50+ filter dimensions', 'Real-time activity data', 'ICP matching scores'],
            },
            {
                icon: Route,
                title: 'Warm Intro Paths',
                description: 'Instantly see who in your team or investor network can introduce you to any prospect.',
                benefits: ['Real-time connection mapping', 'Connector reliability scores', 'Track intro success rates'],
            },
            {
                icon: Building2,
                title: 'Company Intelligence',
                description: 'Access funding data, team composition, tech stack, and recent news for every target account.',
                benefits: ['200+ data points per company', 'Daily updates', 'Competitive landscape mapping'],
            },
        ],
        workflow: [
            { step: '01', title: 'Build Your ICP', description: 'Define your ideal customer profile using 50+ filters including funding stage and tech stack.' },
            { step: '02', title: 'Find Warm Paths', description: 'Pathfinder analyzes your network to find the shortest connection to each prospect.' },
            { step: '03', title: 'Request Introductions', description: 'Generate personalized intro requests with context pulled from prospect intelligence.' },
            { step: '04', title: 'Book Meetings', description: 'Convert warm introductions into meetings at 3x the rate of cold outreach.' },
        ],
        testimonial: {
            quote: "We closed $2.4M in pipeline in Q4 using Berri. The combination of company intelligence and warm intro paths completely transformed our enterprise sales motion.",
            author: 'Marcus Johnson',
            role: 'VP Sales',
            company: 'Infrastructure Co',
        },
    },
    {
        id: 'gtm',
        label: 'For GTM & Marketing',
        icon: Megaphone,
        accent: 'coral',
        hero: {
            title: 'Launch with',
            highlight: 'Maximum Impact',
            description: 'Identify the right partners, influencers, and communities to amplify your message. Data-driven community activation for Web3 teams.',
        },
        stats: [
            { value: '5x', label: 'Event ROI', description: 'improvement' },
            { value: '150%', label: 'Campaign Reach', description: 'via partners' },
            { value: '92%', label: 'Partner Match', description: 'success rate' },
        ],
        features: [
            {
                icon: Users,
                title: 'Find Amplifiers',
                description: 'Discover influencers and KOLs who are already in your extended network. Get warm introductions instead of cold DMs.',
                benefits: ['Influence & reach scoring', 'Category specialization', 'Network connection paths'],
            },
            {
                icon: Share2,
                title: 'Co-Marketing Partners',
                description: 'Identify non-competitive protocols with overlapping user bases for high-impact joint campaigns.',
                benefits: ['Audience overlap analysis', 'Synergy scoring', 'Campaign coordination tools'],
            },
            {
                icon: Sparkles,
                title: 'Market Research',
                description: 'Understand your TAM by analyzing funding inflows, developer activity, and user growth across your sector.',
                benefits: ['Sector funding analysis', 'Developer activity trends', 'Competitive landscape mapping'],
            },
        ],
        workflow: [
            { step: '01', title: 'Define Your Audience', description: 'Use People Intelligence to build detailed profiles of your target community segments.' },
            { step: '02', title: 'Find Amplifiers', description: 'Identify influencers and KOLs who are already connected to your network.' },
            { step: '03', title: 'Map Partners', description: 'Discover protocols with overlapping audiences for co-marketing opportunities.' },
            { step: '04', title: 'Measure Impact', description: 'Track campaign reach and partner performance with built-in analytics.' },
        ],
        testimonial: {
            quote: "Berri transformed our launch strategy. We identified 15 partner protocols and coordinated a joint launch that reached 2M+ users.",
            author: 'Elena Rodriguez',
            role: 'Head of Marketing',
            company: 'NFT Marketplace',
        },
    },
]

const accentColors = {
    amber: {
        badge: 'glass-amber text-berri-amber',
        stat: 'text-berri-amber',
        tab: 'bg-berri-amber',
        tabBg: 'bg-berri-amber/10',
        glow: 'hover-glow-amber',
    },
    raspberry: {
        badge: 'glass-raspberry text-berri-raspberry',
        stat: 'text-berri-raspberry',
        tab: 'bg-berri-raspberry',
        tabBg: 'bg-berri-raspberry/10',
        glow: 'hover-glow-raspberry',
    },
    coral: {
        badge: 'glass-coral text-berri-coral',
        stat: 'text-berri-coral',
        tab: 'bg-berri-coral',
        tabBg: 'bg-berri-coral/10',
        glow: 'hover-glow-raspberry',
    },
}

export default function UseCasesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('founders')
    const activeContent = tabs.find(t => t.id === activeTab)!
    const colors = accentColors[activeContent.accent]

    return (
        <>
            {/* Hero Section */}
            <section className="pt-32 pb-16 bg-gray-50 relative overflow-hidden">
                {/* Aurora Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)',
                        }}
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.6, 0.4],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(229,72,104,0.1) 0%, transparent 70%)',
                        }}
                        animate={{
                            scale: [1.1, 1, 1.1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: STANDARD_EASE }}
                        >
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                                Use Cases
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: STANDARD_EASE }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-6"
                        >
                            Built for Web3 Teams{' '}
                            <span className="text-berri-raspberry">Who Close Deals</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: STANDARD_EASE }}
                            className="text-lg text-gray-600 max-w-2xl mx-auto mb-12"
                        >
                            See how different roles use Berri to accelerate fundraising, build pipeline, and launch with impact.
                        </motion.p>

                        {/* Tab Navigation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15, ease: STANDARD_EASE }}
                            className="inline-flex items-center gap-2 p-1.5 rounded-full glass-strong"
                        >
                            {tabs.map((tab) => {
                                const tabColors = accentColors[tab.accent]
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all ${
                                            isActive
                                                ? `${tabColors.tab} text-white`
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: STANDARD_EASE }}
                >
                    {/* Persona Hero */}
                    <section id={activeContent.id} className="py-16 bg-gray-50 scroll-mt-20">
                        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                            <div className="text-center max-w-3xl mx-auto">
                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium mb-6`}>
                                    <activeContent.icon className="w-4 h-4 mr-2" />
                                    {activeContent.label}
                                </span>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight mb-6">
                                    {activeContent.hero.title}{' '}
                                    <span className={colors.stat}>{activeContent.hero.highlight}</span>
                                </h2>
                                <p className="text-lg text-gray-600 mb-8">
                                    {activeContent.hero.description}
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <Button variant="brandAction" size="lg" className="rounded-full" asChild>
                                        <Link href="/resources/contact">
                                            Book a Demo <ArrowUpRight className="w-4 h-4 ml-2" />
                                        </Link>
                                    </Button>
                                    <Button variant="brandOutline" size="lg" className="rounded-full" asChild>
                                        <Link href="/platform">Explore Platform</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="py-16 bg-white border-y border-gray-100">
                        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                            <div className="grid grid-cols-3 gap-8">
                                {activeContent.stats.map((stat, index) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.1, ease: STANDARD_EASE }}
                                        className="text-center"
                                    >
                                        <div className={`text-3xl lg:text-4xl font-heading font-bold ${colors.stat} mb-1`}>
                                            {stat.value}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">{stat.label}</div>
                                        <div className="text-xs text-gray-500">{stat.description}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section className="py-24 bg-white">
                        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-center max-w-3xl mx-auto mb-16"
                            >
                                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                                    Everything You Need
                                </h2>
                                <p className="text-lg text-gray-600">
                                    Purpose-built tools for your role
                                </p>
                            </motion.div>

                            <div className="grid lg:grid-cols-3 gap-8">
                                {activeContent.features.map((feature, index) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1, ease: STANDARD_EASE }}
                                        className={`glass-strong depth-md rounded-2xl p-8 ${colors.glow} transition-all`}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center mb-6">
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-xl font-heading font-semibold mb-3">{feature.title}</h3>
                                        <p className="text-gray-600 mb-6">{feature.description}</p>
                                        <ul className="space-y-2">
                                            {feature.benefits.map((benefit, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Check className="w-4 h-4 text-emerald-500" />
                                                    {benefit}
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Workflow */}
                    <section className="py-24 bg-gray-50">
                        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="text-center max-w-3xl mx-auto mb-16"
                            >
                                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                                    Your Workflow
                                </h2>
                                <p className="text-lg text-gray-600">
                                    From first touch to closed deal in four steps
                                </p>
                            </motion.div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {activeContent.workflow.map((step, index) => (
                                    <motion.div
                                        key={step.step}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1, ease: STANDARD_EASE }}
                                        className={`glass depth-md rounded-2xl p-6 ${colors.glow} transition-all`}
                                    >
                                        <div className={`text-4xl font-heading font-bold ${colors.stat} opacity-20 mb-4`}>
                                            {step.step}
                                        </div>
                                        <h3 className="text-lg font-heading font-semibold mb-2">{step.title}</h3>
                                        <p className="text-sm text-gray-600">{step.description}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Testimonial */}
                    <section className="py-24 bg-white">
                        <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="glass-strong depth-lg rounded-3xl p-8 md:p-12 max-w-4xl mx-auto"
                            >
                                <div className="grid md:grid-cols-5 gap-8 items-center">
                                    <div className="md:col-span-2 text-center md:text-left">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-berri-raspberry to-berri-coral mx-auto md:mx-0 mb-4 flex items-center justify-center text-white text-2xl font-bold">
                                            {activeContent.testimonial.author.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="font-semibold text-gray-900">{activeContent.testimonial.author}</div>
                                        <div className="text-sm text-gray-500">{activeContent.testimonial.role}</div>
                                        <div className="text-sm text-gray-400">{activeContent.testimonial.company}</div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <div className="flex gap-1 mb-4">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                            ))}
                                        </div>
                                        <blockquote className="text-lg text-gray-700">
                                            &ldquo;{activeContent.testimonial.quote}&rdquo;
                                        </blockquote>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                </motion.div>
            </AnimatePresence>

            {/* CTA */}
            <CTA />
        </>
    )
}
