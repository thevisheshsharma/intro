'use client'

import { useRouter } from 'next/navigation'

interface QuickAction {
    icon: React.ReactNode
    label: string
    description: string
    href?: string
    onClick?: () => void
}

interface QuickActionsProps {
    onSearchFocus?: () => void
}

// Custom line-based icons matching reference design
const ConnectionsIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
)

const CompanyIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
    </svg>
)

const PeopleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
)

export function QuickActions({ onSearchFocus }: QuickActionsProps) {
    const router = useRouter()

    const actions: QuickAction[] = [
        {
            icon: <ConnectionsIcon />,
            label: 'Find connections',
            description: 'Search for warm intros to any prospect',
            onClick: onSearchFocus,
        },
        {
            icon: <CompanyIcon />,
            label: 'Add company',
            description: 'Manage your organization data',
            href: '/app/manage-org',
        },
        {
            icon: <PeopleIcon />,
            label: 'Browse people',
            description: 'Find contacts from organizations',
            href: '/app/find-from-org',
        },
    ]

    const handleClick = (action: QuickAction) => {
        if (action.onClick) {
            action.onClick()
        } else if (action.href) {
            router.push(action.href)
        }
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={() => handleClick(action)}
                    className="group flex flex-col p-6 bg-white rounded-2xl border border-gray-100/80 
                     shadow-sm hover:shadow-lg hover:border-gray-100
                     transition-all duration-300 ease-out text-left
                     hover:-translate-y-1"
                >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 
                         bg-gradient-to-br from-berri-raspberry/8 to-berri-coral/8
                         group-hover:from-berri-raspberry/15 group-hover:to-berri-coral/15 
                         transition-all duration-300">
                        <span className="text-berri-raspberry group-hover:scale-110 transition-transform duration-300">
                            {action.icon}
                        </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{action.label}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
                </button>
            ))}
        </div>
    )
}
