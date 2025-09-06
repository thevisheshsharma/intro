/**
 * Efficient category to org_type mapping system
 * - Pre-computed lookup tables
 * - Fuzzy matching for variants
 * - Performance optimized
 */

export type OrgType = 'infrastructure' | 'defi' | 'exchange' | 'investment' | 'service' | 'community' | 'gaming' | 'social' | 'nft' | 'protocol'

interface CategoryMappingConfig {
  readonly exact: Map<string, OrgType>
  readonly fuzzy: Map<string, OrgType>
  readonly patterns: Array<{ pattern: RegExp, orgType: OrgType }>
}

class CategoryMapper {
  private static instance: CategoryMapper
  private readonly config: CategoryMappingConfig
  
  private constructor() {
    this.config = this.buildMappingConfig()
  }
  
  static getInstance(): CategoryMapper {
    if (!CategoryMapper.instance) {
      CategoryMapper.instance = new CategoryMapper()
    }
    return CategoryMapper.instance
  }
  
  /**
   * Build optimized lookup structures once
   */
  private buildMappingConfig(): CategoryMappingConfig {
    const categoryDefinitions = this.getCategoryDefinitions()
    
    const exact = new Map<string, OrgType>()
    const fuzzy = new Map<string, OrgType>()
    const patterns: Array<{ pattern: RegExp, orgType: OrgType }> = []
    
    for (const [orgType, categories] of Object.entries(categoryDefinitions)) {
      for (const category of categories) {
        const normalized = this.normalize(category)
        
        // Exact matches (case-insensitive)
        exact.set(normalized, orgType as OrgType)
        
        // Fuzzy matches (for common variations)
        this.generateFuzzyVariants(category).forEach(variant => {
          fuzzy.set(this.normalize(variant), orgType as OrgType)
        })
        
        // Pattern matches for complex categories
        if (this.shouldCreatePattern(category)) {
          patterns.push({
            pattern: this.createPattern(category),
            orgType: orgType as OrgType
          })
        }
      }
    }
    
    return { exact, fuzzy, patterns }
  }
  
  /**
   * Your category definitions as a method for easy updates
   */
  private getCategoryDefinitions(): Record<string, string[]> {
    return {
      infrastructure: [
        "chain", "infrastructure", "layer-1", "layer2", "rollup", "zk_rollup",
        "sidechain", "Bridge", "bridge aggregator", "Cross Chain Bridge",
        "Canonical Bridge", "Oracle", "Developer Tools", "tool", "Infrastructure",
        "video infrastructure", "iot blockchain", "interface", "mev", "Privacy",
        "Security Extension", "Domains", "wallet", "Wallets", "DePIN"
      ],
      defi: [
        "rwa", "basis trading", "onchain capital allocator", "yield aggregator",
        "farm", "Token Locker", "cedeFi", "cdp", "cdp manager", "derivatives",
        "options", "Algo-Stables", "stablecoin issuer", "partially algorithmic stablecoin",
        "reserve currency", "anchor btc", "leveraged trading", "indexes",
        "options vault", "synthetics", "uncollateralized lending", "Yield",
        "liquid staking", "liquid restaking", "restaked btc", "staking pool",
        "Liquidity manager", "Liquidity Automation", "volume boosting", "dca tools",
        "nft lending", "decentralized btc", "collateral management", "leveraged farming",
        "nftfi", "liquidity manager", "un-collateralized lending", "yield lottery",
        "yield farming", "lending", "ponzi", "dor", "RWA Lending", "Restaking",
        "Dual-Token Stablecoin", "Liquidations", "Staking Rental"
      ],
      exchange: ["Dexs", "DEX aggregator", "CEX", "trading app", "otc marketplace", "Launchpad"],
      investment: ["VC", "Venture Capital", "Fund", "Private Investment Platform"],
      service: ["Event Hosting", "Services", "support", "enterprise"],
      community: [
        "DAO Service provider", "dao", "Governance Incentives", "Treasury Manager",
        "Builders House", "Advocacy", "foundation", "treasury manager",
        "charity fundraising", "international economic forum", "anonymous league", "mascot"
      ],
      gaming: ["gaming"],
      social: ["soFi", "social matching app", "telegram bot", "meme", "social", "information"],
      nft: ["nft marketplace", "nft launchpad", "nft", "nft project"],
      protocol: [
        "Prediction Market", "risk curators", "insurance", "bug bounty",
        "portfolio tracker", "coins tracker", "ai agents", "Payments", "Chain Bribes"
      ]
    }
  }
  
