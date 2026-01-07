'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, User, Briefcase, Target, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProfileStepProps {
    twitterUsername?: string | null
    analysisResult?: any
    onComplete: (data?: ProfileData) => void
    onSkip: () => void
}

interface ProfileData {
    displayName: string
    role: string
    company: string
    useCases: string[]
}

const roles = [
    { value: 'founder', label: 'Founder / CEO' },
    { value: 'bd', label: 'BD / Partnerships' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing / Growth' },
    { value: 'product', label: 'Product' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'investor', label: 'Investor' },
    { value: 'other', label: 'Other' }
]

const useCases = [
    { value: 'intros', label: 'Find warm intros', icon: User },
    { value: 'research', label: 'Research companies', icon: Briefcase },
    { value: 'recruit', label: 'Recruit talent', icon: Target }
]

export default function ProfileStep({
    twitterUsername,
    analysisResult,
    onComplete,
    onSkip
}: ProfileStepProps) {
    const [displayName, setDisplayName] = useState(
        analysisResult?.twitterProfile?.name || twitterUsername || ''
    )
    const [role, setRole] = useState('')
    const [company, setCompany] = useState('')
    const [selectedUseCases, setSelectedUseCases] = useState<string[]>([])

    const toggleUseCase = (value: string) => {
        setSelectedUseCases(prev =>
            prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value]
        )
    }

    const handleComplete = () => {
        onComplete({
            displayName,
            role,
            company,
            useCases: selectedUseCases
        })
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="glass-strong rounded-3xl p-8"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.h1
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-heading font-bold text-gray-900 mb-2"
                    >
                        Almost there!
                    </motion.h1>
                    <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-600"
                    >
                        Tell us a bit about yourself (optional)
                    </motion.p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Display Name */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/20 outline-none transition-all"
                        />
                    </motion.div>

                    {/* Role */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            What&apos;s your role?
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/20 outline-none transition-all bg-white"
                        >
                            <option value="">Select a role...</option>
                            {roles.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </motion.div>

                    {/* Company */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company (optional)
                        </label>
                        <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Your company"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/20 outline-none transition-all"
                        />
                    </motion.div>

                    {/* Use Cases */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            What will you use Berri for?
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {useCases.map(uc => {
                                const Icon = uc.icon
                                const isSelected = selectedUseCases.includes(uc.value)
                                return (
                                    <button
                                        key={uc.value}
                                        onClick={() => toggleUseCase(uc.value)}
                                        className={`p-4 rounded-xl border-2 transition-all text-center ${isSelected
                                            ? 'border-berri-raspberry bg-berri-raspberry/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? 'text-berri-raspberry' : 'text-gray-400'
                                            }`} />
                                        <span className={`text-xs font-medium ${isSelected ? 'text-berri-raspberry' : 'text-gray-600'
                                            }`}>
                                            {uc.label}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* Actions */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-8 flex gap-3"
                >
                    <Button
                        onClick={onSkip}
                        variant="ghost"
                        className="flex-1 h-12 rounded-xl text-gray-500"
                    >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Skip
                    </Button>
                    <Button
                        onClick={handleComplete}
                        variant="brand"
                        className="flex-1 h-12 rounded-xl"
                    >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    )
}
