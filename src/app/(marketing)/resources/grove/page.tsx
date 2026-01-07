'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Search, BookOpen, Building2, Quote, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import CTA from '@/components/marketing/CTA'

// Combined content types
type ContentType = 'all' | 'stories' | 'insights'

// Blog posts data
const blogPosts = [
    {
        type: 'insight' as const,
        title: 'The Death of Cold Outreach: Why Warm Intros Win in 2024',
        excerpt: 'Cold emails are dying. Response rates have dropped 40% in the past year. Here\'s why relationship-led growth is the future of B2B sales.',
        author: 'Sarah Chen',
        role: 'Head of Growth',
        date: 'Dec 15, 2024',
        readTime: '8 min read',
        category: 'Strategy',
        slug: 'death-of-cold-outreach',
        featured: true
    },
    {
        type: 'insight' as const,
        title: 'How to Map Your Network for Maximum Reach',
        excerpt: 'A tactical guide to understanding your 2nd and 3rd degree connections and leveraging them for warm introductions.',
        author: 'Marcus Johnson',
        date: 'Dec 10, 2024',
        readTime: '6 min read',
        category: 'Tactics',
        slug: 'map-your-network'
    },
    {
        type: 'insight' as const,
        title: '5 Signals That Indicate Buying Intent in Web3',
        excerpt: 'Learn to identify the key signals that indicate a prospect is ready to buy—from funding announcements to team expansions.',
        author: 'Elena Rodriguez',
        date: 'Dec 5, 2024',
        readTime: '5 min read',
        category: 'Sales',
        slug: 'buying-intent-signals'
    },
    {
        type: 'insight' as const,
        title: 'Building Your ICP: A Data-Driven Approach',
        excerpt: 'How to use company intelligence data to build a precise ideal customer profile that actually converts.',
        author: 'Alex Kim',
        date: 'Nov 28, 2024',
        readTime: '7 min read',
        category: 'Strategy',
        slug: 'building-your-icp'
    },
    {
        type: 'insight' as const,
        title: 'The Founder\'s Guide to Warm Intro Fundraising',
        excerpt: 'Raising your next round? Here\'s how top founders use their network to get meetings with the right investors.',
        author: 'Sarah Chen',
        date: 'Nov 20, 2024',
        readTime: '10 min read',
        category: 'Fundraising',
        slug: 'warm-intro-fundraising'
    },
    {
        type: 'insight' as const,
        title: 'Event ROI: Turning Conference Badges into Deals',
        excerpt: 'You spent $10K on that conference. Here\'s how to turn those connections into actual revenue.',
        author: 'Marcus Johnson',
        date: 'Nov 15, 2024',
        readTime: '6 min read',
        category: 'Events',
        slug: 'event-roi'
    }
]

