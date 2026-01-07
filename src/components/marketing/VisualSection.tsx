'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function VisualSection() {
    return (
        <section className="py-24 bg-gray-50/50 backdrop-blur-sm overflow-hidden relative">
            {/* Aurora gradient background accent - warm tones */}
            <motion.div
                className="absolute top-0 left-0 w-[60%] h-[80%] opacity-50 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 80% 80% at 20% 30%, rgba(229, 72, 104, 0.08), transparent 70%)',
                }}
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <motion.div
                className="absolute bottom-0 right-0 w-[50%] h-[60%] opacity-40 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 70% 70% at 80% 70%, rgba(255, 127, 107, 0.06), transparent 70%)',
                }}
                animate={{
                    opacity: [0.25, 0.4, 0.25],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            {/* Valley-inspired grain texture overlay */}
            <div className="absolute inset-0 grain-overlay pointer-events-none" />
            <div className="container mx-auto px-8 md:px-20 lg:px-32 xl:px-40 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Left - Orbital Animation (Light themed) */}
                    <div className="order-2 lg:order-1 flex justify-center items-center">
                        <div className="relative w-80 h-80 md:w-[420px] md:h-[420px]">
                            {/* Outer Ring - X Logo & Luma Logo */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border border-gray-200"
                            >
                                {/* X (Twitter) Logo - Counter-rotate to stay upright */}
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black shadow-lg shadow-black/20 flex items-center justify-center z-10"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </motion.div>
                                {/* Luma Logo - Counter-rotate to stay upright */}
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-11 h-11 rounded-full shadow-lg shadow-berri-coral/30 flex items-center justify-center z-10 overflow-hidden bg-white"
                                >
                                    <Image
                                        src="/images/luma-logo.png"
                                        alt="Luma"
                                        width={36}
                                        height={36}
                                        className="object-contain"
                                        loading="lazy"
                                    />
                                </motion.div>
                            </motion.div>

                            {/* Second Ring - Web3 Founder Avatars */}
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-8 rounded-full border border-gray-200"
                            >
                                {/* Vitalik Buterin */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg shadow-gray-400/30 border-2 border-white z-10 overflow-hidden"
                                >
                                    <Image
                                        src="/images/vitalik.png"
                                        alt="Vitalik Buterin"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                </motion.div>
                                {/* Sandeep Nailwal */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full shadow-lg shadow-gray-400/30 border-2 border-white z-10 overflow-hidden"
                                >
                                    <Image
                                        src="/images/sandeep.png"
                                        alt="Sandeep Nailwal"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                </motion.div>
                                {/* Yu Hu */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg shadow-gray-400/30 border-2 border-white z-10 overflow-hidden"
                                >
                                    <Image
                                        src="/images/yuhu.png"
                                        alt="Yu Hu"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                </motion.div>
                            </motion.div>

                            {/* Third Ring - Organization Avatars */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-16 rounded-full border border-gray-200"
                            >
                                {/* Org Avatar 1 - Counter-rotate to stay upright */}
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-berri-raspberry to-berri-coral shadow-lg shadow-berri-coral/30 flex items-center justify-center z-10"
                                >
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                                    </svg>
                                </motion.div>
                                {/* Org Avatar 2 - Counter-rotate to stay upright */}
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-red-500/30 flex items-center justify-center z-10"
                                >
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                                    </svg>
                                </motion.div>
                            </motion.div>

                            {/* Inner Glow */}
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-24 rounded-full bg-gradient-to-tr from-berri-raspberry/20 via-berri-coral/10 to-berri-green/10 blur-2xl"
                            />

                            {/* Core */}
                            <div className="absolute inset-24 rounded-full glass-strong depth-md flex items-center justify-center z-20">
                                <div className="text-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <span className="text-2xl md:text-3xl font-heading font-black text-berri-raspberry">
                                            berri
                                        </span>
                                    </motion.div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono uppercase tracking-wider">
                                        System Active
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right - Content */}
                    <div className="order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-gray-900 mb-6">
                                Real-time
                                <br />
                                <span className="text-berri-raspberry">relationship</span>
                                <br />
                                intelligence
                            </h2>
                            <p className="text-lg text-gray-700 mb-10 leading-relaxed max-w-lg">
                                Our relationship graph continuously maps millions of connections.
                                When you search, you get instant warm paths to anyone.
                            </p>

                            {/* Live Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {[
                                    { value: '1.4M+', label: 'People & Orgs' },
                                    { value: '12M+', label: 'Connections' },
                                    { value: '<100ms', label: 'Path Time' },
                                ].map((stat, i) => (
                                    <div key={i} className="glass-strong rounded-xl p-4 depth-sm hover-glow-amber">
                                        <div className="text-xl md:text-2xl font-heading font-bold text-gray-900">
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Status Indicator */}
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-berri-green/10 border border-berri-green/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-berri-green opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-berri-green" />
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                    Syncing relationships • Updated 2m ago
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    )
}
