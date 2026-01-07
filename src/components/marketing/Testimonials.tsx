'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const

const testimonials = [
    {
        quote: "Berri helped us identify warm paths to enterprise accounts we'd been trying to crack for months. The results have been phenomenal.",
        author: "Sarah Chen",
        role: "VP of Sales",
        company: "TechFlow",
        metric: "8X",
        metricLabel: "Increase in conversion rate",
        avatar: "https://i.pravatar.cc/200?u=sarah-chen",
    },
    {
        quote: "From cold outreach to warm intros, every detail was meticulously handled. The team's expertise helped us launch faster, and the results have been phenomenal!",
        author: "Marcus Thompson",
        role: "Head of Growth",
        company: "Meridian",
        metric: "2X",
        metricLabel: "Increase in lead generation",
        avatar: "https://i.pravatar.cc/200?u=marcus-thompson",
    },
    {
        quote: "Their network intelligence took our BD efforts to the next level. The team truly understands relationship mapping and storytelling.",
        author: "Priya Sharma",
        role: "Founder",
        company: "Luminary",
        avatar: "https://i.pravatar.cc/200?u=priya-sharma",
    },
    {
        quote: "The team nailed our outreach strategy with fast turnaround and incredible attention to detail. The final results felt polished and professional.",
        author: "David Kim",
        role: "BD Director",
        company: "CloudScale",
        avatar: "https://i.pravatar.cc/200?u=david-kim",
    },
]

function QuoteIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            width="24"
            height="18"
            viewBox="0 0 24 18"
            fill="currentColor"
        >
            <path d="M0 18V10.8C0 8.8 0.4 7 1.2 5.4C2 3.8 3.1 2.5 4.5 1.5C5.9 0.5 7.5 0 9.3 0V4.2C8.2 4.2 7.25 4.6 6.45 5.4C5.65 6.2 5.25 7.2 5.25 8.4V9H9V18H0ZM15 18V10.8C15 8.8 15.4 7 16.2 5.4C17 3.8 18.1 2.5 19.5 1.5C20.9 0.5 22.5 0 24.3 0V4.2C23.2 4.2 22.25 4.6 21.45 5.4C20.65 6.2 20.25 7.2 20.25 8.4V9H24V18H15Z" />
        </svg>
    )
}

export default function Testimonials() {
    return (
        <section className="py-24 bg-gray-50/50 relative overflow-hidden">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease: STANDARD_EASE }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                        Customer Stories
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 mb-4">
                        Real results from real teams
                    </h2>
                    <p className="text-lg text-gray-600">
                        See how teams are closing deals faster and building stronger relationships
                        through warm introductions.
                    </p>
                </motion.div>

                {/* Bento Grid - Fixed heights */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-fr">
                    {/* Left Column - Featured Large Card (spans 2 rows) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: STANDARD_EASE }}
                        className="lg:col-span-5 lg:row-span-2"
                    >
                        <div className="h-full p-8 lg:p-10 glass rounded-3xl border border-gray-200/60 shadow-sm flex flex-col">
                            {/* Metric */}
                            <div className="mb-6">
                                <span className="text-5xl lg:text-6xl font-heading font-extrabold text-gray-900">
                                    {testimonials[0].metric}
                                </span>
                                <p className="text-base text-gray-500 mt-1">
                                    {testimonials[0].metricLabel}
                                </p>
                            </div>

                            <QuoteIcon className="text-berri-coral mb-4" />

                            <p className="text-gray-700 text-lg leading-relaxed flex-1">
                                &ldquo;{testimonials[0].quote}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={testimonials[0].avatar}
                                        alt={testimonials[0].author}
                                        width={44}
                                        height={44}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-heading font-semibold text-gray-900">
                                        {testimonials[0].author}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {testimonials[0].role}, {testimonials[0].company}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Top Right Card with Metric */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1, ease: STANDARD_EASE }}
                        className="lg:col-span-7"
                    >
                        <div className="h-full p-6 lg:p-8 glass rounded-3xl border border-gray-200/60 shadow-sm flex flex-col">
                            {/* Metric inline */}
                            <div className="flex items-baseline gap-3 mb-4">
                                <span className="text-4xl font-heading font-extrabold text-gray-900">
                                    {testimonials[1].metric}
                                </span>
                                <span className="text-gray-500">
                                    {testimonials[1].metricLabel}
                                </span>
                            </div>

                            <QuoteIcon className="text-berri-coral mb-3" />

                            <p className="text-gray-700 leading-relaxed flex-1">
                                &ldquo;{testimonials[1].quote}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={testimonials[1].avatar}
                                        alt={testimonials[1].author}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-heading font-semibold text-gray-900 text-sm">
                                        {testimonials[1].author}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {testimonials[1].role}, {testimonials[1].company}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bottom Left Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2, ease: STANDARD_EASE }}
                        className="lg:col-span-4"
                    >
                        <div className="h-full p-6 glass rounded-3xl border border-gray-200/60 shadow-sm flex flex-col">
                            <QuoteIcon className="text-berri-coral mb-3" />

                            <p className="text-gray-700 text-sm leading-relaxed flex-1">
                                &ldquo;{testimonials[2].quote}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={testimonials[2].avatar}
                                        alt={testimonials[2].author}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-heading font-semibold text-gray-900 text-sm">
                                        {testimonials[2].author}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {testimonials[2].role}, {testimonials[2].company}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bottom Right Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3, ease: STANDARD_EASE }}
                        className="lg:col-span-3"
                    >
                        <div className="h-full p-6 glass rounded-3xl border border-gray-200/60 shadow-sm flex flex-col">
                            <QuoteIcon className="text-berri-coral mb-3" />

                            <p className="text-gray-700 text-sm leading-relaxed flex-1">
                                &ldquo;{testimonials[3].quote}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                                    <Image
                                        src={testimonials[3].avatar}
                                        alt={testimonials[3].author}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-heading font-semibold text-gray-900 text-sm">
                                        {testimonials[3].author}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {testimonials[3].role}, {testimonials[3].company}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
