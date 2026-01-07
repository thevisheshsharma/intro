'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, ArrowUpRight, TrendingUp, Star, Clock, CalendarDays, Users, LogOut, RefreshCcw, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import CTA from '@/components/marketing/CTA'
import FAQ from '@/components/marketing/FAQ'
import { usePrivy } from '@privy-io/react-auth'
import { useSearchParams } from 'next/navigation'

type ButtonVariant = 'brandOutline' | 'brandAction' | 'brandAccent'

interface PricingTier {
    name: string
    price: { monthly: number | string; annual: number | string }
    annualTotal?: number
    tagline: string
    description: string
    includesFrom?: string
    features: string[]
    cta: string
    href: string
    variant: ButtonVariant
    highlight?: boolean
    gradient: string
    inverted?: boolean
}

const tiers: PricingTier[] = [
    {
        name: 'Founder',
        price: { monthly: 100, annual: 100 },
        annualTotal: 1200,
        tagline: 'Built for builders',
        description: 'For early-stage founders and solo operators.',
        features: [
            '1 seat included',
            'Unlimited Pathfinder searches',
            'Full Company Intelligence',
            'Full People Intelligence',
            'Verified emails & socials',
            'CSV exports',
            'Community support'
        ],
        cta: 'Start Free Trial',
        href: '/app/sign-up?plan=founder',
        variant: 'brandOutline',
        gradient: 'from-berri-coral to-amber-400'
    },
    {
        name: 'Standard',
        price: { monthly: 300, annual: 208 },
        annualTotal: 2496,
        tagline: 'Scale your reach',
        description: 'For teams closing deals through warm intros.',
        includesFrom: 'Founder',
        features: [
            '5 seats included',
            'Priority email support',
            'Advanced filters & sorting',
            'Team collaboration tools'
        ],
        cta: 'Start Free Trial',
        href: '/app/sign-up?plan=standard',
        variant: 'brandAction',
        highlight: true,
        gradient: 'from-berri-raspberry to-berri-coral'
    },
    {
        name: 'Enterprise',
        price: { monthly: 'Custom', annual: 'Custom' },
        tagline: 'Full control',
        description: 'For orgs with advanced security & workflow needs.',
        includesFrom: 'Standard',
        features: [
            'Unlimited seats',
            'Team hierarchy & workflows',
            '24×7 priority support',
            'SSO & audit logs',
            'Dedicated success manager',
            'API access'
        ],
        cta: 'Talk to Sales',
        href: '/resources/contact#my-cal-inline-berri',
        variant: 'brandAccent',
        gradient: 'from-berri-amber to-berri-gold',
        inverted: true
    }
]

const pricingFaqs = [
    {
        question: 'What happens after my 10-day trial ends?',
        answer: 'After your trial ends, your account enters read-only mode. You can still view all your existing data, saved searches, and relationship graphs, but you won\'t be able to take new actions until you upgrade. This gives you time to evaluate without losing your work.',
        icon: Clock
    },
    {
        question: 'What\'s the difference between monthly and annual billing?',
        answer: 'Annual billing saves you 31% on the Standard plan—$2,496/year instead of $3,600 if paid monthly. That\'s like getting nearly 4 months free. Founder pricing is the same whether you pay monthly or annually.',
        icon: CalendarDays
    },
    {
        question: 'Can I add more seats to my plan?',
        answer: 'Founder includes 1 seat, and Standard includes 5 seats. If you need more seats, contact us to add them to your Standard plan, or upgrade to Enterprise for unlimited seats.',
        icon: Users
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes, cancel anytime from your account settings. Access continues until the end of your billing period. No lock-in contracts.',
        icon: LogOut
    },
    {
        question: 'Do you offer refunds?',
        answer: 'We offer a 10-day money-back guarantee for all paid plans. Not satisfied? Contact support for a full refund—no questions asked.',
        icon: RefreshCcw
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'All major credit cards via Stripe. Enterprise customers can pay via crypto or arrange invoicing.',
        icon: CreditCard
    }
]

