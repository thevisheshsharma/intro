/**
 * Llama API integration for fetching protocol data
 */

export interface LlamaProtocol {
  id: string
  name: string
  address?: string
  symbol?: string
  url?: string
  description?: string
  chain?: string
  logo?: string
  audits?: string
  audit_note?: string
  gecko_id?: string
  cmcId?: string
  category?: string
  chains?: string[]
  module?: string
  twitter?: string
  audit_links?: string[]
  oracles?: string[]
  listedAt?: number
  methodology?: string
  slug?: string
  tvl?: number | bigint
  chainTvls?: Record<string, number | bigint>
  change_1h?: number
  change_1d?: number
  change_7d?: number
  mcap?: number | bigint
  parentProtocol?: string
  parentProtocolSlug?: string
  defillamaId?: string
  hallmarks?: Array<[number, string]>
  isParentProtocol?: boolean
  subProtocols?: string[]
  github?: string
  governanceID?: string[]
}

export interface GroupedProtocol {
  protocols: LlamaProtocol[]
  parentProtocolSlug?: string
  
  // Single entry fields (only from first/main protocol)
  name: string
  token?: string
  gecko_id?: string
  cmcId?: string
  screenName?: string
  
  // Array fields (merged from all protocols)
  recent_developments: Array<[number, string]>  // hallmarks
  governance_forum: string[]                    // governanceID
  audit_links: string[]                         // audit_links -> renamed from audit_report_url
  org_subType: string[]                         // category
  github: string[]                              // github -> renamed from github_url
  llama_slug: string[]                          // slug
  chains: string[]                              // chains
  about: string[]                               // description
  url: string[]                                 // url
  contract_address: string[]                    // address
  llama_id: string[]                            // id
  
  // TVL calculation field
  totalTvl: number
}

/**
 * Fetch all protocols from Llama API
 */
export async function fetchLlamaProtocols(): Promise<LlamaProtocol[]> {
  console.log('Fetching protocols from Llama API...')
  
  const response = await fetch('https://api.llama.fi/protocols', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Intro-Protocol-Sync/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch protocols from Llama API: ${response.status} ${response.statusText}`)
  }

  const protocols: LlamaProtocol[] = await response.json()
  
  console.log(`Successfully fetched ${protocols.length} protocols from Llama API`)
  return protocols
}

/**
 * Group protocols by their parent protocol slug
 */
export function groupProtocolsByParent(protocols: LlamaProtocol[]): GroupedProtocol[] {
  console.log('Grouping protocols by parent...')
  
  const grouped = new Map<string, LlamaProtocol[]>()
  const standalone: LlamaProtocol[] = []

  // Group protocols
  for (const protocol of protocols) {
    if (protocol.parentProtocolSlug) {
      const key = protocol.parentProtocolSlug
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(protocol)
    } else {
      standalone.push(protocol)
    }
  }

  const result: GroupedProtocol[] = []

  // Process grouped protocols
  for (const entry of Array.from(grouped.entries())) {
    const [parentSlug, protocolGroup] = entry
    const mergedProtocol = mergeProtocolGroup(protocolGroup, parentSlug)
    result.push(mergedProtocol)
  }

  // Process standalone protocols
  for (const protocol of standalone) {
    const groupedProtocol = mergeProtocolGroup([protocol])
    result.push(groupedProtocol)
  }

  console.log(`Created ${result.length} grouped protocols (${grouped.size} groups + ${standalone.length} standalone)`)
  return result
}

/**
 * Merge a group of protocols into a single grouped protocol
 */
function mergeProtocolGroup(protocols: LlamaProtocol[], parentSlug?: string): GroupedProtocol {
  if (protocols.length === 0) {
    throw new Error('Cannot merge empty protocol group')
  }

  // Use the first protocol as the base (usually the parent)
  const baseProtocol = protocols[0]
  
  // Initialize arrays for merging
  const llama_id: string[] = []
  const contract_address: string[] = []
  const about: string[] = []
  const url: string[] = []
  const chains: string[] = []
  const llama_slug: string[] = []
  const audit_links: string[] = []
  const github: string[] = []
  const org_subType: string[] = []
  const governance_forum: string[] = []
  const recent_developments: Array<[number, string]> = []

  let totalTvl = 0

  // Merge data from all protocols with deduplication
  for (const protocol of protocols) {
    // Add to arrays with deduplication for cleaner data
    if (protocol.id && !llama_id.includes(protocol.id)) llama_id.push(protocol.id)
    if (protocol.address && !contract_address.includes(protocol.address)) contract_address.push(protocol.address)
    if (protocol.description && !about.includes(protocol.description)) about.push(protocol.description)
    if (protocol.url && !url.includes(protocol.url)) url.push(protocol.url)
    if (protocol.slug && !llama_slug.includes(protocol.slug)) llama_slug.push(protocol.slug)
    if (protocol.category && !org_subType.includes(protocol.category)) org_subType.push(protocol.category)
    if (protocol.github && !github.includes(protocol.github)) github.push(protocol.github)
    
    // Merge arrays from protocol with deduplication
    if (protocol.chains) {
      for (const chain of protocol.chains) {
        if (!chains.includes(chain)) chains.push(chain)
      }
    }
    if (protocol.audit_links) {
      for (const link of protocol.audit_links) {
        if (!audit_links.includes(link)) audit_links.push(link)
      }
    }
    if (protocol.governanceID) {
      for (const id of protocol.governanceID) {
        if (!governance_forum.includes(id)) governance_forum.push(id)
      }
    }
    if (protocol.hallmarks) {
      for (const hallmark of protocol.hallmarks) {
        // For hallmarks, check if the timestamp + description combination already exists
        const exists = recent_developments.some(existing => 
          existing[0] === hallmark[0] && existing[1] === hallmark[1]
        )
        if (!exists) recent_developments.push(hallmark)
      }
    }
  }

  // Extract Twitter screen name from URL or handle
  let screenName: string | undefined
  if (baseProtocol.twitter) {
    if (typeof baseProtocol.twitter === 'string') {
      // Handle different twitter field formats
      if (baseProtocol.twitter.includes('twitter.com/')) {
        // Full URL format: https://twitter.com/username
        const twitterMatch = baseProtocol.twitter.match(/twitter\.com\/([^\/\?]+)/)
        if (twitterMatch) {
          screenName = twitterMatch[1]
        }
      } else if (baseProtocol.twitter.startsWith('@')) {
        // Handle with @ prefix: @username
        screenName = baseProtocol.twitter.substring(1)
      } else {
        // Just the handle: username
        screenName = baseProtocol.twitter
      }
    }
  }

  return {
    protocols,
    parentProtocolSlug: parentSlug,
    
    // Single entry fields (from base protocol only)
    name: baseProtocol.name,
    token: baseProtocol.symbol,
    gecko_id: baseProtocol.gecko_id,
    cmcId: baseProtocol.cmcId,
    screenName,
    
    // Array fields (merged from all protocols, NO deduplication)
    llama_id,
    contract_address,
    about,
    url,
    chains,
    llama_slug,
    audit_links,
    github,
    org_subType,
    governance_forum,
    recent_developments,
    
    totalTvl: 0  // Temporarily set to 0 instead of calculated value
  }
}


