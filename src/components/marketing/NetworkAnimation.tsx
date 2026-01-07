'use client'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import Image from 'next/image'

// Brand palette with gradients
const COLORS = {
    // Brand colors
    raspberry: '#E54868',
    coral: '#FF7F6B',
    amber: '#F5A623',
    gold: '#D4940A',
    success: '#22C55E',
    // Legacy teal for compatibility
    line: '#94a3b8',
    lineActive: '#64748b',
    lineGlow: 'rgba(229, 72, 104, 0.25)', // Raspberry glow
    particle: '#E54868', // Raspberry particle
    ripple: 'rgba(229, 72, 104, 0.12)',
    rippleStrong: 'rgba(229, 72, 104, 0.3)',
}

// Custom easing curves for organic motion
const EASING = {
    float: [0.45, 0, 0.55, 1] as const,       // sine - gentle floating
    draw: [0.25, 1, 0.5, 1] as const,         // easeOutQuart - fluid drawing
    converge: [0.34, 1.56, 0.64, 1] as const, // spring-like overshoot
    organic: [0.4, 0, 0.2, 1] as const,       // standard organic ease
}

// Spring configurations for natural motion
const SPRING = {
    // Heavy, water-like resistance
    fluid: { type: "spring", stiffness: 100, damping: 20, mass: 1.5 },
    // Snappy but elastic, like a rubber band
    elastic: { type: "spring", stiffness: 300, damping: 20, mass: 0.8 },
    // Gentle floating drift
    drift: { type: "spring", stiffness: 50, damping: 25, mass: 2 },
    // Magnetic snap
    magnetic: { type: "spring", stiffness: 150, damping: 15, mass: 0.5 },
    // Bouncy
    bouncy: { type: "spring", stiffness: 200, damping: 10, mass: 1 },
    // Slow
    slow: { type: "spring", stiffness: 50, damping: 20, mass: 1 }
}

// Company data with positions as percentages
const COMPANIES = [
    {
        id: 'pwc',
        logo: '/images/pwc-logo.jpg',
        label: 'worked at',
        position: { x: 18, y: 18 },
        convergedPosition: { x: 33, y: 33 },
        badgeText: 'Ex-Colleagues',
        badgeColor: '#fb923c', // Orange
        peopleAngles: [0, 72, 144, 216, 288] // 5 people
    },
    {
        id: 'iimc',
        logo: '/images/iimc-logo.png',
        label: 'alumni',
        position: { x: 82, y: 18 },
        convergedPosition: { x: 67, y: 33 },
        badgeText: 'Alumni',
        badgeColor: '#60a5fa', // Blue
        peopleAngles: [0, 120, 240] // 3 people
    },
    {
        id: 'kernel',
        logo: '/images/kernel0x-logo.jpg',
        label: 'member of',
        position: { x: 18, y: 82 },
        convergedPosition: { x: 33, y: 67 },
        badgeText: 'Fellows',
        badgeColor: '#facc15', // Yellow
        peopleAngles: [45, 165, 285] // 3 people
    },
    {
        id: 'polygon',
        logo: '/images/polygon-logo.jpg',
        label: 'works at',
        position: { x: 82, y: 82 },
        convergedPosition: { x: 67, y: 67 },
        badgeText: 'Colleagues',
        badgeColor: '#FF7F6B', // Coral
        peopleAngles: [0, 90, 180, 270] // 4 people
    },
]

// Subtle breathing animation for the center profile - LARGER and more visible
const BreathingRipple = () => (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                    width: 120,
                    height: 120,
                    marginLeft: -60,
                    marginTop: -60,
                    border: '2px solid',
                    borderColor: COLORS.ripple,
                    willChange: 'transform, opacity',
                }}
                animate={{
                    scale: [1, 2, 3],
                    opacity: [0.6, 0.3, 0],
                }}
                transition={{
                    duration: 4,
                    delay: i * 1.3,
                    repeat: Infinity,
                    ease: "easeOut",
                }}
            />
        ))}
    </div>
)

