'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Building2, Users, Route, Send, Check, DollarSign, Code, TrendingUp, Filter, Mail, Zap, Network, Shield, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import CTA from '@/components/marketing/CTA'

const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const

interface WorkflowStep {
    id: string
    step: number
    title: string
    subtitle: string
    description: string
    icon: typeof Building2
    accent: 'coral' | 'amber' | 'raspberry' | 'gold'
    stats: { value: string; label: string }[]
    features: { icon: typeof Building2; title: string; description: string }[]
}

const workflowSteps: WorkflowStep[] = [
    {
        id: 'company-intelligence',
        step: 1,
        title: 'Research: Company Intelligence',
        subtitle: 'Know everything about your target before you pitch',
        description: 'Access comprehensive data on 50,000+ Web3 companies. Funding history, team size, tech stack, competitors, and growth signals—all in one place.',
        icon: Building2,
        accent: 'coral',
        stats: [
            { value: '50K+', label: 'Companies Tracked' },
            { value: '200+', label: 'Data Points' },
            { value: '98%', label: 'Accuracy' },
        ],
        features: [
            { icon: DollarSign, title: 'Funding Intelligence', description: 'Complete funding history from Pre-Seed to Series C+. See investors, valuations, and round details.' },
            { icon: Users, title: 'Team Insights', description: 'Track team size, key hires, and org structure. Know who to target and when teams are growing.' },
            { icon: Code, title: 'Tech Stack Analysis', description: 'Identify infrastructure providers, tools, and dependencies. Perfect for targeting by technology fit.' },
            { icon: TrendingUp, title: 'Growth Signals', description: 'Track Twitter, Discord, and Telegram growth. Gauge community momentum and engagement.' },
        ],
    },
    {
        id: 'people-intelligence',
        step: 2,
        title: 'Find: People Intelligence',
        subtitle: 'Identify the right decision makers',
        description: 'Source prospects based on what they do, not just who they are. Filter by event attendance, past roles, investment activity, and more.',
        icon: Users,
        accent: 'amber',
        stats: [
            { value: '1.4M+', label: 'Profiles' },
            { value: '85%', label: 'Email Coverage' },
            { value: '50+', label: 'Filters' },
        ],
        features: [
            { icon: Filter, title: 'Advanced Filtering', description: 'Combine 20+ filter types with AND/OR logic for precise targeting by role, event, or investment activity.' },
            { icon: Mail, title: 'Verified Contact Info', description: 'Access verified emails, Twitter handles, and Telegram usernames for direct outreach.' },
            { icon: Zap, title: 'Buying Signals', description: 'Track job changes, funding announcements, and engagement spikes to time your outreach.' },
            { icon: TrendingUp, title: 'Relationship Scoring', description: 'See your connection strength and mutual contacts for every person in our database.' },
        ],
    },
    {
        id: 'pathfinder',
        step: 3,
        title: 'Connect: Pathfinder',
        subtitle: 'Discover warm paths through your network',
        description: 'Pathfinder maps multi-step connections through your team, investors, and advisors to find the warmest path to any decision maker.',
        icon: Route,
        accent: 'raspberry',
        stats: [
            { value: '12M+', label: 'Connections Mapped' },
            { value: '3x', label: 'Response Rate' },
            { value: '94%', label: 'Path Accuracy' },
        ],
        features: [
            { icon: Route, title: 'Multi-Hop Path Discovery', description: 'Automatically map 2nd and 3rd degree connections. Find the warmest path to any decision maker.' },
            { icon: Network, title: 'Extended Network Mapping', description: 'We map alumni, ex-coworkers, investors, and shared communities to find every possible path.' },
            { icon: Zap, title: 'Real-Time Path Scoring', description: 'Each connection is scored by strength, recency, and context. Know exactly which intro will land.' },
            { icon: Shield, title: 'Privacy-First Design', description: 'Your network data stays yours. We never share connection graphs with other users.' },
        ],
    },
    {
        id: 'ping',
        step: 4,
        title: 'Reach: Ping',
        subtitle: 'Craft and send the perfect intro message',
        description: 'AI drafts personalized messages based on your context, their background, and the warm path you discovered. Review, edit, and send directly.',
        icon: Send,
        accent: 'gold',
        stats: [
            { value: '5x', label: 'Faster Outreach' },
            { value: '92%', label: 'Personalization' },
            { value: '1-Click', label: 'Send via X' },
        ],
        features: [
            { icon: Sparkles, title: 'AI-Powered Drafts', description: 'Our AI creates personalized messages using context from Company Intel, People Intel, and your warm path.' },
            { icon: MessageSquare, title: 'Context-Rich Messaging', description: 'Every message references shared connections, common interests, and relevant talking points.' },
            { icon: Send, title: 'One-Click Send', description: 'Send your message directly via X/Twitter without leaving Berri. Track opens and responses.' },
            { icon: TrendingUp, title: 'Response Tracking', description: 'Monitor which messages get responses and optimize your outreach strategy over time.' },
        ],
    },
]

const accentColors = {
    coral: {
        badge: 'glass-coral text-berri-coral',
        gradient: 'from-berri-coral to-berri-raspberry',
        stat: 'text-berri-coral',
        border: 'border-berri-coral/20',
    },
    amber: {
        badge: 'glass-amber text-berri-amber',
        gradient: 'from-berri-amber to-berri-gold',
        stat: 'text-berri-amber',
        border: 'border-berri-amber/20',
    },
    raspberry: {
        badge: 'glass-raspberry text-berri-raspberry',
        gradient: 'from-berri-raspberry to-berri-coral',
        stat: 'text-berri-raspberry',
        border: 'border-berri-raspberry/20',
    },
    gold: {
        badge: 'glass-amber text-berri-gold',
        gradient: 'from-berri-gold to-berri-amber',
        stat: 'text-berri-gold',
        border: 'border-berri-gold/20',
    },
}

