'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown, Route, Building2, Users, Rocket, TrendingUp, Megaphone, FileText, BookOpen, Mail, ArrowUpRight, MapPin, BarChart3, Send, Heart, Landmark, UserCheck, Target, Radio, Newspaper, Award } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useUser, UserButton } from '@clerk/nextjs'

// ========== UNIQUE INTERACTIVE ICON ANIMATIONS ==========

// Pathfinder Icon - Path morphs to destination pin on hover
function PathfinderIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.5 : 1,
                    rotate: isHovered ? 180 : 0
                }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Route className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 5 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.5,
                    y: isHovered ? 0 : 5
                }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <MapPin className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// Building Icon - Transforms to Landmark on hover
function BuildingIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Building2 className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Landmark className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// Users Icon - Transforms to UserCheck on hover
function UsersIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Users className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <UserCheck className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// Rocket Icon - Transforms to Target on hover
function RocketIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1,
                    y: isHovered ? -2 : 0
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Rocket className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Target className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// Trending Up Icon - Line draws and pulses on hover
function TrendingIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1
                }}
                transition={{ duration: 0.2 }}
            >
                <TrendingUp className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isHovered ? 1 : 0
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <BarChart3 className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
            {/* Rising indicator */}
            <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{
                    opacity: isHovered ? [0, 1, 0] : 0,
                    y: isHovered ? [0, -6, -8] : 0
                }}
                transition={{
                    duration: 0.8,
                    repeat: isHovered ? Infinity : 0,
                    repeatDelay: 0.3
                }}
                className="absolute -top-1 right-0 text-berri-raspberry text-[8px] font-bold"
            >
                ▲
            </motion.div>
        </motion.div>
    )
}

// Megaphone Icon - Transforms to Radio on hover
function MegaphoneIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Megaphone className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Radio className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// FileText Icon - Transforms to Newspaper on hover
function FileTextIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <FileText className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Newspaper className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// BookOpen Icon - Transforms to Award on hover
function BookOpenIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5">
            <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.8 : 1
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <BookOpen className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Award className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
        </motion.div>
    )
}

// Mail Icon - Envelope opens on hover
function MailIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.div className="relative w-5 h-5 overflow-visible">
            <motion.div
                initial={{ opacity: 1 }}
                animate={{
                    opacity: isHovered ? 0 : 1,
                    y: isHovered ? -2 : 0
                }}
                transition={{ duration: 0.2 }}
            >
                <Mail className="w-5 h-5 text-gray-900 group-hover:text-berri-raspberry transition-colors duration-300" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    y: isHovered ? 0 : 2,
                    rotate: isHovered ? -10 : 0
                }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Send className="w-5 h-5 text-berri-raspberry" />
            </motion.div>
            {/* Sending effect */}
            <motion.div
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{
                    opacity: isHovered ? [0, 1, 0] : 0,
                    x: isHovered ? [0, 8, 12] : 0,
                    y: isHovered ? [0, -4, -6] : 0
                }}
                transition={{
                    duration: 0.5,
                    repeat: isHovered ? Infinity : 0,
                    repeatDelay: 0.2
                }}
                className="absolute top-1/2 right-0 w-1 h-1 bg-berri-raspberry rounded-full"
            />
        </motion.div>
    )
}


// Icon type mapping
const iconTypeMap = {
    'Route': PathfinderIcon,
    'Building2': BuildingIcon,
    'Users': UsersIcon,
    'Rocket': RocketIcon,
    'TrendingUp': TrendingIcon,
    'Megaphone': MegaphoneIcon,
    'FileText': FileTextIcon,
    'BookOpen': BookOpenIcon,
    'Mail': MailIcon,
}

// Main Animated Icon Container - picks the right animation based on icon type
// Now accepts isHovered from parent for card-level hover detection
function AnimatedIconBox({ Icon, iconType, isHovered = false, className = "" }: {
    Icon: React.ComponentType<{ className?: string }>;
    iconType?: string;
    isHovered?: boolean;
    className?: string
}) {
    // Get the specific animated icon component
    const AnimatedIcon = iconType ? iconTypeMap[iconType as keyof typeof iconTypeMap] : null

    return (
        <motion.div
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center ${className}`}
            animate={{ scale: isHovered ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            {AnimatedIcon ? (
                <AnimatedIcon isHovered={isHovered} />
            ) : (
                <motion.div
                    className="relative"
                    animate={{
                        rotate: isHovered ? [0, -10, 10, -5, 0] : 0,
                        scale: isHovered ? 1.1 : 1
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isHovered ? 'text-berri-raspberry' : 'text-gray-900'}`} />
                </motion.div>
            )}
        </motion.div>
    )
}

