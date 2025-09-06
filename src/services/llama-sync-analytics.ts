import { categoryMapper } from '@/services/protocol-category-mapper'
import type { GroupedProtocol } from '@/lib/llama-api'

export interface CategoryAnalytics {
  orgTypeDistribution: Record<string, number>
  unmappedCategories: Array<{
    category: string
    frequency: number
    sampleProtocols: string[]
  }>
  mappingEfficiency: {
    totalCategories: number
    mappedCategories: number
    mappingRate: number
  }
  categoryVariants: Map<string, Set<string>>
}

/**
 * Comprehensive category analysis - OPTIMIZED
 */
export function analyzeCategoryMapping(groupedProtocols: GroupedProtocol[]): CategoryAnalytics {
  const orgTypeDistribution: Record<string, number> = {}
  const unmappedCategories = new Map<string, { frequency: number, protocols: Set<string> }>()
  const categoryVariants = new Map<string, Set<string>>()
  
  let totalCategories = 0
  let mappedCategories = 0
  
  // Single pass analysis - O(n) instead of O(n²)
  for (const protocol of groupedProtocols) {
    const orgType = categoryMapper.mapCategoriesToOrgType(protocol.org_subType)
    
    // Track distribution
    orgTypeDistribution[orgType] = (orgTypeDistribution[orgType] || 0) + 1
    
    // Analyze each category
    for (const category of protocol.org_subType) {
      totalCategories++
      
      const validation = categoryMapper.validateCategory(category)
      
      if (validation.isKnown) {
        mappedCategories++
        
        // Track variants for the same org_type
        const variants = categoryVariants.get(validation.orgType!) || new Set()
        variants.add(category)
        categoryVariants.set(validation.orgType!, variants)
      } else {
        // Track unmapped
        const existing = unmappedCategories.get(category) || { frequency: 0, protocols: new Set() }
        existing.frequency++
        existing.protocols.add(protocol.name)
        unmappedCategories.set(category, existing)
      }
    }
  }
  
  // Convert unmapped to sorted array
  const unmappedArray = Array.from(unmappedCategories.entries())
    .map(([category, data]) => ({
      category,
      frequency: data.frequency,
      sampleProtocols: Array.from(data.protocols).slice(0, 3) // Top 3 examples
    }))
    .sort((a, b) => b.frequency - a.frequency)
  
  return {
    orgTypeDistribution,
    unmappedCategories: unmappedArray,
    mappingEfficiency: {
      totalCategories,
      mappedCategories,
      mappingRate: totalCategories > 0 ? mappedCategories / totalCategories : 0
    },
    categoryVariants
  }
}

/**
 * Performance-optimized logging
 */
export function logCategoryAnalytics(analytics: CategoryAnalytics): void {
  console.log('=== OPTIMIZED CATEGORY MAPPING ANALYSIS ===')
  
  // Org type distribution
  console.log('\n📊 Org Type Distribution:')
  Object.entries(analytics.orgTypeDistribution)
    .sort(([,a], [,b]) => b - a)
    .forEach(([orgType, count]) => {
      const total = Object.values(analytics.orgTypeDistribution).reduce((a, b) => a + b, 0)
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      console.log(`  ${orgType}: ${count} (${percentage}%)`)
    })
  
  // Mapping efficiency
  console.log(`\n⚡ Mapping Efficiency: ${(analytics.mappingEfficiency.mappingRate * 100).toFixed(1)}% (${analytics.mappingEfficiency.mappedCategories}/${analytics.mappingEfficiency.totalCategories})`)
  
  // Top unmapped categories
  if (analytics.unmappedCategories.length > 0) {
    console.log('\n⚠️  Top Unmapped Categories:')
    analytics.unmappedCategories.slice(0, 10).forEach(({ category, frequency, sampleProtocols }) => {
      console.log(`  "${category}" (${frequency}x) - Examples: ${sampleProtocols.join(', ')}`)
    })
  }
  
  // Mapper performance stats
  const mapperStats = categoryMapper.getMappingStats()
  console.log(`\n🔧 Mapper Performance: ${mapperStats.exactMappings} exact + ${mapperStats.fuzzyMappings} fuzzy + ${mapperStats.patterns} patterns`)
}
