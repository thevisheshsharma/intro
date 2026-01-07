'use client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, Calendar } from 'lucide-react'
import { useMemo, useEffect } from 'react'

// Network Sphere Visualization - represents the relationship graph
const NetworkSphere = () => {
    // Generate sphere points using fibonacci sphere algorithm for even distribution
    const spherePoints = useMemo(() => {
        const points: { x: number; y: number; z: number; size: number }[] = []
        const numPoints = 180
        const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle

        for (let i = 0; i < numPoints; i++) {
            const y = 1 - (i / (numPoints - 1)) * 2 // y goes from 1 to -1
            const radius = Math.sqrt(1 - y * y)
            const theta = phi * i

            const x = Math.cos(theta) * radius
            const z = Math.sin(theta) * radius

            // Only show points on the visible hemisphere (front-facing)
            if (z > -0.3) {
                points.push({
                    x: x * 120 + 150, // Scale and center
                    y: y * 120 + 150,
                    z,
                    size: 1.5 + z * 1 // Size based on depth for 3D effect
                })
            }
        }
        return points
    }, [])

    // Generate connection points (nodes on the sphere representing "people")
    const connectionNodes = useMemo(() => {
        const nodes: { x: number; y: number; z: number }[] = []
        // Strategic positions on the sphere
        const positions = [
            { lat: 30, lng: 20 },
            { lat: 45, lng: -30 },
            { lat: 10, lng: 45 },
            { lat: -20, lng: 10 },
            { lat: 60, lng: -10 },
            { lat: 25, lng: -50 },
            { lat: -35, lng: 35 },
            { lat: 50, lng: 50 },
        ]

        positions.forEach(({ lat, lng }) => {
            const latRad = (lat * Math.PI) / 180
            const lngRad = (lng * Math.PI) / 180

            const x = Math.cos(latRad) * Math.sin(lngRad)
            const y = Math.sin(latRad)
            const z = Math.cos(latRad) * Math.cos(lngRad)

            if (z > 0) { // Only front-facing nodes
                nodes.push({
                    x: x * 115 + 150,
                    y: -y * 115 + 150, // Flip Y for SVG coordinates
                    z
                })
            }
        })
        return nodes
    }, [])

    return (
        <div className="relative w-[260px] h-[260px] md:w-[280px] md:h-[280px] lg:w-[300px] lg:h-[300px]">
            {/* Orbital arcs - using berri colors */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                {/* Arc 1 - Teal/Green gradient */}
                <motion.ellipse
                    cx="150"
                    cy="150"
                    rx="135"
                    ry="50"
                    fill="none"
                    stroke="url(#arcGradient1)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-20deg)', transformOrigin: 'center' }}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.8 }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                />
                {/* Arc 2 - Coral accent */}
                <motion.ellipse
                    cx="150"
                    cy="150"
                    rx="140"
                    ry="55"
                    fill="none"
                    stroke="url(#arcGradient2)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-35deg)', transformOrigin: 'center' }}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 0.7, opacity: 0.6 }}
                    transition={{ duration: 2.5, delay: 0.8, ease: "easeOut" }}
                />
                <defs>
                    <linearGradient id="arcGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8ebba5" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#F5A623" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#8ebba5" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="arcGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#9d4edd" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#9d4edd" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#9d4edd" stopOpacity="0.2" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Sphere points */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                {spherePoints.map((point, i) => (
                    <motion.circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r={point.size}
                        fill="rgba(255, 255, 255, 0.6)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 + point.z * 0.5 }}
                        transition={{ duration: 0.5, delay: i * 0.005 }}
                    />
                ))}
            </svg>

            {/* Connection nodes (people markers) */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                {connectionNodes.map((node, i) => (
                    <g key={i}>
                        {/* Pulsing ring */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="6"
                            fill="none"
                            stroke="rgba(142, 187, 165, 0.5)"
                            strokeWidth="1"
                            initial={{ scale: 1, opacity: 0.8 }}
                            animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                        />
                        {/* Node marker */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="4"
                            fill="#F5A623"
                            stroke="rgba(142, 187, 165, 0.8)"
                            strokeWidth="1.5"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                        />
                        {/* Inner glow */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="2"
                            fill="#8ebba5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                        />
                    </g>
                ))}
            </svg>

            {/* Rotating glow effect */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(ellipse 60% 40% at 30% 30%, rgba(142, 187, 165, 0.15), transparent 60%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />

            {/* Subtle sphere border glow */}
            <div
                className="absolute inset-4 rounded-full"
                style={{
                    background: 'radial-gradient(circle at center, transparent 85%, rgba(76, 64, 247, 0.2) 100%)',
                }}
            />
        </div>
    )
}

export default function CTA() {
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
        <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    {/* CTA Card - Split Layout */}
                    <div className="py-12 md:py-16 lg:py-20 px-6 md:px-8 lg:px-10 rounded-3xl bg-gray-900 relative overflow-hidden">
                        {/* Aurora gradient animated background - warm tones */}
                        <motion.div
                            className="absolute -top-1/2 -left-1/4 w-[80%] h-[100%] rounded-full blur-3xl"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(229, 72, 104, 0.35), transparent 70%)',
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                x: [0, 30, 0],
                                opacity: [0.4, 0.6, 0.4],
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                        <motion.div
                            className="absolute top-1/4 -right-1/4 w-[60%] h-[80%] rounded-full blur-3xl"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(255, 127, 107, 0.3), transparent 70%)',
                            }}
                            animate={{
                                scale: [1.2, 1, 1.2],
                                y: [0, -20, 0],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                                duration: 10,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                        <motion.div
                            className="absolute bottom-0 left-1/3 w-[50%] h-[60%] rounded-full blur-3xl"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(76, 64, 247, 0.2), transparent 70%)',
                            }}
                            animate={{
                                scale: [1, 1.15, 1],
                                x: [-20, 20, -20],
                                opacity: [0.25, 0.4, 0.25],
                            }}
                            transition={{
                                duration: 12,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                        {/* Valley-inspired grain texture overlay */}
                        <div className="absolute inset-0 grain-dark" />

                        {/* Grid layout: content left, visual right */}
                        <div className="relative z-10 grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                            {/* Left: Content */}
                            <div className="text-left">
                                <motion.h2
                                    className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4 leading-tight"
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                                >
                                    Start building
                                    <br />
                                    real relationships
                                </motion.h2>

                                <motion.p
                                    className="text-lg text-gray-300 mb-6 leading-relaxed max-w-md"
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                                >
                                    Join teams who close deals faster through warm, trusted introductions.
                                </motion.p>

                                {/* Benefits */}
                                <motion.div
                                    className="flex flex-wrap gap-x-5 gap-y-2 mb-8"
                                    initial={{ opacity: 0, x: -15 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                                >
                                    {['Free 14-day trial', 'No credit card required', 'Cancel anytime'].map((benefit) => (
                                        <div key={benefit} className="flex items-center gap-2 text-gray-300 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-berri-green/20 flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-berri-green" />
                                            </div>
                                            {benefit}
                                        </div>
                                    ))}
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                                    className="flex flex-wrap items-center gap-4"
                                >
                                    <Button
                                        variant="brandAction"
                                        size="lg"
                                        className="rounded-full px-8 h-14 text-base font-semibold"
                                        asChild
                                    >
                                        <Link href="/sign-up" className="flex items-center gap-2">
                                            Get Started
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="rounded-full px-6 h-14 text-base font-medium border-gray-700 bg-transparent text-white hover:bg-white/10 gap-2"
                                        data-cal-link="vishesh-sharma/berri"
                                        data-cal-namespace="berri"
                                        data-cal-config='{"layout":"month_view"}'
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Book a Demo
                                    </Button>
                                </motion.div>
                            </div>

                            {/* Right: Network Sphere Visual */}
                            <motion.div
                                className="hidden md:flex justify-center lg:justify-center"
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <NetworkSphere />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