  /**
   * Fast category mapping with fallback hierarchy
   */
  mapCategoriesToOrgType(categories: string[]): OrgType {
    if (!categories?.length) return 'protocol'
    
    // Try exact match first (fastest)
    for (const category of categories) {
      const normalized = this.normalize(category)
      const exactMatch = this.config.exact.get(normalized)
      if (exactMatch) return exactMatch
    }
    
    // Try fuzzy match
    for (const category of categories) {
      const normalized = this.normalize(category)
      const fuzzyMatch = this.config.fuzzy.get(normalized)
      if (fuzzyMatch) return fuzzyMatch
    }
    
    // Try pattern match
    for (const category of categories) {
      for (const { pattern, orgType } of this.config.patterns) {
        if (pattern.test(category)) return orgType
      }
    }
    
    return 'protocol' // Default fallback
  }
  
  /**
   * Normalize category string for consistent matching
   */
  private normalize(str: string): string {
    return str.toLowerCase().trim().replace(/[_\s-]+/g, ' ')
  }
  
  /**
   * Generate common variations of category names
   */
  private generateFuzzyVariants(category: string): string[] {
    const variants = [category]
    const lower = category.toLowerCase()
    
    // Common variations
    variants.push(
      lower,
      lower.replace(/[_-]/g, ' '),
      lower.replace(/\s+/g, '_'),
      lower.replace(/\s+/g, '-'),
      lower.replace(/\s+/g, '')
    )
    
    // Plural/singular
    if (lower.endsWith('s') && lower.length > 3) {
      variants.push(lower.slice(0, -1))
    } else {
      variants.push(lower + 's')
    }
    
    return Array.from(new Set(variants)) // Remove duplicates
  }
  
  /**
   * Check if category should have pattern matching
   */
  private shouldCreatePattern(category: string): boolean {
    return category.includes(' ') || category.includes('-') || category.includes('_')
  }
  
  /**
   * Create regex pattern for complex categories
   */
  private createPattern(category: string): RegExp {
    const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const flexible = escaped.replace(/[\s_-]+/g, '[\\s_-]+')
    return new RegExp(`^${flexible}$`, 'i')
  }
  
  /**
   * Get mapping statistics for monitoring
   */
  getMappingStats(): {
    exactMappings: number
    fuzzyMappings: number
    patterns: number
    totalCategories: number
  } {
    return {
      exactMappings: this.config.exact.size,
      fuzzyMappings: this.config.fuzzy.size,
      patterns: this.config.patterns.length,
      totalCategories: Object.values(this.getCategoryDefinitions()).flat().length
    }
  }
  
  /**
   * Validate category against known mappings
   */
  validateCategory(category: string): {
    isKnown: boolean
    orgType?: OrgType
    matchType: 'exact' | 'fuzzy' | 'pattern' | 'none'
  } {
    const normalized = this.normalize(category)
    
    if (this.config.exact.has(normalized)) {
      return {
        isKnown: true,
        orgType: this.config.exact.get(normalized)!,
        matchType: 'exact'
      }
    }
    
    if (this.config.fuzzy.has(normalized)) {
      return {
        isKnown: true,
        orgType: this.config.fuzzy.get(normalized)!,
        matchType: 'fuzzy'
      }
    }
    
    for (const { pattern, orgType } of this.config.patterns) {
      if (pattern.test(category)) {
        return {
          isKnown: true,
          orgType,
          matchType: 'pattern'
        }
      }
    }
    
    return { isKnown: false, matchType: 'none' }
  }
}

// Export singleton instance
export const categoryMapper = CategoryMapper.getInstance()
