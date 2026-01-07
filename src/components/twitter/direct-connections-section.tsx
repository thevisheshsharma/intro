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

// Relationship type display config - Light mode colors
const RELATIONSHIP_CONFIG: Record<string, { label: string; color: string }> = {
  WORKS_AT: { label: 'works at', color: 'text-green-600' },
  WORKED_AT: { label: 'worked at', color: 'text-amber-600' },
  INVESTED_IN: { label: 'invested in', color: 'text-blue-600' },
  AUDITS: { label: 'audits', color: 'text-purple-600' },
  AFFILIATED_WITH: { label: 'affiliated with', color: 'text-orange-600' },
  PARTNERS_WITH: { label: 'partners with', color: 'text-pink-600' },
  MEMBER_OF: { label: 'member of', color: 'text-cyan-600' },
}

// Connection type labels
const CONNECTION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  org_direct: { label: 'Shared Organization', description: 'You both have a connection to the same organization' },
  org_indirect: { label: 'Org via Mutual', description: 'Connected through a shared organization and mutual follows' },
  shared_third_party: { label: 'Shared Investor/Auditor', description: 'Your organizations share an investor or auditor' },
  chain_affinity: { label: 'Same Blockchain', description: 'Your organizations operate on the same blockchain' },
}

// Chain node component - Light mode
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
        return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      case 'prospect':
        return 'text-purple-700 bg-purple-50 border-purple-200'
      case 'organization':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'intermediary':
        return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'third_party':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const label = node.role === 'you' ? 'You' : node.screenName

  return (
    <span className={cn(
      'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border',
      getRoleStyles()
    )}>
      {node.role === 'organization' || node.role === 'third_party' ? label : `@${label}`}
    </span>
  )
}

// Em dash connector
function ChainDash() {
  return (
    <span className="text-gray-400 text-sm font-light mx-1">—</span>
  )
}

// Relationship label
function RelLabel({ relationship }: { relationship?: string }) {
  if (!relationship) return null
  const config = RELATIONSHIP_CONFIG[relationship] || { label: relationship.toLowerCase(), color: 'text-gray-500' }
  return (
    <span className={cn('text-[10px] font-medium', config.color)}>{config.label}</span>
  )
}

// Single connection path visualization
function ConnectionPathView({ path }: { path: ConnectionPath }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap py-2">
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
        <span className="ml-2 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs font-medium">
          {path.sharedChains.join(', ')}
        </span>
      )}
    </div>
  )
}

// Connection type section - Light mode
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
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900 font-medium">{config.label}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{paths.length}</span>
        </div>
        <svg
          className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-3">{config.description}</p>
          <div className="space-y-1 bg-gray-50 rounded-xl p-3">
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
      <div className="w-full mt-4 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-berri-raspberry/20 border-t-berri-raspberry animate-spin" />
          <span className="text-sm text-gray-500">Finding your connections...</span>
        </div>
      </div>
    )
  }

  if (totalCount === 0) {
    return null
  }

  return (
    <div className="w-full mt-4">
      <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
        Your Direct Connections to @{prospectScreenName}
      </h3>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
