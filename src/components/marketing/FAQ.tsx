'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Send, LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
    question: string
    answer: string
    icon?: LucideIcon
}

interface TelegramCTA {
    text: string
    link: string
}

interface FAQProps {
    items: FAQItem[]
    title?: string
    subtitle?: string
    telegramCTA?: TelegramCTA
}

export default function FAQ({ items, title = "Frequently Asked Questions", subtitle, telegramCTA }: FAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    const toggleItem = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <section className="py-16 md:py-20 bg-gray-50">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-10 md:mb-12"
                >
                    <h2 className="text-2xl md:text-3xl font-heading font-extrabold mb-3">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-base text-gray-600">{subtitle}</p>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-6xl mx-auto">
                    {items.map((item, index) => {
                        const IconComponent = item.icon
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                            >
                                <button
                                    onClick={() => toggleItem(index)}
                                    className={`w-full text-left px-4 py-3 md:px-5 md:py-4 rounded-xl transition-all duration-300 ${openIndex === index
                                        ? 'glass-strong depth-md'
                                        : 'glass hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            {/* Line-based icon */}
                                            {IconComponent && (
                                                <IconComponent
                                                    className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors duration-300 ${openIndex === index
                                                        ? 'text-berri-raspberry'
                                                        : 'text-gray-400'
                                                        }`}
                                                    strokeWidth={1.75}
                                                />
                                            )}
                                            <h3 className={`text-sm md:text-base font-heading font-semibold transition-colors ${openIndex === index ? 'text-berri-raspberry' : 'text-gray-900'
                                                }`}>
                                                {item.question}
                                            </h3>
                                        </div>
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-300 ${openIndex === index
                                            ? 'bg-berri-raspberry text-white rotate-0'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            <AnimatePresence mode="wait">
                                                {openIndex === index ? (
                                                    <motion.div
                                                        key="minus"
                                                        initial={{ rotate: -90, opacity: 0 }}
                                                        animate={{ rotate: 0, opacity: 1 }}
                                                        exit={{ rotate: 90, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="plus"
                                                        initial={{ rotate: 90, opacity: 0 }}
                                                        animate={{ rotate: 0, opacity: 1 }}
                                                        exit={{ rotate: -90, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {openIndex === index && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                animate={{ height: 'auto', opacity: 1, marginTop: 14 }}
                                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <p className={`text-gray-600 leading-relaxed text-sm ${IconComponent ? 'pl-7' : ''}`}>
                                                    {item.answer}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </motion.div>
                        )
                    })}

                    {/* Telegram CTA - spans both columns */}
                    {telegramCTA && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: items.length * 0.05 }}
                            className="md:col-span-2"
                        >
                            <Link
                                href={telegramCTA.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 p-4 sm:p-5 rounded-xl glass depth-sm hover:depth-md transition-all duration-300 border border-gray-200/50 hover:border-gray-300"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Telegram icon */}
                                    <div className="w-9 h-9 rounded-lg bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                    </div>

                                    <div className="text-center sm:text-left">
                                        <p className="text-sm font-medium text-gray-900">
                                            {telegramCTA.text}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Quick responses during business hours
                                        </p>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="flex items-center gap-2 text-sm font-medium text-[#229ED9] group-hover:text-[#1a7eb0] transition-colors">
                                    <span>Open Chat</span>
                                    <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>
        </section>
    )
}
