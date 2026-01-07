'use client'
import { Network, Search, Users, ArrowUpRight, Zap, Globe } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

const features = [
    {
        title: 'Pathfinder',
        desc: 'Map multi-hop connection paths to anyone. Find the warmest intro through your network.',
        icon: Network,
        href: '/platform/pathfinder',
        size: 'large',
        gradient: 'from-berri-raspberry to-berri-coral',
    },
    {
        title: 'Company Intelligence',
        desc: 'Deep insights on every target company.',
        icon: Search,
        href: '/platform/company-intelligence',
        size: 'medium',
        gradient: 'from-berri-coral to-berri-amber',
    },
    {
        title: 'People Intelligence',
        desc: 'Find the right contacts to reach.',
        icon: Users,
        href: '/platform/people-intelligence',
        size: 'medium',
        gradient: 'from-berri-amber to-berri-gold',
    },
    {
        title: 'Real-time Sync',
        desc: 'Always up-to-date data.',
        icon: Zap,
        href: '/platform/pathfinder',
        size: 'small',
        gradient: 'from-berri-gold to-berri-coral',
    },
    {
        title: 'Global Coverage',
        desc: '150+ countries indexed.',
        icon: Globe,
        href: '/platform/company-intelligence',
        size: 'small',
        gradient: 'from-berri-coral to-berri-raspberry',
    },
]

export default function Features() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                {/* Section Header - Left aligned */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16"
                >
                    <div className="max-w-xl">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                            Everything you need
                            <br />
                            to build relationships
                        </h2>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            One platform for relationship intelligence, warm intros, and meaningful connections.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="rounded-full px-6 h-11 font-medium border-gray-300 self-start lg:self-auto"
                        asChild
                    >
                        <Link href="/features" className="flex items-center gap-2">
                            View All Features
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </Button>
                </motion.div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-12 gap-4 lg:gap-6">
                    {/* Large featured card - spans 7 columns */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="col-span-12 lg:col-span-7 row-span-2"
                    >
                        <Link href={features[0].href} className="group block h-full">
                            <div className="h-full p-8 lg:p-10 rounded-[2rem] glass-strong border border-white/80 hover:border-berri-raspberry/30 hover-glow-raspberry transition-all duration-500 relative overflow-hidden depth-md">
                                {/* Gradient glow background */}
                                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${features[0].gradient} blur-2xl`} />
                                </div>

                                {/* Subtle aurora overlay */}
                                <div className="absolute inset-0 aurora-light opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${features[0].gradient} flex items-center justify-center mb-6 shadow-lg glow-soft group-hover:scale-105 transition-transform duration-300`}>
                                        <Network className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 mb-4 group-hover:text-berri-raspberry transition-colors">
                                        {features[0].title}
                                    </h3>

                                    <p className="text-gray-700 text-lg leading-relaxed mb-8 max-w-md">
                                        {features[0].desc}
                                    </p>

                                    {/* Mini visualization with glass effect */}
                                    <div className="flex items-center gap-4 p-4 glass-raspberry rounded-2xl">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border-2 border-white shadow-md" />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="w-8 h-px bg-berri-raspberry/40" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-berri-raspberry animate-pulse shadow-lg shadow-berri-raspberry/50" />
                                            <span className="w-8 h-px bg-berri-raspberry/40" />
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border-2 border-berri-raspberry/30 flex items-center justify-center shadow-md">
                                            <span className="text-xs font-bold text-berri-raspberry">TG</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Medium cards - right column */}
                    {features.slice(1, 3).map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 * (idx + 1) }}
                            className="col-span-12 sm:col-span-6 lg:col-span-5"
                        >
                            <Link href={feature.href} className="group block h-full">
                                <div className="h-full p-6 rounded-3xl glass border border-white/80 hover:border-berri-raspberry/30 card-elevated relative overflow-hidden">
                                    {/* Subtle glow on hover */}
                                    <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500`} />

                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative z-10`}>
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-lg font-heading font-bold text-gray-900 mb-2 group-hover:text-berri-raspberry transition-colors relative z-10">
                                        {feature.title}
                                    </h3>

                                    <p className="text-gray-700 text-sm relative z-10">
                                        {feature.desc}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Small cards - bottom row */}
                    {features.slice(3).map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 * (idx + 3) }}
                            className="col-span-6 lg:col-span-3"
                        >
                            <Link href={feature.href} className="group block h-full">
                                <div className="h-full p-5 rounded-2xl glass-subtle border border-white/70 hover:border-berri-raspberry/30 card-elevated flex flex-col items-center text-center relative overflow-hidden">
                                    {/* Subtle glow on hover */}
                                    <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500`} />

                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-105 transition-transform duration-300 relative z-10`}>
                                        <feature.icon className="w-5 h-5 text-white" />
                                    </div>

                                    <h3 className="text-sm font-heading font-bold text-gray-900 mb-1 group-hover:text-berri-raspberry transition-colors relative z-10">
                                        {feature.title}
                                    </h3>

                                    <p className="text-gray-600 text-xs relative z-10">
                                        {feature.desc}
                                    </p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
