'use client'

import { useState, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

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
  // Legacy field
  mutualType?: 'direct' | 'organizational'
  // New connection types from the two-POV system
  connectionType?: ConnectionType
  relevancyScore: number
  orgConnections?: OrgConnection[]
  // New fields from enhanced system
  sharedOrg?: { userId: string; screenName: string; name: string }
  intermediary?: { userId: string; screenName: string; name: string }
  thirdParty?: { userId: string; screenName: string; name: string }
  sharedChains?: string[]
  // Aggregated fields for multi-connection users
  connectionTypes?: ConnectionType[]
  allOrgConnections?: OrgConnection[]
  allSharedOrgs?: Array<{ userId: string; screenName: string; name: string }>
  allIntermediaries?: Array<{ userId: string; screenName: string; name: string }>
  allThirdParties?: Array<{ userId: string; screenName: string; name: string }>
  allSharedChains?: string[]
  // Score breakdown for tooltip display
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

// Relationship type display config
const RELATIONSHIP_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  WORKS_AT: { label: 'works at', color: 'text-green-400', bgColor: 'bg-green-900/30' },
  WORKED_AT: { label: 'worked at', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  INVESTED_IN: { label: 'invested in', color: 'text-blue-400', bgColor: 'bg-blue-900/30' },
  AUDITS: { label: 'audits', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
  AFFILIATED_WITH: { label: 'affiliated with', color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
  PARTNERS_WITH: { label: 'partners with', color: 'text-pink-400', bgColor: 'bg-pink-900/30' },
  MEMBER_OF: { label: 'member of', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' },
  FOLLOWS: { label: 'follows', color: 'text-gray-400', bgColor: 'bg-gray-900/30' }
}

// Connection type display config
const CONNECTION_TYPE_CONFIG: Record<ConnectionType, { label: string; shortLabel: string; color: string; bgColor: string }> = {
  direct: { label: 'Direct Follow', shortLabel: 'Follow', color: 'text-blue-400', bgColor: 'bg-blue-900/40' },
  org_direct: { label: 'Same Org', shortLabel: 'Org', color: 'text-green-400', bgColor: 'bg-green-900/40' },
  org_indirect: { label: 'Org via Mutual', shortLabel: 'OrgMutual', color: 'text-orange-400', bgColor: 'bg-orange-900/40' },
  shared_third_party: { label: 'Shared Investor', shortLabel: 'Investor', color: 'text-purple-400', bgColor: 'bg-purple-900/40' },
  chain_affinity: { label: 'Same Chain', shortLabel: 'Chain', color: 'text-cyan-400', bgColor: 'bg-cyan-900/40' },
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

  // Color based on score level
  const getColor = () => {
    if (percentage >= 70) return '#4ade80' // green-400
    if (percentage >= 40) return '#facc15' // yellow-400
    return '#9ca3af' // gray-400
  }

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg width="32" height="32" viewBox="0 0 32 32">
        {/* Background circle */}
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filledLength}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>

      {/* Score breakdown tooltip */}
      {showTooltip && breakdown && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs whitespace-nowrap z-50 shadow-lg">
          <div className="text-gray-400 mb-1 font-medium">Score Breakdown</div>
          <div className="space-y-0.5">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Base:</span>
              <span className="text-white">{breakdown.base.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Multiplier:</span>
              <span className="text-white">×{breakdown.relationshipMultiplier.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Quality:</span>
              <span className="text-white">+{breakdown.accountQuality.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Bonuses:</span>
              <span className="text-white">+{breakdown.bonuses.toFixed(0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Freshness:</span>
              <span className="text-white">×{breakdown.freshnessDecay.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between gap-4">
              <span className="text-gray-400">Total:</span>
              <span className="text-green-400 font-medium">{score.toFixed(0)}</span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700"></div>
        </div>
      )}

      {/* Fallback title for cases without breakdown */}
      {!breakdown && (
        <span className="sr-only">Score: {score.toFixed(0)}</span>
      )}
    </div>
  )
}

// Chain node component
function ChainNode({
  label,
  isUser = false,
  color = 'text-gray-300',
  bgColor = 'bg-gray-700/50'
}: {
  label: string
  isUser?: boolean
  color?: string
  bgColor?: string
}) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
      bgColor,
      color,
      isUser && 'border border-gray-600'
    )}>
      {isUser ? `@${label}` : label}
    </span>
  )
}

// Em dash connector (non-directional)
function ChainDash() {
  return (
    <span className="text-gray-500 text-sm font-light mx-0.5">—</span>
  )
}

// Connection type badges for multi-type users
function ConnectionTypeBadges({ types }: { types: ConnectionType[] }) {
  if (types.length <= 1) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {types.map(type => {
        const config = CONNECTION_TYPE_CONFIG[type]
        return (
          <span
            key={type}
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              config.bgColor,
              config.color
            )}
            title={config.label}
          >
            {config.shortLabel}
          </span>
        )
      })}
    </div>
  )
}

