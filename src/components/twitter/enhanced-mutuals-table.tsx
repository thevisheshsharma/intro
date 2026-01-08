'use client'

import { useState, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { BerriLoader } from '@/components/ui/BerriLoader'

// Types matching the API response
interface OrgConnection {
  orgUserId: string
  orgScreenName: string
  orgName: string
  userRelationType: string
  prospectRelationType: string
  matchSource: 'prospect_direct' | 'prospect_following'
  viaUser?: string
}

type ConnectionType = 'direct' | 'org_direct' | 'org_indirect' | 'shared_third_party' | 'chain_affinity'

interface MutualUser {
  userId: string
  name: string
  screenName: string
  profileImageUrl?: string
  description?: string
  followersCount: number
  followingCount?: number
  verified?: boolean
  mutualType?: 'direct' | 'organizational'
  connectionType?: ConnectionType
  relevancyScore: number
  orgConnections?: OrgConnection[]
  sharedOrg?: { userId: string; screenName: string; name: string }
  intermediary?: { userId: string; screenName: string; name: string }
  thirdParty?: { userId: string; screenName: string; name: string }
  sharedChains?: string[]
  connectionTypes?: ConnectionType[]
  allOrgConnections?: OrgConnection[]
  allSharedOrgs?: Array<{ userId: string; screenName: string; name: string }>
  allIntermediaries?: Array<{ userId: string; screenName: string; name: string }>
  allThirdParties?: Array<{ userId: string; screenName: string; name: string }>
  allSharedChains?: string[]
  scoreBreakdown?: {
    base: number
    relationshipMultiplier: number
    accountQuality: number
    bonuses: number
    freshnessDecay: number
  }
}

interface EnhancedMutualsTableProps {
  mutuals: MutualUser[]
  loading: boolean
  searchedUserScreenName?: string
}

// Relationship type display config - Light mode
const RELATIONSHIP_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  WORKS_AT: { label: 'works at', color: 'text-green-700', bgColor: 'bg-green-50' },
  WORKED_AT: { label: 'worked at', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  INVESTED_IN: { label: 'invested in', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  AUDITS: { label: 'audits', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  AFFILIATED_WITH: { label: 'affiliated with', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  PARTNERS_WITH: { label: 'partners with', color: 'text-pink-700', bgColor: 'bg-pink-50' },
  MEMBER_OF: { label: 'member of', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  FOLLOWS: { label: 'follows', color: 'text-gray-600', bgColor: 'bg-gray-100' }
}

// Connection type display config - Light mode
const CONNECTION_TYPE_CONFIG: Record<ConnectionType, { label: string; shortLabel: string; color: string; bgColor: string }> = {
  direct: { label: 'Direct Follow', shortLabel: 'Follow', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  org_direct: { label: 'Same Org', shortLabel: 'Org', color: 'text-green-700', bgColor: 'bg-green-50' },
  org_indirect: { label: 'Org via Mutual', shortLabel: 'OrgMutual', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  shared_third_party: { label: 'Shared Investor', shortLabel: 'Investor', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  chain_affinity: { label: 'Same Chain', shortLabel: 'Chain', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
}

// Circular progress indicator for relevancy score with tooltip
function ScoreCircle({
  score,
  maxScore = 150,
  breakdown
}: {
  score: number
  maxScore?: number
  breakdown?: MutualUser['scoreBreakdown']
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const percentage = Math.min((score / maxScore) * 100, 100)
  const radius = 12
  const strokeWidth = 3
  const circumference = 2 * Math.PI * radius
  const filledLength = (percentage / 100) * circumference

  const getColor = () => {
    if (percentage >= 70) return '#22c55e' // green-500
    if (percentage >= 40) return '#eab308' // yellow-500
    return '#9ca3af' // gray-400
  }

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx="16" cy="16" r={radius} fill="none" stroke={getColor()} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={circumference - filledLength}
          strokeLinecap="round" transform="rotate(-90 16 16)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>

      {showTooltip && breakdown && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-xl p-3 text-xs whitespace-nowrap z-50 shadow-lg">
          <div className="text-gray-900 mb-2 font-semibold">Score Breakdown</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Base:</span>
              <span className="text-gray-900 font-medium">{breakdown.base.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Multiplier:</span>
              <span className="text-gray-900 font-medium">×{breakdown.relationshipMultiplier.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Quality:</span>
              <span className="text-gray-900 font-medium">+{breakdown.accountQuality.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Bonuses:</span>
              <span className="text-gray-900 font-medium">+{breakdown.bonuses.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Freshness:</span>
              <span className="text-gray-900 font-medium">×{breakdown.freshnessDecay.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between gap-4">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="text-green-600 font-semibold">{score.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Chain node component - Light mode
function ChainNode({
  label,
  isUser = false,
  color = 'text-gray-700',
  bgColor = 'bg-gray-100'
}: {
  label: string
  isUser?: boolean
  color?: string
  bgColor?: string
}) {
  return (
    <span className={cn(
      'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border border-transparent',
      bgColor, color
    )}>
      {isUser ? `@${label}` : label}
    </span>
  )
}

function ChainDash() {
  return <span className="text-gray-400 text-sm font-light mx-1">—</span>
}

// Connection type badges - Light mode
function ConnectionTypeBadges({ types }: { types: ConnectionType[] }) {
  if (types.length <= 1) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {types.map(type => {
        const config = CONNECTION_TYPE_CONFIG[type]
        return (
          <span key={type} className={cn('px-2 py-0.5 rounded-lg text-[10px] font-medium', config.bgColor, config.color)} title={config.label}>
            {config.shortLabel}
          </span>
        )
      })}
    </div>
  )
}

// Connection chain visualization - Light mode
function ConnectionChain({ user, searchedUserScreenName }: { user: MutualUser; searchedUserScreenName?: string }) {
  const connType = user.connectionType || (user.mutualType === 'direct' ? 'direct' : 'org_direct')

  if (connType === 'direct') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  }

  if (connType === 'shared_third_party' && user.sharedOrg && user.thirdParty) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <span className="text-[10px] text-green-600 font-medium">works at</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-700" bgColor="bg-green-50" />
        <ChainDash />
        <ChainNode label={user.thirdParty.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  }

  if (connType === 'chain_affinity' && user.sharedOrg && user.sharedChains) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <span className="text-[10px] text-green-600 font-medium">works at</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-700" bgColor="bg-green-50" />
        <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px] font-medium">{user.sharedChains.join(', ')}</span>
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  }

  if (connType === 'org_indirect' && user.sharedOrg && user.intermediary) {
    const connection = user.orgConnections?.[0]
    const userRelConfig = connection ? RELATIONSHIP_CONFIG[connection.userRelationType] || RELATIONSHIP_CONFIG.WORKS_AT : RELATIONSHIP_CONFIG.WORKS_AT
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <span className={cn('text-[10px] font-medium', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-700" bgColor="bg-green-50" />
        <ChainDash />
        <ChainNode label={user.intermediary.screenName} isUser color="text-orange-700" bgColor="bg-orange-50" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  }

  const connection = user.orgConnections?.[0]
  if (!connection) {
    if (user.sharedOrg) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
          <ChainDash />
          <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-700" bgColor="bg-green-50" />
          <ChainDash />
          <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
        </div>
      )
    }
    return null
  }

  const userRelConfig = RELATIONSHIP_CONFIG[connection.userRelationType] || RELATIONSHIP_CONFIG.WORKS_AT
  const prospectRelConfig = RELATIONSHIP_CONFIG[connection.prospectRelationType] || RELATIONSHIP_CONFIG.WORKS_AT

  if (connection.matchSource === 'prospect_direct') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <span className={cn('text-[10px] font-medium', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={connection.orgScreenName} isUser color="text-green-700" bgColor="bg-green-50" />
        <ChainDash />
        <span className={cn('text-[10px] font-medium', prospectRelConfig.color)}>{prospectRelConfig.label}</span>
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  } else {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-700" bgColor="bg-blue-50" />
        <span className={cn('text-[10px] font-medium', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={connection.orgScreenName} isUser color="text-green-700" bgColor="bg-green-50" />
        <ChainDash />
        <span className={cn('text-[10px] font-medium', prospectRelConfig.color)}>{prospectRelConfig.label}</span>
        {connection.viaUser && (
          <>
            <ChainNode label={connection.viaUser} isUser color="text-orange-700" bgColor="bg-orange-50" />
            <ChainDash />
          </>
        )}
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-700" bgColor="bg-purple-50" />
      </div>
    )
  }
}

export function EnhancedMutualsTable({ mutuals, loading, searchedUserScreenName }: EnhancedMutualsTableProps) {
  const [sortBy, setSortBy] = useState<'relevancy' | 'followers' | 'name'>('relevancy')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 10

  const processed = useMemo(() => {
    let result = [...mutuals]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.screenName.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q)) ||
        (m.orgConnections?.some(c => c.orgScreenName.toLowerCase().includes(q) || c.orgName?.toLowerCase().includes(q)))
      )
    }
    if (sortBy === 'relevancy') result.sort((a, b) => b.relevancyScore - a.relevancyScore)
    else if (sortBy === 'followers') result.sort((a, b) => b.followersCount - a.followersCount)
    else result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [mutuals, sortBy, search])

  const totalPages = Math.ceil(processed.length / pageSize)
  const paginated = processed.slice((page - 1) * pageSize, page * pageSize)

  if (loading) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center gap-4">
        <BerriLoader
          steps={[
            'Analyzing connections',
            'Finding mutual paths',
            'Scoring relevancy'
          ]}
          currentStep={1}
          size="md"
        />
        <span className="text-gray-500 text-sm">Finding mutual connections...</span>
      </div>
    )
  }

  if (!mutuals?.length) return null

  return (
    <div className="w-full flex flex-col gap-4 group">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-500">{mutuals.length} mutual{mutuals.length !== 1 ? 's' : ''} found</div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center h-9" style={{ minWidth: 0, width: searchOpen ? 220 : 36, transition: 'width 0.3s' }}>
            <button
              type="button"
              className={cn('transition-all duration-300', (!searchOpen && 'opacity-0 group-hover:opacity-100') || (searchOpen && 'opacity-0 pointer-events-none'),
                'bg-transparent border-none p-0 m-0', searchOpen ? 'text-berri-raspberry' : 'text-gray-400', 'hover:text-berri-raspberry focus:outline-none absolute left-0')}
              style={{ height: 36, width: 36 }}
              onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 150) }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className={cn('absolute text-sm left-0 top-0 h-9 text-gray-900 bg-white transition-all duration-300',
                'border border-gray-200 rounded-xl px-3 focus:border-berri-raspberry focus:ring-2 focus:ring-berri-raspberry/10',
                searchOpen ? 'w-56 opacity-100' : 'w-0 opacity-0 pointer-events-none')}
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              type="button"
              className={cn('transition opacity-0 group-hover:opacity-100', 'bg-transparent border-none p-0 m-0',
                sortDropdownOpen ? 'text-berri-raspberry' : 'text-gray-400', 'hover:text-berri-raspberry focus:outline-none')}
              style={{ height: 36, width: 36 }}
              onClick={() => setSortDropdownOpen(v => !v)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h12M3 17h6" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                {['relevancy', 'followers', 'name'].map((s, i) => (
                  <button
                    key={s}
                    className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                      sortBy === s ? 'bg-berri-raspberry/10 text-berri-raspberry font-medium' : 'text-gray-700 hover:bg-gray-50')}
                    onClick={() => { setSortBy(s as typeof sortBy); setSortDropdownOpen(false) }}
                  >
                    Sort by {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider border-b border-gray-100">
          <div className="col-span-3">User</div>
          <div className="col-span-6">Connection Path</div>
          <div className="col-span-2 text-right">Followers</div>
          <div className="col-span-1 text-center">Match</div>
        </div>

        {/* Rows */}
        {paginated.map((user) => (
          <div key={user.userId} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-5 py-4 hover:bg-gray-50/50 transition border-t border-gray-100 first:border-t-0">
            <div className="col-span-3 flex items-center gap-3">
              <img src={user.profileImageUrl || '/default-avatar.png'} alt={user.name} className="w-10 h-10 rounded-full border border-gray-100 flex-shrink-0 shadow-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 truncate">{user.name}</span>
                  {user.verified && (
                    <svg className="w-4 h-4 text-berri-raspberry flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-500 text-sm">@{user.screenName}</span>
              </div>
            </div>
            <div className="col-span-6 flex flex-col gap-1 justify-center">
              {user.connectionTypes && user.connectionTypes.length > 1 && <ConnectionTypeBadges types={user.connectionTypes} />}
              <ConnectionChain user={user} searchedUserScreenName={searchedUserScreenName} />
            </div>
            <div className="col-span-2 flex items-center justify-end">
              <span className="text-gray-700 text-sm font-medium">{user.followersCount.toLocaleString()}</span>
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <ScoreCircle score={user.relevancyScore} breakdown={user.scoreBreakdown} />
            </div>
          </div>
        ))}

        {processed.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-500">No mutuals found matching your criteria</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-2">
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-200 transition-colors"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium disabled:opacity-50 hover:bg-gray-200 transition-colors"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
