'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowUpRight, Calendar } from 'lucide-react'
import NetworkAnimation from './NetworkAnimation'

export default function Hero() {
    // Initialize Cal.com embed for popup
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any

            // Cal.com IIFE initialization
            ; (function (C, A, L) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            ; (api as any).q = (api as any).q || []
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

        w.Cal.ns.berri('ui', {
            cssVarsPerTheme: {
                light: { 'cal-brand': '#E54868' },
                dark: { 'cal-brand': '#FF7F6B' }
            },
            hideEventTypeDetails: true,
            layout: 'month_view'
        })
    }, [])
    return (
        <section className="min-h-screen bg-gray-50 pt-24 pb-16 overflow-visible relative">
            {/* Aurora gradient background effect - warm tones */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] opacity-60"
                    style={{
                        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(229, 72, 104, 0.18), transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5],
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
                        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255, 127, 107, 0.15), transparent 70%)',
                    }}
                    animate={{
                        scale: [1.1, 1, 1.1],
                        opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute bottom-0 right-1/4 w-[50%] h-[50%] opacity-40"
                    style={{
                        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(245, 166, 35, 0.15), transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                {/* Fourth layer - Gold accent for extra warmth */}
                <motion.div
                    className="absolute top-1/2 right-1/3 w-[45%] h-[45%] opacity-35"
                    style={{
                        background: 'radial-gradient(ellipse 65% 65% at 50% 50%, rgba(212, 148, 10, 0.12), transparent 70%)',
                    }}
                    animate={{
                        scale: [1.05, 1.2, 1.05],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 14,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                {/* Valley-inspired grain texture overlay */}
                <div className="absolute inset-0 grain-blend" />
            </div>
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                {/* Asymmetric Layout - Content Left, Visual Right */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">

                    {/* Left Content - Left aligned */}
                    <div className="max-w-xl">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-raspberry depth-sm mb-8"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-berri-raspberry opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-berri-raspberry shadow-lg shadow-berri-raspberry/50" />
                            </span>
                            <span className="text-sm text-berri-raspberry font-medium">Relationship Intelligence Platform</span>
                        </motion.div>

                        {/* Headline - Left aligned */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6"
                        >
                            Warm introductions
                            <br />
                            <span className="text-berri-raspberry">that close deals.</span>
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                            className="text-lg text-gray-700 mb-10 leading-relaxed"
                        >
                            Research. Find. Connect. Ping. — All through your network.
                        </motion.p>

                        {/* CTAs - Left aligned */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                            className="flex flex-wrap items-center gap-4 mb-12"
                        >
                            <Button
                                variant="brandAction"
                                size="lg"
                                className="rounded-full h-14 text-base font-semibold px-8 gap-3"
                                asChild
                            >
                                <Link href="/sign-up" className="flex items-center">
                                    <span>Start Free Trial</span>
                                    <ArrowUpRight className="w-5 h-5" />
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="rounded-full px-6 h-14 text-base font-medium border-gray-300 hover:bg-white gap-2"
                                data-cal-link="vishesh-sharma/berri"
                                data-cal-namespace="berri"
                                data-cal-config='{"layout":"month_view"}'
                            >
                                <Calendar className="w-4 h-4" />
                                Book a Demo
                            </Button>
                        </motion.div>

                        {/* Social Proof */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.25 }}
                            className="flex items-center gap-4"
                        >
                            <div className="flex -space-x-2">
                                {[
                                    { avatar: 'https://i.pravatar.cc/100?u=jm', alt: 'User 1' },
                                    { avatar: 'https://i.pravatar.cc/100?u=sk', alt: 'User 2' },
                                    { avatar: 'https://i.pravatar.cc/100?u=ar', alt: 'User 3' },
                                    { avatar: 'https://i.pravatar.cc/100?u=lt', alt: 'User 4' }
                                ].map((person, i) => (
                                    <div
                                        key={i}
                                        className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center overflow-hidden shadow-soft bg-white"
                                    >
                                        <Image
                                            src={person.avatar}
                                            alt={person.alt}
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm text-gray-700">
                                <span className="font-semibold text-gray-900">1,200+</span> people connected this month
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Visual - Network Animation */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        className="relative h-[500px] lg:h-[600px] w-full"
                    >
                        <NetworkAnimation />
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