// Dropdown Item Component - handles hover state for the entire card
function DropdownItem({ item, compact = false }: {
    item: { label: string; href: string; desc: string; Icon: React.ComponentType<{ className?: string }>; iconType: string };
    compact?: boolean;
}) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <Link
            href={item.href}
            className={`group flex items-start gap-4 ${compact ? 'p-3' : 'p-4'} rounded-2xl hover:bg-gray-50 transition-all duration-300`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatedIconBox Icon={item.Icon} iconType={item.iconType} isHovered={isHovered} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{item.label}</h4>
                    <motion.div
                        animate={{ x: isHovered ? 2 : 0, opacity: isHovered ? 1 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ArrowUpRight className="w-3 h-3 text-gray-400" />
                    </motion.div>
                </div>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed line-clamp-2">
                    {item.desc}
                </p>
            </div>
        </Link>
    )
}

// Platform dropdown content - with featured card
const platformContent = {
    type: 'featured' as const,
    featured: {
        title: 'Your relationship intelligence suite',
        tagline: 'PLATFORM',
        href: '/platform',
    },
    items: [
        {
            label: 'Company Intelligence',
            href: '/platform#company-intelligence',
            desc: 'Know everything about your target company.',
            Icon: Building2,
            iconType: 'Building2',
        },
        {
            label: 'People Intelligence',
            href: '/platform#people-intelligence',
            desc: 'Find the right decision makers.',
            Icon: Users,
            iconType: 'Users',
        },
        {
            label: 'Pathfinder',
            href: '/platform#pathfinder',
            desc: 'Discover warm paths through your network.',
            Icon: Route,
            iconType: 'Route',
        },
        {
            label: 'Ping',
            href: '/platform#ping',
            desc: 'Craft and send personalized outreach.',
            Icon: Send,
            iconType: 'Mail',
        },
    ]
}

// Use Cases dropdown content - simple list without featured card
const useCasesContent = {
    type: 'simple' as const,
    items: [
        {
            label: 'For Founders',
            href: '/use-cases#founders',
            desc: 'Accelerate fundraising via warm intros.',
            Icon: Rocket,
            iconType: 'Rocket',
        },
        {
            label: 'For Sales & BD',
            href: '/use-cases#sales',
            desc: 'Close more deals with warm paths.',
            Icon: TrendingUp,
            iconType: 'TrendingUp',
        },
        {
            label: 'For GTM & Marketing',
            href: '/use-cases#gtm',
            desc: 'Market research & activation insights.',
            Icon: Megaphone,
            iconType: 'Megaphone',
        },
    ]
}

// Resources dropdown content - simple list like Use Cases
const resourcesContent = {
    type: 'simple' as const,
    items: [
        {
            label: 'The Grove',
            href: '/resources/grove',
            desc: 'Stories & insights for relationship-led growth.',
            Icon: BookOpen,
            iconType: 'BookOpen',
        },
        {
            label: 'Contact Us',
            href: '/resources/contact',
            desc: 'Demos, support, or questions.',
            Icon: Mail,
            iconType: 'Mail',
        },
    ]
}

type NavLink = {
    label: string;
    href: string;
    content: typeof platformContent | typeof useCasesContent | null;
}

// Reordered: Platform, Use Cases, Resources, Pricing
const navLinks: NavLink[] = [
    { label: 'Platform', href: '/platform', content: platformContent },
    { label: 'Use Cases', href: '/use-cases', content: useCasesContent },
    { label: 'Resources', href: '/resources', content: resourcesContent },
    { label: 'Pricing', href: '/pricing', content: null },
]

// Platform Dropdown Content - two columns (featured card + items list)
function PlatformDropdownContent({ content }: { content: typeof platformContent }) {
    return (
        <div className="w-full h-full p-2">
            <div className="flex h-full">
                {/* Featured Card - Left Side (Non-clickable) */}
                <div
                    className="relative w-[260px] m-2 rounded-2xl overflow-hidden bg-gradient-to-br from-berri-raspberry via-berri-coral to-berri-amber p-6 flex flex-col justify-between min-h-[260px]"
                >
                    {/* Warm floating accents */}
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-8 right-8 w-24 h-24 rounded-full bg-gradient-to-br from-berri-amber/40 to-berri-gold/20 blur-xl"
                        />
                        <motion.div
                            animate={{ y: [0, 6, 0], x: [0, -3, 0] }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-12 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-berri-gold/30 to-berri-amber/15 blur-lg"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/10 blur-2xl"
                        />
                    </div>

                    {/* Decorative connection illustration */}
                    <div className="relative z-10">
                        <svg
                            width="80"
                            height="40"
                            viewBox="0 0 80 40"
                            fill="none"
                            className="opacity-80"
                        >
                            {/* Connection nodes */}
                            <circle cx="8" cy="20" r="4" fill="white" fillOpacity="0.9" />
                            <circle cx="40" cy="8" r="3" fill="white" fillOpacity="0.7" />
                            <circle cx="40" cy="32" r="3" fill="white" fillOpacity="0.7" />
                            <circle cx="72" cy="20" r="4" fill="white" fillOpacity="0.9" />
                            {/* Connection paths */}
                            <motion.path
                                d="M12 20 Q 26 8, 37 8"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                            />
                            <motion.path
                                d="M12 20 Q 26 32, 37 32"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, delay: 0.4 }}
                            />
                            <motion.path
                                d="M43 8 Q 56 8, 68 20"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, delay: 0.6 }}
                            />
                            <motion.path
                                d="M43 32 Q 56 32, 68 20"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                                fill="none"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, delay: 0.8 }}
                            />
                        </svg>
                    </div>

                    {/* Platform description */}
                    <div className="relative z-10 space-y-2">
                        <h3 className="text-lg font-bold text-white leading-tight drop-shadow-sm">
                            Your relationship intelligence suite
                        </h3>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Warm intros via Pathfinder, company insights, and people signals—all in one platform.
                        </p>
                    </div>
                </div>

                {/* Items List - Right Side */}
                <div className="flex-1 p-3 space-y-1">
                    {content.items.map((item) => (
                        <DropdownItem key={item.label} item={item} compact />
                    ))}
                </div>
            </div>
        </div>
    )
}