// Case studies data
const caseStudies = [
    {
        type: 'story' as const,
        company: 'ZK Protocol',
        logo: '⚡',
        industry: 'L2 Infrastructure',
        challenge: 'Needed to reach 50 enterprise clients for mainnet launch',
        solution: 'Used Pathfinder to map warm intros through investor network',
        results: [
            { metric: '47', label: 'Enterprise meetings', subtext: 'in 6 weeks' },
            { metric: '12', label: 'Signed partnerships', subtext: 'from warm intros' },
            { metric: '68%', label: 'Response rate', subtext: 'vs 3% cold' }
        ],
        quote: 'Berri helped us close more partnerships in 2 months than we did in the previous year of cold outreach.',
        author: 'Alex Chen',
        role: 'Head of BD',
        gradient: 'from-berri-raspberry to-berri-coral',
        featured: true,
        slug: 'zk-protocol'
    },
    {
        type: 'story' as const,
        company: 'DeFi Ventures',
        logo: '💰',
        industry: 'Venture Capital',
        challenge: 'Sourcing quality deal flow in a crowded market',
        solution: 'People Intelligence to identify founders before they announce raises',
        results: [
            { metric: '3x', label: 'Deal flow increase', subtext: 'quality leads' },
            { metric: '15', label: 'Pre-seed investments', subtext: 'sourced via Berri' },
            { metric: '40%', label: 'Time saved', subtext: 'on research' }
        ],
        quote: 'We\'re now getting to founders 2-3 months before they start their official raise.',
        author: 'Sarah Kim',
        role: 'Partner',
        gradient: 'from-emerald-500 to-teal-500',
        slug: 'defi-ventures'
    },
    {
        type: 'story' as const,
        company: 'Infrastructure Co',
        logo: '🔧',
        industry: 'Developer Tools',
        challenge: 'Breaking into new enterprise accounts',
        solution: 'Company Intelligence + Pathfinder for targeted outreach',
        results: [
            { metric: '$2.4M', label: 'Pipeline generated', subtext: 'in Q4' },
            { metric: '8', label: 'Enterprise deals', subtext: 'closed' },
            { metric: '45%', label: 'Shorter cycles', subtext: 'vs cold' }
        ],
        quote: 'The combination of company data and warm paths completely transformed our enterprise sales motion.',
        author: 'Marcus Johnson',
        role: 'VP Sales',
        gradient: 'from-berri-raspberry to-berri-coral',
        slug: 'infrastructure-co'
    },
    {
        type: 'story' as const,
        company: 'NFT Marketplace',
        logo: '🎨',
        industry: 'Consumer Web3',
        challenge: 'Recruiting top engineering talent in a competitive market',
        solution: 'People Intelligence to find and reach passive candidates',
        results: [
            { metric: '23', label: 'Engineers hired', subtext: 'in 6 months' },
            { metric: '85%', label: 'Response rate', subtext: 'to outreach' },
            { metric: '50%', label: 'Faster hiring', subtext: 'vs agencies' }
        ],
        quote: 'We stopped using recruiters entirely. Berri gives us direct access to the best talent.',
        author: 'Elena Rodriguez',
        role: 'CTO',
        gradient: 'from-amber-500 to-orange-500',
        slug: 'nft-marketplace'
    }
]

const stats = [
    { value: '150+', label: 'Companies', description: 'using Berri' },
    { value: '$50M+', label: 'Deals Closed', description: 'via warm intros' },
    { value: '94%', label: 'Customer Satisfaction', description: 'NPS score' },
    { value: '3x', label: 'Avg Response Rate', description: 'improvement' }
]

const contentFilters: { label: string; value: ContentType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Success Stories', value: 'stories' },
    { label: 'Insights', value: 'insights' }
]