// Continuous breathing ripples for org nodes (2-3 ripples) - organic expansion
const OrgBreathingRipple = ({ delay = 0 }: { delay?: number }) => (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                    width: 48,
                    height: 48,
                    marginLeft: -24,
                    marginTop: -24,
                    border: '1px solid',
                    borderColor: COLORS.ripple,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: [0.8, 1.8, 3], // Wider, gentler expansion
                    opacity: [0.5, 0.2, 0],
                    borderWidth: ['1px', '2px', '0px']
                }}
                transition={{
                    duration: 4 + Math.random(),
                    delay: delay + i * (1.2 + Math.random() * 0.5),
                    repeat: Infinity,
                    ease: "easeOut",
                }}
            />
        ))}
    </div>
)

// Single pulse ripple for person avatars around org nodes
const PersonPulseRipple = ({ delay = 0 }: { delay?: number }) => (
    <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
            scale: [0.5, 2.2, 2.8],
            opacity: [0, 0.6, 0],
            borderWidth: ['2px', '1px', '0.5px']
        }}
        transition={{
            duration: 3,
            delay,
            repeat: Infinity,
            repeatDelay: 0.2,
            ease: "easeOut"
        }}
    >
        <div
            className="w-5 h-5 rounded-full border"
            style={{
                borderColor: 'rgba(20, 184, 166, 0.4)', // Teal ripple to match theme
                marginLeft: -10,
                marginTop: -10,
                boxShadow: '0 0 10px rgba(20, 184, 166, 0.2)',
            }}
        />
    </motion.div>
)

// Person avatar with pulsating ripple (for org node orbits)
const PersonAvatar = ({
    angle,
    radius,
    duration,
    delay,
    imageSrc
}: {
    angle: number
    radius: number
    duration: number
    delay: number
    imageSrc?: string
}) => {
    const floatDelay = useMemo(() => Math.random() * 2, []);
    // Rotate to keep avatar upright
    const uprightAngle = 0;

    return (
        <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ width: 0, height: 0 }}
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                rotate: [angle, angle + 360]
            }}
            transition={{
                opacity: { duration: 1, delay },
                rotate: { duration, repeat: Infinity, ease: "linear", delay }
            }}
        >
            <motion.div
                initial={{ x: radius }}
                animate={{
                    x: radius,
                    rotate: [-angle, -angle - 360], // Counter-rotate to stay upright
                    y: [-4, 4, -4] // Subtle bobbing
                }}
                transition={{
                    x: SPRING.slow,
                    rotate: { duration, repeat: Infinity, ease: "linear", delay },
                    y: { duration: 3 + Math.random(), repeat: Infinity, ease: "easeInOut", delay: floatDelay }
                }}
            >
                {/* Pulsating ripple */}
                <PersonPulseRipple delay={delay % 3} />

                {/* Avatar */}
                <div
                    className="relative w-6 h-6 rounded-full bg-white border-2 border-white overflow-hidden shadow-md z-10"
                    style={{ filter: 'drop-shadow(0 0 4px rgba(20, 184, 166, 0.2))' }}
                >
                    <Image
                        src={imageSrc || `https://i.pravatar.cc/100?u=${angle}`}
                        alt="Person"
                        width={24}
                        height={24}
                        className="object-cover"
                        loading="lazy"
                    />
                </div>
            </motion.div>
        </motion.div>
    )
}

// Small person icon - simplified, no ripples
const PersonDot = ({
    angle,
    radius,
    duration,
    delay
}: {
    angle: number
    radius: number
    duration: number
    delay: number
}) => {
    const floatDelay = useMemo(() => Math.random(), []);

    return (
        <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ width: 0, height: 0 }}
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                rotate: [angle, angle + 360]
            }}
            transition={{
                opacity: { duration: 0.5, delay },
                rotate: { duration, repeat: Infinity, ease: "linear", delay }
            }}
        >
            <motion.div
                style={{ transform: `translateX(${radius}px) translateY(-6px)` }}
                animate={{
                    rotate: [-angle, -angle - 360],
                    scale: [1, 1.2, 1] // Subtle breathing
                }}
                transition={{
                    rotate: { duration, repeat: Infinity, ease: "linear", delay },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: floatDelay }
                }}
            >
                <div
                    className="w-3 h-3 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-300 shadow-sm"
                />
            </motion.div>
        </motion.div>
    )
}