// Connection chain visualization
function ConnectionChain({
  user,
  searchedUserScreenName
}: {
  user: MutualUser
  searchedUserScreenName?: string
}) {
  // Determine connection type (support both legacy and new format)
  const connType = user.connectionType || (user.mutualType === 'direct' ? 'direct' : 'org_direct')

  // Direct mutual: C → B (C follows you, B follows C)
  if (connType === 'direct') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  }

  // Shared Third Party: C - OrgC - ThirdParty - OrgB - B
  if (connType === 'shared_third_party' && user.sharedOrg && user.thirdParty) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <span className="text-[10px] text-green-400">works at</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
        <ChainDash />
        <ChainNode label={user.thirdParty.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  }

  // Chain Affinity: C - OrgC - [chains] - OrgB - B
  if (connType === 'chain_affinity' && user.sharedOrg && user.sharedChains) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <span className="text-[10px] text-green-400">works at</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
        <span className="text-[10px] text-cyan-400">[{user.sharedChains.join(', ')}]</span>
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  }

  // Org Indirect with intermediary: C - Org - Y - B
  if (connType === 'org_indirect' && user.sharedOrg && user.intermediary) {
    const connection = user.orgConnections?.[0]
    const userRelConfig = connection ? RELATIONSHIP_CONFIG[connection.userRelationType] || RELATIONSHIP_CONFIG.WORKS_AT : RELATIONSHIP_CONFIG.WORKS_AT
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <span className={cn('text-[10px]', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
        <ChainDash />
        <ChainNode label={user.intermediary.screenName} isUser color="text-orange-300" bgColor="bg-orange-900/30" />
        <ChainDash />
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  }

  // Fall back to org connections if available (legacy format and org_direct)
  const connection = user.orgConnections?.[0]
  if (!connection) {
    // If we have sharedOrg but no orgConnections (new format)
    if (user.sharedOrg) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
          <ChainDash />
          <ChainNode label={user.sharedOrg.screenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
          <ChainDash />
          <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
        </div>
      )
    }
    return null
  }

  const userRelConfig = RELATIONSHIP_CONFIG[connection.userRelationType] || RELATIONSHIP_CONFIG.WORKS_AT
  const prospectRelConfig = RELATIONSHIP_CONFIG[connection.prospectRelationType] || RELATIONSHIP_CONFIG.WORKS_AT

  if (connection.matchSource === 'prospect_direct') {
    // C → [rel] → Org ← [rel] ← B
    // Chain: C - Org - B
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <span className={cn('text-[10px]', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={connection.orgScreenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
        <ChainDash />
        <span className={cn('text-[10px]', prospectRelConfig.color)}>{prospectRelConfig.label}</span>
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  } else {
    // Via prospect's following: C → [rel] → Org ← [rel] ← X ← B
    // Chain: C - Org - X - B
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <ChainNode label={user.screenName} isUser color="text-blue-300" bgColor="bg-blue-900/30" />
        <span className={cn('text-[10px]', userRelConfig.color)}>{userRelConfig.label}</span>
        <ChainDash />
        <ChainNode label={connection.orgScreenName} isUser color="text-green-300" bgColor="bg-green-900/30" />
        <ChainDash />
        <span className={cn('text-[10px]', prospectRelConfig.color)}>{prospectRelConfig.label}</span>
        {connection.viaUser && (
          <>
            <ChainNode label={connection.viaUser} isUser color="text-orange-300" bgColor="bg-orange-900/30" />
            <ChainDash />
          </>
        )}
        <ChainNode label={searchedUserScreenName || '?'} isUser color="text-purple-300" bgColor="bg-purple-900/30" />
      </div>
    )
  }
}

export function EnhancedMutualsTable({
  mutuals,
  loading,
  searchedUserScreenName
}: EnhancedMutualsTableProps) {
  const [sortBy, setSortBy] = useState<'relevancy' | 'followers' | 'name'>('relevancy')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 10

  // Search and sort
  const processed = useMemo(() => {
    let result = [...mutuals]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.screenName.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q)) ||
        (m.orgConnections?.some(c => c.orgScreenName.toLowerCase().includes(q) || c.orgName?.toLowerCase().includes(q)))
      )
    }

    // Sort
    if (sortBy === 'relevancy') {
      result.sort((a, b) => b.relevancyScore - a.relevancyScore)
    } else if (sortBy === 'followers') {
      result.sort((a, b) => b.followersCount - a.followersCount)
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [mutuals, sortBy, search])

  const totalPages = Math.ceil(processed.length / pageSize)
  const paginated = processed.slice((page - 1) * pageSize, page * pageSize)

  if (loading) {
    return (
      <div className="w-full mt-8 text-center text-gray-400">
        Finding mutual connections...
      </div>
    )
  }

  if (!mutuals?.length) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-3 group">
      {/* Header with search and sort only */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-400">
          {mutuals.length} mutual{mutuals.length !== 1 ? 's' : ''} found
        </div>

        {/* Search and Sort controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center h-8" style={{ minWidth: 0, width: searchOpen ? 210 : 32, transition: 'width 0.3s' }}>
            <button
              type="button"
              className={cn(
                'transition-all duration-300',
                (!searchOpen && 'opacity-0 group-hover:opacity-100') || (searchOpen && 'opacity-0 pointer-events-none'),
                'bg-transparent border-none p-0 m-0',
                searchOpen ? 'text-blue-500' : 'text-gray-400',
                'hover:text-blue-400 focus:outline-none absolute left-0',
              )}
              style={{ height: 32, width: 32, minWidth: 32, minHeight: 32, zIndex: 2 }}
              onClick={() => {
                setSearchOpen(true)
                setTimeout(() => searchInputRef.current?.focus(), 150)
              }}
              aria-label="Open search filter"
              tabIndex={searchOpen ? -1 : 0}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <input
              ref={searchInputRef}
              type="text"
              className={cn(
                'absolute text-xs left-0 top-0 h-8 text-white bg-transparent transition-all duration-300',
                'border-b-2 border-blue-500 placeholder:text-xs',
                '!outline-none !ring-0 focus:!outline-none focus:!ring-0',
                searchOpen ? 'w-56 opacity-100 pl-2' : 'w-0 opacity-0 pl-0 pointer-events-none',
              )}
              placeholder="search by name, username, org..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ minWidth: searchOpen ? 180 : 0, maxWidth: 210, borderRadius: 0, background: 'transparent', boxShadow: 'none', outline: 'none' }}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}
              tabIndex={searchOpen ? 0 : -1}
              aria-label="Search mutuals"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              type="button"
              className={cn(
                'transition opacity-0 group-hover:opacity-100',
                'bg-transparent border-none p-0 m-0',
                sortDropdownOpen ? 'text-blue-500' : 'text-gray-400',
                'hover:text-blue-400 focus:outline-none'
              )}
              style={{ height: 32, width: 32, minWidth: 32, minHeight: 32 }}
              onClick={() => setSortDropdownOpen(v => !v)}
              aria-label="Open sorting options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 18h6M3 6h18M3 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-[#23272f] border border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  className={cn('w-full text-left px-4 py-2 hover:bg-gray-700 rounded-t-lg text-xs', sortBy === 'relevancy' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                  onClick={() => { setSortBy('relevancy'); setSortDropdownOpen(false) }}
                >
                  Sort by Relevancy
                </button>
                <button
                  className={cn('w-full text-left px-4 py-2 hover:bg-gray-700 text-xs', sortBy === 'followers' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                  onClick={() => { setSortBy('followers'); setSortDropdownOpen(false) }}
                >
                  Sort by Followers
                </button>
                <button
                  className={cn('w-full text-left px-4 py-2 hover:bg-gray-700 rounded-b-lg text-xs', sortBy === 'name' ? 'bg-blue-600 text-white' : 'text-gray-200')}
                  onClick={() => { setSortBy('name'); setSortDropdownOpen(false) }}
                >
                  Sort by Name
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="w-full border border-gray-700 rounded-xl shadow-lg overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-800/50 text-gray-400 text-xs font-semibold border-b border-gray-700">
          <div className="col-span-3">User</div>
          <div className="col-span-6">Connection Path</div>
          <div className="col-span-2 text-right">Followers</div>
          <div className="col-span-1 text-center">Match</div>
        </div>

        {/* Table rows */}
        {paginated.map((user) => (
          <div
            key={user.userId}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-800/30 transition border-t border-gray-700/50 first:border-t-0"
          >
            {/* User info */}
            <div className="col-span-3 flex items-center gap-3">
              <img
                src={user.profileImageUrl || '/default-avatar.png'}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-gray-700 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-white truncate">{user.name}</span>
                  {user.verified && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </svg>
                  )}
                </div>
                <span className="text-gray-400 text-sm">@{user.screenName}</span>
              </div>
            </div>

            {/* Connection chain */}
            <div className="col-span-6 flex flex-col gap-1 justify-center">
              {/* Show connection type badges if multiple types */}
              {user.connectionTypes && user.connectionTypes.length > 1 && (
                <ConnectionTypeBadges types={user.connectionTypes} />
              )}
              <ConnectionChain user={user} searchedUserScreenName={searchedUserScreenName} />
            </div>

            {/* Followers */}
            <div className="col-span-2 flex items-center justify-end">
              <span className="text-gray-300 text-sm">
                {user.followersCount.toLocaleString()}
              </span>
            </div>

            {/* Score circle */}
            <div className="col-span-1 flex items-center justify-center">
              <ScoreCircle score={user.relevancyScore} breakdown={user.scoreBreakdown} />
            </div>

            {/* Mobile layout */}
            <div className="md:hidden col-span-1 flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{user.followersCount.toLocaleString()} followers</span>
                <ScoreCircle score={user.relevancyScore} breakdown={user.scoreBreakdown} />
              </div>
              {user.connectionTypes && user.connectionTypes.length > 1 && (
                <ConnectionTypeBadges types={user.connectionTypes} />
              )}
              <ConnectionChain user={user} searchedUserScreenName={searchedUserScreenName} />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {processed.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400">
            No mutuals found matching your criteria
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-2">
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-300 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50"
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
