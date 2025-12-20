'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// Types for connection paths
interface PathNode {
  userId: string
  screenName: string
  name: string
  role: 'you' | 'introducer' | 'intermediary' | 'organization' | 'third_party' | 'prospect'
  relationship?: string
}

interface ConnectionPath {
  type: 'org_direct' | 'org_indirect' | 'shared_third_party' | 'chain_affinity'
  chain: PathNode[]
  strength: number
  sharedChains?: string[]
}

interface DirectConnections {
  orgDirect: ConnectionPath[]
  orgIndirect: ConnectionPath[]
  sharedThirdParty: ConnectionPath[]
  chainAffinity: ConnectionPath[]
}

interface DirectConnectionsSectionProps {
  connections: DirectConnections
  prospectScreenName: string
  loading: boolean
}

// Relationship type display config
const RELATIONSHIP_CONFIG: Record<string, { label: string; color: string }> = {
  WORKS_AT: { label: 'works at', color: 'text-green-400' },
  WORKED_AT: { label: 'worked at', color: 'text-yellow-400' },
  INVESTED_IN: { label: 'invested in', color: 'text-blue-400' },
  AUDITS: { label: 'audits', color: 'text-purple-400' },
  AFFILIATED_WITH: { label: 'affiliated with', color: 'text-orange-400' },
  PARTNERS_WITH: { label: 'partners with', color: 'text-pink-400' },
  MEMBER_OF: { label: 'member of', color: 'text-cyan-400' },
}

// Connection type labels
const CONNECTION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  org_direct: { label: 'Shared Organization', description: 'You both have a connection to the same organization' },
  org_indirect: { label: 'Org via Mutual', description: 'Connected through a shared organization and mutual follows' },
  shared_third_party: { label: 'Shared Investor/Auditor', description: 'Your organizations share an investor or auditor' },
  chain_affinity: { label: 'Same Blockchain', description: 'Your organizations operate on the same blockchain' },
}

// Chain node component
function ChainNode({
  node,
  isFirst,
  isLast
}: {
  node: PathNode
  isFirst: boolean
  isLast: boolean
}) {
  const getRoleStyles = () => {
    switch (node.role) {
      case 'you':
        return 'text-emerald-300 bg-emerald-900/30 border-emerald-700'
      case 'prospect':
        return 'text-purple-300 bg-purple-900/30 border-purple-700'
      case 'organization':
        return 'text-green-300 bg-green-900/30 border-green-700'
      case 'intermediary':
        return 'text-orange-300 bg-orange-900/30 border-orange-700'
      case 'third_party':
        return 'text-blue-300 bg-blue-900/30 border-blue-700'
      default:
        return 'text-gray-300 bg-gray-700/50 border-gray-600'
    }
  }

  const label = node.role === 'you' ? 'You' : node.screenName

  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border',
      getRoleStyles()
    )}>
      {node.role === 'organization' || node.role === 'third_party' ? label : `@${label}`}
    </span>
  )
}

// Em dash connector
function ChainDash() {
  return (
    <span className="text-gray-500 text-sm font-light mx-0.5">—</span>
  )
}

// Relationship label
function RelLabel({ relationship }: { relationship?: string }) {
  if (!relationship) return null
  const config = RELATIONSHIP_CONFIG[relationship] || { label: relationship.toLowerCase(), color: 'text-gray-400' }
  return (
    <span className={cn('text-[10px]', config.color)}>{config.label}</span>
  )
}

// Single connection path visualization
function ConnectionPathView({ path }: { path: ConnectionPath }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1">
      {path.chain.map((node, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <>
              <RelLabel relationship={path.chain[index - 1]?.relationship} />
              <ChainDash />
            </>
          )}
          <ChainNode
            node={node}
            isFirst={index === 0}
            isLast={index === path.chain.length - 1}
          />
        </span>
      ))}
      {path.sharedChains && path.sharedChains.length > 0 && (
        <span className="ml-2 text-xs text-cyan-400">
          [{path.sharedChains.join(', ')}]
        </span>
      )}
    </div>
  )
}

// Connection type section
function ConnectionTypeSection({
  type,
  paths,
  defaultExpanded = false
}: {
  type: string
  paths: ConnectionPath[]
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const config = CONNECTION_TYPE_LABELS[type] || { label: type, description: '' }

  if (paths.length === 0) return null

  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-gray-800/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">{config.label}</span>
          <span className="text-xs text-gray-500">({paths.length})</span>
        </div>
        <svg
          className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-2 pb-2">
          <p className="text-xs text-gray-500 mb-2">{config.description}</p>
          <div className="space-y-1">
            {paths.map((path, index) => (
              <ConnectionPathView key={index} path={path} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DirectConnectionsSection({
  connections,
  prospectScreenName,
  loading
}: DirectConnectionsSectionProps) {
  const totalCount =
    connections.orgDirect.length +
    connections.orgIndirect.length +
    connections.sharedThirdParty.length +
    connections.chainAffinity.length

  if (loading) {
    return (
      <div className="w-full mt-4 p-4 border border-gray-700 rounded-xl bg-gray-800/30">
        <div className="text-sm text-gray-400">Finding your connections...</div>
      </div>
    )
  }

  if (totalCount === 0) {
    return null
  }

  return (
    <div className="w-full mt-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Your Direct Connections to @{prospectScreenName}
      </h3>
      <div className="border border-gray-700 rounded-xl bg-gray-800/20 overflow-hidden">
        <ConnectionTypeSection
          type="org_direct"
          paths={connections.orgDirect}
          defaultExpanded={connections.orgDirect.length > 0}
        />
        <ConnectionTypeSection
          type="org_indirect"
          paths={connections.orgIndirect}
        />
        <ConnectionTypeSection
          type="shared_third_party"
          paths={connections.sharedThirdParty}
        />
        <ConnectionTypeSection
          type="chain_affinity"
          paths={connections.chainAffinity}
        />
      </div>
    </div>
  )
}
