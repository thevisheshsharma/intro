'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MapPin, Clock, Check, Building2, User, Send, MessageSquare, Zap, Shield, Calendar, Plus, Minus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const contactFaqs = [
    {
        question: 'How quickly can I get started?',
        answer: 'You can sign up and start using Berri in under 5 minutes. Connect your socials, and we\'ll build your relationship graph automatically.',
        icon: Zap
    },
    {
        question: 'Do you offer a free trial?',
        answer: 'Yes! All paid plans include a 10-day free trial. No credit card required to start.',
        icon: Clock
    },
    {
        question: 'What integrations do you support?',
        answer: 'We integrate with Twitter, LinkedIn, Telegram, and major CRMs including Salesforce, HubSpot, and Attio.',
        icon: MessageSquare
    },
    {
        question: 'Is my data secure?',
        answer: 'Absolutely. We\'re SOC 2 compliant and never share your network data with other users. Your connections stay private.',
        icon: Shield
    }
]

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        role: '',
        message: '',
    })
    const [submitted, setSubmitted] = useState(false)
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0) // First FAQ open by default

    // Initialize Cal.com embed
    useEffect(() => {
        const w = window as any

        // Cal.com IIFE initialization
        ;(function (C, A, L) {
            const p = function (a: any, ar: any) { a.q.push(ar) }
            const d = C.document
            C.Cal = C.Cal || function () {
                const cal = C.Cal
                // eslint-disable-next-line prefer-rest-params
                const ar = arguments
                if (!cal.loaded) {
                    cal.ns = {}
                    cal.q = cal.q || []
                    d.head.appendChild(d.createElement('script')).src = A
                    cal.loaded = true
                }
                if (ar[0] === L) {
                    const api = function () { p(api, arguments) }
                    const namespace = ar[1]
                    ;(api as any).q = (api as any).q || []
                    if (typeof namespace === 'string') {
                        cal.ns[namespace] = cal.ns[namespace] || api
                        p(cal.ns[namespace], ar)
                        p(cal, ['initNamespace', namespace])
                    } else {
                        p(cal, ar)
                    }
                    return
                }
                p(cal, ar)
            }
        })(w, 'https://app.cal.com/embed/embed.js', 'init')

        w.Cal('init', 'berri', { origin: 'https://app.cal.com' })

        w.Cal.ns.berri('inline', {
            elementOrSelector: '#my-cal-inline-berri',
            config: { layout: 'month_view', theme: 'auto' },
            calLink: 'vishesh-sharma/berri',
        })

        w.Cal.ns.berri('ui', {
            cssVarsPerTheme: {
                light: { 'cal-brand': '#E54868' },
                dark: { 'cal-brand': '#FF7F6B' }
            },
            hideEventTypeDetails: true,
            layout: 'month_view'
        })
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
    }

    return (
        <>
            {/* Hero + Form Combined Section */}
            <section className="min-h-[85vh] pt-32 pb-24 bg-gray-50 relative overflow-hidden">
                {/* Aurora gradient background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] opacity-60"
                        style={{
                            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(229, 72, 104, 0.15), transparent 60%)',
                        }}
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.4, 0.6, 0.4],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute top-1/3 -left-1/4 w-[60%] h-[60%] opacity-50"
                        style={{
                            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255, 127, 107, 0.12), transparent 60%)',
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
                    <motion.div
                        className="absolute -bottom-1/4 right-1/3 w-[50%] h-[50%] opacity-40"
                        style={{
                            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(245, 166, 35, 0.1), transparent 60%)',
                        }}
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.25, 0.4, 0.25],
                        }}
                        transition={{
                            duration: 12,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                        {/* Left Column: Content */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                            className="lg:sticky lg:top-32"
                        >
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                                <Mail className="w-4 h-4 mr-2" />
                                Contact Us
                            </span>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-gray-900 mb-6">
                                Let&apos;s Talk
                            </h1>

                            <p className="text-lg text-gray-600 mb-10 max-w-md">
                                Have questions about Berri? Want a personalized demo? We&apos;d love to hear from you.
                            </p>

                            {/* Contact Info Cards */}
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl glass depth-sm"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-raspberry to-berri-coral flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Quick Response</p>
                                        <p className="text-sm text-gray-500">Average reply within 4 hours</p>
                                    </div>
                                </motion.div>

                                <motion.a
                                    href="mailto:hello@berri.ai"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl glass depth-sm hover:depth-md transition-all duration-300 group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-coral to-berri-amber flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 group-hover:text-berri-raspberry transition-colors">hello@berri.ai</p>
                                        <p className="text-sm text-gray-500">Email us directly</p>
                                    </div>
                                </motion.a>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl glass depth-sm"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berri-amber to-berri-gold flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">San Francisco, CA</p>
                                        <p className="text-sm text-gray-500">Remote-first team</p>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Right Column: Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                            <div className="glass-strong depth-lg rounded-3xl p-8 md:p-10 border border-white/50">
                                {!submitted ? (
                                    <>
                                        <h2 className="text-2xl font-heading font-bold mb-2">Get in Touch</h2>
                                        <p className="text-gray-500 mb-8">
                                            Fill out the form and we&apos;ll get back to you within 24 hours.
                                        </p>

                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Full Name *
                                                    </label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry transition-all"
                                                            placeholder="John Doe"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Work Email *
                                                    </label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="email"
                                                            required
                                                            value={formData.email}
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry transition-all"
                                                            placeholder="john@company.com"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company
                                                    </label>
                                                    <div className="relative">
                                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={formData.company}
                                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry transition-all"
                                                            placeholder="Your Company"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Role
                                                    </label>
                                                    <select
                                                        value={formData.role}
                                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry transition-all"
                                                    >
                                                        <option value="">Select your role</option>
                                                        <option value="founder">Founder / CEO</option>
                                                        <option value="sales">Sales / BD</option>
                                                        <option value="marketing">Marketing / GTM</option>
                                                        <option value="investor">Investor</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    How can we help? *
                                                </label>
                                                <textarea
                                                    required
                                                    rows={4}
                                                    value={formData.message}
                                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry resize-none transition-all"
                                                    placeholder="Tell us about your goals and how we can help..."
                                                />
                                            </div>

                                            <Button type="submit" variant="brandAction" size="lg" className="rounded-full w-full">
                                                Send Message <Send className="w-4 h-4 ml-2" />
                                            </Button>
                                        </form>
                                    </>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                                            <Check className="w-10 h-10 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-heading font-bold mb-3">Message Sent!</h3>
                                        <p className="text-gray-600 max-w-sm mx-auto">
                                            Thanks for reaching out. Our team will get back to you within 24 hours.
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Schedule a Call + FAQ Section - 60/40 Split */}
            <section className="py-16 md:py-20 bg-gray-50 relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-berri-coral/5 to-berri-amber/5 rounded-full blur-3xl" />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-8 md:mb-10"
                    >
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-coral text-berri-coral text-sm font-medium mb-4">
                            <Calendar className="w-4 h-4 mr-2" />
                            Book a Meeting
                        </span>
                        <h2 className="text-3xl md:text-4xl font-heading font-extrabold mb-2">
                            Schedule a Call
                        </h2>
                        <p className="text-gray-600">
                            Pick a time that works for you. We&apos;ll answer any questions.
                        </p>
                    </motion.div>

                    {/* 60/40 Grid Layout */}
                    <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
                        {/* Calendar - 60% (3 cols) */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:col-span-3"
                        >
                            <div
                                id="my-cal-inline-berri"
                                className="w-full rounded-2xl bg-white shadow-lg shadow-gray-200/40 border border-gray-100"
                                style={{ minHeight: '600px', height: '70vh', maxHeight: '750px', overflow: 'auto' }}
                            />
                        </motion.div>

                        {/* FAQ - 40% (2 cols) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-2 flex flex-col"
                        >
                            <div className="glass-strong depth-md rounded-2xl p-5 md:p-6 border border-white/50 flex-1 flex flex-col">
                                <h3 className="text-lg font-heading font-bold mb-4 text-gray-900">
                                    Quick Answers
                                </h3>

                                {/* Compact Accordion */}
                                <div className="space-y-2 flex-1">
                                    {contactFaqs.map((faq, index) => {
                                        const IconComponent = faq.icon
                                        const isOpen = openFaqIndex === index
                                        return (
                                            <div key={index}>
                                                <button
                                                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                                                        isOpen
                                                            ? 'bg-white shadow-sm'
                                                            : 'hover:bg-white/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            <IconComponent
                                                                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                                                    isOpen ? 'text-berri-raspberry' : 'text-gray-400'
                                                                }`}
                                                            />
                                                            <span className={`text-sm font-medium transition-colors ${
                                                                isOpen ? 'text-berri-raspberry' : 'text-gray-700'
                                                            }`}>
                                                                {faq.question}
                                                            </span>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                                                            isOpen
                                                                ? 'bg-berri-raspberry text-white'
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {isOpen ? (
                                                                <Minus className="w-3 h-3" />
                                                            ) : (
                                                                <Plus className="w-3 h-3" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {isOpen && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <p className="text-sm text-gray-600 mt-2 pl-7 leading-relaxed">
                                                                    {faq.answer}
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Telegram CTA */}
                                <Link
                                    href="https://t.me/vshweb3"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                            Prefer to chat?
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Message us on Telegram
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-berri-raspberry transition-colors" />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    )
}