export default function PricingPage() {
    const [annual, setAnnual] = useState(true)
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
    const [checkoutMessage, setCheckoutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const { authenticated, login, getAccessToken } = usePrivy()
    const searchParams = useSearchParams()

    // Handle checkout result from URL params
    useEffect(() => {
        const checkout = searchParams.get('checkout')
        if (checkout === 'success') {
            setCheckoutMessage({ type: 'success', text: 'Welcome to Berri! Your subscription is now active.' })
        } else if (checkout === 'canceled') {
            setCheckoutMessage({ type: 'error', text: 'Checkout was canceled. You can try again anytime.' })
        }
    }, [searchParams])

    const handleCheckout = async (plan: 'founder' | 'standard') => {
        if (!authenticated) {
            login()
            return
        }

        try {
            setCheckoutLoading(plan)
            setCheckoutMessage(null)

            const token = await getAccessToken()
            const response = await fetch('/api/subscription/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    plan,
                    interval: annual ? 'annual' : 'monthly',
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start checkout')
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url
        } catch (error: any) {
            setCheckoutMessage({ type: 'error', text: error.message || 'Something went wrong' })
            setCheckoutLoading(null)
        }
    }

    return (
        <>
            {/* Hero Section with rich aurora */}
            <section className="min-h-[70vh] bg-gray-50 pt-32 pb-24 relative overflow-hidden">
                {/* Rich Aurora gradient background - matching Hero.tsx */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Primary raspberry glow - top right */}
                    <motion.div
                        className="absolute -top-1/4 -right-1/4 w-[90%] h-[90%] opacity-70"
                        style={{
                            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(229, 72, 104, 0.18), transparent 60%)',
                        }}
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.5, 0.7, 0.5],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Secondary coral glow - left */}
                    <motion.div
                        className="absolute top-1/4 -left-1/4 w-[70%] h-[70%] opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255, 127, 107, 0.15), transparent 60%)',
                        }}
                        animate={{
                            scale: [1.1, 1, 1.1],
                            opacity: [0.4, 0.6, 0.4],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Accent amber glow - bottom */}
                    <motion.div
                        className="absolute -bottom-1/4 right-1/3 w-[60%] h-[60%] opacity-50"
                        style={{
                            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(76, 64, 247, 0.12), transparent 60%)',
                        }}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.35, 0.5, 0.35],
                        }}
                        transition={{
                            duration: 12,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Extra warm glow - center */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] opacity-40"
                        style={{
                            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(229, 72, 104, 0.1), transparent 70%)',
                        }}
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.3, 0.45, 0.3],
                        }}
                        transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge with ping animation */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-raspberry depth-sm mb-8 shadow-lg shadow-berri-raspberry/10"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-berri-raspberry opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-berri-raspberry shadow-lg shadow-berri-raspberry/50" />
                            </span>
                            <span className="text-sm text-berri-raspberry font-semibold">Simple, Transparent Pricing</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6"
                        >
                            One platform.
                            <br />
                            <span className="bg-gradient-to-r from-berri-raspberry via-berri-coral to-berri-raspberry bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                                Full access.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                            className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
                        >
                            Every feature included. No gates, no surprises.
                            <br className="hidden sm:block" />
                            Choose based on your team size. Start with a <span className="font-semibold text-berri-raspberry">10-day free trial</span>.
                        </motion.p>

                        {/* Billing Toggle - Sophisticated design */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                            className="inline-flex items-center p-1.5 rounded-full glass-strong depth-md border border-white/50"
                        >
                            {/* Monthly button */}
                            <button
                                onClick={() => setAnnual(false)}
                                aria-label="Select monthly billing"
                                aria-pressed={!annual}
                                className={`relative px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 ${!annual
                                    ? 'bg-white shadow-lg text-gray-900'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Monthly
                            </button>

                            {/* Annual button */}
                            <button
                                onClick={() => setAnnual(true)}
                                aria-label="Select annual billing with 31% discount"
                                aria-pressed={annual}
                                className={`relative px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${annual
                                    ? 'bg-gradient-to-r from-berri-raspberry to-berri-coral text-white shadow-lg shadow-berri-raspberry/30'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Annual
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${annual
                                    ? 'bg-white/25 text-white'
                                    : 'bg-green-500 text-white'
                                    }`}>
                                    −31%
                                </span>
                            </button>
                        </motion.div>

                        {/* Savings callout - only visible on monthly */}
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{
                                opacity: !annual ? 1 : 0,
                                height: !annual ? 'auto' : 0,
                                marginTop: !annual ? 16 : 0
                            }}
                            transition={{ duration: 0.3 }}
                            className="text-sm text-gray-500 overflow-hidden"
                        >
                            Switch to annual and save <span className="font-semibold text-berri-raspberry">$1,104/year</span> on Standard
                        </motion.p>

                        {/* Checkout message */}
                        {checkoutMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-6 px-6 py-3 rounded-xl text-sm font-medium ${checkoutMessage.type === 'success'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}
                            >
                                {checkoutMessage.text}
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-24 bg-white relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-berri-raspberry/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-berri-coral/5 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                        {tiers.map((tier, index) => (
                            <motion.div
                                key={tier.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                                className={`relative ${tier.highlight ? 'md:-mt-6 md:mb-6' : ''}`}
                            >
                                <div className={`relative rounded-3xl p-8 flex flex-col h-full transition-all duration-300 ${tier.inverted
                                    ? 'bg-berri-charcoal border border-berri-charcoal shadow-xl'
                                    : tier.highlight
                                        ? 'glass-strong depth-lg border-2 border-berri-raspberry/30 shadow-xl shadow-berri-raspberry/10'
                                        : 'glass depth-md border border-gray-100/50'
                                    }`}>
                                    {tier.highlight && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <span className="px-5 py-2 rounded-full bg-gradient-to-r from-berri-raspberry to-berri-coral text-white text-sm font-bold shadow-lg shadow-berri-raspberry/30 flex items-center gap-2">
                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                Most Popular
                                            </span>
                                        </div>
                                    )}

                                    {/* Tagline */}
                                    <span className={`text-xs font-bold uppercase tracking-wider mb-2 bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>
                                        {tier.tagline}
                                    </span>

                                    <h3 className={`text-2xl font-heading font-bold mb-2 ${tier.inverted ? 'text-white' : ''}`}>{tier.name}</h3>
                                    <p className={`mb-6 text-sm ${tier.inverted ? 'text-gray-400' : 'text-gray-500'}`}>{tier.description}</p>

                                    {/* Price */}
                                    <div className="mb-8">
                                        {typeof tier.price.monthly === 'number' ? (
                                            <>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-5xl font-heading font-bold tracking-tight ${tier.inverted ? 'text-white' : ''}`}>
                                                        ${annual ? tier.price.annual : tier.price.monthly}
                                                    </span>
                                                    <span className={`text-lg ${tier.inverted ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span>
                                                </div>
                                                {annual && tier.annualTotal && (
                                                    <p className={`text-sm mt-2 ${tier.inverted ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        ${tier.annualTotal.toLocaleString()}/year · billed annually
                                                    </p>
                                                )}
                                                {!annual && tier.name === 'Standard' && (
                                                    <p className="text-sm text-berri-raspberry mt-2 font-semibold flex items-center gap-1">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        Save $1,104/year with annual
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <div className={`text-4xl font-heading font-bold ${tier.inverted ? 'text-white' : ''}`}>Custom</div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="mb-8 flex-1">
                                        {/* Includes from previous tier */}
                                        {tier.includesFrom && (
                                            <div className={`flex items-center gap-2 mb-4 pb-4 border-b ${tier.inverted ? 'border-gray-700' : 'border-gray-100'}`}>
                                                <Sparkles className={`w-4 h-4 ${tier.inverted ? 'text-berri-amber' : 'text-berri-coral'}`} />
                                                <span className={`text-sm font-semibold ${tier.inverted ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Everything in {tier.includesFrom}, plus:
                                                </span>
                                            </div>
                                        )}
                                        <ul className="space-y-3">
                                            {tier.features.map((feature, i) => (
                                                <li key={feature} className="flex items-start gap-3">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${tier.inverted ? 'bg-gradient-to-br from-berri-amber to-berri-gold' : 'bg-gradient-to-br from-berri-raspberry to-berri-coral'}`}>
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                    <span className={`text-sm ${tier.inverted
                                                        ? (i === 0 && !tier.includesFrom ? 'font-semibold text-white' : 'text-gray-400')
                                                        : (i === 0 && !tier.includesFrom ? 'font-semibold text-gray-900' : 'text-gray-600')
                                                        }`}>
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* CTA */}
                                    {tier.name === 'Enterprise' ? (
                                        <Button
                                            asChild
                                            className={`w-full rounded-full group/btn`}
                                            variant={tier.variant}
                                            size="lg"
                                        >
                                            <Link href={tier.href} className="flex items-center justify-center gap-2">
                                                {tier.cta}
                                                <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleCheckout(tier.name.toLowerCase() as 'founder' | 'standard')}
                                            disabled={checkoutLoading === tier.name.toLowerCase()}
                                            className={`w-full rounded-full group/btn ${tier.highlight ? 'shadow-lg shadow-berri-raspberry/20' : ''}`}
                                            variant={tier.variant}
                                            size="lg"
                                        >
                                            {checkoutLoading === tier.name.toLowerCase() ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    {tier.cta}
                                                    <ArrowUpRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Trial note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="text-center mt-12"
                    >
                        <p className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-raspberry text-sm text-berri-raspberry font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-berri-raspberry opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-berri-raspberry" />
                            </span>
                            All plans include a 10-day free trial · No credit card required
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Features Strip */}
            <section className="py-20 bg-gray-50 border-y border-gray-100 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-berri-raspberry/5 via-berri-coral/5 to-berri-raspberry/5 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h3 className="text-2xl lg:text-3xl font-heading font-bold mb-3">
                            <span className="bg-gradient-to-r from-berri-raspberry to-berri-coral bg-clip-text text-transparent">
                                Full access
                            </span>
                            {' '}on every plan
                        </h3>
                        <p className="text-gray-500 text-lg">
                            No feature gates. No surprises. Just results.
                        </p>
                    </motion.div>

                    <div className="flex flex-wrap justify-center gap-4">
                        {[
                            'Unlimited Pathfinder Searches',
                            'Company Intelligence',
                            'People Intelligence',
                            'Verified Contacts',
                            'CSV Export',
                            'Relationship Mapping'
                        ].map((feature, i) => (
                            <motion.div
                                key={feature}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2.5 px-5 py-3 rounded-full glass-strong depth-sm hover:depth-md transition-all hover:scale-105 border border-white/50"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center shadow-sm">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{feature}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trusted By - Logo Cloud */}
            <section className="py-16 bg-white relative overflow-hidden">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center text-sm text-gray-400 uppercase tracking-widest font-medium mb-10"
                    >
                        Trusted by leading crypto teams
                    </motion.p>

                    {/* Logo marquee container */}
                    <div className="relative">
                        {/* Fade edges */}
                        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                        {/* Scrolling logos */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="flex gap-12 overflow-hidden"
                        >
                            <div className="flex items-center gap-16 animate-marquee">
                                {[
                                    { name: 'Polygon', color: '#8247E5' },
                                    { name: 'Solana', color: '#14F195' },
                                    { name: 'a16z crypto', color: '#FF5F1F' },
                                    { name: 'Paradigm', color: '#1a1a1a' },
                                    { name: 'Framework', color: '#3B82F6' },
                                    { name: 'Alliance', color: '#6366F1' },
                                    { name: 'Multicoin', color: '#00C2FF' },
                                    { name: 'Delphi Digital', color: '#FF6B6B' },
                                    { name: 'Jump Crypto', color: '#00D395' },
                                    { name: 'Coinbase Ventures', color: '#0052FF' },
                                ].map((company) => (
                                    <span
                                        key={`${company.name}-1`}
                                        className="text-lg font-semibold text-gray-300 hover:text-gray-900 transition-all duration-300 whitespace-nowrap cursor-default select-none"
                                        style={{
                                            // @ts-ignore
                                            '--hover-color': company.color
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = company.color;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '';
                                        }}
                                    >
                                        {company.name}
                                    </span>
                                ))}
                            </div>
                            {/* Duplicate for seamless loop */}
                            <div className="flex items-center gap-16 animate-marquee" aria-hidden="true">
                                {[
                                    { name: 'Polygon', color: '#8247E5' },
                                    { name: 'Solana', color: '#14F195' },
                                    { name: 'a16z crypto', color: '#FF5F1F' },
                                    { name: 'Paradigm', color: '#1a1a1a' },
                                    { name: 'Framework', color: '#3B82F6' },
                                    { name: 'Alliance', color: '#6366F1' },
                                    { name: 'Multicoin', color: '#00C2FF' },
                                    { name: 'Delphi Digital', color: '#FF6B6B' },
                                    { name: 'Jump Crypto', color: '#00D395' },
                                    { name: 'Coinbase Ventures', color: '#0052FF' },
                                ].map((company) => (
                                    <span
                                        key={`${company.name}-2`}
                                        className="text-lg font-semibold text-gray-300 hover:text-gray-900 transition-all duration-300 whitespace-nowrap cursor-default select-none"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = company.color;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '';
                                        }}
                                    >
                                        {company.name}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Social Proof - Web3 focused */}
            <section className="py-20 bg-white relative">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center"
                    >
                        <p className="text-sm text-berri-raspberry font-semibold uppercase tracking-wider mb-8">
                            Trusted by leading Web3 founders & investors
                        </p>

                        {/* Stats for Web3 audience */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                            {[
                                { value: '$50M+', label: 'Deals closed via warm intros' },
                                { value: '150+', label: 'Web3 teams using Berri' },
                                { value: '68%', label: 'Avg response rate increase' },
                                { value: '3x', label: 'Faster fundraising cycles' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-center"
                                >
                                    <div className="text-3xl md:text-4xl font-heading font-bold bg-gradient-to-r from-berri-raspberry to-berri-coral bg-clip-text text-transparent mb-1">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-500">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Avatars with testimonial snippet */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex flex-col items-center gap-4 glass-strong depth-md rounded-2xl p-6"
                        >
                            <div className="flex -space-x-3">
                                {[
                                    'https://i.pravatar.cc/80?u=web3founder1',
                                    'https://i.pravatar.cc/80?u=web3founder2',
                                    'https://i.pravatar.cc/80?u=web3founder3',
                                    'https://i.pravatar.cc/80?u=web3founder4',
                                    'https://i.pravatar.cc/80?u=web3founder5'
                                ].map((avatar, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-md">
                                        <Image
                                            src={avatar}
                                            alt={`Founder ${i + 1}`}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-gray-600 max-w-sm">
                                <span className="font-semibold text-gray-900">&quot;Berri helped us close our seed round in 4 weeks&quot;</span>
                                {' '}— founders from Protocol Labs, Framework, Paradigm
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <FAQ
                items={pricingFaqs}
                title="Questions?"
                subtitle="Everything you need to know about pricing"
                telegramCTA={{
                    text: "Still have questions? Let's chat on Telegram",
                    link: "https://t.me/vshweb3"
                }}
            />

            <CTA />
        </>
    )
}