export default function GrovePage() {
    const [activeFilter, setActiveFilter] = useState<ContentType>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Get featured content
    const featuredStory = caseStudies.find(s => s.featured)
    const featuredPost = blogPosts.find(p => p.featured)

    // Filter content based on active filter
    const filteredContent = [
        ...caseStudies.filter(s => !s.featured).map(s => ({ ...s, contentType: 'story' as const })),
        ...blogPosts.filter(p => !p.featured).map(p => ({ ...p, contentType: 'insight' as const }))
    ].filter(item => {
        if (activeFilter === 'all') return true
        if (activeFilter === 'stories') return item.contentType === 'story'
        if (activeFilter === 'insights') return item.contentType === 'insight'
        return true
    }).filter(item => {
        if (!searchQuery) return true
        const searchLower = searchQuery.toLowerCase()
        if ('title' in item) return item.title.toLowerCase().includes(searchLower)
        if ('company' in item) return item.company.toLowerCase().includes(searchLower)
        return true
    })

    return (
        <>
            {/* Hero Section */}
            <section className="pt-32 pb-16 bg-gray-50 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(229,72,104,0.1) 0%, transparent 70%)',
                        }}
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full"
                        style={{
                            background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
                        }}
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>

                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-raspberry text-berri-raspberry text-sm font-medium mb-6">
                                <Sparkles className="w-4 h-4 mr-2" />
                                The Grove
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight mb-6"
                        >
                            Stories & Insights for{' '}
                            <span className="text-berri-raspberry">Relationship-Led Growth</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-lg text-gray-600"
                        >
                            Real success stories and tactical insights from leading Web3 teams building warm paths to customers, investors, and partners.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-white border-y border-gray-100">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="text-center"
                            >
                                <div className="text-3xl lg:text-4xl font-heading font-bold text-berri-raspberry mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{stat.label}</div>
                                <div className="text-xs text-gray-500">{stat.description}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Filter & Search Bar */}
            <section className="py-8 bg-white border-b border-gray-100 sticky top-20 z-30">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {contentFilters.map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setActiveFilter(filter.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter.value
                                            ? 'bg-berri-raspberry text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                        <div className="hidden md:flex items-center gap-2 glass rounded-full px-4 py-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-40"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Content */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Featured Story */}
                        {featuredStory && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="glass-strong depth-lg rounded-3xl overflow-hidden"
                            >
                                <div className={`bg-gradient-to-br ${featuredStory.gradient} p-6 lg:p-8`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                                            {featuredStory.logo}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-heading font-bold text-white">
                                                {featuredStory.company}
                                            </h3>
                                            <p className="text-white/70 text-sm">{featuredStory.industry}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {featuredStory.results.map((result, i) => (
                                            <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                                                <div className="text-xl font-heading font-bold text-white">
                                                    {result.metric}
                                                </div>
                                                <div className="text-xs text-white/90">{result.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-berri-raspberry/10 text-berri-raspberry text-xs font-medium mb-3">
                                        <Building2 className="w-3 h-3 mr-1" />
                                        Featured Story
                                    </span>
                                    <p className="text-sm text-gray-600 italic mb-4">&quot;{featuredStory.quote}&quot;</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-berri-raspberry to-berri-coral" />
                                            <span className="text-xs text-gray-500">{featuredStory.author}, {featuredStory.role}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-berri-raspberry hover:text-berri-raspberry/80">
                                            Read More <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Featured Post */}
                        {featuredPost && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                                className="glass-strong depth-lg rounded-3xl overflow-hidden"
                            >
                                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 lg:p-8 h-48 flex items-center justify-center">
                                    <BookOpen className="w-16 h-16 text-gray-300" />
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-berri-coral/10 text-berri-coral text-xs font-medium">
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            Featured Insight
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                                            {featuredPost.category}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-heading font-bold mb-2">
                                        {featuredPost.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {featuredPost.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-berri-coral to-berri-raspberry" />
                                            <span className="text-xs text-gray-500">{featuredPost.author}</span>
                                            <span className="text-xs text-gray-400">·</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {featuredPost.readTime}
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-berri-coral hover:text-berri-coral/80">
                                            Read <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* Content Grid */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40">
                    <h2 className="text-2xl md:text-3xl font-heading font-bold mb-8">
                        {activeFilter === 'all' ? 'All Content' : activeFilter === 'stories' ? 'Success Stories' : 'Latest Insights'}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredContent.map((item, index) => (
                            <motion.article
                                key={'company' in item ? item.company : item.slug}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className="glass depth-md rounded-2xl overflow-hidden hover-glow-raspberry transition-all cursor-pointer group"
                            >
                                {'company' in item ? (
                                    // Case Study Card
                                    <>
                                        <div className={`h-32 bg-gradient-to-br ${item.gradient} p-4 flex items-center gap-3`}>
                                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                                                {item.logo}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-heading font-bold text-white">{item.company}</h3>
                                                <p className="text-xs text-white/70">{item.industry}</p>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                {item.results.slice(0, 3).map((result, i) => (
                                                    <div key={i} className="text-center">
                                                        <div className="text-sm font-heading font-bold text-gray-900">
                                                            {result.metric}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{result.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-600 italic mb-3 line-clamp-2">&quot;{item.quote}&quot;</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">{item.author}</span>
                                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-berri-raspberry transition-colors" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    // Blog Post Card
                                    <>
                                        <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                            <BookOpen className="w-10 h-10 text-gray-300 group-hover:text-berri-raspberry transition-colors" />
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                                                    {item.category}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {item.readTime}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-heading font-semibold mb-2 group-hover:text-berri-raspberry transition-colors line-clamp-2">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                                {item.excerpt}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-berri-coral to-berri-raspberry" />
                                                    <span className="text-xs text-gray-500">{item.author}</span>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-berri-raspberry transition-colors" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.article>
                        ))}
                    </div>

                    {filteredContent.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No content found matching your criteria.</p>
                        </div>
                    )}

                    {filteredContent.length > 0 && (
                        <div className="mt-12 text-center">
                            <Button variant="brandOutline" className="rounded-full">
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            <CTA />
        </>
    )
}