// Energy particle flowing along a quadratic bezier curve - behaves like organic matter
const EnergyParticle = ({
    startX, startY, ctrlX, ctrlY, endX, endY, delay, duration = 3, size = 3
}: {
    startX: number
    startY: number
    ctrlX: number
    ctrlY: number
    endX: number
    endY: number
    delay: number
    duration?: number
    size?: number
}) => {
    // Generate points along a quadratic bezier curve
    const points = useMemo(() => {
        const pts: { x: number; y: number }[] = []
        const steps = 30 // More steps for smoother flow
        for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX
            const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY
            pts.push({ x, y })
        }
        return pts
    }, [startX, startY, ctrlX, ctrlY, endX, endY])

    return (
        <motion.circle
            fill={COLORS.particle}
            r={size}
            initial={{ opacity: 0 }}
            animate={{
                cx: points.map(p => p.x),
                cy: points.map(p => p.y),
                opacity: [0, 0.8, 1, 0.8, 0],
                r: [size * 0.8, size, size * 1.2, size],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatDelay: 2, // Slower, more sporadic flow
                ease: "easeInOut",
            }}
            style={{ filter: 'drop-shadow(0 0 3px rgba(20, 184, 166, 0.5))' }}
        />
    )
}

// Animated connection line with vine-like growth and magnetic pull
const AnimatedConnectionLine = ({
    centerX, centerY, company, isVisible, isConverged, dimensions
}: {
    centerX: number
    centerY: number
    company: typeof COMPANIES[0]
    isVisible: boolean
    isConverged: boolean
    dimensions: { width: number; height: number }
}) => {
    // Animate endpoint position for smooth convergence
    const [animatedEnd, setAnimatedEnd] = useState(company.position)

    useEffect(() => {
        const target = isConverged ? company.convergedPosition : company.position
        // Slight organic delay based on company index/random
        const timer = setTimeout(() => setAnimatedEnd(target), 100)
        return () => clearTimeout(timer)
    }, [isConverged, company.position, company.convergedPosition])

    // Convert percentage to absolute coordinates
    const startX = (centerX / 100) * dimensions.width
    const startY = (centerY / 100) * dimensions.height
    const endX = (animatedEnd.x / 100) * dimensions.width
    const endY = (animatedEnd.y / 100) * dimensions.height

    if (!isVisible) return null

    // Calculate distance and proportional curve offset
    const dx = endX - startX
    const dy = endY - startY
    const len = Math.sqrt(dx * dx + dy * dy) || 1 // Avoid division by zero
    // Dynamic curve intensity based on convergence - straightens out when snapped
    const curveIntensity = isConverged ? Math.min(len * 0.05, 10) : Math.min(len * 0.15, 30)
    const nx = -dy / len
    const ny = dx / len
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const ctrlX = midX + nx * curveIntensity
    const ctrlY = midY + ny * curveIntensity

    // Pulse animation for the line itself
    const pulseVariants = {
        idle: { strokeWidth: 2, opacity: 0.8 },
        pulse: { strokeWidth: 2.5, opacity: 1 }
    }

    // Unique gradient ID for this connection
    const gradientId = `grad-${company.id}`

    return (
        <g>
            {/* Dynamic gradient definition */}
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={COLORS.raspberry} stopOpacity="0.9" />
                    <stop offset="50%" stopColor={COLORS.coral} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={COLORS.amber} stopOpacity="0.7" />
                </linearGradient>
            </defs>

            {/* Background dashed path (shows the route) */}
            <motion.path
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="6 4"
                d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.3 }}
            />

            {/* Glowing aura with gradient */}
            <motion.path
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                strokeLinecap="round"
                d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: 1,
                    opacity: 0.4,
                }}
                transition={{
                    pathLength: { duration: 1.2, ease: EASING.draw },
                    opacity: { duration: 0.5 },
                }}
                style={{ filter: 'blur(6px)' }}
            />

            {/* Main gradient path with path tracing animation */}
            <motion.path
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="3"
                strokeLinecap="round"
                d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                    pathLength: 1,
                    opacity: 1,
                }}
                transition={{
                    pathLength: { duration: 1.2, ease: EASING.draw },
                    opacity: { duration: 0.3 },
                }}
            />

            {/* Animated tip particle traveling along path */}
            <motion.circle
                r="4"
                fill={COLORS.raspberry}
                initial={{ opacity: 0 }}
                animate={{
                    opacity: [0, 1, 1, 0],
                    cx: [startX, ctrlX, endX],
                    cy: [startY, ctrlY, endY],
                }}
                transition={{
                    duration: 1.2,
                    ease: EASING.draw,
                }}
                style={{ filter: 'drop-shadow(0 0 4px rgba(229, 72, 104, 0.6))' }}
            />

            {/* Energy particles - flowing nutrients */}
            {[0, 1, 2].map((i) => (
                <EnergyParticle
                    key={i}
                    startX={startX}
                    startY={startY}
                    ctrlX={ctrlX}
                    ctrlY={ctrlY}
                    endX={endX}
                    endY={endY}
                    delay={1.5 + i * 1.2} // Staggered start
                    duration={3 + i * 0.5} // Variable speeds
                    size={2 + i * 0.8} // Stable size variation instead of random
                />
            ))}

            {/* Floating Label - Fixed Positioning */}
            <motion.text
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#334155"
                x={ctrlX}
                y={ctrlY - 22}
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isConverged ? 0 : 0.95,
                    x: ctrlX,
                    y: ctrlY - 22
                }}
                transition={{
                    opacity: { duration: 0.4 },
                    x: { duration: 0 }, // Sync immediately with ctrlX calculation
                    y: { duration: 0 }  // Sync immediately with ctrlY calculation
                }}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))' }}
            >
                {company.label}
            </motion.text>
        </g>
    )
}

