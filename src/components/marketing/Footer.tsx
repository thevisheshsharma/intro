'use client'
import Link from 'next/link'

const footerLinks = {
    platform: {
        title: 'Platform',
        links: [
            { label: 'Company Intelligence', href: '/platform#company-intelligence' },
            { label: 'People Intelligence', href: '/platform#people-intelligence' },
            { label: 'Pathfinder', href: '/platform#pathfinder' },
            { label: 'Ping', href: '/platform#ping', isNew: true },
        ]
    },
    resources: {
        title: 'Resources',
        links: [
            { label: 'The Grove', href: '/resources/grove' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Contact', href: '/resources/contact' },
        ]
    },
    useCases: {
        title: 'Use Cases',
        links: [
            { label: 'For Founders', href: '/use-cases#founders' },
            { label: 'For Sales & BD', href: '/use-cases#sales' },
            { label: 'For Marketing', href: '/use-cases#gtm' },
        ]
    }
}

const socialLinks = [
    { label: 'Twitter', href: 'https://twitter.com/berri_ai' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/berri-ai' },
]

export default function Footer() {
    return (
        <footer className="bg-gray-50/50 backdrop-blur-sm pt-20 pb-0 overflow-hidden">
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                {/* Top Row - Social & Navigation */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-16 mb-20">
                    {/* Left Side - Social Links & Established */}
                    <div className="space-y-8">
                        {/* Social Pills */}
                        <div className="flex items-center gap-4">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 rounded-full glass hover-glow-raspberry text-sm font-medium text-gray-600 hover:text-berri-raspberry transition-all duration-300"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Link Columns */}
                    <div className="flex flex-wrap gap-16 lg:gap-20">
                        {Object.values(footerLinks).map((section) => (
                            <div key={section.title} className="min-w-[140px]">
                                {/* Section Title - Underlined Bold */}
                                <h3 className="text-sm font-regular text-gray-900 pb-2 mb-4 border-b-2 border-gray-500 inline-block">
                                    {section.title}
                                </h3>

                                {/* Links */}
                                <ul className="space-y-3">
                                    {section.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                className="group flex items-center gap-2 text-sm text-gray-500 hover:text-berri-raspberry transition-colors"
                                            >
                                                <span className="relative">
                                                    {link.label}
                                                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-berri-raspberry transition-all group-hover:w-full" />
                                                </span>
                                                {'isNew' in link && link.isNew && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-berri-raspberry bg-berri-raspberry/10 rounded-full">
                                                        NEW
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Giant Brand Name - Watermark style */}
            <div className="relative h-28 md:h-36 lg:h-44 overflow-hidden select-none pointer-events-none opacity-40 mix-blend-multiply">
                <h2
                    className="absolute bottom-0 left-8 md:left-20 lg:left-32 xl:left-40 font-heading font-extrabold text-berri-raspberry leading-none translate-y-[35%]"
                    style={{
                        fontSize: 'clamp(8rem, 20vw, 16rem)',
                        letterSpacing: '-0.04em',
                    }}
                >
                    berri
                </h2>
            </div>

            {/* Bottom Legal Bar - Terms & Privacy at absolute bottom */}
            <div className="bg-gray-100 border-t border-gray-200">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 py-4 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        © 2025 Berri. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/terms"
                            className="text-xs text-gray-500 hover:text-berri-raspberry transition-colors"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            href="/privacy"
                            className="text-xs text-gray-500 hover:text-berri-raspberry transition-colors"
                        >
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