// Simple Dropdown Content - single column items list
function SimpleDropdownContent({ content }: { content: typeof useCasesContent }) {
    return (
        <div className="w-full h-full p-3">
            <div className="space-y-1">
                {content.items.map((item) => (
                    <DropdownItem key={item.label} item={item} />
                ))}
            </div>
        </div>
    )
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
    const { isSignedIn, isLoaded, user } = useUser()

    // Stripe-like morphing popover state
    const navRef = useRef<HTMLDivElement>(null)
    const linkRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const prevDropdownRef = useRef<string | null>(null)

    // Dynamic dimensions for each dropdown type based on content
    const getDropdownDimensions = useCallback((label: string | null) => {
        if (!label) return { width: 420, height: 200 }
        const link = navLinks.find(l => l.label === label)
        if (link?.content?.type === 'featured') {
            // Platform: two columns (featured + items) - 4 items now
            const itemCount = link?.content?.items?.length || 4
            const dynamicHeight = Math.max(280, itemCount * 72 + 32)
            return { width: 680, height: dynamicHeight }
        }
        // Use Cases & Resources: single column - calculate height based on item count
        // Each item is ~88px (padding + content), plus container padding (24px)
        const itemCount = link?.content?.items?.length || 3
        const dynamicHeight = itemCount * 88 + 24
        return { width: 420, height: dynamicHeight }
    }, [])

    const { scrollY } = useScroll()

    useMotionValueEvent(scrollY, "change", (latest) => {
        const isScrolled = latest > 20
        if (isScrolled !== scrolled) {
            setScrolled(isScrolled)
        }
    })

    // Set ref for link elements
    const setLinkRef = useCallback((label: string, el: HTMLDivElement | null) => {
        if (el) {
            linkRefs.current.set(label, el)
        } else {
            linkRefs.current.delete(label)
        }
    }, [])

    // Calculate x position for dropdown
    const getDropdownX = useCallback((dropdownLabel: string) => {
        if (!navRef.current) return 0

        const linkEl = linkRefs.current.get(dropdownLabel)
        const navRect = navRef.current.getBoundingClientRect()
        const dims = getDropdownDimensions(dropdownLabel)

        if (linkEl) {
            const linkRect = linkEl.getBoundingClientRect()

            // Center dropdown under the link
            let xOffset = linkRect.left - navRect.left + linkRect.width / 2 - dims.width / 2

            // Ensure dropdown doesn't overflow left or right
            const minX = -navRect.left + 16
            const maxX = window.innerWidth - navRect.left - dims.width - 16
            xOffset = Math.max(minX, Math.min(maxX, xOffset))

            return xOffset
        }
        return 0
    }, [getDropdownDimensions])

    // Check if this is initial render (no previous dropdown)
    const isInitialRender = prevDropdownRef.current === null && activeDropdown !== null

    // Update prev ref after render
    useEffect(() => {
        prevDropdownRef.current = activeDropdown
    }, [activeDropdown])

    // Handle mouse enter with immediate show
    const handleMouseEnter = useCallback((label: string, hasContent: boolean) => {
        if (!hasContent) return
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        setActiveDropdown(label)
    }, [])

    // Handle mouse leave with delay for smooth UX
    const handleMouseLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setActiveDropdown(null)
        }, 150) // Small delay to allow moving to dropdown
    }, [])

    // Cancel close when entering popover area
    const handlePopoverEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
    }, [])

    // Get arrow position (center of the active link relative to popover)
    const getArrowPosition = useCallback(() => {
        if (!activeDropdown || !navRef.current) return 0
        const linkEl = linkRefs.current.get(activeDropdown)
        if (!linkEl) return 0

        const navRect = navRef.current.getBoundingClientRect()
        const linkRect = linkEl.getBoundingClientRect()
        const dropdownX = getDropdownX(activeDropdown)

        // Arrow position relative to the popover container
        return linkRect.left - navRect.left + linkRect.width / 2 - dropdownX
    }, [activeDropdown, getDropdownX])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
            }
        }
    }, [])

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out ${scrolled
                ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/80 shadow-sm'
                : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <span className="text-xl font-heading font-bold text-gray-900 transition-colors duration-300 group-hover:text-berri-raspberry">berri</span>
                </Link>

                {/* Desktop Nav - Stripe-like Morphing Popover */}
                <nav className="hidden lg:flex items-center relative" ref={navRef}>
                    <div className="flex items-center gap-1 bg-gray-50/90 backdrop-blur-sm rounded-full px-2 py-1.5 border border-gray-200/50">
                        {navLinks.map((link) => (
                            <div
                                key={link.label}
                                ref={(el) => setLinkRef(link.label, el)}
                                className="relative"
                                onMouseEnter={() => handleMouseEnter(link.label, !!link.content)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {link.content ? (
                                    <button
                                        type="button"
                                        className={`relative z-20 px-5 py-2 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-full cursor-pointer ${activeDropdown === link.label
                                            ? 'text-gray-900 bg-white shadow-sm ring-1 ring-gray-200'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                            }`}
                                    >
                                        {link.label}
                                        <ChevronDown
                                            className={`w-3.5 h-3.5 transition-transform duration-300 ${activeDropdown === link.label ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>
                                ) : (
                                    <Link
                                        href={link.href}
                                        className="relative z-20 px-5 py-2 text-sm font-medium transition-all duration-300 flex items-center gap-1.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-white/60"
                                    >
                                        {link.label}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Shared Morphing Popover Container */}
                    <AnimatePresence>
                        {activeDropdown && (
                            <motion.div
                                className="absolute top-full pt-4"
                                style={{ left: 0 }}
                                initial={{ opacity: 0, y: 8, x: getDropdownX(activeDropdown) }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    x: getDropdownX(activeDropdown),
                                }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{
                                    opacity: { duration: 0.2, ease: "easeOut" },
                                    y: { duration: 0.25, ease: [0.23, 1, 0.32, 1] },
                                    x: isInitialRender
                                        ? { duration: 0 }
                                        : { type: "spring", stiffness: 350, damping: 30 }
                                }}
                                onMouseEnter={handlePopoverEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                {/* Arrow indicator */}
                                <motion.div
                                    className="absolute -top-0 w-3 h-3 bg-white border-l border-t border-gray-200/50 rotate-45 z-10"
                                    initial={{ left: getArrowPosition() - 6 }}
                                    animate={{ left: getArrowPosition() - 6 }}
                                    transition={isInitialRender
                                        ? { duration: 0 }
                                        : { type: "spring", stiffness: 350, damping: 30 }
                                    }
                                />

                                {/* Morphing background container */}
                                <motion.div
                                    className="glass-navbar rounded-3xl depth-lg overflow-hidden relative"
                                    initial={getDropdownDimensions(activeDropdown)}
                                    animate={getDropdownDimensions(activeDropdown)}
                                    transition={isInitialRender
                                        ? { duration: 0 }
                                        : { type: "spring", stiffness: 350, damping: 30 }
                                    }
                                >
                                    {/* Render all dropdowns, positioned absolutely */}
                                    {navLinks.filter(l => l.content).map((link) => (
                                        <motion.div
                                            key={link.label}
                                            className="absolute top-0 left-0 w-full h-full"
                                            initial={{ opacity: activeDropdown === link.label ? 1 : 0 }}
                                            animate={{
                                                opacity: activeDropdown === link.label ? 1 : 0,
                                                pointerEvents: activeDropdown === link.label ? 'auto' : 'none'
                                            }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {link.content?.type === 'featured' ? (
                                                <PlatformDropdownContent content={link.content as typeof platformContent} />
                                            ) : link.content?.type === 'simple' ? (
                                                <SimpleDropdownContent content={link.content as typeof useCasesContent} />
                                            ) : null}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>

                {/* Actions */}
                <div className="hidden lg:flex items-center gap-3">
                    {isLoaded && isSignedIn ? (
                        <>
                            <Button
                                variant="brand"
                                asChild
                                className="rounded-full px-6 h-10 text-sm font-medium transition-transform hover:scale-105"
                            >
                                <Link href="/app" className="flex items-center gap-2">
                                    Go to Dashboard
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </Button>
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-10 h-10 rounded-full ring-2 ring-gray-200 hover:ring-berri-raspberry transition-all"
                                    }
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Link
                                href="/sign-in"
                                className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-300 rounded-full hover:bg-gray-100"
                            >
                                Log in
                            </Link>
                            <Button
                                variant="brand"
                                asChild
                                className="rounded-full px-6 h-10 text-sm font-medium transition-transform hover:scale-105"
                            >
                                <Link href="/sign-up">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden p-2.5 text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-300"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="absolute top-20 left-4 right-4 bg-white rounded-3xl border border-gray-200 shadow-2xl lg:hidden overflow-hidden"
                        >
                            <div className="p-6 flex flex-col gap-2">
                                {navLinks.map((link) => (
                                    <div key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="flex items-center justify-between text-base font-semibold text-gray-900 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                                            onClick={() => !link.content && setMobileMenuOpen(false)}
                                        >
                                            {link.label}
                                            {link.content && <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </Link>
                                        {link.content && 'items' in link.content && (
                                            <div className="mt-1 ml-4 space-y-1">
                                                {link.content.items.map((item: { label: string; href: string; Icon: React.ComponentType<{ className?: string }> }) => (
                                                    <Link
                                                        key={item.label}
                                                        href={item.href}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <item.Icon className="w-4 h-4 text-gray-400" />
                                                        {item.label}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}

                                    </div>
                                ))}
                                <div className="h-px bg-gray-100 my-3" />
                                {isLoaded && isSignedIn ? (
                                    <>
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <UserButton
                                                afterSignOutUrl="/"
                                                appearance={{
                                                    elements: {
                                                        avatarBox: "w-10 h-10 rounded-full"
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-900">
                                                {user?.firstName || 'Account'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="brand"
                                            className="w-full rounded-full h-12 text-sm font-medium"
                                            asChild
                                        >
                                            <Link href="/app" onClick={() => setMobileMenuOpen(false)}>
                                                Go to Dashboard
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/sign-in"
                                            className="text-sm font-medium text-gray-600 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Log in
                                        </Link>
                                        <Button
                                            variant="brand"
                                            className="w-full rounded-full h-12 text-sm font-medium"
                                            asChild
                                        >
                                            <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                                                Get Started
                                            </Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header >
    )
}