// Company node - cleaner, with entrance pulse and organic float
const CompanyNode = ({
    id,
    logo,
    position,
    convergedPosition,
    isVisible,
    isConverged,
    appearDelay,
    badgeText,
    badgeColor,
    peopleAngles = [0, 90, 180, 270],
}: {
    id: string
    logo: string
    position: { x: number; y: number }
    convergedPosition: { x: number; y: number }
    isVisible: boolean
    isConverged: boolean
    appearDelay: number
    badgeText?: string
    badgeColor?: string
    peopleAngles?: number[]
}) => {
    // Randomize floating parameters for each node so they don't sync up
    // Move to top to satisfy hook rules if we ever add hooks after them,
    // though these aren't hooks, it's good practice.
    // Actually, useMemo makes them stable across renders.
    const { randomDuration, randomDelay } = useMemo(() => ({
        randomDuration: 3 + Math.random() * 2,
        randomDelay: Math.random() * 2
    }), []);

    if (!isVisible) return null

    const targetX = isConverged ? convergedPosition.x : position.x
    const targetY = isConverged ? convergedPosition.y : position.y

    return (
        <motion.div
            className="absolute"
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                x: '-50%',
                y: '-50%',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                left: `${targetX}%`,
                top: `${targetY}%`,
                scale: isConverged ? 0.85 : 1,
                opacity: 1,
            }}
            transition={{
                left: SPRING.magnetic,
                top: SPRING.magnetic,
                scale: { ...SPRING.elastic, delay: appearDelay },
                opacity: { duration: 0.6, delay: appearDelay },
            }}
        >
            {/* Organic floating wrapper */}
            <motion.div
                animate={{
                    y: [-4, 4, -4],
                    rotate: [-1, 1, -1]
                }}
                transition={{
                    y: { duration: randomDuration, repeat: Infinity, ease: "easeInOut", delay: randomDelay },
                    rotate: { duration: randomDuration * 1.5, repeat: Infinity, ease: "easeInOut", delay: randomDelay }
                }}
            >
                {/* Continuous breathing ripples for org node */}
                <OrgBreathingRipple delay={appearDelay} />

                {/* Orbiting people avatars with pulsating ripples */}
                <div className="absolute w-44 h-44 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    {peopleAngles.map((angle, i) => (
                        <PersonAvatar
                            key={i}
                            angle={angle}
                            radius={isConverged ? 58 : 78} // Spacious clearance
                            duration={20 + i * 5}
                            delay={appearDelay + 0.5 + i * 0.3}
                            imageSrc={`https://i.pravatar.cc/100?u=${angle + id}`} // Unique seed using passed id
                        />
                    ))}
                </div>

                {/* Company Badge Orbit */}
                {badgeText && badgeColor && (
                    <BadgeOrbit
                        text={badgeText}
                        color={badgeColor}
                        orbitSize={isConverged ? 120 : 160}
                        isVisible={true} // Keep badges visible after convergence
                        labelShift={-45}
                        fontSize={10}
                        pulse={false}
                    />
                )}

                {/* Company logo */}
                <motion.div
                    className="relative"
                    whileHover={{ scale: 1.1, y: -4 }}
                    transition={SPRING.elastic}
                >
                    <div
                        className="absolute inset-0 rounded-xl bg-berri-amber/10 blur-md"
                        style={{ transform: 'translate(4px, 6px)' }}
                    />
                    <div
                        className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border-2 border-white"
                        style={{ boxShadow: '0 8px 20px -4px rgba(0,0,0,0.1)' }}
                    >
                        <Image src={logo} alt="Company" width={48} height={48} className="object-cover" loading="lazy" />
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