function WorkflowStepSection({ step, isEven }: { step: WorkflowStep; isEven: boolean }) {
    const colors = accentColors[step.accent]

    return (
        <section
            id={step.id}
            className={`py-24 ${isEven ? 'bg-gray-50' : 'bg-white'} relative overflow-hidden scroll-mt-20`}
        >
            {/* Aurora Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className={`absolute ${isEven ? 'top-0 right-0' : 'bottom-0 left-0'} w-[600px] h-[600px] rounded-full`}
                    style={{
                        background: `radial-gradient(circle, rgba(229,72,104,0.08) 0%, transparent 70%)`,
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                {/* Step Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: STANDARD_EASE }}
                    className="mb-16"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium`}>
                            <step.icon className="w-4 h-4 mr-2" />
                            Step {step.step}
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                        {step.title}
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl">
                        {step.subtitle}
                    </p>
                </motion.div>

                {/* Content Grid */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Left - Description & Stats */}
                    <motion.div
                        initial={{ opacity: 0, x: isEven ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: STANDARD_EASE }}
                        className={isEven ? 'lg:order-2' : ''}
                    >
                        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                            {step.description}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {step.stats.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass depth-sm rounded-xl p-4 text-center"
                                >
                                    <div className={`text-2xl md:text-3xl font-heading font-bold ${colors.stat}`}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4">
                            <Button variant="brandAction" size="lg" className="rounded-full" asChild>
                                <Link href="/app/sign-up">
                                    Get Started <ArrowUpRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                            <Button variant="brandOutline" size="lg" className="rounded-full" asChild>
                                <Link href="/resources/contact">Book a Demo</Link>
                            </Button>
                        </div>
                    </motion.div>

                    {/* Right - Features */}
                    <motion.div
                        initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: STANDARD_EASE }}
                        className={isEven ? 'lg:order-1' : ''}
                    >
                        <div className="grid sm:grid-cols-2 gap-4">
                            {step.features.map((feature, i) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`glass depth-md rounded-2xl p-6 border ${colors.border}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4`}>
                                        <feature.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-heading font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-600">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default function PlatformPage() {
    return (
        <>
            {/* Hero Section */}
            <section className="pt-32 pb-24 bg-gray-50 relative overflow-hidden">
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
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: STANDARD_EASE }}
                        >
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                                Platform
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: STANDARD_EASE }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-6"
                        >
                            From Stranger to{' '}
                            <span className="text-berri-raspberry">Warm Intro</span>
                            <br />in 4 Steps
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: STANDARD_EASE }}
                            className="text-lg text-gray-600 max-w-2xl mx-auto mb-8"
                        >
                            The complete relationship intelligence workflow. Research your target, find decision makers,
                            discover warm paths, and send personalized outreach—all in one connected platform.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15, ease: STANDARD_EASE }}
                            className="flex flex-wrap justify-center gap-4"
                        >
                            <Button variant="brandAction" size="lg" className="rounded-full" asChild>
                                <Link href="/app/sign-up">
                                    Start Free Trial <ArrowUpRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                            <Button variant="brandOutline" size="lg" className="rounded-full" asChild>
                                <Link href="/resources/contact">Book a Demo</Link>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Workflow Steps Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: STANDARD_EASE }}
                        className="mt-16 max-w-4xl mx-auto"
                    >
                        <div className="grid grid-cols-4 gap-2 md:gap-4">
                            {workflowSteps.map((step, i) => {
                                const colors = accentColors[step.accent]
                                return (
                                    <Link
                                        key={step.id}
                                        href={`#${step.id}`}
                                        className="group"
                                    >
                                        <motion.div
                                            whileHover={{ y: -4 }}
                                            className={`glass depth-sm rounded-xl p-3 md:p-4 text-center border ${colors.border} hover:shadow-md transition-all`}
                                        >
                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center mx-auto mb-2`}>
                                                <step.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                            </div>
                                            <div className="text-xs md:text-sm font-semibold text-gray-900 group-hover:text-berri-raspberry transition-colors">
                                                {step.step}. {step.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </div>
                                        </motion.div>
                                    </Link>
                                )
                            })}
                        </div>
                        <div className="hidden md:flex items-center justify-between px-8 mt-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Workflow Steps */}
            {workflowSteps.map((step, i) => (
                <WorkflowStepSection key={step.id} step={step} isEven={i % 2 === 1} />
            ))}

            {/* Comparison Section */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center max-w-3xl mx-auto mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold mb-6">
                            Cold Outreach vs. Berri
                        </h2>
                        <p className="text-lg text-gray-600">
                            See the difference a connected workflow makes.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl bg-gray-100 border border-gray-200"
                        >
                            <h3 className="text-xl font-heading font-bold mb-6 text-gray-500">Cold Outreach</h3>
                            <ul className="space-y-4">
                                {[
                                    '2-5% response rate',
                                    'Generic messaging',
                                    'No context or credibility',
                                    'Hours of manual research',
                                    'Fragmented tools & data'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-500">
                                        <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs">✕</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-3xl glass-strong depth-lg border border-berri-raspberry/20"
                        >
                            <h3 className="text-xl font-heading font-bold mb-6 text-berri-raspberry">With Berri</h3>
                            <ul className="space-y-4">
                                {[
                                    '40%+ response rate',
                                    'Personalized intros',
                                    'Built-in trust & context',
                                    'Instant path discovery',
                                    'One connected workflow'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-900">
                                        <span className="w-5 h-5 rounded-full bg-berri-raspberry flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <CTA />
        </>
    )
}
