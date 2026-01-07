'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface BerriLoaderProps {
    /** Array of step labels to display */
    steps?: string[]
    /** Current step index (0-based) */
    currentStep?: number
    /** Size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Show step text */
    showSteps?: boolean
    /** Custom className */
    className?: string
}

// Orbital node component
function OrbitalNode({
    delay,
    radius,
    duration,
    size,
    color
}: {
    delay: number
    radius: number
    duration: number
    size: number
    color: string
}) {
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: size,
                height: size,
                background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
            animate={{
                rotate: 360,
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'linear',
            }}
        >
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size,
                    height: size,
                    left: radius,
                    top: -size / 2,
                    background: color,
                    boxShadow: `0 0 ${size}px ${color}`,
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.8, 1, 0.8],
                }}
                transition={{
                    duration: 2,
                    delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </motion.div>
    )
}

// Central pulsing core
function CentralCore({ size }: { size: number }) {
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: size,
                height: size,
                background: 'linear-gradient(135deg, #E54868 0%, #FF7F6B 50%, #F5A623 100%)',
                left: '50%',
                top: '50%',
                marginLeft: -size / 2,
                marginTop: -size / 2,
            }}
            animate={{
                scale: [1, 1.15, 1],
                boxShadow: [
                    '0 0 20px rgba(229, 72, 104, 0.4), 0 0 40px rgba(229, 72, 104, 0.2)',
                    '0 0 30px rgba(255, 127, 107, 0.5), 0 0 60px rgba(245, 166, 35, 0.3)',
                    '0 0 20px rgba(229, 72, 104, 0.4), 0 0 40px rgba(229, 72, 104, 0.2)',
                ],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    )
}

// Orbital ring
function OrbitalRing({ radius, opacity }: { radius: number; opacity: number }) {
    return (
        <motion.div
            className="absolute rounded-full border"
            style={{
                width: radius * 2,
                height: radius * 2,
                left: '50%',
                top: '50%',
                marginLeft: -radius,
                marginTop: -radius,
                borderColor: `rgba(229, 72, 104, ${opacity})`,
            }}
            animate={{
                rotate: 360,
                opacity: [opacity, opacity * 1.5, opacity],
            }}
            transition={{
                rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
        />
    )
}

export function BerriLoader({
    steps = [],
    currentStep = 0,
    size = 'md',
    showSteps = true,
    className = '',
}: BerriLoaderProps) {
    const sizeConfig = useMemo(() => ({
        sm: { container: 80, core: 16, nodes: 4, rings: 2 },
        md: { container: 120, core: 24, nodes: 6, rings: 3 },
        lg: { container: 160, core: 32, nodes: 8, rings: 3 },
    }), [])

    const config = sizeConfig[size]

    // Generate orbital nodes
    const nodes = useMemo(() => {
        const colors = ['#E54868', '#FF7F6B', '#F5A623', '#D4940A']
        return Array.from({ length: config.nodes }, (_, i) => ({
            delay: i * 0.5,
            radius: config.container * 0.3 + (i % 2) * 10,
            duration: 4 + i * 0.5,
            size: 4 + (i % 3) * 2,
            color: colors[i % colors.length],
        }))
    }, [config])

    // Generate orbital rings
    const rings = useMemo(() => {
        return Array.from({ length: config.rings }, (_, i) => ({
            radius: config.container * 0.25 + i * (config.container * 0.15),
            opacity: 0.1 - i * 0.02,
        }))
    }, [config])

    return (
        <div className={`flex flex-col items-center gap-6 ${className}`}>
            {/* Orbital Animation Container */}
            <div
                className="relative"
                style={{ width: config.container, height: config.container }}
            >
                {/* Background glow */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(229, 72, 104, 0.15) 0%, transparent 70%)',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Orbital rings */}
                {rings.map((ring, i) => (
                    <OrbitalRing key={i} {...ring} />
                ))}

                {/* Central core */}
                <CentralCore size={config.core} />

                {/* Orbital nodes */}
                <div
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                    }}
                >
                    {nodes.map((node, i) => (
                        <OrbitalNode key={i} {...node} />
                    ))}
                </div>
            </div>

            {/* Step Progress */}
            {showSteps && steps.length > 0 && (
                <div className="flex flex-col items-center gap-3">
                    {/* Current step text */}
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm font-medium text-gray-700"
                        >
                            {steps[currentStep] || steps[steps.length - 1]}
                        </motion.p>
                    </AnimatePresence>

                    {/* Step indicators */}
                    <div className="flex items-center gap-2">
                        {steps.map((_, i) => (
                            <motion.div
                                key={i}
                                className="rounded-full"
                                style={{
                                    width: 6,
                                    height: 6,
                                }}
                                animate={{
                                    backgroundColor: i <= currentStep ? '#E54868' : '#E5E7EB',
                                    scale: i === currentStep ? 1.3 : 1,
                                }}
                                transition={{ duration: 0.3 }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Fullscreen loader variant
export function BerriLoaderFullscreen({
    steps = [],
    currentStep = 0,
    title,
    subtitle,
}: {
    steps?: string[]
    currentStep?: number
    title?: string
    subtitle?: string
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-8 text-center">
                {title && (
                    <motion.h2
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-heading font-bold text-gray-900"
                    >
                        {title}
                    </motion.h2>
                )}

                <BerriLoader steps={steps} currentStep={currentStep} size="lg" />

                {subtitle && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-gray-500 max-w-sm"
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>
        </div>
    )
}

// Inline compact loader
export function BerriLoaderInline({ className = '' }: { className?: string }) {
    return (
        <motion.div
            className={`inline-flex items-center gap-1.5 ${className}`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        >
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                        background: ['#E54868', '#FF7F6B', '#F5A623'][i],
                    }}
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 0.8,
                        delay: i * 0.15,
                        repeat: Infinity,
                    }}
                />
            ))}
        </motion.div>
    )
}