// Generic Badge Orbit Component
const BadgeOrbit = ({
    text,
    color,
    orbitSize,
    isVisible,
    labelShift = -40,
    fontSize = 10,
    pulse = true
}: {
    text: string;
    color: string;
    orbitSize: number;
    isVisible: boolean;
    labelShift?: number;
    fontSize?: number;
    pulse?: boolean
}) => {
    if (!isVisible) return null

    return (
        <motion.div
            className="absolute left-1/2 top-1/2"
            style={{
                width: orbitSize,
                height: orbitSize,
                x: '-50%',
                y: '-50%',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: 1,
                scale: 1,
                rotate: 360,
                width: orbitSize,
                height: orbitSize,
            }}
            transition={{
                opacity: { duration: 0.5 },
                scale: { ...SPRING.bouncy },
                rotate: { duration: 40, repeat: Infinity, ease: "linear" },
                width: SPRING.slow,
                height: SPRING.slow,
            }}
        >
            <svg className="absolute inset-0 w-full h-full">
                <circle
                    cx="50%"
                    cy="50%"
                    r="48%"
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="3 6"
                    strokeLinecap="round"
                    style={{ opacity: 0.3 }}
                />
            </svg>
            <motion.div
                className="absolute"
                style={{ right: labelShift, top: '50%', marginTop: -11 }}
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
                <motion.div
                    className="px-2.5 py-0.5 rounded-full text-white font-bold whitespace-nowrap shadow-lg uppercase tracking-tight"
                    style={{
                        backgroundColor: color,
                        fontSize: `${fontSize}px`,
                        boxShadow: `0 4px 12px ${color}44`
                    }}
                    animate={pulse ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    {text}
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

// Follower badge with dotted orbit - EVEN LARGER
const FollowerOrbit = ({ isVisible, isConverged }: { isVisible: boolean; isConverged: boolean }) => {
    const orbitSize = isConverged ? 180 : 220
    return (
        <BadgeOrbit
            text="friends"
            color="#14b8a6"
            orbitSize={orbitSize}
            isVisible={isVisible}
            labelShift={-45}
            fontSize={10}
        />
    )
}

// Convergence ripple burst - smoother, more natural expansion
const ConvergenceBurst = ({ isActive }: { isActive: boolean }) => {
    if (!isActive) return null

    return (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {/* Smooth expanding rings */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2 rounded-full"
                    style={{
                        width: 80, // Start slightly larger
                        height: 80,
                        marginLeft: -40,
                        marginTop: -40,
                        border: i === 0 ? '3px solid' : '1.5px solid',
                        borderColor: i === 0 ? COLORS.rippleStrong : COLORS.ripple,
                        willChange: 'transform, opacity',
                    }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                        scale: [0.5, 6, 10, 15], // Massive expansion for merged look
                        opacity: [0.8, 0.5, 0.2, 0],
                    }}
                    transition={{
                        duration: 6, // Slower, more epic
                        delay: i * 1.2,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
                />
            ))}
            {/* Center glow */}
            <motion.div
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                    width: 200,
                    height: 200,
                    marginLeft: -100,
                    marginTop: -100,
                    background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 60%)',
                    willChange: 'transform, opacity',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
        </div>
    )
}

// Refined timing - more breathing room
const STEP_DELAYS = [0, 800, 1800, 3000, 4400, 6000, 7800, 10500]
const LOOP_HOLD_DURATION = 6000

// Main component with magnetic interaction
export default function NetworkAnimation() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 600, height: 500 })
    const [currentStep, setCurrentStep] = useState(0)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    const isConverged = currentStep >= 7

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setDimensions({ width: rect.width, height: rect.height })
            }
        }
        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    useEffect(() => {
        const timers = STEP_DELAYS.map((delay, step) =>
            setTimeout(() => setCurrentStep(step), delay)
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    // Smooth animation loop reset
    useEffect(() => {
        if (currentStep >= 7) {
            const resetTimer = setTimeout(() => {
                setCurrentStep(0)
                const timers = STEP_DELAYS.map((delay, step) =>
                    setTimeout(() => setCurrentStep(step), delay)
                )
                return () => timers.forEach(clearTimeout)
            }, LOOP_HOLD_DURATION)
            return () => clearTimeout(resetTimer)
        }
    }, [currentStep])

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left - rect.width / 2) / 20
        const y = (e.clientY - rect.top - rect.height / 2) / 20
        setMousePos({ x, y })
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
        >
            {/* Visual Grounding: Subtle Grid Pattern */}
            <div
                className="absolute inset-0 opacity-25 pointer-events-none rounded-3xl"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.07) 1px, transparent 0)`,
                    backgroundSize: '28px 28px'
                }}
            />

            {/* Soft Backdrop Glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(229, 72, 104, 0.06), transparent 70%)',
                }}
            />

            <motion.div
                className="relative w-full h-full"
                animate={{ x: mousePos.x, y: mousePos.y }}
                transition={{ type: "spring", stiffness: 150, damping: 15 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <BreathingRipple />
                    <ConvergenceBurst isActive={isConverged} />
                    <FollowerOrbit isVisible={true} isConverged={isConverged} />

                    {/* Center Profile */}
                    <motion.div
                        className="relative z-20 w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white"
                        animate={{ scale: isConverged ? 1.1 : 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Image
                            src="https://i.pravatar.cc/100?u=aish-main"
                            alt="0xaishwary"
                            width={96}
                            height={96}
                            className="object-cover"
                        />
                    </motion.div>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {COMPANIES.map((company, i) => (
                        <AnimatedConnectionLine
                            key={company.id}
                            centerX={50}
                            centerY={50}
                            company={company}
                            isVisible={currentStep > i}
                            isConverged={isConverged}
                            dimensions={dimensions}
                        />
                    ))}
                </svg>

                {COMPANIES.map((company, i) => (
                    <CompanyNode
                        key={company.id}
                        {...company}
                        isVisible={currentStep > i}
                        isConverged={isConverged}
                        appearDelay={0}
                    />
                ))}

                {/* Success Badge - Pill style matching pathfinder badges */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                        opacity: isConverged ? 1 : 0,
                        scale: isConverged ? 1 : 0.8
                    }}
                    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute bottom-[12%] right-[8%] z-30"
                >
                    <motion.div
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold whitespace-nowrap shadow-lg uppercase tracking-tight"
                        style={{
                            backgroundColor: '#22C55E',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                        }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>Strong Path</span>
                        <span className="font-extrabold">92%</span>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    )
}
